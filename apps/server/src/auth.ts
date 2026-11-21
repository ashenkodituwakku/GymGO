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
  /** Your profile picture's file, if you've set one (null or missing: none). */
  avatar_id?: string | null;
  avatar_type?: 'jpeg' | 'png' | null;
  /** The version of the terms (LEGAL_VERSION) this account last agreed to; null for accounts made before there were any. */
  terms_version?: string | null;
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
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
    hasPassword: hasPassword(row),
    avatarUrl: row.avatar_id ? `/api/avatars/${row.avatar_id}` : null,
    termsVersion: row.terms_version ?? null,
  };
}

/** Accounts made with Google or Apple have no password until one is set. */
export const hasPassword = (row: AccountRow) => row.password_hash !== '';

export class AuthInputError extends Error {
  readonly status: number = 400;
}

/**
 * GymGO accounts are for people 13 and over: in the US, collecting anything
 * from a child under 13 needs verified parental consent (COPPA), which GymGO
 * doesn't have. Browsing needs no account and collects nothing, so it's open
 * to everyone.
 */
export const MINIMUM_AGE = 13;

export class TooYoungError extends AuthInputError {
  override readonly status = 403;
  readonly code = 'too_young';
}

export class TermsNeededError extends AuthInputError {
  readonly code = 'terms_needed';
}

/** A new account agrees to the terms and privacy policy first: the app sends `acceptTerms: true` once the box is ticked. */
export function checkTermsAccepted(acceptTerms: unknown): void {
  if (acceptTerms !== true) throw new TermsNeededError('To make an account, agree to the Terms of Service and Privacy Policy.');
}

/**
 * The age check made before any account is created. It asks the month and
 * year someone was born (a neutral question, which doesn't say what answer
 * gets in) and counts their birthday as the last day of that month, so it
 * never lets in anyone even a day short. The answer isn't kept; only when
 * the check was made is.
 */
export function checkAge(birthMonth: unknown, now: Date): void {
  const match = typeof birthMonth === 'string' ? /^(\d{4})-(\d{2})$/.exec(birthMonth.trim()) : null;
  const year = match ? Number(match[1]) : NaN;
  const month = match ? Number(match[2]) : NaN;
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1;
  if (!match || month < 1 || month > 12 || year < thisYear - 120 || year > thisYear || (year === thisYear && month > thisMonth)) {
    throw new AuthInputError('Enter the month and year you were born.');
  }
  // Whole years, counting this year's birthday only once its month is over.
  const age = thisYear - year - (thisMonth > month ? 0 : 1);
  if (age < MINIMUM_AGE) throw new TooYoungError(`GymGO accounts are for people ${MINIMUM_AGE} and over.`);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The commonest passwords of 8 characters or more in public breach lists:
 * the first ones anyone guessing tries, so GymGO turns them down (as NIST's
 * guidance on passwords advises) rather than asking for symbols and numbers.
 */
const COMMON_PASSWORDS = new Set(
  (
    'password password1 password12 password123 password! passw0rd p@ssw0rd p@ssword password2 changeme changeme1 ' +
    '12345678 123456789 1234567890 0123456789 87654321 987654321 11111111 00000000 88888888 99999999 999999999 ' +
    '12341234 12121212 11223344 123123123 147258369 1q2w3e4r 1q2w3e4r5t 1qaz2wsx zaq12wsx q1w2e3r4 1234qwer 123qweasd qazwsxedc ' +
    'qwertyui qwertyuiop qwerty123 qwerty12 qwerty1234 asdfghjk asdfghjkl zxcvbnm1 abcd1234 abc12345 abcdefgh aa123456 ' +
    'iloveyou iloveyou1 sunshine princess football baseball basketball superman batman123 starwars whatever trustno1 ' +
    'letmein1 letmein! welcome1 welcome123 admin123 administrator computer internet monkey123 dragon123 master123 ' +
    'shadow123 michael1 jennifer michelle jordan23 liverpool chelsea1 arsenal1 chocolate butterfly pokemon1 minecraft ' +
    'fortnite secret123 gymgo123 gymgogym workout1 fitness1 bodybuilding gymrat123'
  ).split(' '),
);

/** Why a new password is too easy to guess, or null if it isn't. */
export function weakPasswordReason(password: string, email?: string): string | null {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return 'That’s one of the most common passwords, so it’s the first anyone would try. Choose another.';
  if (/^(.)\1+$/.test(password)) return 'One character over and over is quick to guess. Choose another password.';
  if (email) {
    const address = email.trim().toLowerCase();
    const name = address.split('@')[0] ?? '';
    if (lower === address || (name.length >= 4 && lower === name)) return 'Don’t use your email address as your password.';
  }
  return null;
}

export function validateSignup(input: unknown): { email: string; password: string; displayName: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().replace(/\s+/g, ' ') : '';
  if (!EMAIL.test(email) || email.length > 254) throw new AuthInputError('That email address doesn’t look right.');
  if (password.length < 8) throw new AuthInputError('Use at least 8 characters for your password.');
  if (password.length > 200) throw new AuthInputError('That password is too long.');
  if (displayName.length < 1 || displayName.length > 40) throw new AuthInputError('Add a name between 1 and 40 characters.');
  const weak = weakPasswordReason(password, email);
  if (weak) throw new AuthInputError(weak);
  return { email, password, displayName };
}

/** A display name, tidied, or an error saying what's wrong with it. */
export function validateDisplayName(input: unknown): string {
  const name = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 1 || name.length > 40) throw new AuthInputError('Add a name between 1 and 40 characters.');
  return name;
}

