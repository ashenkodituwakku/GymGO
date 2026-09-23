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
 *   GET    /api/gyms/:gymId/photos        published photos, plus your own waiting ones
 *   POST   /api/gyms/:gymId/photos        { data (base64 JPEG/PNG), consent: true } -> held for moderation
 *   GET    /api/photos/covers             { gymId: url } of each gym's newest published photo
 *   GET    /api/photos/:id                a published photo's image
 *   GET    /api/gyms/:gymId/google        live Google Maps details (only with the owner's key)
 *   GET    /api/moderation/reviews        moderators: the queue
 *   POST   /api/moderation/reviews/:id    moderators: { decision, reason? }
 *   GET    /api/moderation/photos         moderators: photos waiting
 *   POST   /api/moderation/photos/:id     moderators: { decision, reason? }
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
import { allGyms, gymExists, gymIsDemo, type Db } from './db';
import { GoogleError, GooglePlaces } from './google';
import { MAX_PHOTO_BYTES, PhotoStore, cleanPhoto, type PhotoType } from './photos';

export interface AppOptions {
  db: Db;
  /** Extra browser origins to allow, beyond localhost and the local network. */
  allowedOrigins?: string[];
  attribution: string;
  now?: () => Date;
  /** New accounts allowed per address per hour. */
  signupsPerHour?: number;
  /** Where photo files are kept; null keeps them in memory (tests). */
  photoDir?: string | null;
  /** The owner's Google Places key, if they chose to set one. */
  googleKey?: string | null;
  /** Swappable for tests, so no test ever calls Google. */
  fetchImpl?: typeof fetch;
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

async function readJson(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) throw new HttpError(413, 'That request is too large.');
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
  const photoLimiter = new AttemptLimiter(20, 24 * 60 * 60_000);
  const photos = new PhotoStore(options.photoDir ?? null);
  const google = new GooglePlaces(db, options.googleKey ?? null, options.fetchImpl);

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
        // Sessions, saved gyms, reviews and photo records go with it (foreign
        // keys cascade); the photo files are removed here.
        const owned = db.prepare('select id, type from photos where user_id = ?').all(account.id) as Array<{ id: string; type: PhotoType }>;
        for (const photo of owned) photos.remove(photo.id, photo.type);
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

    // --- Photos ------------------------------------------------------------
    if (parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'photos' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');

      if (method === 'GET') {
        const { account } = caller(req);
        const rows = db
          .prepare(
            `select photos.id, photos.status, photos.created_at, photos.user_id, users.display_name
             from photos join users on users.id = photos.user_id
             where photos.gym_id = ? order by photos.created_at desc`,
          )
          .all(gymId) as Array<{ id: string; status: string; created_at: string; user_id: string; display_name: string }>;
        return send(res, 200, {
          photos: rows
            .filter((row) => row.status === 'published')
            .map((row) => ({ id: row.id, url: `/api/photos/${row.id}`, credit: row.display_name, createdAt: row.created_at })),
          mine: account
            ? rows
                .filter((row) => row.user_id === account.id && row.status !== 'published')
                .map((row) => ({ id: row.id, status: row.status, createdAt: row.created_at }))
            : [],
        });
      }

      if (method === 'POST') {
        const { account, user } = requireAccount(req);
        requirePermission(user, 'review.create', gymId);
        if (gymIsDemo(db, gymId)) throw new HttpError(400, 'This is an invented demo gym, so there\u2019s nothing real to photograph.');
        // Base64 inflates by a third; allow for that plus the JSON around it.
        const body = (await readJson(req, Math.ceil(MAX_PHOTO_BYTES * 1.4) + 1024)) as Record<string, unknown>;
        if (body.consent !== true) {
          throw new HttpError(400, 'Confirm you took this photo and are happy for GymGO to show it.');
        }
        if (typeof body.data !== 'string' || body.data.length === 0) throw new HttpError(400, 'No photo was attached.');
        const raw = Buffer.from(body.data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
        if (raw.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'Photos can be up to 4 MB.');
        const clean = cleanPhoto(raw);
        if (!clean) throw new HttpError(400, 'That isn\u2019t a JPEG or PNG photo we can read.');
        if (!photoLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That\u2019s a lot of photos for one day. Try again tomorrow.');
        const id = randomUUID();
        photos.save(id, clean.type, clean.bytes);
        db.prepare(`insert into photos (id, gym_id, user_id, type, bytes, status, created_at) values (?, ?, ?, ?, ?, 'pending', ?)`).run(
          id,
          gymId,
          account.id,
          clean.type,
          clean.bytes.length,
          now().toISOString(),
        );
        return send(res, 201, { photo: { id, status: 'pending' } });
      }
    }

    if (method === 'GET' && path === '/api/photos/covers') {
      // The newest published photo of each gym, for the list's thumbnails.
      const rows = db
        .prepare(
          `select gym_id, id from photos p where status = 'published'
           and created_at = (select max(created_at) from photos where gym_id = p.gym_id and status = 'published')`,
        )
        .all() as Array<{ gym_id: string; id: string }>;
      return send(res, 200, { covers: Object.fromEntries(rows.map((row) => [row.gym_id, `/api/photos/${row.id}`])) });
    }

    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'photos' && parts.length === 3) {
      const row = db.prepare(`select id, type from photos where id = ? and status = 'published'`).get(decodeURIComponent(parts[2]!)) as
        | { id: string; type: PhotoType }
        | undefined;
      const bytes = row ? photos.read(row.id, row.type) : null;
      if (!row || !bytes) throw new HttpError(404, 'No such photo.');
      res.statusCode = 200;
      res.setHeader('Content-Type', row.type === 'jpeg' ? 'image/jpeg' : 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(bytes);
      return;
    }

    // --- Google Maps (live, only with the owner's key) ----------------------
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'google' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      const record = allGyms(db).find((item) => item.location.id === gymId);
      if (!record) throw new HttpError(404, 'No gym with that id.');
      try {
        return send(res, 200, await google.lookup(record));
      } catch (error) {
        if (error instanceof GoogleError) throw new HttpError(error.status, error.message);
        throw new HttpError(502, 'Couldn\u2019t reach Google Maps.');
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

    if (method === 'GET' && path === '/api/moderation/photos') {
      const { user } = requireAccount(req);
      requirePermission(user, 'moderation.view_queue');
      const rows = db
        .prepare(
          `select photos.id, photos.gym_id, photos.type, photos.created_at, users.display_name
           from photos join users on users.id = photos.user_id
           where photos.status = 'pending' order by photos.created_at limit 20`,
        )
        .all() as Array<{ id: string; gym_id: string; type: PhotoType; created_at: string; display_name: string }>;
      return send(res, 200, {
        // Waiting photos aren't public, so the moderator gets them inline.
        photos: rows.map((row) => {
          const bytes = photos.read(row.id, row.type);
          return {
            id: row.id,
            gymId: row.gym_id,
            credit: row.display_name,
            createdAt: row.created_at,
            dataUrl: bytes ? `data:image/${row.type};base64,${bytes.toString('base64')}` : null,
          };
        }),
      });
    }

    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'moderation' && parts[2] === 'photos' && parts.length === 4) {
      const { user } = requireAccount(req);
      requirePermission(user, 'review.moderate');
      const body = (await readJson(req)) as Record<string, unknown>;
      const decision = body.decision;
      if (decision !== 'publish' && decision !== 'reject') throw new HttpError(400, 'Decide publish or reject.');
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : null;
      if (decision === 'reject' && !reason) throw new HttpError(400, 'Give a reason when rejecting.');
      const photoId = decodeURIComponent(parts[3]!);
      const pending = db.prepare(`select type from photos where id = ? and status = 'pending'`).get(photoId) as { type: PhotoType } | undefined;
      if (!pending) throw new HttpError(404, 'No pending photo with that id.');
      db.prepare(`update photos set status = ?, moderation_reason = ?, moderated_at = ?, moderated_by = ? where id = ?`).run(
        decision === 'publish' ? 'published' : 'rejected',
        reason,
        now().toISOString(),
        user.id,
        photoId,
      );
      // A rejected photo is never shown, so its file isn't kept. The record
      // stays, with the reason, so the uploader can see what happened.
      if (decision === 'reject') photos.remove(photoId, pending.type);
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
