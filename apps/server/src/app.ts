/**
 * The HTTP API.
 *
 *   GET    /api/health
 *   GET    /api/gyms                      every gym record, with its sources
 *   GET    /api/gyms/:gymId               one gym's record, including ones found by searching an area
 *   GET    /api/area?south&west&north&east&home  gyms on OpenStreetMap in that box, read live and kept; outside `home`, Pro only
 *   GET    /api/country/:cc/pack?home     every gym in a country, gzipped, for the app to keep (202 while it's built)
 *   GET    /api/country/:cc/pack/status?home  whether that pack is ready, and its size
 *   GET    /api/places?q=                 towns and suburbs in AU and the US by name (for search on submit)
 *   POST   /api/auth/signup               { email, password, displayName, birthMonth: 'YYYY-MM' } (13 and over)
 *   POST   /api/auth/login                { email, password }
 *   POST   /api/auth/logout
 *   GET    /api/auth/providers            which of Google and Apple sign-in are on, and Google's client ids
 *   POST   /api/auth/google               { idToken, nonce, birthMonth? } -> signed in (the account is made the first time, 13 and over)
 *   POST   /api/auth/apple                { idToken, nonce, name? } -> signed in (likewise)
 *   GET    /api/me/identities             how you can sign in: password, Google, Apple
 *   POST   /api/me/identities/:provider   { idToken, nonce } -> Google or Apple connected to this account
 *   DELETE /api/me/identities/:provider   disconnected (never the last way in)
 *   GET    /api/me                        the signed-in account
 *   DELETE /api/me                        delete the account and its data
 *   GET    /api/saved                     { gymIds }
 *   PUT    /api/saved/:gymId
 *   DELETE /api/saved/:gymId
 *   GET    /api/me/export                 everything held about you, as a JSON file
 *   PATCH  /api/me                        { displayName } -> your account, renamed
 *   POST   /api/me/password               { currentPassword, newPassword } -> changed; other devices signed out
 *   PUT    /api/me/avatar                 { data (base64 JPEG/PNG) } -> your account, with its new profile picture
 *   DELETE /api/me/avatar                 your account, with no profile picture
 *   GET    /api/avatars/:id               a profile picture (the id is random and changes with each picture)
 *   GET    /api/gyms/:gymId/reviews       published reviews, plus your own
 *   POST   /api/gyms/:gymId/reviews       { overall, body, visitedOn? } -> held for moderation
 *   GET    /api/gyms/:gymId/photos        published photos, plus your own waiting ones
 *   POST   /api/gyms/:gymId/photos        { data (base64 JPEG/PNG), consent: true } -> held for moderation
 *   GET    /api/photos/covers             { gymId: url } of each gym's newest published photo
 *   GET    /api/photos/:id                a published photo's image
 *   GET    /api/gyms/:gymId/equipment     what members say the gym has, tallied (plus your own)
 *   PUT    /api/gyms/:gymId/equipment     { items: [{ equipmentTypeId, presence, maxWeightKg? }] } -> your report
 *   GET    /api/equipment/reported?types= { gymId: { typeId: { yes, no, maxWeightKg } } } for the gyms members say have any of them
 *   GET    /api/gyms/:gymId/prices        what members paid for a casual visit: count, typical, range (plus yours)
 *   PUT    /api/gyms/:gymId/prices        { amountMinor, paidOn } -> your report (replaces your last)
 *   DELETE /api/gyms/:gymId/prices        take back your report
 *   GET    /api/prices/typical            { gymId: { typicalMinor, count } } for every gym members have priced
 *   GET    /api/reviews/ratings           { gymId: { average, count } } from published reviews, for every gym that has any
 *   GET    /api/gyms/:gymId/access        how visiting went for members: walked in / booked first / turned away
 *   PUT    /api/gyms/:gymId/access        { outcome, visitedOn } -> your report (replaces your last)
 *   DELETE /api/gyms/:gymId/access        take back your report
 *   GET    /api/gyms/:gymId/status        whether members say it has closed: closed / still open counts
 *   PUT    /api/gyms/:gymId/status        { status: 'closed' | 'open', seenOn } -> your report (replaces your last)
 *   DELETE /api/gyms/:gymId/status        take back your report
 *   GET    /api/gyms/:gymId/busy          how busy members at the gym say it is now: a level once 3 said so in the last hour (plus yours)
 *   PUT    /api/gyms/:gymId/busy          { level: 'quiet' | 'steady' | 'busy' | 'packed' } -> your report (replaces your last)
 *   DELETE /api/gyms/:gymId/busy          take back your report
 *   GET    /api/gyms/:gymId/owner         whether a verified owner runs it, its approved updates, and (signed in) your claim and submissions
 *   POST   /api/gyms/:gymId/claim         { roleTitle, contact, evidence } -> a claim, for an admin to check
 *   POST   /api/gyms/:gymId/owner-updates the gym's owner: { kind: 'visitor_hours', alwaysOpen, windows } or { kind: 'casual_price', amountMinor, anyoneCanBuy, photoIdRequired } -> waits for a moderator
 *   GET    /api/gyms/:gymId/google        live Google Maps details (only with the owner's key)
 *   GET    /api/gyms/:gymId/icon          the icon from the gym's own website, or its chain's (PNG/JPEG/WebP/GIF), or 404
 *   GET    /api/gyms/:gymId/photo         the photo the gym's own website shares (JPEG/PNG/WebP), or 404
 *   GET    /api/billing/plans             GymGO Pro's prices, and whether it's on sale
 *   GET    /api/billing                   your plan (Free or Pro) and subscription
 *   POST   /api/billing/checkout          { interval, currency, returnUrl } -> { url } of Stripe Checkout
 *   POST   /api/billing/portal            { returnUrl } -> { url } of Stripe's page to manage or cancel
 *   POST   /api/billing/gift              { currency, returnUrl } -> { url } of Stripe Checkout for a year of Pro as a gift code
 *   GET    /api/billing/gifts             the gift codes you bought, and whether they've been used
 *   POST   /api/billing/redeem            { code } -> a year of Pro (after any gift still running); your plan
 *   GET    /api/billing/duo               your Duo: who's on it, and whether you can add someone
 *   PUT    /api/billing/duo               Duo subscribers: { code } (their friend code) -> adds or swaps your one more person
 *   DELETE /api/billing/duo               take your person off, or leave someone's Duo
 *   GET    /api/gyms/:gymId/passes        day passes GymGO has agreed with the gym (none until the owner adds one)
 *   POST   /api/passes/:id/book           { forDate, returnUrl } -> { url } of Stripe Checkout: the pass and GymGO's fee
 *   GET    /api/passes/mine               your paid day passes, with the code to show
 *   POST   /api/admin/passes              admins: { gymId, label, priceMinor, feeMinor, currency } -> a partner day pass
 *   DELETE /api/admin/passes/:id          admins: take a pass off sale
 *   POST   /api/billing/sync              re-read your subscription from Stripe
 *   GET    /api/billing/return            where Stripe sends people back to; forwards them into the app
 *   POST   /api/billing/webhook           Stripe's events (signature checked)
 *   GET    /api/workouts                  your saved workouts
 *   POST   /api/workouts                  Pro: { name, gymId?, plan } -> saved
 *   DELETE /api/workouts/:id
 *   GET    /api/training                  the sessions you've logged, newest first
 *   POST   /api/training                  { name, unit, startedAt, finishedAt, workoutId?, gymId?, exercises } -> logged (sent again: the one already logged)
 *   DELETE /api/training/:id
 *   GET    /api/collection                your gym collection (gyms checked in at, and the days) and when it was last reset
 *   PUT    /api/collection                { gyms, resetAt } -> merged into the account's (never overwritten); 409 when reset elsewhere since
 *   DELETE /api/collection                reset: every gym and visit removed, and the reset remembered
 *   GET    /api/friends                   your friend code, friends (with totals), requests both ways, invites to train, whether you're on the leaderboard
 *   POST   /api/friends                   { code } -> asks them (or, if they'd asked you, you're friends)
 *   POST   /api/friends/:id/accept        accept their request
 *   DELETE /api/friends/:id               unfriend, turn down, or take back a request (their invites go too)
 *   GET    /api/friends/:id/collection    a friend's cards (look and visit count, no days) and totals
 *   POST   /api/friends/:id/invites       { gymId, gymName, at, note? } -> an invite to train
 *   POST   /api/invites/:id               { answer: 'yes' | 'no' } -> your answer to an invite
 *   DELETE /api/invites/:id               take back an invite you sent
 *   PUT    /api/me/leaderboard            { join } -> on or off the public leaderboard
 *   GET    /api/leaderboard?scope=everyone|friends&city=&country=   ranked by gyms, then visits
 *   GET    /api/moderation/reviews        moderators: the queue
 *   POST   /api/moderation/reviews/:id    moderators: { decision, reason? }
 *   GET    /api/moderation/photos         moderators: photos waiting
 *   POST   /api/moderation/photos/:id     moderators: { decision, reason? }
 *   GET    /api/moderation/member-reports moderators: the latest price and visit reports, with who sent them
 *   GET    /api/moderation/counts         moderators: how many of each are waiting
 *   GET    /api/moderation/claims         admins: gym claims waiting, with their evidence
 *   POST   /api/moderation/claims/:id     admins: { decision: 'approve' | 'reject', reason? }
 *   GET    /api/moderation/owner-updates  moderators: owners' submissions waiting
 *   POST   /api/moderation/owner-updates/:id  moderators: { decision: 'approve' | 'reject', reason? }
 *   GET    /api/legal                     who runs GymGO, the terms' version, and the copyright agent once registered
 *   GET    /terms /privacy /refunds /community /legal   the legal documents, as public pages
 *   GET    /.well-known/security.txt      where to report a security problem (once GYMGO_CONTACT_EMAIL is set)
 *   POST   /api/me/terms                  signed in: { version } -> agree to the terms as they are now
 *   POST   /api/auth/forgot               { email } -> emails a link to choose a new password (same answer for any address)
 *   GET    /reset-password?token=         the page that link opens; POST it to set the new password
 *   POST   /api/bug-reports               anyone: { description, topic?: 'bug' | 'copyright', replyTo?, context? } -> kept, and emailed to the team
 *   GET    /api/moderation/bug-reports    moderators: the latest bug reports, and whether each was emailed
 *   DELETE /api/moderation/member-reports/:kind/:gymId/:userId   moderators: remove one
 *
 * Every route that changes something re-checks permission here with the
 * shared domain rules. The app hiding a button is not access control.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  applyOwnerUpdates,
  BUSY_MINIMUM,
  BUSY_WINDOW_MINUTES,
  busyNow,
  isBusyLevel,
  type BusyLevel,
  ANONYMOUS,
  DEFAULT_OPERATOR,
  LEGAL_UPDATED,
  LEGAL_VERSION,
  isLegalDocId,
  type LegalDocId,
  type LegalOperator,
  EQUIPMENT_TYPES,
  LIMITS,
  can,
  priceLabel,
  publishedReviews,
  reportCurrency,
  visitPriceRange,
  type BillingCurrency,
  type BillingInterval,
  type GymRecord,
  type Permission,
  type Review,
  type User,
  chainSiteFor,
  COLLECTION_MAX_GYMS,
  cleanCollectedGym,
  mergeCollectedGym,
  type CollectedGym,
} from '@gymgo/domain';
import {
  AttemptLimiter,
  AuthInputError,
  TermsNeededError,
  TooYoungError,
  accountForToken,
  checkTermsAccepted,
  RESET_MINUTES,
  accountForResetToken,
  findByEmail,
  finishPasswordReset,
  forgetExpired,
  startPasswordReset,
  checkAge,
  checkLogin,
  createAccount,
  endOtherSessions,
  endSession,
  hasPassword,
  hashPassword,
  publicAccount,
  startSession,
  toUser,
  validateDisplayName,
  validateNewPassword,
  validateSignup,
  verifyPassword,
  type AccountRow,
} from './auth';
import { DEV_PRO_EMAIL, matchesDevPassword } from './devAccount';
import { legalIndexPage, legalPage, resetEmail, resetPasswordPage, securityTxt } from './legalPages';
import { Billing, BillingError, returnPage, safeReturnUrl, withQuery, type StripeApi } from './billing';
import { AreaError, AreaSearch, parseBox, whereIs } from './area';
import { CountryPacks } from './countryPack';
import { PlaceError, PlaceSearch } from './places';
import { SiteIcons, SitePhotos, chainWebsites, ownPhotoSites, type SafeGet } from './siteicons';
import { allGyms, gymCountry, gymExists, gymIsDemo, gymRecord, type Db } from './db';
import { GoogleError, GooglePlaces } from './google';
import { MAX_AVATAR_BYTES, MAX_PHOTO_BYTES, PhotoStore, cleanPhoto, type PhotoType } from './photos';
import { IdentityError, IdentityVerifier, label, type Provider, type VerifiedIdentity } from './identity';
import { BugReportError, BugReports, cleanBugReport } from './bugReports';
import { Social, SocialError } from './social';
import { OwnerError, Owners } from './owners';
import { PerkError, Perks } from './perks';
import type { SendMail } from './mail';

export interface AppOptions {
  db: Db;
  /** Extra browser origins to allow, beyond localhost and the local network. */
  allowedOrigins?: string[];
  attribution: string;
  now?: () => Date;
  /** New accounts allowed per address per hour. */
  signupsPerHour?: number;
  /**
   * Behind a reverse proxy (Caddy, in the hosting setup), every request
   * comes from the proxy; when true, the caller's own address is taken from
   * the X-Forwarded-For header the proxy sets. Only turn this on behind a
   * proxy, or anyone could claim any address (GYMGO_TRUST_PROXY).
   */
  trustProxy?: boolean;
  /** Sends account emails (password reset links); without it, passwords can't be reset by email. */
  mail?: SendMail | null;
  /** Where photo files are kept; null keeps them in memory (tests). */
  photoDir?: string | null;
  /** The owner's Google Places key, if they chose to set one. */
  googleKey?: string | null;
  /** Swappable for tests, so no test ever calls Google. */
  fetchImpl?: typeof fetch;
  /** Stripe, for GymGO Pro. Without a client, Pro isn't on sale. */
  billing?: { stripe: StripeApi | null; webhookSecret: string | null };
  /** This server's public address, once hosted. */
  publicUrl?: string | null;
  /** "Search this area": which Overpass API server to ask, and a stand-in fetch for tests. */
  area?: { endpoints?: string[]; fetchImpl?: typeof fetch; retryDelayMs?: number; log?: (line: string) => void };
  /** Country packs: the same Overpass settings as area searches, unless set. */
  packs?: { endpoints?: string[]; fetchImpl?: typeof fetch; retryDelayMs?: number; log?: (line: string) => void };
  /** Finding a town by name: which geocoder to ask, and a stand-in fetch for tests. */
  places?: { endpoint?: string; fetchImpl?: typeof fetch };
  /** Gyms' own website icons: on unless switched off; `get` stands in for the web in tests. */
  siteIcons?: { enabled?: boolean; get?: SafeGet };
  /** Sign in with Google and Apple: the client ids each accepts, and a stand-in fetch for their keys in tests. */
  signIn?: {
    google?: { web: string | null; ios: string | null; android: string | null };
    apple?: string[];
    fetchImpl?: typeof fetch;
  };
  /** Bug reports: how to email them (none: kept here only), who to, and how many a day at most. */
  bugReports?: {
    send?: SendMail | null;
    to?: string[];
    perDay?: number;
    log?: (line: string) => void;
    /** How often to retry reports that didn't go (and send any kept before email was set up); off unless set. */
    retryEveryMs?: number;
  };
  /** Legal contacts the app shows: the designated copyright (DMCA) agent, once registered. */
  legal?: {
    copyrightAgent?: { name: string; address: string | null; email: string | null } | null;
    /** Who runs GymGO, for the legal pages; by default "the GymGO team", with no contact address. */
    operator?: LegalOperator;
  };
  /**
   * True when this server made the dev Pro account (GYMGO_DEV_PRO=on, on a
   * computer, never a hosted server; see devAccount.ts). That account, and
   * only it, is then marked `devTools` for the app's testing shortcuts.
   */
  devAccount?: boolean;
}