/** A new password, or an error saying what's wrong with it. */
export function validateNewPassword(input: unknown, email?: string): string {
  const password = typeof input === 'string' ? input : '';
  if (password.length < 8) throw new AuthInputError('Use at least 8 characters for your password.');
  if (password.length > 200) throw new AuthInputError('That password is too long.');
  const weak = weakPasswordReason(password, email);
  if (weak) throw new AuthInputError(weak);
  return password;
}

/** Sign out everywhere except the session in use. */
export function endOtherSessions(db: Db, userId: string, keepToken: string): void {
  db.prepare('delete from sessions where user_id = ? and token_hash != ?').run(userId, sha256(keepToken));
}

export function createAccount(
  db: Db,
  input: { email: string; password: string | null; displayName: string; ageCheckedAt?: string | null; termsVersion?: string | null },
  now = new Date(),
): AccountRow | null {
  const existing = db.prepare('select 1 from users where email = ?').get(input.email);
  if (existing) return null;
  const row: AccountRow = {
    id: randomUUID(),
    email: input.email,
    display_name: input.displayName,
    password_hash: input.password === null ? '' : hashPassword(input.password),
    role: 'member',
    blocked: 0,
    created_at: now.toISOString(),
    terms_version: input.termsVersion ?? null,
  };
  db.prepare(
    `insert into users (id, email, display_name, password_hash, role, blocked, created_at, age_checked_at, terms_version, terms_accepted_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.email,
    row.display_name,
    row.password_hash,
    row.role,
    row.blocked,
    row.created_at,
    input.ageCheckedAt ?? null,
    row.terms_version ?? null,
    row.terms_version ? row.created_at : null,
  );
  return row;
}

export function findByEmail(db: Db, email: string): AccountRow | undefined {
  return db.prepare('select * from users where email = ?').get(email.trim().toLowerCase()) as AccountRow | undefined;
}

/** Returns the account when the password matches, otherwise null. */
export function checkLogin(db: Db, email: string, password: string): AccountRow | null {
  const row = findByEmail(db, email);
  if (!row || !hasPassword(row)) {
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

// --- Forgotten passwords -----------------------------------------------------

/** How long a link to choose a new password works. */
export const RESET_MINUTES = 30;

/**
 * A one-time link to choose a new password, emailed to the account's
 * address. Like sign-ins, only the token's hash is kept; asking again
 * replaces any earlier link.
 */
export function startPasswordReset(db: Db, userId: string, now = new Date()): string {
  const token = randomBytes(32).toString('base64url');
  db.prepare('delete from password_resets where user_id = ?').run(userId);
  db.prepare('insert into password_resets (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)').run(
    sha256(token),
    userId,
    now.toISOString(),
    new Date(now.getTime() + RESET_MINUTES * 60_000).toISOString(),
  );
  return token;
}

/** The account a reset link is for, while it still works. */
export function accountForResetToken(db: Db, token: string, now = new Date()): AccountRow | null {
  if (!token || token.length > 200) return null;
  const row = db
    .prepare(
      `select users.* from password_resets join users on users.id = password_resets.user_id
       where password_resets.token_hash = ? and password_resets.expires_at > ?`,
    )
    .get(sha256(token), now.toISOString()) as AccountRow | undefined;
  return row ?? null;
}

/**
 * Sets the new password from a reset link, once: the link stops working,
 * and every device signed in to the account is signed out.
 */
export function finishPasswordReset(db: Db, token: string, newPassword: string, now = new Date()): AccountRow | null {
  const account = accountForResetToken(db, token, now);
  if (!account) return null;
  db.exec('begin');
  try {
    db.prepare('update users set password_hash = ? where id = ?').run(hashPassword(newPassword), account.id);
    db.prepare('delete from password_resets where user_id = ?').run(account.id);
    db.prepare('delete from sessions where user_id = ?').run(account.id);
    db.exec('commit');
  } catch (error) {
    db.exec('rollback');
    throw error;
  }
  return account;
}

/** Sign-ins and reset links past their date are only taking up room. */
export function forgetExpired(db: Db, now = new Date()): void {
  db.prepare('delete from sessions where expires_at <= ?').run(now.toISOString());
  db.prepare('delete from password_resets where expires_at <= ?').run(now.toISOString());
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
 * A small in-memory limit on attempts per key (an address, an email, an
 * account), so a password can't be guessed at speed and nobody can flood the
 * server. It resets when the server restarts, which is fine for one server.
 * Keys are forgotten once their window has passed (see `sweep`), so memory
 * stays bounded however many addresses call, and addresses aren't held
 * longer than the privacy policy says.
 */
export class AttemptLimiter {
  private readonly attempts = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(
    private readonly max = 10,
    private readonly windowMs = 15 * 60_000,
  ) {}

  /** How many keys it's holding. */
  get size(): number {
    return this.attempts.size;
  }

  /** Forgets every key with no attempt left inside the window. */
  sweep(now = Date.now()): void {
    this.lastSweep = now;
    for (const [key, times] of this.attempts) {
      if (times.length === 0 || now - times[times.length - 1]! >= this.windowMs) this.attempts.delete(key);
    }
  }

  allow(key: string, now = Date.now()): boolean {
    if (now - this.lastSweep >= 60_000 || this.attempts.size > 20_000) this.sweep(now);
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
