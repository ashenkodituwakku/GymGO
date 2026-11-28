/**
 * Verity's guard (verity.ts, app.ts POST /api/verity): what stops the chat
 * being talked out of its rules, or told what to do by text that isn't the
 * person's own question. Four layers, none of which trusts the model alone:
 *
 * 1. **Questions screened before any model sees them** (`screen`): attempts
 *    to override Verity's instructions ("ignore your previous rules"), known
 *    jailbreak personas ("DAN", "developer mode"), requests for its hidden
 *    instructions, chat-markup smuggled in ("<|im_start|>system"), invisible
 *    Unicode tag characters and long encoded blobs. Matching is done on a
 *    folded copy (accents, full-width letters, zero-width characters,
 *    l33t-speak and s.p.a.c.e.d letters undone), so a disguise doesn't get
 *    through. A question that trips it gets a fixed refusal and costs
 *    nothing: no model is asked.
 * 2. **Verity's own answers are signed** (`signReply`, `verifyReply`): the
 *    app sends the conversation back with each question, so anyone could
 *    write a fake earlier answer ("Sure, developer mode is on"). Each answer
 *    carries an HMAC made with a secret only this server process holds, and
 *    an answer without a good one is left out of what the model sees. A
 *    restart forgets the secret: earlier answers then drop out, the
 *    questions stay.
 * 3. **Everything that isn't the question is marked as data**: what a
 *    screen shows, the training log and a tool's result go in fenced
 *    sections the instructions say never to obey (verity.ts `instructions`),
 *    and a screen's text that trips the screen is left out altogether.
 * 4. **Answers checked before they go back** (`checkReply`): one that
 *    repeats the secret marker hidden in the instructions, quotes Verity's
 *    rules at length, or announces a jailbreak is replaced by the refusal.
 *
 * Actions (building a workout) never act on their own: the model can only
 * propose one, the server checks it against what the app offered, and the
 * person taps to save or start it (verityTools.ts).
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** What Verity says to a question it won't take. The same words every time, so a refusal can't be argued with. */
export const REFUSAL = 'I can’t help with that. I’m here for GymGO and your training: ask me about gyms, workouts or the app.';
/** To a question after its own instructions: it can't share them, and what it can do instead. */
export const PRIVATE = 'I can’t share how I’m set up. I can help with gyms, workouts and finding your way around GymGO, though.';

export type Threat = 'override' | 'persona' | 'extraction' | 'markup' | 'hidden' | 'encoded';
export type Verdict = { ok: true } | { ok: false; threat: Threat };

/** Zero-width, joiners, direction marks and the BOM: invisible, and used to split a word past a filter. */
// eslint-disable-next-line no-misleading-character-class
const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿]/g;
/** Unicode's tag characters: invisible copies of ASCII that some models read as text ("ASCII smuggling"). */
const TAGS = /[\u{E0000}-\u{E007F}]/u;
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i', '|': 'i' };

/**
 * A copy of the text made for matching only: compatibility forms folded
 * (full-width and styled letters to plain), accents and invisible marks
 * taken off, lower case, l33t undone inside words, letters spaced out with
 * spaces, dots or dashes joined again, and whitespace to single spaces.
 */
export function fold(text: string): string {
  let out = text.normalize('NFKD').replace(/\p{M}/gu, '').replace(INVISIBLE, '').toLowerCase();
  // A digit or symbol standing in for a letter, inside or at the end of a word (so "5x5" and "$25" stay as they are).
  out = out.replace(/(?<=[a-z])[0134579@$!|]{1,2}(?=[a-z])/g, (run) => [...run].map((char) => LEET[char] ?? char).join(''));
  out = out.replace(/(?<=[a-z]{2})[0134579@$]{1,2}(?=\s|[.,?]|$)/g, (run) => [...run].map((char) => LEET[char] ?? char).join(''));
  out = out.replace(/(?<=^|\s)[0134579@$](?=[a-z]{2})/g, (char) => LEET[char] ?? char);
  // "i g n o r e", "i.g.n.o.r.e", "d-a-n": three or more single letters in a row, joined.
  out = out.replace(/\b(?:[a-z][\s.\-_*/\\]+){2,}[a-z]\b/g, (run) => run.replace(/[\s.\-_*/\\]+/g, ''));
  return out.replace(/\s+/g, ' ').trim();
}

