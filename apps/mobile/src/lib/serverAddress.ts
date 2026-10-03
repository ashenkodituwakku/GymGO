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
  if (from.configured) return from.configured.replace(/\/+$/, '');
  if (from.pageOrigin) return `${from.pageOrigin}${SERVER_PREFIX}`;
  const origin = from.bundleUrl ? /^https?:\/\/[^/?#]+/i.exec(from.bundleUrl)?.[0] : null;
  if (origin) return `${origin}${SERVER_PREFIX}`;
  if (from.hostUri) return `http://${from.hostUri}${SERVER_PREFIX}`;
  return null;
}
