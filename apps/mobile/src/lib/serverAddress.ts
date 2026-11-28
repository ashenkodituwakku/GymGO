/**
 * Where the GymGO server is, worked out from what the app knows about where
 * it came from (see apiBase in api.ts). Kept apart from api.ts so it can be
 * tested without React Native.
 */

/** Where the bundler forwards requests to the GymGO server (metro.config.js). */
export const SERVER_PREFIX = '/_gymgo';

/** The server's address from what the app knows about where it came from. */
export function pickApiBase(from: {
  configured?: string | null;
  /** In a browser, the page's own origin. */
  pageOrigin?: string | null;
  /** On a phone, the address its code was loaded from (none in a release build). */
  bundleUrl?: string | null;
  /** Expo's note of the bundler's host and port. */
  hostUri?: string | null;
}): string | null {
  // A build with no server (the website on Netlify, until one is set up): nothing is asked of one.
  if (from.configured === 'none') return null;
  // A build its own server serves (GymGO online from one computer, scripts/online.mjs): the page's
  // own address, whatever the tunnel in front of it is called today.
  if (from.configured === 'same-origin') return from.pageOrigin ?? null;
  if (from.configured) return from.configured.replace(/\/+$/, '');
  if (from.pageOrigin) return `${from.pageOrigin}${SERVER_PREFIX}`;
  const origin = from.bundleUrl ? /^https?:\/\/[^/?#]+/i.exec(from.bundleUrl)?.[0] : null;
  if (origin) return `${origin}${SERVER_PREFIX}`;
  if (from.hostUri) return `http://${from.hostUri}${SERVER_PREFIX}`;
  return null;
}

/**
 * Whether the server is a hosted GymGO, reached over the internet, rather
 * than GymGO running on your own computer (in development, or a build
 * pointed at a computer on your network). It decides what to suggest when
 * the server can't be reached: check you're online, or check GymGO is running.
 */
export function serverIsHosted(configured: string | null | undefined, pageOrigin: string | null = null): boolean {
  if (!configured || configured === 'none') return false;
  const address = configured === 'same-origin' ? pageOrigin : configured;
  // Served from wherever the page is, with no page to go by: a hosted GymGO is likelier.
  if (!address) return configured === 'same-origin';
  let host: string;
  try {
    host = new URL(address).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    return false;
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '::1') return false;
  const ip = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(host);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    if (a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)) return false;
  }
  return true;
}