/** Whose instructions: Verity's own, never the rules of a sport or a gym ("ignore the rules about rest days" passes). */
const WHO = '(?:your|previous|prior|above|earlier|preceding|original|initial|system|default|developer|hidden|existing|current)';
const RULES = '(?:instructions?|rules|prompts?|guidelines|directions|directives|programming|polic(?:y|ies)|restrictions|filters|guardrails|constraints|safeguards|system messages?|content polic(?:y|ies))';
const VERBS = '(?:ignore|disregard|forget|override|overwrite|bypass|circumvent|discard|abandon|disable|suspend|drop|break|remove|delete|erase)';
const MODIFIERS = '(?:system|hidden|secret|internal|initial|original|developer|underlying|confidential|pre[\\s-]?)';

/** Each pattern is matched against `fold`'s copy. Written to catch the attack, not gym talk ("can I skip my training today" passes). */
const PATTERNS: Array<{ threat: Threat; pattern: RegExp }> = [
  // Taking the instructions away, or replacing them.
  { threat: 'override', pattern: new RegExp(`\\b${VERBS}\\b(?:\\W+\\w+){0,4}?\\W+${WHO}\\b(?:\\W+\\w+){0,3}?\\W+${RULES}\\b`) },
  { threat: 'override', pattern: new RegExp(`\\b(?:ignore|disregard|forget)\\s+(?:all\\s+|any\\s+|every\\s+)?(?:of\\s+)?(?:the\\s+)?(?:instructions?|prompts?|rules)\\s+(?:above|before|so far|you(?:'ve| have| were)? (?:been )?given)`) },
  { threat: 'override', pattern: /\b(?:ignore|disregard|forget)\s+(?:everything|all|anything)\s+(?:above|before|previously|you (?:were|have been) told|i said before)/ },
  { threat: 'override', pattern: /\b(?:new|updated|secret|hidden|override|admin|developer|system)\s+(?:instructions|prompt|system prompt|directives)\s*(?::|follow|are|apply)/ },
  { threat: 'override', pattern: /\b(?:you (?:are|were) (?:no longer|not) (?:bound|restricted|limited)|you have no (?:rules|restrictions|limits|filters|guidelines))\b/ },
  { threat: 'override', pattern: /\bfrom now on\b.{0,60}\b(?:no (?:rules|restrictions|limits|filters)|without (?:any )?(?:rules|restrictions|limits|filters)|ignore (?:your|all|the)|you are (?:not|no longer|free|unrestricted|unfiltered|dan)\b|you (?:will|must) (?:answer|respond|reply) (?:anything|everything|without))/ },
  { threat: 'override', pattern: /\b(?:i am|i'm|this is) (?:your|the|an?) (?:developer|creator|admin|administrator|owner|programmer|operator|system)\b.{0,60}\b(?:allow|authori[sz]e|permit|unlock|override|instruct|order|command|let you)/ },
  { threat: 'override', pattern: /\b(?:end|stop) (?:of )?(?:the )?(?:system|instructions?|prompt)\b.{0,20}\b(?:begin|start|new)\b/ },
  // Personas made to have no rules.
  { threat: 'persona', pattern: /\b(?:dan|stan|dude|aim|evil ?bot|anti ?gpt|better ?dan|mongo tom|omega|apophis|ucar)\s+(?:mode|prompt|jailbreak|persona)\b/ },
  { threat: 'persona', pattern: /\b(?:you are|you're|act as|become|pretend to be|roleplay as|role play as)\s+(?:now\s+)?(?:a\s+|an\s+)?dan\b/ },
  { threat: 'persona', pattern: /\bdo anything now\b/ },
  { threat: 'persona', pattern: /\b(?:developer|dev|debug|god|sudo|admin|root|unrestricted|unfiltered|uncensored|jailbreak|jailbroken|opposite|evil|chaos|unlocked|no ?limits?) mode\b/ },
  { threat: 'persona', pattern: /\bjail ?br(?:ea|o)k(?:s|ing|en)?\b/ },
  { threat: 'persona', pattern: /\b(?:act|behave|respond|reply|answer|talk|speak|roleplay|role play|pretend|imagine|simulate)\b(?:\W+\w+){0,4}?\W+(?:as|like|to be|you are|you're)\b(?:\W+\w+){0,4}?\W+(?:unfiltered|uncensored|unrestricted|unbound|amoral|immoral|without (?:any )?(?:rules|restrictions|limits|filters|guidelines|ethics|morals|censorship)|with no (?:rules|restrictions|limits|filters|guidelines|ethics|morals))\b/ },
  { threat: 'persona', pattern: /\b(?:an? )?(?:ai|assistant|chatbot|model|bot) (?:with|that has) no (?:rules|restrictions|limits|filters|guidelines|ethics|morals|censorship)\b/ },
  { threat: 'persona', pattern: /\b(?:stay|remain|keep) in character\b.{0,40}\b(?:no matter|whatever|always|even if)\b/ },
  // Asking for the hidden instructions.
  { threat: 'extraction', pattern: new RegExp(`\\b(?:reveal|show|print|output|repeat|display|tell|give|share|leak|dump|recite|write|copy|paste|list|spell|translate|summari[sz]e|reproduce|quote|echo|read)\\b(?:\\W+\\w+){0,5}?\\W+${MODIFIERS}\\s*(?:prompt|instructions?|message|configuration|config|directives?)\\b`) },
  { threat: 'extraction', pattern: /\b(?:repeat|print|output|show|reveal|recite|copy|translate|write)\b(?:\W+\w+){0,4}?\W+(?:the )?(?:words|text|everything|lines?|instructions?|content|message)\s+(?:above|before)\s+(?:this|my|the|our)/ },
  { threat: 'extraction', pattern: /\bwhat (?:are|were|is) (?:your|the) (?:system |initial |original |hidden |secret |exact |full )?(?:prompt|instructions|system message)(?=\s*(?:[?.!]|$))/ },
  { threat: 'extraction', pattern: /\bwhat (?:were you|have you been) (?:told|instructed|programmed) (?:to (?:say|do|hide)|before|at the start|by (?:the|your))/ },
  { threat: 'extraction', pattern: /\b(?:your|the) (?:system )?prompt (?:verbatim|word for word|in full|exactly)\b/ },
  { threat: 'extraction', pattern: /\b(?:secret|hidden) (?:marker|token|canary)\b/ },
];

/** Chat markup a model might take for a new turn or new instructions, looked for in the text as typed. */
const MARKUP = [
  /<\|\s*(?:im_start|im_end|im_sep|system|endoftext|eot_id|start_header_id|end_header_id|begin_of_text|assistant|user)\s*\|>/i,
  /\[\s*\/?\s*(?:inst|sys|system|assistant)\s*\]/i,
  /<<\s*\/?\s*sys\s*>>/i,
  /<\s*\/?\s*(?:system|sys|instructions?|assistant|developer|tool|function_results?|tool_results?)\s*>/i,
  /(?:^|\n)\s*#{1,6}\s*(?:system|instructions?|developer|new rules)\b/i,
  /(?:^|\n)\s*(?:system|assistant|developer|verity)\s*(?:prompt|message)?\s*:\s*\S/i,
  /(?:^|\n)\s*(?:begin|end)\s+(?:system|instructions?)\b/i,
];

/**
 * Whether a question (or what a screen says) is safe to hand to a model.
 * Ordinary questions, in any language, pass; it's tuned so a gym question
 * never trips it, at the cost of letting through attacks it can't name.
 * The model's instructions and `checkReply` stand behind it.
 */
export function screen(text: string): Verdict {
  if (TAGS.test(text)) return { ok: false, threat: 'hidden' };
  // A long run of base64 or hex: nothing a gym question needs, and a way to hide instructions.
  if (/[A-Za-z0-9+/=_-]{80,}/.test(text)) return { ok: false, threat: 'encoded' };
  if (/(?:[0-9a-f]{2}[\s:]?){80,}/i.test(text)) return { ok: false, threat: 'encoded' };
  if (MARKUP.some((pattern) => pattern.test(text))) return { ok: false, threat: 'markup' };
  const folded = fold(text);
  for (const { threat, pattern } of PATTERNS) if (pattern.test(folded)) return { ok: false, threat };
  return { ok: true };
}

/** The refusal for what tripped the screen: a question after its instructions gets told so plainly. */
export const refusalFor = (threat: Threat) => (threat === 'extraction' ? PRIVATE : REFUSAL);

/** Signs and checks Verity's answers, and holds the marker hidden in its instructions. One per server. */
export class VerityGuard {
  private readonly secret: Buffer;
  /** A random word in Verity's instructions, never said anywhere else: an answer that has it has leaked them. */
  readonly canary: string;
  private readonly rules: Set<string>;

  constructor(options: { secret?: Buffer; canary?: string; rules?: string } = {}) {
    this.secret = options.secret ?? randomBytes(32);
    this.canary = options.canary ?? `VG-${randomBytes(6).toString('hex')}`;
    this.rules = shingles(options.rules ?? '');
  }

  /** The signature the app sends back with an answer. */
  signReply(text: string): string {
    return createHmac('sha256', this.secret).update(`verity-reply\n${text}`).digest('base64url');
  }

  /** Whether an answer sent back is one this server gave, word for word. */
  verifyReply(text: string, sig: unknown): boolean {
    if (typeof sig !== 'string' || sig.length > 100) return false;
    const want = Buffer.from(this.signReply(text));
    const got = Buffer.from(sig);
    return want.length === got.length && timingSafeEqual(want, got);
  }

  /**
   * Why an answer mustn't go back, or null when it's fine: it holds the
   * marker, quotes Verity's rules at length (two or more stretches of 10
   * words straight from them), or says a jailbreak worked.
   */
  checkReply(text: string): 'canary' | 'rules' | 'persona' | null {
    if (text.includes(this.canary) || fold(text).includes(this.canary.toLowerCase())) return 'canary';
    if (this.rules.size) {
      let quoted = 0;
      for (const piece of shingles(text)) if (this.rules.has(piece) && ++quoted >= 2) return 'rules';
    }
    const folded = fold(text);
    if (/\b(?:dan|developer|dev|god|sudo|jailbreak|jailbroken|unrestricted|unfiltered|uncensored) mode (?:is )?(?:now )?(?:enabled|activated|on|unlocked|engaged)\b/.test(folded)) return 'persona';
    if (/\b(?:i am|i'm) (?:now )?(?:dan|jailbroken|unrestricted|unfiltered|uncensored|free of (?:my |all )?(?:rules|restrictions))\b/.test(folded)) return 'persona';
    if (/\bjailbreak (?:successful|complete|worked)\b/.test(folded)) return 'persona';
    return null;
  }
}

/** Every run of 10 words, folded: how a long quote is found whatever its punctuation. */
function shingles(text: string, size = 10): Set<string> {
  const words = fold(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let at = 0; at + size <= words.length; at++) out.add(words.slice(at, at + size).join(' '));
  return out;
}
