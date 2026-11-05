/**
 * How a request to the GymGO server fails (lib/api.ts throws these), and
 * reading its answer. Apart from lib/api.ts so it's tested in Node.
 */

import { serverMissed } from './website';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The server's reason, when it gives one: `pro_required`, `billing_off`… */
    readonly code: string | null = null,
    /** Anything else the server said, e.g. `countryCode` for an area that needs Pro. */
    readonly detail: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** The server couldn't be reached at all. */
export class OfflineError extends Error {}

/**
 * The server's JSON answer. Anything else came from something in front of
 * it: a proxy (Caddy, a tunnel, the dev server) saying the server isn't
 * answering (502, 503, 504) is the server being unreachable, said as such;
 * any other page is a failure with no reason given. Never a raw parse error.
 */
export function readBody(status: number, text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // Not JSON: below.
  }
  // A proxy's or tunnel's own page (Caddy, a Cloudflare tunnel's 502 or 530) for a server that isn't answering.
  if (status === 502 || status === 503 || status === 504 || (status >= 520 && status <= 530)) {
    serverMissed();
    throw new OfflineError('The GymGO server isn’t answering.');
  }
  throw new ApiError(status >= 400 ? status : 502, 'Something went wrong.', 'not_json');
}

/**
 * The error for an answer that isn't a success. The server's own failures
 * always say what went wrong (`error`, usually a `code`), its 502s and 503s
 * included (the place finder busy, the weather switched off). Something in
 * front of a server that isn't answering says nothing of the kind: a 502,
 * 503 or 504 with no message (Caddy), or the dev server's proxy, which says
 * `server_down`. Only those are the server being unreachable.
 */
export function failure(status: number, data: Record<string, unknown>): ApiError | OfflineError {
  const code = typeof data.code === 'string' ? data.code : null;
  const said = typeof data.error === 'string' ? data.error : null;
  if (code === 'server_down' || ((status === 502 || status === 503 || status === 504) && !said && !code)) {
    serverMissed();
    return new OfflineError(said ?? 'The GymGO server isn’t answering.');
  }
  return new ApiError(status, said ?? 'Something went wrong.', code, data);
}
