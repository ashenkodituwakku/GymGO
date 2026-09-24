/**
 * GymGO Pro through Stripe: checkout, the customer portal, webhooks, and who
 * is Pro.
 *
 * Stripe holds everything about money: prices, cards, invoices, receipts,
 * refunds. GymGO never sees a card number. The database keeps only which
 * Stripe customer is which account, and each subscription's status, so the
 * server can decide "Pro or Free" without calling Stripe on every request.
 *
 * Status reaches the server three ways, so Pro turns on even when Stripe's
 * webhooks can't reach a server on someone's own computer:
 *  - the webhook, when it's set up (the reliable way, and the only one that
 *    hears about renewals and failed payments on its own);
 *  - the page people land on after paying, which asks Stripe about that
 *    checkout straight away;
 *  - an explicit sync, which the app asks for after checkout and the portal.
 * Whichever way, the server re-reads the subscription from Stripe rather than
 * trusting what it was sent, so events arriving out of order can't win.
 */

import Stripe from 'stripe';
import {
  LIMITS,
  PRO_PRICES,
  isProStatus,
  type BillingCurrency,
  type BillingInterval,
  type PlanId,
  type PlanLimits,
  type ProPrice,
} from '@gymgo/domain';
import type { Db } from './db';

// --- The parts of Stripe used here ---------------------------------------------

type Expandable = string | { id: string } | null;

export interface StripePrice {
  id: string;
  active: boolean;
  lookup_key: string | null;
  currency: string;
  unit_amount: number | null;
  recurring: { interval: string } | null;
}

export interface StripeSubscription {
  id: string;
  status: string;
  customer: Expandable;
  cancel_at_period_end: boolean;
  cancel_at: number | null;
  metadata: Record<string, string> | null;
  items: { data: Array<{ current_period_end: number; price: StripePrice }> };
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  customer: Expandable;
  client_reference_id: string | null;
  subscription: Expandable;
}

/** The real client satisfies this; tests pass a fake that never calls Stripe. */
export interface StripeApi {
  customers: {
    create(params: { email: string; name: string; metadata: Record<string, string> }, options?: { idempotencyKey?: string }): Promise<{ id: string }>;
  };
  checkout: {
    sessions: {
      create(params: Record<string, unknown>): Promise<StripeCheckoutSession>;
      retrieve(id: string): Promise<StripeCheckoutSession>;
    };
  };
  billingPortal: {
    sessions: { create(params: { customer: string; return_url: string; configuration?: string }): Promise<{ url: string }> };
    configurations: { list(params: { active?: boolean; limit?: number }): Promise<{ data: Array<{ id: string; metadata: Record<string, string> | null }> }> };
  };
  subscriptions: {
    list(params: { customer: string; status: 'all'; limit?: number }): Promise<{ data: StripeSubscription[] }>;
    retrieve(id: string): Promise<StripeSubscription>;
    cancel(id: string): Promise<StripeSubscription>;
  };
  prices: {
    list(params: { lookup_keys: string[]; active?: boolean; limit?: number }): Promise<{ data: StripePrice[] }>;
  };
}

export function createStripe(secretKey: string): StripeApi {
  return new Stripe(secretKey, { appInfo: { name: 'GymGO', url: 'https://github.com/ashenkodituwakku/GymGO' } });
}

// --- Errors ----------------------------------------------------------------------

export class BillingError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

// --- What the app is told ----------------------------------------------------------

export interface SubscriptionView {
  status: string;
  interval: BillingInterval | null;
  currency: BillingCurrency | null;
  amountMinor: number | null;
  /** When it next renews; null once it's set to end. */
  renewsAt: string | null;
  /** When Pro ends, if it's been cancelled. */
  endsAt: string | null;
}

export interface PlanView {
  plan: PlanId;
  limits: PlanLimits;
  subscription: SubscriptionView | null;
}

interface SubscriptionRow {
  stripe_subscription_id: string;
  user_id: string;
  status: string;
  interval: string | null;
  currency: string | null;
  amount_minor: number | null;
  current_period_end: string | null;
  cancel_at: string | null;
  cancel_at_period_end: number;
  updated_at: string;
}

