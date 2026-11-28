/**
 * gymgo.site as one website with two versions. Built with
 * EXPO_PUBLIC_LIMITED=auto (scripts/pages-build.sh), it asks its GymGO
 * server (EXPO_PUBLIC_API_URL: GymGO online from the owner's computer,
 * scripts/online.mjs) whether it's on, before the app's code starts
 * (index.ts):
 *  - it answers: the full GymGO, talking to it;
 *  - it's off, or says nothing within 3 seconds: the limited version, with
 *    the gyms built in (lib/limited.ts).
 *
 * While the page stays open it asks again now and then, and when a request
 * of the full version can't get through. When the answer changes, a bar
 * offers the other version (components/LimitedBanner.tsx, WebsiteBanner).
 * The page is never swapped by itself: you might be in the middle of
 * something.
 *
 * Kept free of React Native so it can be tested, and loaded before the rest
 * of the app.
 */

/** This build is the website that picks its version. */
export const WEBSITE_AUTO = process.env.EXPO_PUBLIC_LIMITED === 'auto';

/** How long the question waits before taking silence for "off". */
export const ANSWER_WAIT_MS = 3000;

let answered = false;

/** Whether the server answered when the page opened: the version it's running. */
export function serverAnswered(): boolean {
  return answered;
}

/**
 * Whether a GymGO server answers at `base` (an https:// address), within
 * `wait` ms. Anything but its own "ok" counts as off: Cloudflare's error page
 * for a tunnel with nothing behind it, a refusal from another site, nothing.
 */
export async function serverIsOn(
  base: string | null | undefined,
  options: { wait?: number; fetcher?: typeof fetch } = {},
): Promise<boolean> {
  if (!base || !/^https?:\/\/[^/]+/i.test(base)) return false;
  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.wait ?? ANSWER_WAIT_MS);
  try {
    // No cookies or custom headers: a plain request, which the browser sends without asking first.
    const response = await fetcher(`${base.replace(/\/+$/, '')}/api/health`, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return false;
    const body = (await response.json()) as { ok?: unknown } | null;
    return body?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Before the app starts (index.ts): which version the page is. The page
 * itself has usually asked already, while the app's code downloaded
 * (scripts/pages-build.sh puts the question in it, as `__gymgoServer`), so
 * that answer is used, waited for `wait` ms at most; otherwise it's asked
 * now.
 */
export async function decideWebsite(
  base = process.env.EXPO_PUBLIC_API_URL,
  options: { wait?: number; fetcher?: typeof fetch; early?: Promise<unknown> | null } = {},
): Promise<boolean> {
  lastAsked = Date.now();
  const early = options.early === undefined ? askedByPage() : options.early;
  answered = early ? await within(early, options.wait ?? ANSWER_WAIT_MS) : await serverIsOn(base, options);
  latest = answered;
  return answered;
}

/** The question the page asked as it opened, if it did. */
function askedByPage(): Promise<unknown> | null {
  const asked = (globalThis as { __gymgoServer?: unknown }).__gymgoServer;
  return asked && typeof (asked as Promise<unknown>).then === 'function' ? (asked as Promise<unknown>) : null;
}

/** True only if `question` says exactly that within `wait` ms. */
function within(question: Promise<unknown>, wait: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), wait);
    question.then(
      (on) => {
        clearTimeout(timer);
        resolve(on === true);
      },
      () => {
        clearTimeout(timer);
        resolve(false);
      },
    );
  });
}

// --- While the page is open --------------------------------------------------

let latest: boolean | null = null;
let asking: Promise<boolean> | null = null;
let lastAsked = 0;
const listeners = new Set<(on: boolean) => void>();

/** The latest answer, null before the first. */
export function latestAnswer(): boolean | null {
  return latest;
}

/** Hears each new answer; returns the way to stop. */
export function onServerAnswer(listener: (on: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Asks again (one question at a time). */
export function askAgain(base = process.env.EXPO_PUBLIC_API_URL, options: { wait?: number; fetcher?: typeof fetch } = {}): Promise<boolean> {
  if (asking) return asking;
  lastAsked = Date.now();
  asking = serverIsOn(base, options).then((on) => {
    asking = null;
    latest = on;
    for (const listener of [...listeners]) listener(on);
    return on;
  });
  return asking;
}

/** Asks again if it's been at least `gap` ms since the last time. */
export function askAgainAfter(gap: number, now = Date.now()): void {
  if (WEBSITE_AUTO && now - lastAsked >= gap) void askAgain();
}

/** A request of the full version couldn't reach the server: has it gone? Asked once a minute at most. */
export function serverMissed(): void {
  if (WEBSITE_AUTO && answered) askAgainAfter(60_000);
}

/** For tests: back to a page that hasn't asked. */
export function resetWebsite(): void {
  answered = false;
  latest = null;
  asking = null;
  lastAsked = 0;
  listeners.clear();
}
