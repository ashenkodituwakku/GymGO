/**
 * A ready-made Pro account for trying GymGO locally: sign in with it to see
 * everything Pro opens (every country, more saved gyms, bigger comparisons,
 * the workout library) without connecting Stripe.
 *
 * It is a real account with a real (hashed) password, not a way round
 * signing in. Its Pro comes from a subscription record kept only here,
 * marked `dev_local`, for which nobody paid, so it must never exist on a
 * hosted GymGO: the server makes it only when GYMGO_DEV_PRO=on, and refuses
 * even then when it has a public address or live Stripe keys (see main.ts).
 * Stripe never hears of it: the account has no Stripe customer, so nothing
 * re-syncs or cancels it.
 */

import { createAccount, findByEmail, hashPassword } from './auth';
import type { Db } from './db';

/** `.test` is reserved for testing: it can never be someone's real address. */
export const DEV_PRO_EMAIL = 'dev@gymgo.test';
export const DEV_PRO_PASSWORD = 'GymGO-dev-pro-2026';
const DEV_SUBSCRIPTION = 'dev_local_pro';

/** Why the dev account can't be made here, or null when it can. */
export function devAccountRefusal(options: { publicUrl: string | null; stripeKey: string | null }): string | null {
  if (options.publicUrl) return 'this server has a public address (GYMGO_PUBLIC_URL), so it may be hosted';
  if (options.stripeKey && /^(sk|rk)_live_/.test(options.stripeKey)) return 'live Stripe keys are set, so real money is in play';
  return null;
}

/**
 * Make the dev account if it's missing, put its password back if it was
 * changed, and give it Pro until 2099. Safe to run on every start.
 */
export function ensureDevProAccount(db: Db, now = new Date()): { email: string; password: string } {
  const account =
    findByEmail(db, DEV_PRO_EMAIL) ??
    createAccount(db, { email: DEV_PRO_EMAIL, password: DEV_PRO_PASSWORD, displayName: 'GymGO Dev (Pro)' }, now)!;
  db.prepare('update users set password_hash = ?, blocked = 0 where id = ?').run(hashPassword(DEV_PRO_PASSWORD), account.id);
  db.prepare(
    `insert into subscriptions (stripe_subscription_id, user_id, status, interval, currency, amount_minor, price_lookup_key, current_period_end, cancel_at, cancel_at_period_end, updated_at)
     values (?, ?, 'active', 'year', 'usd', 0, 'dev_local', '2099-12-31T00:00:00Z', null, 0, ?)
     on conflict(stripe_subscription_id) do update set user_id = excluded.user_id, status = 'active', cancel_at = null, cancel_at_period_end = 0,
       current_period_end = excluded.current_period_end, updated_at = excluded.updated_at`,
  ).run(DEV_SUBSCRIPTION, account.id, now.toISOString());
  return { email: DEV_PRO_EMAIL, password: DEV_PRO_PASSWORD };
}