const iso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);
const idOf = (value: Expandable) => (value === null ? null : typeof value === 'string' ? value : value.id);
const PRICE_CACHE_MS = 10 * 60_000;
const SYNC_EVERY_MS = 10 * 60_000;

export interface BillingOptions {
  stripe: StripeApi | null;
  webhookSecret: string | null;
  now: () => Date;
}

export class Billing {
  private priceCache: { at: number; prices: Array<ProPrice & { id: string }> } | null = null;
  private portalConfig: { id: string | null } | null = null;

  constructor(
    private readonly db: Db,
    private readonly options: BillingOptions,
  ) {}

  /** Payments are connected: a Stripe key is set. */
  get enabled(): boolean {
    return this.options.stripe !== null;
  }

  private get stripe(): StripeApi {
    if (!this.options.stripe) {
      throw new BillingError(503, 'Payments aren’t connected on this GymGO server yet.', 'billing_off');
    }
    return this.options.stripe;
  }

  // --- Prices ------------------------------------------------------------------------

  /**
   * The prices on sale, read from Stripe by lookup key. Without Stripe, the
   * planned prices, marked as not on sale.
   */
  async prices(): Promise<{ available: boolean; prices: ProPrice[] }> {
    if (!this.enabled) return { available: false, prices: PRO_PRICES };
    const live = await this.stripePrices();
    return { available: live.length > 0, prices: live.map(({ id: _id, ...price }) => price) };
  }

  private async stripePrices(): Promise<Array<ProPrice & { id: string }>> {
    const now = this.options.now().getTime();
    if (this.priceCache && now - this.priceCache.at < PRICE_CACHE_MS) return this.priceCache.prices;
    const listed = await this.stripe.prices.list({ lookup_keys: PRO_PRICES.map((price) => price.lookupKey), active: true, limit: 10 });
    const prices = listed.data.flatMap((price): Array<ProPrice & { id: string }> => {
      const planned = PRO_PRICES.find((item) => item.lookupKey === price.lookup_key);
      const interval = price.recurring?.interval;
      const currency = price.currency;
      if (!planned || price.unit_amount === null) return [];
      if ((interval !== 'month' && interval !== 'year') || (currency !== 'aud' && currency !== 'usd')) return [];
      return [{ id: price.id, lookupKey: planned.lookupKey, interval, currency, amountMinor: price.unit_amount }];
    });
    this.priceCache = { at: now, prices };
    return prices;
  }

  // --- Who is Pro --------------------------------------------------------------------

  planFor(userId: string): PlanView {
    const rows = this.db
      .prepare('select * from subscriptions where user_id = ? order by updated_at desc')
      .all(userId) as unknown as SubscriptionRow[];
    const now = this.options.now().getTime();
    const current = rows.find((row) => isProStatus(row.status) && !this.endedLocally(row, now)) ?? null;
    const shown = current ?? rows[0] ?? null;
    const plan: PlanId = current ? 'pro' : 'free';
    return { plan, limits: LIMITS[plan], subscription: shown ? this.view(shown) : null };
  }

  isPro(userId: string): boolean {
    return this.planFor(userId).plan === 'pro';
  }

  /** Set to end, and that moment has passed, even if no webhook has said so yet. */
  private endedLocally(row: SubscriptionRow, now: number): boolean {
    const end = row.cancel_at ?? (row.cancel_at_period_end ? row.current_period_end : null);
    return end !== null && Date.parse(end) <= now;
  }

  private view(row: SubscriptionRow): SubscriptionView {
    const ending = row.cancel_at ?? (row.cancel_at_period_end ? row.current_period_end : null);
    const live = isProStatus(row.status);
    return {
      status: row.status,
      interval: row.interval === 'month' || row.interval === 'year' ? row.interval : null,
      currency: row.currency === 'aud' || row.currency === 'usd' ? row.currency : null,
      amountMinor: row.amount_minor,
      renewsAt: live && !ending ? row.current_period_end : null,
      endsAt: live ? ending : null,
    };
  }