/**
 * The routes open without an account. GymGO needs one for everything else:
 * a request without a signed-in session gets 401 "Sign in first", so a route
 * added later is closed unless it's listed here.
 *
 * Open: the health check; signing in, signing up and resetting a password;
 * the legal pages (the terms are read before an account is made); Stripe's
 * webhook and the page it sends people back to; Pro's price list; bug
 * reports, so someone who can't get in can still say so; and image files
 * (a photo, a profile picture, a gym's logo), which phones and browsers load
 * without the app's sign-in. Each of those images is reached only from a
 * signed-in page, and a profile picture's address is random.
 */
export function isPublicRoute(method: string, path: string): boolean {
  if (path === '/api/health' || path === '/api/legal' || path.startsWith('/api/auth/') || path === '/reset-password') return true;
  if (method === 'GET' && (path === '/legal' || isLegalDocId(path.slice(1)) || path === '/.well-known/security.txt')) return true;
  if ((method === 'POST' && path === '/api/billing/webhook') || (method === 'GET' && (path === '/api/billing/return' || path === '/api/billing/plans'))) return true;
  if (method === 'POST' && path === '/api/bug-reports') return true;
  if (method === 'GET' && (/^\/api\/avatars\/[^/]+$/.test(path) || (/^\/api\/photos\/[^/]+$/.test(path) && path !== '/api/photos/covers'))) return true;
  if (method === 'GET' && /^\/api\/gyms\/[^/]+\/(icon|photo)$/.test(path)) return true;
  return false;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** For the app to act on, e.g. `pro_required` opens the Pro screen. */
    readonly code?: string,
    /** Anything else the app needs to act on it, e.g. which country an area is in. */
    readonly detail?: Record<string, string>,
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

async function readRaw(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) throw new HttpError(413, 'That request is too large.');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

/** A saved workout, checked field by field: only what the app needs to show it again. */
function cleanWorkoutPlan(input: unknown) {
  const plan = (input ?? {}) as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === 'string' && value.length <= max ? value : null);
  const texts = (value: unknown, maxItems: number, maxLength: number) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length <= maxLength).slice(0, maxItems) : [];
  const int = (value: unknown, min: number, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;
  const items = Array.isArray(plan.items) ? plan.items : [];
  if (items.length === 0 || items.length > 12) throw new HttpError(400, 'A workout needs 1 to 12 exercises.');
  const cleanItems = items.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const exerciseId = text(item.exerciseId, 60);
    const sets = int(item.sets, 1, 10);
    const reps = text(item.reps, 20);
    const restSeconds = int(item.restSeconds, 0, 600);
    if (!exerciseId || sets === null || !reps || restSeconds === null) throw new HttpError(400, 'That workout isn’t in a shape GymGO can save.');
    return { exerciseId, sets, reps, restSeconds, uses: texts(item.uses, 4, 40), confirmed: item.confirmed === true };
  });
  return {
    version: 1,
    muscles: texts(plan.muscles, 15, 30),
    goal: text(plan.goal, 20),
    gymName: text(plan.gymName, 120),
    items: cleanItems,
    uncovered: texts(plan.uncovered, 15, 30),
  };
}

/** Sessions kept per account: years of training; the cap only stops a runaway script. */
export const MAX_TRAINING_SESSIONS = 5000;

/** Collected gyms sent in one request (the app sends a big collection in batches), and the room they may take. */
export const COLLECTION_BATCH = 200;
const BUSY_KEEP_MS = 24 * 60 * 60_000;
const COLLECTION_BODY_BYTES = 2 * 1024 * 1024;

/**
 * A logged session, checked field by field. A weight left blank is body
 * weight (null), never zero; reps of 0 are a set planned but not done.
 */
export function cleanTrainingSession(input: unknown, now: Date) {
  const body = (input ?? {}) as Record<string, unknown>;
  const bad = () => new HttpError(400, 'That session isn’t in a shape GymGO can keep.');
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 1 || name.length > 80) throw new HttpError(400, 'Give it a name of up to 80 characters.');
  const unit = body.unit === 'kg' || body.unit === 'lb' ? body.unit : null;
  if (!unit) throw bad();
  const time = (value: unknown) => (typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value)) ? new Date(value) : null);
  const started = time(body.startedAt);
  const finished = time(body.finishedAt);
  if (!started || !finished || finished < started) throw bad();
  if (finished.getTime() > now.getTime() + 5 * 60_000) throw new HttpError(400, 'That session finishes in the future.');
  if (finished.getTime() - started.getTime() > 24 * 3_600_000) throw new HttpError(400, 'A session can last up to a day.');
  const id = (value: unknown, max: number) => (typeof value === 'string' && value.length >= 1 && value.length <= max ? value : null);
  const exercises = Array.isArray(body.exercises) ? body.exercises : [];
  if (exercises.length < 1 || exercises.length > 40) throw bad();
  const clean = exercises.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const exerciseId = typeof item.exerciseId === 'string' && /^[a-z0-9-]{1,60}$/.test(item.exerciseId) ? item.exerciseId : null;
    const sets = Array.isArray(item.sets) ? item.sets : null;
    if (!exerciseId || !sets || sets.length > 30) throw bad();
    return {
      exerciseId,
      sets: sets.map((rawSet) => {
        const set = (rawSet ?? {}) as Record<string, unknown>;
        const weight = set.weight === null ? null : typeof set.weight === 'number' && Number.isFinite(set.weight) && set.weight > 0 && set.weight <= 1500 ? Math.round(set.weight * 100) / 100 : undefined;
        const reps = typeof set.reps === 'number' && Number.isInteger(set.reps) && set.reps >= 0 && set.reps <= 200 ? set.reps : undefined;
        if (weight === undefined || reps === undefined) throw bad();
        return { weight, reps };
      }),
    };
  });
  if (!clean.some((item) => item.sets.some((set) => set.reps > 0))) throw new HttpError(400, 'Log at least one set before finishing.');
  return {
    name,
    unit,
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    workoutId: id(body.workoutId, 60),
    gymId: id(body.gymId, 120),
    exercises: clean,
  };
}

type TrainingRow = {
  id: string;
  name: string;
  unit: string;
  started_at: string;
  finished_at: string;
  workout_id: string | null;
  gym_id: string | null;
  exercises_json: string;
};

const trainingView = (row: TrainingRow) => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  workoutId: row.workout_id,
  gymId: row.gym_id,
  exercises: JSON.parse(row.exercises_json),
});

