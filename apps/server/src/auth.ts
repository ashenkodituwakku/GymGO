/**
 * Accounts and sessions.
 *
 * Passwords are hashed with scrypt (Node's built-in, memory-hard) and a
 * per-password salt. Sessions are random 256-bit tokens; the database keeps
 * only their SHA-256, so a copied database file doesn't hand out logins.
 * Tokens travel in an `Authorization: Bearer` header, which works the same
 * for the phone app and the browser.
 */

import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Role, User } from '@gymgo/domain';
import type { Db } from './db';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(actual, expected);
}

// Checked against when an email isn't registered, so a login attempt takes
// the same time whether or not the account exists.
const DUMMY_HASH = hashPassword(randomBytes(12).toString('base64'));

export interface AccountRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  role: Role;
  blocked: number;
  created_at: string;
}

export function toUser(row: AccountRow): User {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    ownedGymIds: [],
    blocked: row.blocked === 1,
    createdAt: row.created_at,
  };
}

/** What the signed-in person sees about themselves. */
export function publicAccount(row: AccountRow) {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role, createdAt: row.created_at };
}

export class AuthInputError extends Error {
  readonly status = 400;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(input: unknown): { email: string; password: string; displayName: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().replace(/\s+/g, ' ') : '';
  if (!EMAIL.test(email) || email.length > 254) throw new AuthInputError('That email address doesn’t look right.');
  if (password.length < 8) throw new AuthInputError('Use at least 8 characters for your password.');
  if (password.length > 200) throw new AuthInputError('That password is too long.');
  if (displayName.length < 1 || displayName.length > 40) throw new AuthInputError('Add a name between 1 and 40 characters.');
  return { email, password, displayName };
}

export function createAccount(db: Db, input: { email: string; password: string; displayName: string }, now = new Date()): AccountRow | null {
  const existing = db.prepare('select 1 from users where email = ?').get(input.email);
  if (existing) return null;
  const row: AccountRow = {
    id: randomUUID(),
    email: input.email,
    display_name: input.displayName,
    password_hash: hashPassword(input.password),
    role: 'member',
    blocked: 0,
    created_at: now.toISOString(),
  };
  db.prepare(
    'insert into users (id, email, display_name, password_hash, role, blocked, created_at) values (?, ?, ?, ?, ?, ?, ?)',
  ).run(row.id, row.email, row.display_name, row.password_hash, row.role, row.blocked, row.created_at);
  return row;
}

export function findByEmail(db: Db, email: string): AccountRow | undefined {
  return db.prepare('select * from users where email = ?').get(email.trim().toLowerCase()) as AccountRow | undefined;
}

/** Returns the account when the password matches, otherwise null. */
export function checkLogin(db: Db, email: string, password: string): AccountRow | null {
  const row = findByEmail(db, email);
  if (!row) {
    verifyPassword(password, DUMMY_HASH);
    return null;
  }
  return verifyPassword(password, row.password_hash) ? row : null;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function startSession(db: Db, userId: string, now = new Date()): string {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  db.prepare('insert into sessions (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)').run(
    sha256(token),
    userId,
    now.toISOString(),
    expires.toISOString(),
  );
  return token;
}

export function endSession(db: Db, token: string): void {
  db.prepare('delete from sessions where token_hash = ?').run(sha256(token));
}

export function accountForToken(db: Db, token: string, now = new Date()): AccountRow | null {
  const row = db
    .prepare(
      `select users.* from sessions join users on users.id = sessions.user_id
       where sessions.token_hash = ? and sessions.expires_at > ?`,
    )
    .get(sha256(token), now.toISOString()) as AccountRow | undefined;
  return row ?? null;
}

/**
 * A small in-memory limit on sign-in attempts per address and email, so a
 * password can't be guessed at speed. Resets when the server restarts, which
 * is fine for one machine; a hosted deployment would want a shared store.
 */
export class AttemptLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly max = 10,
    private readonly windowMs = 15 * 60_000,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.attempts.get(key) ?? []).filter((at) => now - at < this.windowMs);
    if (recent.length >= this.max) {
      this.attempts.set(key, recent);
      return false;
    }
    recent.push(now);
    this.attempts.set(key, recent);
    return true;
  }
}
