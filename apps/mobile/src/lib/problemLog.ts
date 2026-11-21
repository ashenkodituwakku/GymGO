/**
 * The last few errors and warnings the app ran into, kept in memory on this
 * device, so a bug report can say what went wrong on the phone it came from
 * (a warning in Expo Go is gone once it's dismissed).
 *
 * Only the messages, cleaned: anything that looks like an email address, a
 * sign-in token or a link's query is taken out, and each is cut short.
 * Nothing is sent on its own: the lines go only with a bug report you send,
 * listed on the form first, and its switch leaves them out (see
 * lib/bugReport.ts). Gone when the app closes.
 *
 * No React Native imports, so the cleaning and keeping can be tested alone.
 */

export type ProblemKind = 'error' | 'warning';

/** How many different problems are kept; the oldest goes first. */
export const KEPT = 5;
/** How long one message may be, once cleaned. */
export const MESSAGE_CHARS = 150;

/** A message, safe to send: no email addresses, tokens or link queries, on one line, short. */
export function scrubProblem(text: string): string {
  const clean = text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/gi, '$1?…')
    // Web tokens (three dotted parts), then any long run of letters and digits: tokens, keys, ids.
    .replace(/[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{2,}/g, '[…]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[…]')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > MESSAGE_CHARS ? `${clean.slice(0, MESSAGE_CHARS - 1).trimEnd()}…` : clean;
}

/** What console.error and console.warn were given, as one line ("%s" filled in, as React's warnings use it). */
export function formatArgs(args: readonly unknown[]): string {
  const say = (value: unknown): string => {
    if (value instanceof Error) return value.message || value.name;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  };
  const [first, ...rest] = args;
  if (typeof first === 'string' && first.includes('%')) {
    let used = 0;
    const filled = first.replace(/%[sdifoOc]/g, (token) => (token === '%c' ? '' : used < rest.length ? say(rest[used++]) : token));
    return [filled, ...rest.slice(used).map(say)].join(' ');
  }
  return args.map(say).join(' ');
}

interface Kept {
  kind: ProblemKind;
  message: string;
  times: number;
  /** The last time it happened, in ms. */
  at: number;
}

export class ProblemLog {
  private kept: Kept[] = [];

  note(kind: ProblemKind, text: string, at: number): void {
    const message = scrubProblem(text);
    if (!message) return;
    const same = this.kept.find((item) => item.kind === kind && item.message === message);
    if (same) {
      same.times += 1;
      same.at = at;
      this.kept = [...this.kept.filter((item) => item !== same), same];
      return;
    }
    this.kept = [...this.kept, { kind, message, times: 1, at }].slice(-KEPT);
  }

  /** The lines a bug report lists, newest first. */
  lines(now: number): Array<{ label: string; value: string }> {
    return [...this.kept].reverse().map((item, index) => ({
      label: `Recent problem ${index + 1}`,
      value: `${item.kind === 'error' ? 'Error' : 'Warning'}${item.times > 1 ? ` (${item.times} times)` : ''}, ${ago(now - item.at)}: ${item.message}`,
    }));
  }

  clear(): void {
    this.kept = [];
  }
}

function ago(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ago`;
}

/** The app's own log. */
export const problems = new ProblemLog();

let installed = false;

/**
 * Starts keeping: console errors and warnings (passed on unchanged, so
 * Expo Go still shows them), errors nothing caught, and in a browser,
 * promises nothing answered. Once; later calls do nothing.
 */
export function installProblemLog(): void {
  if (installed) return;
  installed = true;
  let busy = false;
  const keep = (kind: ProblemKind, text: string) => {
    // Never a loop: a problem while keeping one is let go.
    if (busy) return;
    busy = true;
    try {
      problems.note(kind, text, Date.now());
    } catch {
      // Not kept, then.
    } finally {
      busy = false;
    }
  };
  for (const [method, kind] of [['error', 'error'], ['warn', 'warning']] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      keep(kind, formatArgs(args));
      original(...args);
    };
  }
  // A phone: errors nothing caught.
  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler(): (error: unknown, fatal?: boolean) => void; setGlobalHandler(handler: (error: unknown, fatal?: boolean) => void): void } }).ErrorUtils;
  if (errorUtils) {
    const before = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, fatal) => {
      keep('error', `${fatal ? 'Fatal: ' : ''}${formatArgs([error])}`);
      before(error, fatal);
    });
  }
  // A browser: the same, and promises nothing answered.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('error', (event) => keep('error', event.message || formatArgs([event.error])));
    window.addEventListener('unhandledrejection', (event) => keep('error', `Unhandled: ${formatArgs([event.reason])}`));
  }
}