/** The middle of sorted amounts (the mean of the middle two for an even count). */
function median(sorted: number[]): number {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

type AccessOutcome = 'walked_in' | 'booked_first' | 'turned_away';

/** How long a member's report that a gym has closed (or is open) keeps counting. */
const STATUS_REPORT_DAYS = 183;

/** How long a member's report of getting in keeps counting. */
const ACCESS_REPORT_DAYS = 365;

/** How long a member's price report keeps counting. */
const PRICE_REPORT_DAYS = 730;

/** Below this, compressing costs more than it saves. */
const GZIP_FROM_BYTES = 2048;

function send(res: ServerResponse, status: number, body?: unknown, cacheControl = 'no-store'): void {
  res.statusCode = status;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', cacheControl);
  if (body === undefined) {
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const json = Buffer.from(JSON.stringify(body));
  // The gym list is about 1.5 MB of JSON and a tenth of that gzipped; phones
  // and browsers unzip it themselves.
  const accepts = /\bgzip\b/.test(String(res.req?.headers['accept-encoding'] ?? ''));
  res.setHeader('Vary', 'Accept-Encoding');
  if (accepts && json.length >= GZIP_FROM_BYTES) {
    res.setHeader('Content-Encoding', 'gzip');
    res.end(gzipSync(json));
    return;
  }
  res.end(json);
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
  const operator = options.legal?.operator ?? DEFAULT_OPERATOR;
  /** The caller's address, for rate limits: the socket's, or behind a trusted proxy the one it passes on. */
  const clientAddress = (req: IncomingMessage): string => {
    const socket = req.socket.remoteAddress ?? 'unknown';
    if (!options.trustProxy) return socket;
    const header = req.headers['x-forwarded-for'];
    // The proxy adds the address it saw last, so that's the one to believe.
    const last = (Array.isArray(header) ? header.join(',') : (header ?? '')).split(',').map((part) => part.trim()).filter(Boolean).pop();
    return last && isIP(last) ? last : socket;
  };
  const hsts = options.publicUrl?.startsWith('https://') ?? false;
  const accountJson = (row: Parameters<typeof publicAccount>[0]) =>
    options.devAccount && row.email === DEV_PRO_EMAIL ? { ...publicAccount(row), devTools: true } : publicAccount(row);
  // Wrong passwords: 10 per address and email per 15 minutes, and 30 an hour
  // for one email from anywhere, against guessing spread over many addresses.
  const loginLimiter = new AttemptLimiter(10, 15 * 60_000);
  const accountLoginLimiter = new AttemptLimiter(30, 60 * 60_000);
  // Password reset emails: 5 an hour from one address, 3 an hour to one account.
  const forgotLimiter = new AttemptLimiter(5, 60 * 60_000);
  const forgotEmailLimiter = new AttemptLimiter(3, 60 * 60_000);
  // New passwords set from reset links: 10 per address per 15 minutes.
  const resetLimiter = new AttemptLimiter(10, 15 * 60_000);
  const signupLimiter = new AttemptLimiter(options.signupsPerHour ?? 20, 60 * 60_000);
  const photoLimiter = new AttemptLimiter(20, 24 * 60 * 60_000);
  const avatarLimiter = new AttemptLimiter(20, 24 * 60 * 60_000);
  const equipmentLimiter = new AttemptLimiter(30, 24 * 60 * 60_000);
  // Adding friends by code: plenty for real use, far too few to guess codes with.
  const friendLimiter = new AttemptLimiter(20, 24 * 60 * 60_000);
  // How busy a gym is: a few gyms a day, a few times each.
  const busyLimiter = new AttemptLimiter(30, 24 * 60 * 60_000);
  // Gift codes: enough for real use, too few to guess one.
  const redeemLimiter = new AttemptLimiter(10, 24 * 60 * 60_000);
  const priceLimiter = new AttemptLimiter(10, 24 * 60 * 60_000);
  const accessLimiter = new AttemptLimiter(10, 24 * 60 * 60_000);
  const statusLimiter = new AttemptLimiter(10, 24 * 60 * 60_000);
  // Area searches that need a live map read: 30 per address per hour.
  const areaLimiter = new AttemptLimiter(30, 60 * 60_000);
  // Website icons not yet kept: 300 per address per hour (a results list asks for about 40).
  const iconLimiter = new AttemptLimiter(300, 60 * 60_000);
  const siteIcons = new SiteIcons(db, { get: options.siteIcons?.get, now });
  const sitePhotos = new SitePhotos(db, { get: options.siteIcons?.get, now });
  // Website photos not yet kept: fewer than icons, as a page shows one.
  const sitePhotoLimiter = new AttemptLimiter(120, 60 * 60_000);
  // A chain's shared website, for branches the map gives none (worked out once, from the bundled gyms).
  let chainSite: ((record: GymRecord) => string | null) | null = null;
  // The site a gym's photo may come from: its very own, never one other gyms share.
  let photoSite: ((record: GymRecord) => string | null) | null = null;
  // New place questions (not already answered): 60 per address per hour.
  const placeLimiter = new AttemptLimiter(60, 60 * 60_000);
  const places = new PlaceSearch(db, { endpoint: options.places?.endpoint, fetchImpl: options.places?.fetchImpl, now });
  const area = new AreaSearch(db, { ...options.area, now, known: () => allGyms(db) });
  const packs = new CountryPacks(db, { ...options.area, ...options.packs, now, known: () => allGyms(db) });
  const photos = new PhotoStore(options.photoDir ?? null);
  const social = new Social(db, now);
  const owners = new Owners(db, now);
  /** A gym as the server sends it: with its verified owner's approved updates laid over (domain owner.ts). */
  const withOwner = (record: GymRecord): GymRecord => applyOwnerUpdates(record, owners.approved());
  const bugReports = new BugReports(db, {
    send: options.bugReports?.send ?? null,
    to: options.bugReports?.to ?? [],
    perDay: options.bugReports?.perDay,
    log: options.bugReports?.log ?? ((line) => console.warn(line)),
    now,
  });
  // Bug reports: 5 an hour from one account, or from one address when signed out.
  const bugLimiter = new AttemptLimiter(5, 60 * 60_000);
  const retryEvery = options.bugReports?.retryEveryMs ?? 0;
  if (bugReports.emailing && retryEvery > 0) {
    void bugReports.deliverWaiting();
    setInterval(() => void bugReports.deliverWaiting(), retryEvery).unref();
  }
  // Every few minutes: forget expired sign-ins and reset links, and the
  // rate-limit keys (addresses among them) whose window has passed.
  const limiters = [
    loginLimiter, accountLoginLimiter, forgotLimiter, forgotEmailLimiter, resetLimiter, signupLimiter, photoLimiter, avatarLimiter,
    equipmentLimiter, friendLimiter, busyLimiter, redeemLimiter, priceLimiter, accessLimiter, statusLimiter, areaLimiter, iconLimiter, sitePhotoLimiter, placeLimiter, bugLimiter,
  ];
  /** How busy a gym is matters for an hour; a member's report is kept a day at most. */
  const forgetOldBusy = (at: Date) => db.prepare('delete from busy_reports where reported_at < ?').run(new Date(at.getTime() - BUSY_KEEP_MS).toISOString());
  setInterval(() => {
    const at = now();
    forgetExpired(db, at);
    forgetOldBusy(at);
    for (const limiter of limiters) limiter.sweep(at.getTime());
  }, 5 * 60_000).unref();
  const google = new GooglePlaces(db, options.googleKey ?? null, options.fetchImpl);
  const identities = new IdentityVerifier({ fetchImpl: options.signIn?.fetchImpl, now });
  const googleIds = options.signIn?.google ?? { web: null, ios: null, android: null };
  const audiences: Record<Provider, string[]> = {
    google: [googleIds.web, googleIds.ios, googleIds.android].filter((id): id is string => Boolean(id)),
    apple: options.signIn?.apple ?? [],
  };

  /** Check a Google or Apple ID token from the request body, or say why not. */
  const identityFrom = async (provider: Provider, body: Record<string, unknown>): Promise<VerifiedIdentity> => {
    const idToken = typeof body.idToken === 'string' && body.idToken.length < 8000 ? body.idToken : '';
    const nonce = typeof body.nonce === 'string' && body.nonce.length <= 200 ? body.nonce : null;
    if (!idToken) throw new HttpError(400, `Sign in with ${label(provider)} didn’t finish. Try again.`);
    try {
      return await identities.verify(provider, idToken, audiences[provider], nonce);
    } catch (error) {
      if (error instanceof IdentityError) throw new HttpError(audiences[provider].length ? 401 : 404, error.message);
      throw error;
    }
  };

  const identityRows = (userId: string) =>
    db.prepare('select provider, email, created_at from identities where user_id = ? order by created_at').all(userId) as Array<{
      provider: Provider;
      email: string | null;
      created_at: string;
    }>;

  const perks = new Perks(db, now);
  const billing = new Billing(db, {
    stripe: options.billing?.stripe ?? null,
    webhookSecret: options.billing?.webhookSecret ?? null,
    now,
    grantFor: (userId) => perks.grantFor(userId),
    onPaid: (session) => perks.fulfil(session),
  });
  perks.attach(billing);

  /**
   * How the caller reached this server, for the page Stripe sends people
   * back to. Locally that can be through the app's bundler, which forwards
   * /_gymgo/… here and says so in X-Forwarded-Prefix (apps/mobile/metro.config.js).
   */
  function publicBase(req: IncomingMessage): string {
    if (options.publicUrl) return options.publicUrl;
    const host = req.headers.host ?? '';
    if (!/^[a-z0-9.\-]+(:\d{1,5})?$|^\[[0-9a-f:]+\](:\d{1,5})?$/i.test(host)) throw new HttpError(400, 'Unexpected Host header.');
    const prefix = req.headers['x-forwarded-prefix'];
    return `http://${host}${typeof prefix === 'string' && /^\/[A-Za-z0-9_-]{1,40}$/.test(prefix) ? prefix : ''}`;
  }

  function returnUrlFrom(value: unknown): string {
    const url = safeReturnUrl(value, (origin) => isAllowedOrigin(origin, options.allowedOrigins));
    if (!url) throw new HttpError(400, 'That return address isn’t allowed.');
    return url;
  }

  function caller(req: IncomingMessage): { account: AccountRow | null; user: User; token: string | null } {
    const token = bearer(req);
    const account = token ? accountForToken(db, token, now()) : null;
    return { account, user: account ? { ...toUser(account), ownedGymIds: owners.ownedGyms(account.id) } : ANONYMOUS, token };
  }

  function requireAccount(req: IncomingMessage) {
    const found = caller(req);
    if (!found.account || !found.token) throw new HttpError(401, 'Sign in first.');
    return { ...found, account: found.account, token: found.token };
  }

  /** When the account's collection was last reset, or null. */
  function collectionResetAt(userId: string): string | null {
    const row = db.prepare('select reset_at from collection_resets where user_id = ?').get(userId) as { reset_at: string } | undefined;
    return row?.reset_at ?? null;
  }

  function collectionView(userId: string): { gyms: CollectedGym[]; resetAt: string | null } {
    const rows = db.prepare('select entry_json from collection_gyms where user_id = ? order by gym_id').all(userId) as Array<{ entry_json: string }>;
    return { gyms: rows.map((row) => JSON.parse(row.entry_json) as CollectedGym), resetAt: collectionResetAt(userId) };
  }

  function requirePermission(user: User, permission: Permission, gymId?: string) {
    if (!can(user, permission, gymId ? { gymId } : {})) throw new HttpError(403, 'You don’t have permission to do that.');
  }

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method ?? 'GET';
    const parts = path.split('/').filter(Boolean);

    // GymGO needs an account: everything but the public routes (isPublicRoute) answers only a signed-in session.
    if (!isPublicRoute(method, path)) requireAccount(req);

    // --- Public ---------------------------------------------------------
    if (method === 'GET' && path === '/api/health') return send(res, 200, { ok: true });

    // Who runs GymGO (for the legal documents), the terms' version, and
    // where to send a copyright (DMCA) notice once the owner has registered an agent.
    if (method === 'GET' && path === '/api/legal') {
      return send(res, 200, { copyrightAgent: options.legal?.copyrightAgent ?? null, operator, version: LEGAL_VERSION, updated: LEGAL_UPDATED });
    }

    // The legal documents as public pages, for Stripe, the app stores and anyone with a link.
    if (method === 'GET' && (path === '/legal' || isLegalDocId(parts[0]) && parts.length === 1)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.end(path === '/legal' ? legalIndexPage(operator) : legalPage(parts[0] as LegalDocId, operator));
      return;
    }

    if (method === 'GET' && path === '/.well-known/security.txt') {
      const body = securityTxt(operator, options.publicUrl ?? null, now());
      if (!body) throw new HttpError(404, 'Not found.');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(body);
      return;
    }

    if (method === 'GET' && path === '/api/gyms') {
      return send(res, 200, { gyms: allGyms(db).map(withOwner), attribution: options.attribution, generatedAt: now().toISOString() });
    }

    if (method === 'GET' && path === '/api/area') {
      try {
        const box = parseBox(url.searchParams);
        // GymGO Free covers the country you chose; Pro, every country (see
        // packages/domain/src/plans.ts). The app says which is yours, and an
        // area whose middle is elsewhere needs Pro, before anything is read.
        const home = (url.searchParams.get('home') ?? '').trim().toUpperCase();
        if (!/^[A-Z]{2}$/.test(home)) throw new HttpError(400, 'Say which country is yours (home=AU, for one).');
        const middle = whereIs((box.south + box.north) / 2, (box.west + box.east) / 2);
        if (middle && middle.countryCode !== home) {
          const { account } = caller(req);
          if (!account || !billing.isPro(account.id)) {
            throw new HttpError(403, 'Gyms outside the country you chose are part of GymGO Pro.', 'pro_required', { countryCode: middle.countryCode });
          }
        }
        if (area.needsFetch(box) && !areaLimiter.allow(clientAddress(req), now().getTime())) {
          throw new AreaError(429, 'That’s a lot of searching. Try again in a little while.', 'rate_limited');
        }
        const answer = await area.search(box);
        return send(res, 200, { ...answer, gyms: answer.gyms.map(withOwner), attribution: '© OpenStreetMap contributors (ODbL)' });
      } catch (error) {
        if (error instanceof AreaError) throw new HttpError(error.status, error.message, error.code);
        throw error;
      }
    }

    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'country' && parts[3] === 'pack' && (parts.length === 4 || (parts.length === 5 && parts[4] === 'status'))) {
      const country = decodeURIComponent(parts[2]!).toUpperCase();
      if (!/^[A-Z]{2}$/.test(country)) throw new HttpError(400, 'Not a country code.');
      // Your own country is free; any other is Pro, as for searching an area.
      const home = (url.searchParams.get('home') ?? '').trim().toUpperCase();
      if (country !== home) {
        const { account } = caller(req);
        if (!account || !billing.isPro(account.id)) {
          throw new HttpError(403, 'Gyms outside the country you chose are part of GymGO Pro.', 'pro_required', { countryCode: country });
        }
      }
      const status = packs.status(country);
      if (parts.length === 5) return send(res, 200, status);
      const pack = packs.pack(country);
      if (!pack) {
        if (status.state === 'failed') throw new HttpError(503, 'The map service didn’t answer. Try again later.', 'upstream');
        return send(res, 202, status);
      }
      const etag = `"${pack.builtAt}"`;
      res.setHeader('ETag', etag);
      if (req.headers['if-none-match'] === etag) return send(res, 304, undefined, 'no-cache');
      res.statusCode = 200;
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Vary', 'Accept-Encoding');
      if (/\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
        res.setHeader('Content-Encoding', 'gzip');
        res.end(pack.gzipped);
      } else {
        res.end(gunzipSync(pack.gzipped));
      }
      return;
    }

    if (method === 'GET' && path === '/api/places') {
      const query = url.searchParams.get('q') ?? '';
      try {
        if (places.cached(query) === undefined && !placeLimiter.allow(clientAddress(req), now().getTime())) {
          throw new HttpError(429, 'That’s a lot of place searches. Try again in a little while.');
        }
        return send(res, 200, { places: await places.search(query), attribution: '© OpenStreetMap contributors (ODbL), via Photon by komoot' });
      } catch (error) {
        if (error instanceof PlaceError) throw new HttpError(error.status, error.message);
        throw error;
      }
    }

    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'gyms' && parts.length === 3) {
      const record = gymRecord(db, decodeURIComponent(parts[2]!));
      if (!record) throw new HttpError(404, 'No gym with that id.');
      return send(res, 200, { gym: withOwner(record) });
    }

    // --- GymGO Pro ----------------------------------------------------------
    if (method === 'POST' && path === '/api/billing/webhook') {
      await billing.handleWebhook(await readRaw(req, 1024 * 1024), req.headers['stripe-signature'] as string | undefined);
      return send(res, 200, { received: true });
    }

    if (method === 'GET' && path === '/api/billing/plans') {
      const { available, prices, duo, gifts } = await billing.prices();
      return send(res, 200, { available, prices, duo, gifts, limits: LIMITS });
    }

    if (method === 'GET' && path === '/api/billing/return') {
      const result = url.searchParams.get('result');
      const kind = result === 'success' || result === 'cancelled' || result === 'portal' ? result : 'portal';
      const to = safeReturnUrl(url.searchParams.get('to'), (origin) => isAllowedOrigin(origin, options.allowedOrigins));
      const sessionId = url.searchParams.get('session_id');
      if (kind === 'success' && sessionId && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId) && billing.enabled) {
        // Turn Pro on now, without waiting for a webhook that may never come.
        await billing.syncCheckoutSession(sessionId).catch((error: unknown) => console.error('[billing] return sync failed', error));
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'");
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.end(returnPage(kind, to ? withQuery(to, { checkout: kind }) : null));
      return;
    }

    if (path === '/api/billing' && method === 'GET') {
      const { account } = requireAccount(req);
      return send(res, 200, { ...(await billing.planForFresh(account.id)), available: billing.enabled });
    }

    if (method === 'POST' && path === '/api/billing/sync') {
      const { account } = requireAccount(req);
      return send(res, 200, { ...(await billing.syncAccount(account.id)), available: billing.enabled });
    }

    if (method === 'POST' && path === '/api/billing/checkout') {
      const { account } = requireAccount(req);
      const body = (await readJson(req)) as Record<string, unknown>;
      const interval = body.interval;
      const currency = body.currency;
      if (interval !== 'month' && interval !== 'year') throw new HttpError(400, 'Choose monthly or yearly.');
      if (currency !== 'aud' && currency !== 'usd') throw new HttpError(400, 'Choose A$ or US$.');
      const plan = body.plan === 'duo' ? 'duo' : 'pro';
      const returnUrl = returnUrlFrom(body.returnUrl);
      const back = `${publicBase(req)}/api/billing/return?to=${encodeURIComponent(returnUrl)}`;
      const checkoutUrl = await billing.checkout(
        account,
        { interval: interval as BillingInterval, currency: currency as BillingCurrency, plan },
        // Stripe fills in {CHECKOUT_SESSION_ID} itself; it must stay unencoded.
        {
          success: `${back}&result=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel: `${back}&result=cancelled`,
          terms: `${publicBase(req)}/terms`,
          refunds: `${publicBase(req)}/refunds`,
        },
      );
      return send(res, 200, { url: checkoutUrl });
    }

    // --- Gift Pro, Duo and day passes (perks.ts) ------------------------------------
    if ((parts[0] === 'api' && parts[1] === 'billing' && (parts[2] === 'gift' || parts[2] === 'gifts' || parts[2] === 'redeem' || parts[2] === 'duo')) || (parts[0] === 'api' && (parts[1] === 'passes' || (parts[1] === 'admin' && parts[2] === 'passes')))) {
      const { account, user } = requireAccount(req);
      const payBack = (returnUrl: string) => {
        const back = `${publicBase(req)}/api/billing/return?to=${encodeURIComponent(returnUrl)}`;
        return { success: `${back}&result=success&session_id={CHECKOUT_SESSION_ID}`, cancel: `${back}&result=cancelled`, terms: `${publicBase(req)}/terms`, refunds: `${publicBase(req)}/refunds` };
      };
      try {
        if (path === '/api/billing/gift' && method === 'POST') {
          const body = (await readJson(req)) as Record<string, unknown>;
          const currency = body.currency;
          if (currency !== 'aud' && currency !== 'usd') throw new HttpError(400, 'Choose A$ or US$.');
          const price = await billing.giftPriceId(currency);
          const checkout = await billing.payOnce(account, [{ price: price.id }], { gymgo_kind: 'gift', gymgo_currency: currency }, payBack(returnUrlFrom(body.returnUrl)));
          return send(res, 200, { url: checkout.url });
        }
        if (path === '/api/billing/gifts' && method === 'GET') return send(res, 200, { gifts: perks.giftsBoughtBy(account.id) });
        if (path === '/api/billing/redeem' && method === 'POST') {
          if (!redeemLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That’s a lot of codes for one day. Try again tomorrow.');
          const body = (await readJson(req)) as Record<string, unknown>;
          perks.redeem(account.id, typeof body.code === 'string' ? body.code : '');
          return send(res, 200, { ...billing.planFor(account.id), available: billing.enabled });
        }
        if (path === '/api/billing/duo') {
          if (method === 'GET') return send(res, 200, perks.duoView(account.id));
          if (method === 'PUT') {
            if (!friendLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That’s a lot of codes for one day. Try again tomorrow.');
            const body = (await readJson(req)) as Record<string, unknown>;
            perks.addToDuo(account.id, typeof body.code === 'string' ? body.code : '');
            return send(res, 200, perks.duoView(account.id));
          }
          if (method === 'DELETE') {
            perks.leaveDuo(account.id);
            return send(res, 200, perks.duoView(account.id));
          }
        }
        if (path === '/api/passes/mine' && method === 'GET') return send(res, 200, { bookings: perks.bookingsFor(account.id) });
        if (parts[1] === 'passes' && parts[3] === 'book' && parts.length === 4 && method === 'POST') {
          const body = (await readJson(req)) as Record<string, unknown>;
          const passId = decodeURIComponent(parts[2]!);
          const gymId = (db.prepare('select gym_id from partner_passes where id = ?').get(passId) as { gym_id: string } | undefined)?.gym_id;
          const gym = gymId ? gymRecord(db, gymId) : null;
          return send(res, 200, await perks.bookPass(account, passId, body.forDate, gym?.location.name ?? 'the gym', payBack(returnUrlFrom(body.returnUrl))));
        }
        if (parts[1] === 'admin' && parts[2] === 'passes') {
          // Partner passes are GymGO's agreements with gyms: admins only.
          if (user.role !== 'admin' || user.blocked) throw new HttpError(403, 'Admins only.');
          if (parts.length === 3 && method === 'POST') {
            const body = (await readJson(req)) as Record<string, unknown>;
            const gymId = typeof body.gymId === 'string' ? body.gymId : '';
            if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');
            return send(res, 201, perks.addPass(account.id, gymId, body));
          }
          if (parts.length === 4 && method === 'DELETE') {
            perks.removePass(decodeURIComponent(parts[3]!));
            return send(res, 204);
          }
        }
      } catch (error) {
        if (error instanceof PerkError) throw new HttpError(error.status, error.message);
        throw error;
      }
      throw new HttpError(404, 'Not found.');
    }

    if (method === 'POST' && path === '/api/billing/portal') {
      const { account } = requireAccount(req);
      const body = (await readJson(req)) as Record<string, unknown>;
      const returnUrl = returnUrlFrom(body.returnUrl);
      const back = `${publicBase(req)}/api/billing/return?to=${encodeURIComponent(returnUrl)}&result=portal`;
      return send(res, 200, { url: await billing.portal(account, back) });
    }

    // --- Saved workouts (Pro) ---------------------------------------------
    if (path === '/api/workouts' && method === 'GET') {
      const { account } = requireAccount(req);
      const rows = db
        .prepare('select id, name, gym_id, plan_json, created_at from workouts where user_id = ? order by created_at desc')
        .all(account.id) as Array<{ id: string; name: string; gym_id: string | null; plan_json: string; created_at: string }>;
      return send(res, 200, {
        workouts: rows.map((row) => ({ id: row.id, name: row.name, gymId: row.gym_id, createdAt: row.created_at, plan: JSON.parse(row.plan_json) })),
      });
    }

    if (path === '/api/workouts' && method === 'POST') {
      const { account } = requireAccount(req);
      if (!billing.isPro(account.id)) throw new HttpError(403, 'Saving workouts is part of GymGO Pro.', 'pro_required');
      const body = (await readJson(req)) as Record<string, unknown>;
      const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
      if (name.length < 1 || name.length > 80) throw new HttpError(400, 'Give it a name of up to 80 characters.');
      const gymId = typeof body.gymId === 'string' && body.gymId.length <= 120 ? body.gymId : null;
      const plan = cleanWorkoutPlan(body.plan);
      const count = (db.prepare('select count(*) as n from workouts where user_id = ?').get(account.id) as { n: number }).n;
      if (count >= LIMITS.pro.savedWorkouts) throw new HttpError(409, `You’ve saved ${count} workouts, the most there’s room for. Delete one first.`);
      const id = randomUUID();
      const createdAt = now().toISOString();
      db.prepare('insert into workouts (id, user_id, name, gym_id, plan_json, created_at) values (?, ?, ?, ?, ?, ?)').run(
        id,
        account.id,
        name,
        gymId,
        JSON.stringify(plan),
        createdAt,
      );
      return send(res, 201, { workout: { id, name, gymId, createdAt, plan } });
    }

    if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'workouts' && parts.length === 3) {
      const { account } = requireAccount(req);
      // Allowed on Free too: nobody loses the right to tidy what they kept.
      const removed = db.prepare('delete from workouts where id = ? and user_id = ?').run(decodeURIComponent(parts[2]!), account.id);
      if (removed.changes === 0) throw new HttpError(404, 'No saved workout with that id.');
      return send(res, 204);
    }

    // --- Training log (free: it's your own numbers) ---------------------------
    if (path === '/api/training' && method === 'GET') {
      const { account } = requireAccount(req);
      const rows = db
        .prepare(
          'select id, name, unit, started_at, finished_at, workout_id, gym_id, exercises_json from training_sessions where user_id = ? order by finished_at desc limit ?',
        )
        .all(account.id, MAX_TRAINING_SESSIONS) as TrainingRow[];
      return send(res, 200, { sessions: rows.map(trainingView) });
    }

    if (path === '/api/training' && method === 'POST') {
      const { account } = requireAccount(req);
      const session = cleanTrainingSession(await readJson(req), now());
      // The same workout sent again (the answer lost on the gym's Wi-Fi, and
      // Finish tapped again): each starts at its own moment, so it's the one
      // already logged, not a second copy doubling the volume and the streak.
      const again = db
        .prepare('select id, name, unit, started_at, finished_at, workout_id, gym_id, exercises_json from training_sessions where user_id = ? and started_at = ?')
        .get(account.id, session.startedAt) as TrainingRow | undefined;
      if (again) return send(res, 200, { session: trainingView(again) });
      const count = (db.prepare('select count(*) as n from training_sessions where user_id = ?').get(account.id) as { n: number }).n;
      if (count >= MAX_TRAINING_SESSIONS) throw new HttpError(409, `You’ve logged ${count} sessions, the most there’s room for. Delete some old ones first.`);
      const id = randomUUID();
      db.prepare(
        `insert into training_sessions (id, user_id, name, unit, started_at, finished_at, workout_id, gym_id, exercises_json, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        account.id,
        session.name,
        session.unit,
        session.startedAt,
        session.finishedAt,
        session.workoutId,
        session.gymId,
        JSON.stringify(session.exercises),
        now().toISOString(),
      );
      return send(res, 201, { session: { id, ...session } });
    }

    if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'training' && parts.length === 3) {
      const { account } = requireAccount(req);
      const removed = db.prepare('delete from training_sessions where id = ? and user_id = ?').run(decodeURIComponent(parts[2]!), account.id);
      if (removed.changes === 0) throw new HttpError(404, 'No logged session with that id.');
      return send(res, 204);
    }

    // --- Gym collection (free: your own check-ins) ------------------------------
    // Check-ins are decided on the phone, where your position is compared with
    // the gym's and never sent; the account keeps what they add up to, so the
    // collection follows you between devices.
    if (path === '/api/collection' && method === 'GET') {
      const { account } = requireAccount(req);
      return send(res, 200, collectionView(account.id));
    }

    if (path === '/api/collection' && method === 'PUT') {
      const { account } = requireAccount(req);
      const body = (await readJson(req, COLLECTION_BODY_BYTES)) as Record<string, unknown>;
      if (!Array.isArray(body.gyms) || body.gyms.length > COLLECTION_BATCH) throw new HttpError(400, `Send up to ${COLLECTION_BATCH} gyms at a time.`);
      // A reset on another device since this one last heard wins: it drops its
      // older visits (lib/useCollection.ts) and sends what's left.
      const resetAt = collectionResetAt(account.id);
      if (resetAt && body.resetAt !== resetAt) throw new HttpError(409, 'Your collection was reset on another device.', 'collection_reset', { resetAt });
      const incoming = body.gyms.map((entry) => cleanCollectedGym(entry, now())).filter((entry): entry is CollectedGym => entry !== null);
      const stored = new Map(
        (db.prepare('select gym_id, entry_json from collection_gyms where user_id = ?').all(account.id) as Array<{ gym_id: string; entry_json: string }>).map(
          (row) => [row.gym_id, JSON.parse(row.entry_json) as CollectedGym],
        ),
      );
      const fresh = new Set(incoming.map((entry) => entry.id).filter((id) => !stored.has(id)));
      if (stored.size + fresh.size > COLLECTION_MAX_GYMS) throw new HttpError(409, `A collection holds up to ${COLLECTION_MAX_GYMS} gyms.`);
      const at = now().toISOString();
      const upsert = db.prepare(
        `insert into collection_gyms (user_id, gym_id, entry_json, updated_at) values (?, ?, ?, ?)
         on conflict (user_id, gym_id) do update set entry_json = excluded.entry_json, updated_at = excluded.updated_at`,
      );
      db.exec('begin');
      try {
        for (const entry of incoming) {
          const kept = stored.get(entry.id);
          // The account's copy first, so its card (its seed) stays the same everywhere.
          upsert.run(account.id, entry.id, JSON.stringify(kept ? mergeCollectedGym(kept, entry) : entry), at);
        }
        db.exec('commit');
      } catch (error) {
        db.exec('rollback');
        throw error;
      }
      return send(res, 200, collectionView(account.id));
    }

    if (path === '/api/collection' && method === 'DELETE') {
      const { account } = requireAccount(req);
      const resetAt = now().toISOString();
      db.exec('begin');
      try {
        db.prepare('delete from collection_gyms where user_id = ?').run(account.id);
        db.prepare('insert into collection_resets (user_id, reset_at) values (?, ?) on conflict (user_id) do update set reset_at = excluded.reset_at').run(
          account.id,
          resetAt,
        );
        db.exec('commit');
      } catch (error) {
        db.exec('rollback');
        throw error;
      }
      return send(res, 200, { gyms: [], resetAt });
    }

    // --- Friends, invites to train, leaderboards (social.ts) -----------------
    if (parts[0] === 'api' && (parts[1] === 'friends' || parts[1] === 'invites' || parts[1] === 'leaderboard' || path === '/api/me/leaderboard')) {
      const { account } = requireAccount(req);
      const me = account.id;
      try {
        if (path === '/api/friends' && method === 'GET') return send(res, 200, social.overview(me));
        if (path === '/api/friends' && method === 'POST') {
          if (!friendLimiter.allow(me, now().getTime())) throw new HttpError(429, 'That’s a lot of friend codes for one day. Try again tomorrow.');
          const body = (await readJson(req)) as Record<string, unknown>;
          return send(res, 200, social.add(me, typeof body.code === 'string' ? body.code : ''));
        }
        if (parts[1] === 'friends' && parts.length >= 3) {
          const other = decodeURIComponent(parts[2]!);
          if (parts.length === 3 && method === 'DELETE') {
            social.remove(me, other);
            return send(res, 204);
          }
          if (parts[3] === 'accept' && parts.length === 4 && method === 'POST') {
            social.accept(me, other);
            return send(res, 200, social.overview(me));
          }
          if (parts[3] === 'collection' && parts.length === 4 && method === 'GET') return send(res, 200, social.friendCollection(me, other));
          if (parts[3] === 'invites' && parts.length === 4 && method === 'POST') {
            return send(res, 201, social.invite(me, other, (await readJson(req)) as Record<string, unknown>));
          }
        }
        if (parts[1] === 'invites' && parts.length === 3) {
          const id = decodeURIComponent(parts[2]!);
          if (method === 'POST') return send(res, 200, social.answerInvite(me, id, ((await readJson(req)) as Record<string, unknown>).answer));
          if (method === 'DELETE') {
            social.cancelInvite(me, id);
            return send(res, 204);
          }
        }
        if (path === '/api/me/leaderboard' && method === 'PUT') {
          return send(res, 200, { leaderboard: social.setLeaderboard(me, ((await readJson(req)) as Record<string, unknown>).join) });
        }
        if (path === '/api/leaderboard' && method === 'GET') {
          const scope = url.searchParams.get('scope') === 'friends' ? 'friends' : 'everyone';
          const city = (url.searchParams.get('city') ?? '').trim().slice(0, 200);
          const country = (url.searchParams.get('country') ?? '').trim().toUpperCase();
          if (city && !/^[A-Z]{2}$/.test(country)) throw new HttpError(400, 'Say which country the city is in.');
          return send(res, 200, social.board(me, scope, city ? { city, countryCode: country } : null));
        }
      } catch (error) {
        if (error instanceof SocialError) throw new HttpError(error.status, error.message);
        throw error;
      }
      throw new HttpError(404, 'Not found.');
    }

    // --- Accounts --------------------------------------------------------
    if (method === 'POST' && path === '/api/auth/signup') {
      const body = (await readJson(req)) as Record<string, unknown>;
      const input = validateSignup(body);
      if (!signupLimiter.allow(clientAddress(req), now().getTime())) {
        throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
      }
      // Nothing is kept about someone too young for an account, not even that they tried.
      checkAge(body.birthMonth, now());
      checkTermsAccepted(body.acceptTerms);
      const account = createAccount(db, { ...input, ageCheckedAt: now().toISOString(), termsVersion: LEGAL_VERSION }, now());
      if (!account) throw new HttpError(409, 'There’s already an account with that email. Try signing in.');
      return send(res, 201, { token: startSession(db, account.id, now()), account: accountJson(account) });
    }

    // --- Forgotten passwords -------------------------------------------------
    if (method === 'POST' && path === '/api/auth/forgot') {
      const body = (await readJson(req)) as Record<string, unknown>;
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, 'That email address doesn’t look right.');
      // The emailed link must point at this server's own address, set by its
      // owner, never one taken from the request, which anyone can change.
      const mail = options.mail;
      if (!mail || !options.publicUrl) {
        throw new HttpError(503, 'This GymGO server can’t send email, so passwords can’t be reset by email here. Ask whoever runs it for help.', 'reset_off');
      }
      if (!forgotLimiter.allow(clientAddress(req), now().getTime()) || !forgotEmailLimiter.allow(email, now().getTime())) {
        throw new HttpError(429, 'That’s a lot of reset emails. Wait an hour and try again.');
      }
      const account = findByEmail(db, email);
      if (account && !account.blocked) {
        const token = startPasswordReset(db, account.id, now());
        const link = `${options.publicUrl}/reset-password?token=${token}`;
        // Sent without waiting, so the answer takes as long whether or not there's an account.
        void mail({ to: [account.email], subject: 'Choose a new GymGO password', text: resetEmail(account.display_name, link, RESET_MINUTES) }).catch(
          (error: unknown) => console.error('[auth] password reset email failed', error),
        );
      }
      // The same answer either way, so nobody can find out who has an account.
      return send(res, 200, { sent: true, minutes: RESET_MINUTES });
    }

    if (path === '/reset-password' && (method === 'GET' || method === 'POST')) {
      const page = (html: string, status = 200) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.end(html);
      };
      if (method === 'GET') {
        const token = url.searchParams.get('token') ?? '';
        return page(resetPasswordPage({ token: accountForResetToken(db, token, now()) ? token : null }));
      }
      if (!resetLimiter.allow(clientAddress(req), now().getTime())) {
        return page(resetPasswordPage({ token: null, problem: 'Too many tries. Wait a few minutes, then open the link again.' }), 429);
      }
      const form = new URLSearchParams((await readRaw(req, 4096)).toString('utf8'));
      const token = form.get('token') ?? '';
      const account = accountForResetToken(db, token, now());
      if (!account) return page(resetPasswordPage({ token: null }), 400);
      const password = form.get('password') ?? '';
      if (password !== (form.get('confirm') ?? '')) return page(resetPasswordPage({ token, problem: 'The two passwords don’t match.' }), 400);
      let next: string;
      try {
        next = validateNewPassword(password, account.email);
      } catch (error) {
        if (error instanceof AuthInputError) return page(resetPasswordPage({ token, problem: error.message }), 400);
        throw error;
      }
      finishPasswordReset(db, token, next, now());
      return page(resetPasswordPage({ token: null, done: true }));
    }

    if (method === 'POST' && path === '/api/auth/login') {
      const body = (await readJson(req)) as Record<string, unknown>;
      // No email has spaces in it; a phone keyboard or autofill can leave one (or an invisible one) behind.
      const email = typeof body.email === 'string' ? body.email.replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) throw new HttpError(400, 'Enter your email and password.');
      if (!loginLimiter.allow(`${clientAddress(req)}|${email}`, now().getTime())) {
        throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
      }
      if (!accountLoginLimiter.allow(email, now().getTime())) {
        throw new HttpError(429, 'Too many attempts for this account. Wait a while, or reset your password.');
      }
      const trimmed = password.trim();
      const account =
        checkLogin(db, email, password) ??
        // A space a phone keyboard or password manager added at either end.
        (trimmed && trimmed !== password ? checkLogin(db, email, trimmed) : null) ??
        // The local dev account's password, however a phone keyboard typed its dashes and capitals.
        (options.devAccount && email === DEV_PRO_EMAIL && matchesDevPassword(password) ? (findByEmail(db, email) ?? null) : null);
      if (!account) throw new HttpError(401, 'That email and password don’t match.');
      if (account.blocked) throw new HttpError(403, 'This account has been blocked.');
      return send(res, 200, { token: startSession(db, account.id, now()), account: accountJson(account) });
    }

    // --- Sign in with Google or Apple --------------------------------------
    if (method === 'GET' && path === '/api/auth/providers') {
      return send(res, 200, {
        google: audiences.google.length ? { web: googleIds.web, ios: googleIds.ios, android: googleIds.android } : null,
        apple: audiences.apple.length > 0,
      });
    }

    if (method === 'POST' && (path === '/api/auth/google' || path === '/api/auth/apple')) {
      const provider: Provider = path.endsWith('google') ? 'google' : 'apple';
      if (!loginLimiter.allow(`${clientAddress(req)}|${provider}`, now().getTime())) {
        throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
      }
      const body = (await readJson(req)) as Record<string, unknown>;
      const who = await identityFrom(provider, body);
      const linked = db.prepare('select user_id from identities where provider = ? and subject = ?').get(provider, who.subject) as
        | { user_id: string }
        | undefined;
      let account = linked ? (db.prepare('select * from users where id = ?').get(linked.user_id) as AccountRow | undefined) : undefined;
      let created = false;
      if (!account) {
        if (!who.email || !who.emailVerified) {
          throw new HttpError(400, `${label(provider)} didn’t share a verified email address, which a GymGO account needs.`);
        }
        const existing = db.prepare('select * from users where email = ?').get(who.email) as AccountRow | undefined;
        if (existing && hasPassword(existing)) {
          // Never joined on email alone: GymGO doesn't check the emails people
          // sign up with, so a password account with this address could be
          // someone else's. Its owner connects Google or Apple from Settings.
          throw new HttpError(
            409,
            `There’s already a GymGO account with ${who.email}. Sign in with its password, then connect ${label(provider)} in Settings → Account.`,
            'connect_from_settings',
          );
        }
        if (existing) {
          // Made with the other provider, which verified the same address.
          account = existing;
        } else {
          // A new account: the same age check as signing up with an email.
          // The app asks, then sends the same sign-in again with the answer.
          if (body.birthMonth === undefined || body.birthMonth === null || body.birthMonth === '') {
            throw new HttpError(400, 'Before GymGO makes your account: which month and year were you born?', 'age_needed');
          }
          checkAge(body.birthMonth, now());
          checkTermsAccepted(body.acceptTerms);
          const fromEmail = who.email.split('@')[0]!.replace(/[._-]+/g, ' ').trim();
          const offered = provider === 'apple' && typeof body.name === 'string' ? body.name : who.name;
          const displayName = (offered ?? '').trim().replace(/\s+/g, ' ').slice(0, 40) || fromEmail.slice(0, 40) || 'GymGO member';
          account = createAccount(
            db,
            { email: who.email, password: null, displayName, ageCheckedAt: now().toISOString(), termsVersion: LEGAL_VERSION },
            now(),
          )!;
          created = true;
        }
        db.prepare('insert into identities (provider, subject, user_id, email, created_at) values (?, ?, ?, ?, ?)').run(
          provider,
          who.subject,
          account.id,
          who.email,
          now().toISOString(),
        );
      }
      if (account.blocked) throw new HttpError(403, 'This account has been blocked.');
      return send(res, created ? 201 : 200, { token: startSession(db, account.id, now()), account: accountJson(account), created });
    }

    if (method === 'GET' && path === '/api/me/identities') {
      const { account } = requireAccount(req);
      return send(res, 200, {
        password: hasPassword(account),
        identities: identityRows(account.id).map((row) => ({ provider: row.provider, email: row.email, connectedAt: row.created_at })),
      });
    }

    if (parts[0] === 'api' && parts[1] === 'me' && parts[2] === 'identities' && parts.length === 4 && (method === 'POST' || method === 'DELETE')) {
      const { account } = requireAccount(req);
      const provider = parts[3] === 'google' || parts[3] === 'apple' ? parts[3] : null;
      if (!provider) throw new HttpError(404, 'Only Google and Apple can be connected.');
      if (method === 'POST') {
        const who = await identityFrom(provider, (await readJson(req)) as Record<string, unknown>);
        const taken = db.prepare('select user_id from identities where provider = ? and subject = ?').get(provider, who.subject) as
          | { user_id: string }
          | undefined;
        if (taken && taken.user_id !== account.id) {
          throw new HttpError(409, `That ${label(provider)} account already signs in to a different GymGO account.`);
        }
        if (!taken) {
          db.prepare('delete from identities where user_id = ? and provider = ?').run(account.id, provider);
          db.prepare('insert into identities (provider, subject, user_id, email, created_at) values (?, ?, ?, ?, ?)').run(
            provider,
            who.subject,
            account.id,
            who.email,
            now().toISOString(),
          );
        }
        return send(res, 200, { connected: provider, email: who.email });
      }
      const others = identityRows(account.id).filter((row) => row.provider !== provider).length;
      if (!hasPassword(account) && others === 0) {
        throw new HttpError(409, `${label(provider)} is your only way to sign in. Set a password first, then disconnect it.`);
      }
      db.prepare('delete from identities where user_id = ? and provider = ?').run(account.id, provider);
      return send(res, 204);
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      const token = bearer(req);
      if (token) endSession(db, token);
      return send(res, 204);
    }

    // Everything GymGO holds about you, as one file. Never the password hash
    // or session tokens; the photo images themselves stay on the server.
    if (method === 'GET' && path === '/api/me/export') {
      const { account } = requireAccount(req);
      const id = account.id;
      const rows = (sql: string) => db.prepare(sql).all(id) as Array<Record<string, unknown>>;
      const today = now().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="gymgo-my-data-${today}.json"`);
      return send(res, 200, {
        exportedAt: now().toISOString(),
        note: 'Everything GymGO holds about you. Your password is stored only as a salted hash, which is left out; so are sign-in tokens.',
        account: rows(
          `select id, email, display_name as displayName, role, blocked, created_at as createdAt,
                  avatar_id as profilePictureId, avatar_type as profilePictureType from users where id = ?`,
        )[0],
        signIns: rows('select created_at as signedInAt, expires_at as expiresAt from sessions where user_id = ? order by created_at'),
        connectedSignIns: rows('select provider, email, created_at as connectedAt from identities where user_id = ? order by created_at'),
        savedGyms: rows('select gym_id as gymId, created_at as savedAt from saved_gyms where user_id = ? order by created_at'),
        reviews: rows(
          `select id, gym_id as gymId, overall, body, visited_on as visitedOn, status, moderation_reason as moderationReason,
                  created_at as createdAt, moderated_at as moderatedAt from reviews where user_id = ? order by created_at`,
        ),
        photos: rows(
          `select id, gym_id as gymId, type, bytes, status, moderation_reason as moderationReason, created_at as createdAt,
                  moderated_at as moderatedAt from photos where user_id = ? order by created_at`,
        ),
        equipmentReports: rows(
          `select gym_id as gymId, equipment_type_id as equipmentTypeId, presence, max_weight_kg as maxWeightKg, reported_at as reportedAt
           from equipment_reports where user_id = ? order by reported_at`,
        ),
        priceReports: rows(
          `select gym_id as gymId, amount_minor as amountMinor, currency, paid_on as paidOn, reported_at as reportedAt
           from price_reports where user_id = ? order by reported_at`,
        ),
        gymStatusReports: rows(
          `select gym_id as gymId, status, seen_on as seenOn, reported_at as reportedAt from status_reports where user_id = ? order by reported_at`,
        ),
        busyReports: rows(`select gym_id as gymId, level, reported_at as reportedAt from busy_reports where user_id = ? order by reported_at`),
        visitReports: rows(
          `select gym_id as gymId, outcome, visited_on as visitedOn, reported_at as reportedAt from access_reports where user_id = ? order by reported_at`,
        ),
        workouts: rows('select id, name, gym_id as gymId, plan_json, created_at as createdAt from workouts where user_id = ? order by created_at').map(
          ({ plan_json, ...workout }) => ({ ...workout, plan: JSON.parse(String(plan_json)) }),
        ),
        collection: rows('select entry_json from collection_gyms where user_id = ? order by gym_id').map(({ entry_json }) => JSON.parse(String(entry_json))),
        collectionResetAt: rows('select reset_at from collection_resets where user_id = ?')[0]?.reset_at ?? null,
        trainingSessions: rows(
          `select id, name, unit, started_at as startedAt, finished_at as finishedAt, workout_id as workoutId, gym_id as gymId, exercises_json
           from training_sessions where user_id = ? order by finished_at`,
        ).map(({ exercises_json, ...session }) => ({ ...session, exercises: JSON.parse(String(exercises_json)) })),
        subscriptions: rows(
          `select status, interval, currency, amount_minor as amountMinor, current_period_end as currentPeriodEnd, cancel_at as cancelAt,
                  cancel_at_period_end as cancelAtPeriodEnd, updated_at as updatedAt from subscriptions where user_id = ? order by updated_at`,
        ),
        bugReports: rows(
          `select id, topic, description, reply_to as replyTo, context_json, status, created_at as createdAt, sent_at as emailedAt
           from bug_reports where user_id = ? order by created_at`,
        ).map(({ context_json, ...report }) => ({ ...report, device: JSON.parse(String(context_json)) })),
        ...social.exportFor(id),
        ...owners.exportFor(id),
        ...perks.exportFor(id),
      });
    }

    if (method === 'POST' && path === '/api/me/password') {
      const { account } = requireAccount(req);
      const body = (await readJson(req)) as Record<string, unknown>;
      const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
      const next = validateNewPassword(body.newPassword, account.email);
      // Guessing the current password is as limited as guessing at sign-in.
      if (!loginLimiter.allow(`password|${account.id}`, now().getTime())) {
        throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
      }
      // An account made with Google or Apple sets its first password without one.
      if (hasPassword(account) && !verifyPassword(current, account.password_hash)) throw new HttpError(403, 'Your current password isn\u2019t right.');
      db.prepare('update users set password_hash = ? where id = ?').run(hashPassword(next), account.id);
      // Anyone else signed in as you is signed out; this device stays in.
      endOtherSessions(db, account.id, bearer(req)!);
      return send(res, 204);
    }

    // Your profile picture. It's shown only to you, in your own Profile and
    // tab bar, never beside your reviews or photos, so it needs no moderator.
    // Like a gym photo, its metadata (a phone photo's GPS location) is removed
    // before it's kept, and the old picture's file goes when it's replaced.
    if (path === '/api/me/avatar' && (method === 'PUT' || method === 'DELETE')) {
      const { account } = requireAccount(req);
      let next: { id: string; type: PhotoType } | null = null;
      if (method === 'PUT') {
        const body = (await readJson(req, Math.ceil(MAX_AVATAR_BYTES * 1.4) + 1024)) as Record<string, unknown>;
        if (typeof body.data !== 'string' || body.data.length === 0) throw new HttpError(400, 'No picture was attached.');
        const raw = Buffer.from(body.data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
        if (raw.length > MAX_AVATAR_BYTES) throw new HttpError(413, 'Profile pictures can be up to 2 MB.');
        const clean = cleanPhoto(raw);
        if (!clean) throw new HttpError(400, 'That isn\u2019t a JPEG or PNG picture we can read.');
        if (!avatarLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That\u2019s a lot of new pictures for one day. Try again tomorrow.');
        next = { id: `avatar-${randomUUID()}`, type: clean.type };
        photos.save(next.id, next.type, clean.bytes);
      }
      db.prepare('update users set avatar_id = ?, avatar_type = ? where id = ?').run(next?.id ?? null, next?.type ?? null, account.id);
      if (account.avatar_id && account.avatar_type) photos.remove(account.avatar_id, account.avatar_type);
      return send(res, 200, { account: accountJson({ ...account, avatar_id: next?.id ?? null, avatar_type: next?.type ?? null }) });
    }

    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'avatars' && parts.length === 3) {
      const id = decodeURIComponent(parts[2]!);
      const row = db.prepare('select avatar_id, avatar_type from users where avatar_id = ?').get(id) as { avatar_id: string; avatar_type: PhotoType } | undefined;
      const bytes = row ? photos.read(row.avatar_id, row.avatar_type) : null;
      if (!row || !bytes) throw new HttpError(404, 'No such picture.');
      res.statusCode = 200;
      res.setHeader('Content-Type', row.avatar_type === 'jpeg' ? 'image/jpeg' : 'image/png');
      // A new picture gets a new id, so this one never changes.
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(bytes);
      return;
    }

    // Agreeing to the terms as they are now, after they've changed.
    if (method === 'POST' && path === '/api/me/terms') {
      const { account } = requireAccount(req);
      const body = (await readJson(req)) as Record<string, unknown>;
      if (body.version !== LEGAL_VERSION) throw new HttpError(409, 'The terms have changed again. Reopen GymGO to see them.');
      db.prepare('update users set terms_version = ?, terms_accepted_at = ? where id = ?').run(LEGAL_VERSION, now().toISOString(), account.id);
      return send(res, 200, { account: accountJson({ ...account, terms_version: LEGAL_VERSION }) });
    }

    if (path === '/api/me') {
      const { account } = requireAccount(req);
      if (method === 'GET') return send(res, 200, { account: accountJson(account), plan: billing.planFor(account.id).plan });
      if (method === 'PATCH') {
        const body = (await readJson(req)) as Record<string, unknown>;
        const displayName = validateDisplayName(body.displayName);
        db.prepare('update users set display_name = ? where id = ?').run(displayName, account.id);
        return send(res, 200, { account: accountJson({ ...account, display_name: displayName }) });
      }
      if (method === 'DELETE') {
        // A running subscription is cancelled first, so nobody keeps paying
        // for an account that's gone. If that can't happen, nothing is deleted.
        await billing.cancelAllFor(account.id);
        // Sessions, saved gyms, reviews and photo records go with it (foreign
        // keys cascade); the photo files are removed here.
        const owned = db.prepare('select id, type from photos where user_id = ?').all(account.id) as Array<{ id: string; type: PhotoType }>;
        for (const photo of owned) photos.remove(photo.id, photo.type);
        if (account.avatar_id && account.avatar_type) photos.remove(account.avatar_id, account.avatar_type);
        db.prepare('delete from users where id = ?').run(account.id);
        owners.forget();
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
        const limit = billing.planFor(account.id).limits.savedGyms;
        const already = db.prepare('select 1 from saved_gyms where user_id = ? and gym_id = ?').get(account.id, gymId);
        const count = (db.prepare('select count(*) as n from saved_gyms where user_id = ?').get(account.id) as { n: number }).n;
        if (!already && count >= limit) {
          throw new HttpError(403, `Free accounts can save ${limit} gyms. GymGO Pro saves as many as you like.`, 'pro_required');
        }
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

    // --- What members say a gym has ------------------------------------------
    // Gyms rarely publish their equipment, so members who train there tick
    // what they saw. Each member has one report per gym, which they can
    // change. These are shown as tallies ("3 members say yes"), apart from
    // what the gym itself publishes, and never decide a search result.
    if (parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'equipment' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');

      if (method === 'GET') {
        const { account } = caller(req);
        const items = db
          .prepare(
            `select equipment_type_id,
                    sum(presence = 'yes') as yes,
                    sum(presence = 'no') as no,
                    max(case when presence = 'yes' then max_weight_kg end) as max_weight_kg,
                    max(reported_at) as last_reported_at
             from equipment_reports where gym_id = ? group by equipment_type_id`,
          )
          .all(gymId) as Array<{ equipment_type_id: string; yes: number; no: number; max_weight_kg: number | null; last_reported_at: string }>;
        const reporters = (db.prepare('select count(distinct user_id) as n from equipment_reports where gym_id = ?').get(gymId) as { n: number }).n;
        const mine = account
          ? (db
              .prepare('select equipment_type_id, presence, max_weight_kg from equipment_reports where gym_id = ? and user_id = ?')
              .all(gymId, account.id) as Array<{ equipment_type_id: string; presence: 'yes' | 'no'; max_weight_kg: number | null }>)
          : [];
        return send(res, 200, {
          reporters,
          items: items.map((row) => ({
            equipmentTypeId: row.equipment_type_id,
            yes: row.yes,
            no: row.no,
            maxWeightKg: row.max_weight_kg,
            lastReportedAt: row.last_reported_at,
          })),
          mine: mine.map((row) => ({ equipmentTypeId: row.equipment_type_id, presence: row.presence, maxWeightKg: row.max_weight_kg })),
        });
      }

      if (method === 'PUT') {
        const { account, user } = requireAccount(req);
        requirePermission(user, 'correction.create', gymId);
        if (gymIsDemo(db, gymId)) throw new HttpError(400, 'This is an invented demo gym, so there\u2019s nothing real to report.');
        const body = (await readJson(req)) as Record<string, unknown>;
        if (!Array.isArray(body.items)) throw new HttpError(400, 'Send the list of what you saw.');
        const seen = new Set<string>();
        const items = body.items.map((raw) => {
          const item = (raw ?? {}) as Record<string, unknown>;
          const type = EQUIPMENT_TYPES.find((candidate) => candidate.id === item.equipmentTypeId);
          if (!type) throw new HttpError(400, 'That isn\u2019t equipment we track.');
          if (seen.has(type.id)) throw new HttpError(400, `${type.label} is listed twice.`);
          seen.add(type.id);
          if (item.presence !== 'yes' && item.presence !== 'no') throw new HttpError(400, `Say yes or no for ${type.label}.`);
          let maxWeightKg: number | null = null;
          if (item.maxWeightKg !== undefined && item.maxWeightKg !== null) {
            const kg = Number(item.maxWeightKg);
            if (!type.usesMaxWeight || item.presence !== 'yes' || !Number.isInteger(kg) || kg < 1 || kg > 200) {
              throw new HttpError(400, `The heaviest ${type.label.toLowerCase()} should be a whole number of kg, up to 200.`);
            }
            maxWeightKg = kg;
          }
          return { typeId: type.id, presence: item.presence, maxWeightKg };
        });
        if (!equipmentLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That\u2019s a lot of updates for one day. Try again tomorrow.');

        const at = now().toISOString();
        const insert = db.prepare(
          `insert into equipment_reports (gym_id, user_id, equipment_type_id, presence, max_weight_kg, reported_at) values (?, ?, ?, ?, ?, ?)`,
        );
        db.exec('begin');
        try {
          // A report replaces your last one for this gym, so "not sure" clears a tick.
          db.prepare('delete from equipment_reports where gym_id = ? and user_id = ?').run(gymId, account.id);
          for (const item of items) insert.run(gymId, account.id, item.typeId, item.presence, item.maxWeightKg, at);
          db.exec('commit');
        } catch (error) {
          db.exec('rollback');
          throw error;
        }
        return send(res, 204);
      }
    }

    // The typical price members paid at each gym, for lists: one request, not one per gym.
    if (method === 'GET' && path === '/api/prices/typical') {
      const since = new Date(now().getTime() - PRICE_REPORT_DAYS * 86_400_000).toISOString().slice(0, 10);
      const rows = db
        .prepare('select gym_id, amount_minor from price_reports where paid_on >= ? order by gym_id, amount_minor')
        .all(since) as Array<{ gym_id: string; amount_minor: number }>;
      const byGym = new Map<string, number[]>();
      for (const row of rows) byGym.set(row.gym_id, [...(byGym.get(row.gym_id) ?? []), row.amount_minor]);
      const typical: Record<string, { typicalMinor: number; count: number }> = {};
      for (const [gymId, amounts] of byGym) typical[gymId] = { typicalMinor: median(amounts), count: amounts.length };
      return send(res, 200, { typical });
    }

    // Machine search: which gyms members say have the machines asked for, in
    // one request. No position is sent: the app keeps the gyms near the
    // search itself, as it does with every list.
    if (method === 'GET' && path === '/api/equipment/reported') {
      const types = [...new Set((url.searchParams.get('types') ?? '').split(',').map((type) => type.trim()).filter(Boolean))];
      if (types.length === 0) throw new HttpError(400, 'Say which equipment to look for.');
      if (types.length > 8) throw new HttpError(400, 'Pick up to 8 at once.');
      for (const type of types) {
        if (!EQUIPMENT_TYPES.some((candidate) => candidate.id === type)) throw new HttpError(400, 'That isn\u2019t equipment we track.');
      }
      const rows = db
        .prepare(
          `select gym_id, equipment_type_id,
                  sum(presence = 'yes') as yes,
                  sum(presence = 'no') as no,
                  max(case when presence = 'yes' then max_weight_kg end) as max_weight_kg
           from equipment_reports where equipment_type_id in (${types.map(() => '?').join(', ')})
           group by gym_id, equipment_type_id having yes > 0`,
        )
        .all(...types) as Array<{ gym_id: string; equipment_type_id: string; yes: number; no: number; max_weight_kg: number | null }>;
      const gyms: Record<string, Record<string, { yes: number; no: number; maxWeightKg: number | null }>> = {};
      for (const row of rows) {
        (gyms[row.gym_id] ??= {})[row.equipment_type_id] = { yes: row.yes, no: row.no, maxWeightKg: row.max_weight_kg };
      }
      return send(res, 200, { gyms });
    }

    // --- Ratings from published reviews, for every gym that has any ----------
    // Lists and cards show a gym's rating without fetching its reviews. Only
    // published reviews count; the average is to one decimal, as a gym's own
    // review section shows it.
    if (method === 'GET' && path === '/api/reviews/ratings') {
      const rows = db
        .prepare(`select gym_id, count(*) as count, avg(overall) as average from reviews where status = 'published' group by gym_id`)
        .all() as Array<{ gym_id: string; count: number; average: number }>;
      const ratings: Record<string, { average: number; count: number }> = {};
      for (const row of rows) ratings[row.gym_id] = { average: Math.round(row.average * 10) / 10, count: row.count };
      return send(res, 200, { ratings });
    }

    // --- What members paid for a casual visit ---------------------------------
    // Members' reports, shown as theirs next to (never instead of) what the gym
    // publishes. The typical figure is the median, so one odd report can't
    // move it far; reports over two years old stop counting.
    if (parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'prices' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');
      // Reports are kept in the gym's country's own currency, never converted;
      // none where the exchange rate is too unsettled to check a price against.
      const country = gymCountry(db, gymId);
      const currency = country ? reportCurrency(country) : null;
      const since = new Date(now().getTime() - PRICE_REPORT_DAYS * 86_400_000).toISOString().slice(0, 10);

      if (method === 'GET' && currency === null) {
        return send(res, 200, { currency: null, count: 0, typicalMinor: null, lowMinor: null, highMinor: null, latestPaidOn: null, mine: null });
      }
      if (method === 'GET') {
        const { account } = caller(req);
        const rows = db
          .prepare('select amount_minor, paid_on from price_reports where gym_id = ? and currency = ? and paid_on >= ? order by amount_minor')
          .all(gymId, currency, since) as Array<{ amount_minor: number; paid_on: string }>;
        const amounts = rows.map((row) => row.amount_minor);
        const mine = account
          ? (db.prepare('select amount_minor, paid_on from price_reports where gym_id = ? and user_id = ?').get(gymId, account.id) as
              | { amount_minor: number; paid_on: string }
              | undefined)
          : undefined;
        return send(res, 200, {
          currency,
          count: amounts.length,
          typicalMinor: amounts.length ? median(amounts) : null,
          lowMinor: amounts[0] ?? null,
          highMinor: amounts.at(-1) ?? null,
          latestPaidOn: rows.reduce<string | null>((latest, row) => (latest && latest > row.paid_on ? latest : row.paid_on), null),
          mine: mine ? { amountMinor: mine.amount_minor, paidOn: mine.paid_on } : null,
        });
      }

      if (method === 'PUT' || method === 'DELETE') {
        const { account, user } = requireAccount(req);
        requirePermission(user, 'correction.create', gymId);
        if (method === 'DELETE') {
          db.prepare('delete from price_reports where gym_id = ? and user_id = ?').run(gymId, account.id);
          return send(res, 204);
        }
        if (gymIsDemo(db, gymId)) throw new HttpError(400, 'This is an invented demo gym, so there\u2019s nothing real to report.');
        if (currency === null) {
          throw new HttpError(400, 'GymGO doesn\u2019t keep visit prices here yet: the exchange rate moves too much to check a price against.');
        }
        const body = (await readJson(req)) as Record<string, unknown>;
        const amount = Number(body.amountMinor);
        // A$1 to A$500, or the same in the currency's own sizes (¥100 to ¥50,000): typos, not dear gyms.
        const range = visitPriceRange(currency);
        if (!Number.isInteger(amount) || amount < range.minMinor || amount > range.maxMinor) {
          throw new HttpError(400, `Enter what one casual visit cost, between ${priceLabel(range.minMinor, currency)} and ${priceLabel(range.maxMinor, currency)}.`);
        }
        const paidOn = typeof body.paidOn === 'string' ? body.paidOn : '';
        const tomorrow = new Date(now().getTime() + 86_400_000).toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(Date.parse(paidOn)) || paidOn > tomorrow) {
          throw new HttpError(400, 'Say when you paid, as a date that has happened.');
        }
        if (paidOn < since) throw new HttpError(400, 'That was over two years ago; prices change, so it wouldn\u2019t help anyone now.');
        if (!priceLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That\u2019s a lot of updates for one day. Try again tomorrow.');
        db.prepare(
          `insert into price_reports (gym_id, user_id, amount_minor, currency, paid_on, reported_at) values (?, ?, ?, ?, ?, ?)
           on conflict (gym_id, user_id) do update set amount_minor = excluded.amount_minor, currency = excluded.currency,
             paid_on = excluded.paid_on, reported_at = excluded.reported_at`,
        ).run(gymId, account.id, amount, currency, paidOn, now().toISOString());
        return send(res, 204);
      }
    }

    // --- How getting in went for visiting members -------------------------------
    // Members' reports of their own visits, shown as theirs next to (never
    // instead of) what the gym publishes about guests. Door policies change,
    // so only the last year counts.
    if (parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'access' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');
      const since = new Date(now().getTime() - ACCESS_REPORT_DAYS * 86_400_000).toISOString().slice(0, 10);

      if (method === 'GET') {
        const { account } = caller(req);
        const rows = db
          .prepare('select outcome, visited_on from access_reports where gym_id = ? and visited_on >= ?')
          .all(gymId, since) as Array<{ outcome: AccessOutcome; visited_on: string }>;
        const counts = { walked_in: 0, booked_first: 0, turned_away: 0 };
        for (const row of rows) counts[row.outcome] += 1;
        const mine = account
          ? (db.prepare('select outcome, visited_on from access_reports where gym_id = ? and user_id = ?').get(gymId, account.id) as
              | { outcome: AccessOutcome; visited_on: string }
              | undefined)
          : undefined;
        return send(res, 200, {
          count: rows.length,
          walkedIn: counts.walked_in,
          bookedFirst: counts.booked_first,
          turnedAway: counts.turned_away,
          latestVisitOn: rows.reduce<string | null>((latest, row) => (latest && latest > row.visited_on ? latest : row.visited_on), null),
          mine: mine ? { outcome: mine.outcome, visitedOn: mine.visited_on } : null,
        });
      }

      if (method === 'PUT' || method === 'DELETE') {
        const { account, user } = requireAccount(req);
        requirePermission(user, 'correction.create', gymId);
        if (method === 'DELETE') {
          db.prepare('delete from access_reports where gym_id = ? and user_id = ?').run(gymId, account.id);
          return send(res, 204);
        }
        if (gymIsDemo(db, gymId)) throw new HttpError(400, 'This is an invented demo gym, so there\u2019s nothing real to report.');
        const body = (await readJson(req)) as Record<string, unknown>;
        const outcome = body.outcome;
        if (outcome !== 'walked_in' && outcome !== 'booked_first' && outcome !== 'turned_away') {
          throw new HttpError(400, 'Say whether you walked in, had to book first, or were turned away.');
        }
        const visitedOn = typeof body.visitedOn === 'string' ? body.visitedOn : '';
        const tomorrow = new Date(now().getTime() + 86_400_000).toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(visitedOn) || Number.isNaN(Date.parse(visitedOn)) || visitedOn > tomorrow) {
          throw new HttpError(400, 'Say when you went, as a date that has happened.');
        }
        if (visitedOn < since) throw new HttpError(400, 'That was over a year ago; door rules change, so it wouldn\u2019t help anyone now.');
        if (!accessLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That\u2019s a lot of updates for one day. Try again tomorrow.');
        db.prepare(
          `insert into access_reports (gym_id, user_id, outcome, visited_on, reported_at) values (?, ?, ?, ?, ?)
           on conflict (gym_id, user_id) do update set outcome = excluded.outcome, visited_on = excluded.visited_on, reported_at = excluded.reported_at`,
        ).run(gymId, account.id, outcome, visitedOn, now().toISOString());
        return send(res, 204);
      }
    }

    // --- Whether the gym is still there, from members -------------------------
    // Map data can be years old. Members who went by say it has closed, or
    // that it's still open; the card warns only on their word, labelled as
    // theirs. Six months of reports count.
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'passes' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');
      return send(res, 200, { passes: perks.passesAt(gymId), available: billing.enabled });
    }

    // --- Verified owners (owners.ts) ---------------------------------------------
    if (parts[0] === 'api' && parts[1] === 'gyms' && (parts[3] === 'owner' || parts[3] === 'claim' || parts[3] === 'owner-updates') && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      const record = gymRecord(db, gymId);
      if (!record) throw new HttpError(404, 'No gym with that id.');
      try {
        if (parts[3] === 'owner' && method === 'GET') {
          const { account, user } = caller(req);
          const owned = owners.isOwned(gymId);
          return send(res, 200, {
            verified: owned !== null,
            since: owned?.since ?? null,
            updates: owners.approved().filter((update) => update.gymId === gymId).map((update) => ({ kind: update.payload.kind, approvedAt: update.approvedAt })),
            you: account
              ? { owner: user.ownedGymIds.includes(gymId), claim: owners.claimFor(account.id, gymId), submissions: user.ownedGymIds.includes(gymId) ? owners.updatesBy(account.id, gymId) : [] }
              : null,
          });
        }
        if (parts[3] === 'claim' && method === 'POST') {
          const { account, user } = requireAccount(req);
          requirePermission(user, 'claim.create', gymId);
          if (record.location.isDemoData) throw new HttpError(400, 'This is an invented demo gym; there’s no one to claim it.');
          return send(res, 201, owners.claim(account.id, gymId, (await readJson(req)) as Record<string, unknown>));
        }
        if (parts[3] === 'owner-updates' && method === 'POST') {
          const { account, user } = requireAccount(req);
          if (!user.ownedGymIds.includes(gymId)) throw new HttpError(403, 'Only this gym’s verified owner can update it.');
          requirePermission(user, 'gym.edit', gymId);
          return send(res, 201, owners.submitUpdate(account.id, gymId, record.location.address.countryCode, await readJson(req)));
        }
      } catch (error) {
        if (error instanceof OwnerError) throw new HttpError(error.status, error.message);
        throw error;
      }
    }

    if (parts[0] === 'api' && parts[1] === 'moderation' && (parts[2] === 'claims' || parts[2] === 'owner-updates' || parts[2] === 'counts')) {
      const { user } = requireAccount(req);
      try {
        if (path === '/api/moderation/counts' && method === 'GET') {
          requirePermission(user, 'moderation.view_queue');
          const waiting = owners.counts();
          const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
          return send(res, 200, {
            reviews: count(`select count(*) as n from reviews where status = 'pending'`),
            photos: count(`select count(*) as n from photos where status = 'pending'`),
            ownerUpdates: waiting.ownerUpdates,
            // Claims hold personal details: admins only.
            claims: can(user, 'claim.moderate') ? waiting.claims : null,
          });
        }
        if (parts[2] === 'claims') {
          requirePermission(user, 'claim.moderate');
          if (parts.length === 3 && method === 'GET') return send(res, 200, { claims: owners.claimQueue() });
          if (parts.length === 4 && method === 'POST') {
            const body = (await readJson(req)) as Record<string, unknown>;
            owners.decideClaim(user.id, decodeURIComponent(parts[3]!), body.decision, body.reason);
            return send(res, 204);
          }
        }
        if (parts[2] === 'owner-updates') {
          requirePermission(user, 'correction.moderate');
          if (parts.length === 3 && method === 'GET') return send(res, 200, { updates: owners.updateQueue() });
          if (parts.length === 4 && method === 'POST') {
            const body = (await readJson(req)) as Record<string, unknown>;
            owners.decideUpdate(user.id, decodeURIComponent(parts[3]!), body.decision, body.reason);
            return send(res, 204);
          }
        }
      } catch (error) {
        if (error instanceof OwnerError) throw new HttpError(error.status, error.message);
        throw error;
      }
      throw new HttpError(404, 'Not found.');
    }

    // --- Is it busy? From members there now -----------------------------------
    // Each member has one report per gym, replaced by their next. A level is
    // shown only once 3 have said so in the last hour (domain busy.ts); the
    // app asks for it only from someone its location check puts at the gym.
    if (parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'busy' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');
      if (method === 'GET') {
        const { account } = caller(req);
        forgetOldBusy(now());
        const since = new Date(now().getTime() - BUSY_WINDOW_MINUTES * 60_000).toISOString();
        const rows = db.prepare('select level, reported_at from busy_reports where gym_id = ? and reported_at >= ?').all(gymId, since) as Array<{
          level: BusyLevel;
          reported_at: string;
        }>;
        const mine = account
          ? (db.prepare('select level, reported_at from busy_reports where gym_id = ? and user_id = ? and reported_at >= ?').get(gymId, account.id, since) as
              | { level: BusyLevel; reported_at: string }
              | undefined)
          : undefined;
        return send(res, 200, {
          ...busyNow(rows.map((row) => ({ level: row.level, reportedAt: row.reported_at })), now()),
          windowMinutes: BUSY_WINDOW_MINUTES,
          minimum: BUSY_MINIMUM,
          mine: mine ? { level: mine.level, reportedAt: mine.reported_at } : null,
        });
      }
      if (method === 'PUT' || method === 'DELETE') {
        const { account, user } = requireAccount(req);
        requirePermission(user, 'correction.create', gymId);
        if (method === 'DELETE') {
          db.prepare('delete from busy_reports where gym_id = ? and user_id = ?').run(gymId, account.id);
          return send(res, 204);
        }
        if (gymIsDemo(db, gymId)) throw new HttpError(400, 'This is an invented demo gym, so there\u2019s nothing real to report.');
        const level = ((await readJson(req)) as Record<string, unknown>).level;
        if (!isBusyLevel(level)) throw new HttpError(400, 'Say how busy it is: quiet, steady, busy or packed.');
        if (!busyLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That\u2019s a lot of updates for one day. Try again tomorrow.');
        db.prepare(
          `insert into busy_reports (gym_id, user_id, level, reported_at) values (?, ?, ?, ?)
           on conflict (gym_id, user_id) do update set level = excluded.level, reported_at = excluded.reported_at`,
        ).run(gymId, account.id, level, now().toISOString());
        return send(res, 204);
      }
    }

    if (parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'status' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      if (!gymExists(db, gymId)) throw new HttpError(404, 'No gym with that id.');
      const since = new Date(now().getTime() - STATUS_REPORT_DAYS * 86_400_000).toISOString().slice(0, 10);

      if (method === 'GET') {
        const { account } = caller(req);
        const rows = db
          .prepare('select status, seen_on from status_reports where gym_id = ? and seen_on >= ?')
          .all(gymId, since) as Array<{ status: 'closed' | 'open'; seen_on: string }>;
        const latest = (status: 'closed' | 'open') =>
          rows.filter((row) => row.status === status).reduce<string | null>((max, row) => (max && max > row.seen_on ? max : row.seen_on), null);
        const mine = account
          ? (db.prepare('select status, seen_on from status_reports where gym_id = ? and user_id = ?').get(gymId, account.id) as
              | { status: 'closed' | 'open'; seen_on: string }
              | undefined)
          : undefined;
        return send(res, 200, {
          closed: rows.filter((row) => row.status === 'closed').length,
          open: rows.filter((row) => row.status === 'open').length,
          latestClosedOn: latest('closed'),
          latestOpenOn: latest('open'),
          mine: mine ? { status: mine.status, seenOn: mine.seen_on } : null,
        });
      }

      if (method === 'PUT' || method === 'DELETE') {
        const { account, user } = requireAccount(req);
        requirePermission(user, 'correction.create', gymId);
        if (method === 'DELETE') {
          db.prepare('delete from status_reports where gym_id = ? and user_id = ?').run(gymId, account.id);
          return send(res, 204);
        }
        if (gymIsDemo(db, gymId)) throw new HttpError(400, 'This is an invented demo gym, so there\u2019s nothing real to report.');
        const body = (await readJson(req)) as Record<string, unknown>;
        const status = body.status;
        if (status !== 'closed' && status !== 'open') throw new HttpError(400, 'Say whether it has closed or is still open.');
        const seenOn = typeof body.seenOn === 'string' ? body.seenOn : '';
        const tomorrow = new Date(now().getTime() + 86_400_000).toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(seenOn) || Number.isNaN(Date.parse(seenOn)) || seenOn > tomorrow) {
          throw new HttpError(400, 'Say when you saw it, as a date that has happened.');
        }
        if (seenOn < since) throw new HttpError(400, 'That was over six months ago; say what you saw more recently.');
        if (!statusLimiter.allow(account.id, now().getTime())) throw new HttpError(429, 'That\u2019s a lot of updates for one day. Try again tomorrow.');
        db.prepare(
          `insert into status_reports (gym_id, user_id, status, seen_on, reported_at) values (?, ?, ?, ?, ?)
           on conflict (gym_id, user_id) do update set status = excluded.status, seen_on = excluded.seen_on, reported_at = excluded.reported_at`,
        ).run(gymId, account.id, status, seenOn, now().toISOString());
        return send(res, 204);
      }
    }

    // --- The gym's own website icon -------------------------------------------
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'icon' && parts.length === 4) {
      const record = gymRecord(db, decodeURIComponent(parts[2]!));
      if (!record) throw new HttpError(404, 'No gym with that id.');
      chainSite ??= chainWebsites(allGyms(db));
      // Its own site, else its chain's: named by other branches, or a chain GymGO knows.
      const website = record.location.website ?? chainSite(record) ?? chainSiteFor(record.location);
      if (options.siteIcons?.enabled === false) throw new HttpError(404, 'Website icons are switched off.', 'off');
      // A missing icon is kept by the browser too, so a list doesn't ask again
      // on every visit: a day when there's no website, an hour when the site had
      // no usable icon or didn't answer (the server asks such a site again after
      // an hour at the soonest).
      if (record.location.isDemoData || !website) {
        return send(res, 404, { error: 'This gym has no website to take an icon from.', code: 'none' }, 'public, max-age=86400');
      }
      let icon = siteIcons.cached(website);
      if (icon === undefined) {
        if (!iconLimiter.allow(clientAddress(req), now().getTime())) throw new HttpError(429, 'Too many icons at once. Try again soon.');
        icon = await siteIcons.icon(website);
      }
      if (!icon) return send(res, 404, { error: 'The gym’s website has no icon GymGO can show.', code: 'none' }, 'public, max-age=3600');
      res.statusCode = 200;
      res.setHeader('Content-Type', icon.mime);
      res.setHeader('Content-Length', String(icon.bytes.length));
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('X-Icon-Source', encodeURI(icon.source));
      res.end(icon.bytes);
      return;
    }

    // --- A photo of the gym, from its own website ------------------------------
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'photo' && parts.length === 4) {
      const record = gymRecord(db, decodeURIComponent(parts[2]!));
      if (!record) throw new HttpError(404, 'No gym with that id.');
      if (options.siteIcons?.enabled === false) throw new HttpError(404, 'Website pictures are switched off.', 'off');
      photoSite ??= ownPhotoSites(allGyms(db));
      const website = photoSite(record);
      if (!website) {
        return send(res, 404, { error: 'This gym has no website of its own to take a photo from.', code: 'none' }, 'public, max-age=86400');
      }
      let photo = sitePhotos.cached(website);
      if (photo === undefined) {
        if (!sitePhotoLimiter.allow(clientAddress(req), now().getTime())) throw new HttpError(429, 'Too many photos at once. Try again soon.');
        photo = await sitePhotos.photo(website);
      }
      if (!photo) return send(res, 404, { error: 'The gym’s website has no photo GymGO can show.', code: 'none' }, 'public, max-age=3600');
      res.statusCode = 200;
      res.setHeader('Content-Type', photo.mime);
      res.setHeader('Content-Length', String(photo.bytes.length));
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('X-Photo-Source', encodeURI(website));
      res.setHeader('Access-Control-Expose-Headers', 'X-Photo-Source, X-Icon-Source');
      res.end(photo.bytes);
      return;
    }

    // --- Google Maps (live, only with the owner's key) ----------------------
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'gyms' && parts[3] === 'google' && parts.length === 4) {
      const gymId = decodeURIComponent(parts[2]!);
      const record = gymRecord(db, gymId);
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

    // --- Bug reports ------------------------------------------------------------
    // Kept first, then emailed to the team; the answer says whether the email went.
    if (method === 'POST' && path === '/api/bug-reports') {
      const { account } = caller(req);
      const key = account ? `account:${account.id}` : `address:${clientAddress(req)}`;
      if (!bugLimiter.allow(key, now().getTime())) throw new HttpError(429, 'That’s a lot of reports at once. Try again in an hour.');
      let report;
      try {
        report = cleanBugReport(await readJson(req));
      } catch (error) {
        if (error instanceof BugReportError) throw new HttpError(error.status, error.message);
        throw error;
      }
      const id = bugReports.create(report, account ? { id: account.id, email: account.email, displayName: account.display_name } : null);
      // A slow mail server doesn't keep the app waiting: after a few seconds
      // the answer goes back and the email carries on.
      const emailed = await bugReports.deliverWithin(id, 8000);
      return send(res, 201, { id, emailed });
    }

    if (method === 'GET' && path === '/api/moderation/bug-reports') {
      const { user } = requireAccount(req);
      requirePermission(user, 'moderation.view_queue');
      return send(res, 200, { emailing: bugReports.emailing, reports: bugReports.latest() });
    }

    // Price and visit reports show at once, unmoderated, so moderators can
    // look over the latest and take out any that are wrong or abusive.
    if (method === 'GET' && path === '/api/moderation/member-reports') {
      const { user } = requireAccount(req);
      requirePermission(user, 'moderation.view_queue');
      const rows = db
        .prepare(
          `select 'price' as kind, price_reports.gym_id, price_reports.user_id, users.display_name,
                  price_reports.amount_minor, price_reports.currency, null as outcome, price_reports.paid_on as on_date, price_reports.reported_at
           from price_reports join users on users.id = price_reports.user_id
           union all
           select 'access', access_reports.gym_id, access_reports.user_id, users.display_name,
                  null, null, access_reports.outcome, access_reports.visited_on, access_reports.reported_at
           from access_reports join users on users.id = access_reports.user_id
           union all
           select 'status', status_reports.gym_id, status_reports.user_id, users.display_name,
                  null, null, status_reports.status, status_reports.seen_on, status_reports.reported_at
           from status_reports join users on users.id = status_reports.user_id
           order by reported_at desc limit 50`,
        )
        .all() as Array<{
        kind: 'price' | 'access' | 'status';
        gym_id: string;
        user_id: string;
        display_name: string;
        amount_minor: number | null;
        currency: string | null;
        outcome: string | null;
        on_date: string;
        reported_at: string;
      }>;
      return send(res, 200, {
        reports: rows.map((row) => ({
          kind: row.kind,
          gymId: row.gym_id,
          userId: row.user_id,
          author: row.display_name,
          amountMinor: row.amount_minor,
          currency: row.currency,
          outcome: row.outcome,
          on: row.on_date,
          reportedAt: row.reported_at,
        })),
      });
    }

    if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'moderation' && parts[2] === 'member-reports' && parts.length === 6) {
      const { user } = requireAccount(req);
      requirePermission(user, 'correction.moderate');
      const table = { price: 'price_reports', access: 'access_reports', status: 'status_reports' }[parts[3] ?? ''] ?? null;
      if (!table) throw new HttpError(400, 'Say which kind of report: price, access or status.');
      const result = db
        .prepare(`delete from ${table} where gym_id = ? and user_id = ?`)
        .run(decodeURIComponent(parts[4]!), decodeURIComponent(parts[5]!));
      if (result.changes === 0) throw new HttpError(404, 'No report like that.');
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
    // Safe defaults for every answer; the HTML pages set their own CSP.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (hsts) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin, options.allowedOrigins)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return send(res, 204);

    try {
      await route(req, res);
    } catch (error) {
      if (error instanceof HttpError || error instanceof BillingError) {
        const detail = error instanceof HttpError ? error.detail : undefined;
        return send(res, error.status, { error: error.message, ...(error.code ? { code: error.code } : {}), ...detail });
      }
      if (error instanceof AuthInputError) {
        const code = error instanceof TooYoungError || error instanceof TermsNeededError ? error.code : undefined;
        return send(res, error.status, { error: error.message, ...(code ? { code } : {}) });
      }
      console.error(error);
      send(res, 500, { error: 'Something went wrong on the server.' });
    }
  };
}
