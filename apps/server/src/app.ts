/**
 * The HTTP API.
 *
 *   GET    /api/health
 *   GET    /api/gyms                      every gym record, with its sources
 *   POST   /api/auth/signup               { email, password, displayName }
 *   POST   /api/auth/login                { email, password }
 *   POST   /api/auth/logout
 *   GET    /api/me                        the signed-in account
 *   DELETE /api/me                        delete the account and its data
 *   GET    /api/saved                     { gymIds }
 *   PUT    /api/saved/:gymId
 *   DELETE /api/saved/:gymId
 *   GET    /api/gyms/:gymId/reviews       published reviews, plus your own
 *   POST   /api/gyms/:gymId/reviews       { overall, body, visitedOn? } -> held for moderation
 *   GET    /api/moderation/reviews        moderators: the queue
 *   POST   /api/moderation/reviews/:id    moderators: { decision, reason? }
 *
 * Every route that changes something re-checks permission here with the
 * shared domain rules. The app hiding a button is not access control.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ANONYMOUS, can, publishedReviews, type Permission, type Review, type User } from '@gymgo/domain';
import {
  AttemptLimiter,
  AuthInputError,
  accountForToken,
  checkLogin,
  createAccount,
  endSession,
  publicAccount,
  startSession,
  toUser,
  validateSignup,
  type AccountRow,
} from './auth';
import { allGyms, gymExists, type Db } from './db';

export interface AppOptions {
  db: Db;
  /** Extra browser origins to allow, beyond localhost and the local network. */
  allowedOrigins?: string[];
  attribution: string;
  now?: () => Date;
  /** New accounts allowed per address per hour. */
  signupsPerHour?: number;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Browsers may call the API from localhost or from this machine's address on
 * the home network, which is where the app is served during development.
 * The phone app sends no Origin at all.
 */
export function isAllowedOrigin(origin: string, extra: string[] = []): boolean {
  if (extra.includes(origin)) return true;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
  return /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(host);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'That request is too large.');
    chunks.push(chunk as Buffer);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'The request body isn’t valid JSON.');
  }
}

function send(res: ServerResponse, status: number, body?: unknown): void {
  res.statusCode = status;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (body === undefined) {
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function bearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 && token.length < 200 ? token : null;
}

interface ReviewRow {
  id: string;
  gym_id: string;
  user_id: string;
  overall: number;
  body: string;
  visited_on: string | null;
  status: Review['status'];
  moderation_reason: string | null;
  created_at: string;
  display_name: string;
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    gymId: row.gym_id,
    authorId: row.user_id,
    authorDisplayName: row.display_name,
    overall: row.overall,
    equipment: null,
    cleanliness: null,
    atmosphere: null,
    value: null,
    body: row.body,
    visitedOn: row.visited_on,
    createdAt: row.created_at,
    status: row.status,
    moderationReason: row.moderation_reason,
    // No mechanism verifies a visit, so none is ever marked verified.
    verifiedVisit: false,
    ownerReply: null,
  };
}

const REVIEW_SELECT = `select reviews.*, users.display_name from reviews join users on users.id = reviews.user_id`;