  // --- Checkout and the portal -----------------------------------------------------------

  async checkout(
    account: { id: string; email: string; display_name: string },
    choice: { interval: BillingInterval; currency: BillingCurrency },
    urls: { success: string; cancel: string },
  ): Promise<string> {
    if (this.isPro(account.id)) throw new BillingError(409, 'You already have GymGO Pro.', 'already_pro');
    const price = (await this.stripePrices()).find((item) => item.interval === choice.interval && item.currency === choice.currency);
    if (!price) throw new BillingError(503, 'That price isn’t on sale yet. Run the Stripe setup (see README).', 'price_missing');
    const customer = await this.customerFor(account);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: account.id,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: urls.success,
      cancel_url: urls.cancel,
      metadata: { gymgo_account_id: account.id },
      subscription_data: { metadata: { gymgo_account_id: account.id } },
    });
    if (!session.url) throw new BillingError(502, 'Stripe didn’t return a checkout page. Try again.');
    return session.url;
  }

  async portal(account: { id: string }, returnUrl: string): Promise<string> {
    const customer = this.customerIdFor(account.id);
    if (!customer) throw new BillingError(404, 'There’s no subscription on this account to manage.', 'no_customer');
    const configuration = await this.gymgoPortalConfiguration();
    const session = await this.stripe.billingPortal.sessions.create({
      customer,
      return_url: returnUrl,
      ...(configuration ? { configuration } : {}),
    });
    return session.url;
  }

  /** The portal settings the setup script made, if it made some; else Stripe's default. */
  private async gymgoPortalConfiguration(): Promise<string | null> {
    if (this.portalConfig) return this.portalConfig.id;
    const listed = await this.stripe.billingPortal.configurations.list({ active: true, limit: 20 });
    const ours = listed.data.find((item) => item.metadata?.gymgo === 'pro');
    this.portalConfig = { id: ours?.id ?? null };
    return this.portalConfig.id;
  }

  private customerIdFor(userId: string): string | null {
    const row = this.db.prepare('select stripe_customer_id from billing_customers where user_id = ?').get(userId) as
      | { stripe_customer_id: string }
      | undefined;
    return row?.stripe_customer_id ?? null;
  }

  private async customerFor(account: { id: string; email: string; display_name: string }): Promise<string> {
    const existing = this.customerIdFor(account.id);
    if (existing) return existing;
    // Two quick taps must not make two customers.
    const customer = await this.stripe.customers.create(
      { email: account.email, name: account.display_name, metadata: { gymgo_account_id: account.id } },
      { idempotencyKey: `gymgo-customer-${account.id}` },
    );
    this.db
      .prepare('insert or ignore into billing_customers (user_id, stripe_customer_id, created_at) values (?, ?, ?)')
      .run(account.id, customer.id, this.options.now().toISOString());
    return this.customerIdFor(account.id) ?? customer.id;
  }

  // --- Keeping status current ----------------------------------------------------------

  /** Re-read every subscription this account has from Stripe. */
  async syncAccount(userId: string): Promise<PlanView> {
    const customer = this.customerIdFor(userId);
    if (customer && this.enabled) {
      const listed = await this.stripe.subscriptions.list({ customer, status: 'all', limit: 20 });
      for (const subscription of listed.data) this.store(subscription, userId);
      this.db.prepare('update billing_customers set synced_at = ? where user_id = ?').run(this.options.now().toISOString(), userId);
    }
    return this.planFor(userId);
  }

  /**
   * Without webhooks, a cancellation made in Stripe would never arrive, so
   * reading the plan re-syncs now and then.
   */
  async planForFresh(userId: string): Promise<PlanView> {
    if (!this.enabled || this.options.webhookSecret) return this.planFor(userId);
    const row = this.db.prepare('select synced_at from billing_customers where user_id = ?').get(userId) as
      | { synced_at: string | null }
      | undefined;
    if (!row) return this.planFor(userId);
    const stale = !row.synced_at || this.options.now().getTime() - Date.parse(row.synced_at) > SYNC_EVERY_MS;
    return stale ? this.syncAccount(userId).catch(() => this.planFor(userId)) : this.planFor(userId);
  }

  /** After paying: ask Stripe about that checkout and record the subscription. */
  async syncCheckoutSession(sessionId: string): Promise<void> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    const userId = this.linkCustomer(idOf(session.customer), session.client_reference_id);
    const subscriptionId = idOf(session.subscription);
    if (!userId || !subscriptionId) return;
    this.store(await this.stripe.subscriptions.retrieve(subscriptionId), userId);
  }

  /** Which account a Stripe customer belongs to, recording it the first time. */
  private linkCustomer(customerId: string | null, claimedUserId: string | null | undefined): string | null {
    if (!customerId) return null;
    const known = this.db.prepare('select user_id from billing_customers where stripe_customer_id = ?').get(customerId) as
      | { user_id: string }
      | undefined;
    if (known) return known.user_id;
    if (!claimedUserId) return null;
    const user = this.db.prepare('select id from users where id = ?').get(claimedUserId) as { id: string } | undefined;
    if (!user) return null;
    this.db
      .prepare('insert or ignore into billing_customers (user_id, stripe_customer_id, created_at) values (?, ?, ?)')
      .run(user.id, customerId, this.options.now().toISOString());
    return user.id;
  }

  private store(subscription: StripeSubscription, userId: string): void {
    const item = subscription.items.data[0];
    const price = item?.price;
    this.db
      .prepare(
        `insert into subscriptions
           (stripe_subscription_id, user_id, status, interval, currency, amount_minor, price_lookup_key,
            current_period_end, cancel_at, cancel_at_period_end, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(stripe_subscription_id) do update set
           status = excluded.status, interval = excluded.interval, currency = excluded.currency,
           amount_minor = excluded.amount_minor, price_lookup_key = excluded.price_lookup_key,
           current_period_end = excluded.current_period_end, cancel_at = excluded.cancel_at,
           cancel_at_period_end = excluded.cancel_at_period_end, updated_at = excluded.updated_at`,
      )
      .run(
        subscription.id,
        userId,
        subscription.status,
        price?.recurring?.interval ?? null,
        price?.currency ?? null,
        price?.unit_amount ?? null,
        price?.lookup_key ?? null,
        iso(item?.current_period_end),
        iso(subscription.cancel_at),
        subscription.cancel_at_period_end ? 1 : 0,
        this.options.now().toISOString(),
      );
  }

  // --- Webhooks ------------------------------------------------------------------------

  /**
   * Check Stripe's signature, then act once per event. The event body is
   * only a hint: the subscription is re-read from Stripe.
   */
  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const secret = this.options.webhookSecret;
    if (!secret) throw new BillingError(503, 'Webhooks aren’t set up on this server.', 'webhooks_off');
    if (!signature) throw new BillingError(400, 'Missing Stripe signature.');
    let event: { id: string; type: string; data: { object: Record<string, unknown> } };
    try {
      event = Stripe.webhooks.constructEvent(rawBody, signature, secret) as unknown as typeof event;
    } catch {
      throw new BillingError(400, 'That webhook signature doesn’t check out.');
    }
    const fresh = this.db
      .prepare('insert or ignore into stripe_events (id, type, received_at) values (?, ?, ?)')
      .run(event.id, event.type, this.options.now().toISOString());
    if (fresh.changes === 0) return; // Already handled: Stripe sends some events more than once.
    try {
      await this.apply(event);
    } catch (error) {
      // Forget it, so Stripe's retry gets another go.
      this.db.prepare('delete from stripe_events where id = ?').run(event.id);
      throw error;
    }
  }

  private async apply(event: { type: string; data: { object: Record<string, unknown> } }): Promise<void> {
    const object = event.data.object;
    if (event.type === 'checkout.session.completed') {
      const userId = this.linkCustomer(idOf(object.customer as Expandable), object.client_reference_id as string | null);
      const subscriptionId = idOf(object.subscription as Expandable);
      if (userId && subscriptionId) this.store(await this.stripe.subscriptions.retrieve(subscriptionId), userId);
      return;
    }
    if (event.type.startsWith('customer.subscription.')) {
      const subscription = await this.stripe.subscriptions.retrieve(String(object.id));
      const userId = this.linkCustomer(idOf(subscription.customer), subscription.metadata?.gymgo_account_id ?? null);
      if (userId) this.store(subscription, userId);
    }
    // Invoices and everything else: the subscription events carry what matters.
  }

  // --- Deleting an account -----------------------------------------------------------------

  /**
   * Stop every running subscription before an account is deleted, so nobody
   * keeps paying for an account that no longer exists.
   */
  async cancelAllFor(userId: string): Promise<void> {
    const running = (
      this.db.prepare('select * from subscriptions where user_id = ?').all(userId) as unknown as SubscriptionRow[]
    ).filter((row) => isProStatus(row.status) || row.status === 'incomplete' || row.status === 'unpaid' || row.status === 'paused');
    if (running.length === 0) return;
    if (!this.enabled) {
      throw new BillingError(
        409,
        'This account has a GymGO Pro subscription, and payments aren’t connected on this server to cancel it. Cancel it first.',
        'subscription_running',
      );
    }
    for (const row of running) {
      const cancelled = await this.stripe.subscriptions.cancel(row.stripe_subscription_id);
      this.store(cancelled, userId);
    }
  }
}

