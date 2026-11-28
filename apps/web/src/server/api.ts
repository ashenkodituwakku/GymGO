/**
 * Route handler helpers.
 *
 * Every handler accepts both JSON and ordinary form encoding, and answers in
 * kind: JSON for a fetch, a redirect for a plain form post. That keeps one
 * documented API while the forms still work without JavaScript.
 */

import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { AuthorizationError } from '@gymgo/domain';
import { AuthUnavailableError } from './auth';

export interface ParsedBody {
  data: Record<string, unknown>;
  /** True for an ordinary form post, which expects a redirect back. */
  isForm: boolean;
  /** Where a form post should return to. Only ever a path on this site. */
  redirectTo: string | null;
}

export async function readBody(request: Request): Promise<ParsedBody> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const data = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return { data, isForm: false, redirectTo: null };
  }

  const form = await request.formData();
  const data: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') data[key] = value;
  }

  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const redirectTo = safeRedirect(typeof data.returnTo === 'string' ? data.returnTo : null);
  delete data.returnTo;

  return { data, isForm: !wantsJson, redirectTo };
}

/**
 * Only same-site paths are honoured. An absolute URL here would be an open
 * redirect, so anything that is not a plain path is dropped.
 */
function safeRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

/** Coerce form strings into the shapes the schemas expect. */
export function coerceNumbers(
  data: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out = { ...data };
  for (const key of keys) {
    const value = out[key];
    if (value === undefined || value === '' || value === null) {
      out[key] = null;
      continue;
    }
    const parsed = Number(value);
    out[key] = Number.isFinite(parsed) ? parsed : value;
  }
  return out;
}

export function coerceOptionalStrings(
  data: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out = { ...data };
  for (const key of keys) {
    if (out[key] === '' || out[key] === undefined) out[key] = null;
  }
  return out;
}

export function parseWith<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export interface SuccessOptions {
  status?: number;
  /** Appended to the redirect target so the page can acknowledge the action. */
  flash?: string;
}

export function success(
  body: ParsedBody,
  payload: Record<string, unknown>,
  options: SuccessOptions = {},
): NextResponse {
  if (body.isForm && body.redirectTo) {
    const url = new URL(body.redirectTo, 'http://placeholder.invalid');
    if (options.flash) url.searchParams.set('done', options.flash);
    return NextResponse.redirect(
      new URL(`${url.pathname}${url.search}`, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
      303,
    );
  }
  return NextResponse.json({ ok: true, ...payload }, { status: options.status ?? 201 });
}

/**
 * Turn a thrown error into a response.
 *
 * Authorisation failures answer 403 with the permission name and nothing else:
 * no hint about whether the record exists, and never any private evidence.
 */
export function failure(error: unknown, body?: ParsedBody): NextResponse {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const message = first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input.';
    return respondError(message, 400, body);
  }
  if (error instanceof AuthorizationError) {
    return respondError('You do not have permission to do that.', 403, body);
  }
  if (error instanceof AuthUnavailableError) {
    return respondError(error.message, 503, body);
  }
  const status = (error as { status?: number }).status;
  if (typeof status === 'number') {
    return respondError((error as Error).message, status, body);
  }

  console.error('Unhandled API error', error);
  return respondError('Something went wrong handling that request.', 500, body);
}

function respondError(message: string, status: number, body?: ParsedBody): NextResponse {
  if (body?.isForm && body.redirectTo) {
    const url = new URL(body.redirectTo, 'http://placeholder.invalid');
    url.searchParams.set('error', message);
    return NextResponse.redirect(
      new URL(`${url.pathname}${url.search}`, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
      303,
    );
  }
  return NextResponse.json({ ok: false, error: message }, { status });
}