export function createApp(options: AppOptions) {
  const { db } = options;
  const now = options.now ?? (() => new Date());
  // Wrong passwords: 10 per address and email per 15 minutes.
  const loginLimiter = new AttemptLimiter(10, 15 * 60_000);
  const signupLimiter = new AttemptLimiter(options.signupsPerHour ?? 20, 60 * 60_000);

  function caller(req: IncomingMessage): { account: AccountRow | null; user: User; token: string | null } {
    const token = bearer(req);
    const account = token ? accountForToken(db, token, now()) : null;
    return { account, user: account ? toUser(account) : ANONYMOUS, token };
  }

  function requireAccount(req: IncomingMessage) {
    const found = caller(req);
    if (!found.account || !found.token) throw new HttpError(401, 'Sign in first.');
    return { ...found, account: found.account, token: found.token };
  }

  function requirePermission(user: User, permission: Permission, gymId?: string) {
    if (!can(user, permission, gymId ? { gymId } : {})) throw new HttpError(403, 'You don’t have permission to do that.');
  }

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method ?? 'GET';
    const parts = path.split('/').filter(Boolean);

    // --- Public ---------------------------------------------------------
    if (method === 'GET' && path === '/api/health') return send(res, 200, { ok: true });

    if (method === 'GET' && path === '/api/gyms') {
      return send(res, 200, { gyms: allGyms(db), attribution: options.attribution, generatedAt: now().toISOString() });
    }

    // --- Accounts --------------------------------------------------------
    if (method === 'POST' && path === '/api/auth/signup') {
      const input = validateSignup(await readJson(req));
      if (!signupLimiter.allow(`${req.socket.remoteAddress}`, now().getTime())) {
        throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
      }
      const account = createAccount(db, input, now());
      if (!account) throw new HttpError(409, 'There’s already an account with that email. Try signing in.');
      return send(res, 201, { token: startSession(db, account.id, now()), account: publicAccount(account) });
    }

    if (method === 'POST' && path === '/api/auth/login') {
      const body = (await readJson(req)) as Record<string, unknown>;
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) throw new HttpError(400, 'Enter your email and password.');
      if (!loginLimiter.allow(`${req.socket.remoteAddress}|${email}`, now().getTime())) {
        throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
      }
      const account = checkLogin(db, email, password);
      if (!account) throw new HttpError(401, 'That email and password don’t match.');
      if (account.blocked) throw new HttpError(403, 'This account has been blocked.');
      return send(res, 200, { token: startSession(db, account.id, now()), account: publicAccount(account) });
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      const token = bearer(req);
      if (token) endSession(db, token);
      return send(res, 204);
    }

    if (path === '/api/me') {
      const { account } = requireAccount(req);
      if (method === 'GET') return send(res, 200, { account: publicAccount(account) });
      if (method === 'DELETE') {
        // Sessions, saved gyms and reviews go with it (foreign keys cascade).
        db.prepare('delete from users where id = ?').run(account.id);
        return send(res, 204);
      }
    }

    // --- Saved gyms ------------------------------------------------------
    if (method === 'GET' && path === '/api/saved') {
      const { account } = requireAccount(req);
      const rows = db.prepare('select gym_id from saved_gyms where user_id = ? order by created_at').all(account.id) as Array<{
        gym_id: string;
      }>;
      return send(res, 200, { gymIds: rows.map((row) => row.gym_id) });
    }

    if (parts[0] === 'api' && parts[1] === 'saved' && parts.length === 3 && (method === 'PUT' || method === 'DELETE')) {
      const { account } = requireAccount(req);
      const gymId = decodeURIComponent(parts[2]!);
      if (method === 'PUT') {
        if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');
        db.prepare('insert or ignore into saved_gyms (user_id, gym_id, created_at) values (?, ?, ?)').run(
          account.id,
          gymId,
          now().toISOString(),
        );
      } else {
        db.prepare('delete from saved_gyms where user_id = ? and gym_id = ?').run(account.id, gymId);
      }
      return send(res, 204);
    }

    // --- Reviews ---------------------------------------------------------
    if (parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'reviews' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');

      if (method === 'GET') {
        const { account } = caller(req);
        const rows = db.prepare(`${REVIEW_SELECT} where reviews.gym_id = ? order by reviews.created_at desc`).all(gymId) as unknown as ReviewRow[];
        const reviews = rows.map(toReview);
        return send(res, 200, {
          reviews: publishedReviews(reviews),
          mine: account ? reviews.filter((review) => review.authorId === account.id && review.status !== 'published') : [],
        });
      }

      if (method === 'POST') {
        const { account, user } = requireAccount(req);
        requirePermission(user, 'review.create', gymId);
        const body = (await readJson(req)) as Record<string, unknown>;
        const overall = Number(body.overall);
        const text = typeof body.body === 'string' ? body.body.trim() : '';
        const visitedOn = typeof body.visitedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.visitedOn) ? body.visitedOn : null;
        if (!Number.isInteger(overall) || overall < 1 || overall > 5) throw new HttpError(400, 'Pick a rating from 1 to 5 stars.');
        if (text.length < 10) throw new HttpError(400, 'Say a little more: at least 10 characters.');
        if (text.length > 2000) throw new HttpError(400, 'Keep it under 2,000 characters.');
        const existing = db
          .prepare(`select 1 from reviews where gym_id = ? and user_id = ? and status in ('pending', 'published')`)
          .get(gymId, account.id);
        if (existing) throw new HttpError(409, 'You’ve already reviewed this gym.');
        const id = randomUUID();
        db.prepare(
          `insert into reviews (id, gym_id, user_id, overall, body, visited_on, status, created_at) values (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        ).run(id, gymId, account.id, overall, text, visitedOn, now().toISOString());
        const row = db.prepare(`${REVIEW_SELECT} where reviews.id = ?`).get(id) as unknown as ReviewRow;
        return send(res, 201, { review: toReview(row) });
      }
    }

    // --- Moderation --------------------------------------------------------
    if (method === 'GET' && path === '/api/moderation/reviews') {
      const { user } = requireAccount(req);
      requirePermission(user, 'moderation.view_queue');
      const rows = db.prepare(`${REVIEW_SELECT} where reviews.status = 'pending' order by reviews.created_at`).all() as unknown as ReviewRow[];
      return send(res, 200, { reviews: rows.map(toReview) });
    }

    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'moderation' && parts[2] === 'reviews' && parts.length === 4) {
      const { user } = requireAccount(req);
      requirePermission(user, 'review.moderate');
      const body = (await readJson(req)) as Record<string, unknown>;
      const decision = body.decision;
      if (decision !== 'publish' && decision !== 'reject') throw new HttpError(400, 'Decide publish or reject.');
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : null;
      if (decision === 'reject' && !reason) throw new HttpError(400, 'Give a reason when rejecting.');
      const result = db
        .prepare(
          `update reviews set status = ?, moderation_reason = ?, moderated_at = ?, moderated_by = ? where id = ? and status = 'pending'`,
        )
        .run(decision === 'publish' ? 'published' : 'rejected', reason, now().toISOString(), user.id, decodeURIComponent(parts[3]!));
      if (result.changes === 0) throw new HttpError(404, 'No pending review with that id.');
      return send(res, 204);
    }

    throw new HttpError(404, 'Not found.');
  }

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin, options.allowedOrigins)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return send(res, 204);

    try {
      await route(req, res);
    } catch (error) {
      if (error instanceof HttpError || error instanceof AuthInputError) {
        return send(res, error.status, { error: error.message });
      }
      console.error(error);
      send(res, 500, { error: 'Something went wrong on the server.' });
    }
  };
}
