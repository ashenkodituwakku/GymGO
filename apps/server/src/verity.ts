/**
 * Verity: the chat in the corner of the app, answered by a free AI model
 * through OpenRouter (openrouter.ai), with Verity's guide to GymGO
 * (verityGuide.ts) as its instructions.
 *
 * It costs nothing. Only models whose OpenRouter id ends in ":free" are ever
 * asked: any other named in GYMGO_VERITY_MODELS is left out, and the server
 * says so as it starts. OpenRouter bills a fallback at the price of the model
 * that answered, so a list of free models stays free. Free models allow 20
 * questions a minute and 50 a day for the whole OpenRouter account (1,000 a
 * day once $10 of credit has ever been bought there); past that, the app
 * says Verity's had a lot of questions.
 *
 * Nothing said is kept here: each question brings the conversation so far
 * from the app, and the answer goes straight back. What's sent goes to
 * OpenRouter and the model's provider, whose free services may keep it; the
 * chat says so.
 */

import { VERITY_GUIDE } from './verityGuide';

type Fetch = typeof fetch;

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
/**
 * Asked in this order, each one free, from two different providers so one
 * being busy doesn't stop Verity. Checked on OpenRouter's list of models on
 * 27 October 2026.
 */
export const DEFAULT_MODELS = ['google/gemma-4-31b-it:free', 'thinkingmachines/inkling-small:free', 'google/gemma-4-26b-a4b-it:free'];

/** The conversation the app sends: the latest messages, and at most this many. */
export const MAX_MESSAGES = 20;
/** What one question may say. */
export const MAX_QUESTION_CHARS = 1000;
/** Verity's own earlier answers, as the app sends them back. */
const MAX_ANSWER_CHARS = 4000;
/** The whole conversation: past this, its oldest messages are left out. */
const MAX_TOTAL_CHARS = 12_000;
/** A few paragraphs at most. */
const MAX_REPLY_TOKENS = 700;
const TIMEOUT_MS = 45_000;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class VerityError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** For the app to act on: `verity_off`, `verity_busy`. */
    readonly code?: string,
  ) {
    super(message);
  }
}

/** The free models in a list, and the others, which are never asked. */
export function freeModels(list: readonly string[]): { models: string[]; ignored: string[] } {
  const models: string[] = [];
  const ignored: string[] = [];
  for (const raw of list) {
    const id = raw.trim();
    if (!id) continue;
    if (/^[\w.-]+\/[\w.:-]+:free$/.test(id)) {
      if (!models.includes(id)) models.push(id);
    } else ignored.push(id);
  }
  return { models, ignored };
}

/** The conversation from the app, checked: it ends with a question, and each message is a sensible length. */
export function cleanChat(input: unknown): ChatMessage[] {
  const list = (input as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_MESSAGES * 2) throw new VerityError(400, 'Ask Verity something first.');
  const messages: ChatMessage[] = [];
  for (const item of list.slice(-MAX_MESSAGES)) {
    const role = (item as { role?: unknown } | null)?.role;
    const content = (item as { content?: unknown } | null)?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') throw new VerityError(400, 'That message didn’t come through. Try again.');
    const text = content.trim();
    if (!text) continue;
    if (role === 'user' && text.length > MAX_QUESTION_CHARS) throw new VerityError(400, `Keep a question under ${MAX_QUESTION_CHARS} characters.`);
    const kept = role === 'assistant' ? text.slice(0, MAX_ANSWER_CHARS) : text;
    // Two in a row from one side (a question asked again after one that failed) go as one:
    // some models only take a conversation that takes turns.
    const last = messages.at(-1);
    if (last?.role === role) last.content = `${last.content}\n\n${kept}`;
    else messages.push({ role, content: kept });
  }
  if (messages.at(-1)?.role !== 'user') throw new VerityError(400, 'Ask Verity something first.');
  // A long conversation keeps its latest messages; the question itself always goes.
  let total = messages.reduce((sum, message) => sum + message.content.length, 0);
  while (total > MAX_TOTAL_CHARS && messages.length > 1) total -= messages.shift()!.content.length;
  // And starts with a question, as those models also need.
  while (messages[0]?.role === 'assistant') messages.shift();
  return messages;
}

/** A model's answer as text, without any thinking it wrote out first. */
export function readAnswer(data: unknown): string | null {
  const content = (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return null;
  const answer = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return answer || null;
}

export class Verity {
  private readonly key: string | null;
  private readonly models: string[];
  private readonly fetchImpl: Fetch;
  private readonly referer: string | null;
  private readonly timeoutMs: number;
  private readonly log: (line: string) => void;

  constructor(options: {
    /** The owner's OpenRouter key (OPENROUTER_API_KEY); without it Verity is off. */
    key: string | null;
    /** Only the free ones are kept. */
    models?: readonly string[];
    /** Stands in for the web in tests, so no test ever calls OpenRouter. */
    fetchImpl?: Fetch;
    /** This server's public address, which OpenRouter shows the owner beside each request. */
    referer?: string | null;
    timeoutMs?: number;
    log?: (line: string) => void;
  }) {
    this.key = options.key?.trim() || null;
    const { models } = freeModels(options.models?.length ? options.models : DEFAULT_MODELS);
    this.models = models.length ? models : DEFAULT_MODELS;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.referer = options.referer ?? null;
    this.timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
    this.log = options.log ?? ((line) => console.warn(line));
  }

  /** Whether Verity can answer: an OpenRouter key is set. */
  get on(): boolean {
    return this.key !== null;
  }

  /** Verity's answer to the conversation's last question. */
  async ask(messages: ChatMessage[]): Promise<string> {
    if (!this.key) throw new VerityError(503, 'Verity isn’t switched on for this server yet.', 'verity_off');
    let response: Response;
    try {
      response = await this.fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.key}`,
          'Content-Type': 'application/json',
          'X-Title': 'GymGO',
          ...(this.referer ? { 'HTTP-Referer': this.referer } : {}),
        },
        body: JSON.stringify({
          // Tried in turn: each one free, so whichever answers costs nothing.
          models: this.models,
          messages: [{ role: 'system', content: VERITY_GUIDE }, ...messages],
          max_tokens: MAX_REPLY_TOKENS,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new VerityError(502, 'Verity couldn’t be reached. Try again in a moment.');
    }
    if (response.status === 429) throw new VerityError(429, 'Verity’s had a lot of questions. Try again a bit later.', 'verity_busy');
    if (!response.ok) {
      // The owner's to fix (a wrong key, an account owing money): said in the server's log, never the key itself.
      if (response.status === 401 || response.status === 402 || response.status === 403) {
        this.log(`[verity] OpenRouter turned the request down (${response.status}). Check OPENROUTER_API_KEY and the account at openrouter.ai.`);
      } else {
        this.log(`[verity] OpenRouter answered ${response.status}.`);
      }
      throw new VerityError(502, 'Verity isn’t working right now. Try again later.');
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new VerityError(502, 'Verity isn’t working right now. Try again later.');
    }
    const answer = readAnswer(data);
    if (!answer) throw new VerityError(502, 'Verity didn’t have an answer. Try asking another way.');
    return answer;
  }
}