// --- Return addresses --------------------------------------------------------------------

/** Deep links back into the app: GymGO's own scheme, and Expo Go's. */
const APP_SCHEMES = new Set(['gymgo:', 'exp:', 'exps:']);

/**
 * Where people may be sent back to after Stripe: into the app, or to a page
 * the API already trusts. Anything else would make the server an open
 * redirect.
 */
export function safeReturnUrl(value: unknown, isAllowedWebOrigin: (origin: string) => boolean): string | null {
  if (typeof value !== 'string' || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (APP_SCHEMES.has(url.protocol)) return value;
  if ((url.protocol === 'http:' || url.protocol === 'https:') && isAllowedWebOrigin(url.origin)) return value;
  return null;
}

export function withQuery(url: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  const hash = url.indexOf('#');
  const [base, fragment] = hash === -1 ? [url, ''] : [url.slice(0, hash), url.slice(hash)];
  return `${base}${base.includes('?') ? '&' : '?'}${query}${fragment}`;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** The page Stripe sends people to: a word of thanks, then straight back into GymGO. */
export function returnPage(result: 'success' | 'cancelled' | 'portal', destination: string | null): string {
  const copy = {
    success: { emoji: '🎉', title: 'You’re on GymGO Pro', body: 'Thanks! Taking you back to GymGO…' },
    cancelled: { emoji: '👋', title: 'No charge made', body: 'You didn’t subscribe. Taking you back to GymGO…' },
    portal: { emoji: '✅', title: 'All set', body: 'Taking you back to GymGO…' },
  }[result];
  const go = destination
    ? `<p><a class="button" href="${escapeHtml(destination)}">Back to GymGO</a></p>
       <script>setTimeout(function () { location.replace(${JSON.stringify(destination).replace(/</g, '\\u003c')}); }, 600);</script>`
    : '<p>You can close this page and go back to GymGO.</p>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>GymGO</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f2f2f7; color: #1c1c1e;
         font: 17px/1.4 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif; }
  main { max-width: 340px; padding: 32px 24px; text-align: center; background: #fff; border-radius: 24px; margin: 16px; }
  .emoji { font-size: 44px; } h1 { font-size: 22px; margin: 8px 0; } p { color: #636366; margin: 8px 0; }
  .button { display: inline-block; margin-top: 12px; padding: 12px 22px; border-radius: 999px; background: #5856d6;
            color: #fff; text-decoration: none; font-weight: 600; }
</style></head>
<body><main><div class="emoji">${copy.emoji}</div><h1>${copy.title}</h1><p>${copy.body}</p>${go}</main></body></html>`;
}
