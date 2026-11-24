/**
 * GymGO Pro paid with PayPal, through GymGO's own PayPal business account
 * (docs/PAYMENTS.md). Off until PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET
 * are set; sandbox until PAYPAL_MODE=live.
 *
 * Stripe offers PayPal on its own checkout page only to businesses in
 * Europe (billing.ts reads whether it's on). Anywhere else, this is how
 * PayPal is taken: PayPal's Subscriptions API, on PayPal's own page.
 *
 *  1. The setup script (paypal-setup.ts) makes the product "GymGO Pro" and a
 *     plan for each price GymGO sells, each plan's description naming the
 *     price it is ("gymgo:gymgo_pro_month_aud", with ":trial" for the one
 *     with the free trial). The prices are read back from PayPal, so what the
 *     app shows is what PayPal charges.
 *  2. Checkout makes a subscription for the account (its id as custom_id)
 *     and sends the person to PayPal to approve it.
 *  3. PayPal sends them back through the server, which reads the
 *     subscription from PayPal and records it, so Pro turns on at once.
 *  4. Renewals, failed payments and cancellations arrive by webhook (when
 *     PAYPAL_WEBHOOK_ID is set, its signature checked by PayPal), and the
 *     plan is re-read from PayPal now and then regardless.
 *
 * As with Stripe, nothing is taken on trust: the subscription is always
 * re-read from PayPal. Its subscriptions sit in the same table as Stripe's,
 * written "paypal:I-…", so who is Pro is decided in one place (billing.ts).
 * GymGO never sees a PayPal login or a card.
 */

import {
  DUO_PRICES,
  PRO_PRICES,
  TRIAL_DAYS,
  isDuoLookupKey,
  type BillingCurrency,
  type BillingInterval,
  type ProPrice,
  type TrialOffer,
} from '@gymgo/domain';
import type { Db } from './db';

// --- PayPal's API, the parts GymGO uses -------------------------------------------------

export type PayPalMode = 'sandbox' | 'live';

export interface PayPalLink {
  href: string;
  rel: string;
}

export interface PayPalSubscription {
  id: string;
  /** APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED or EXPIRED. */
  status: string;
  plan_id: string;
  custom_id?: string;
  start_time?: string;
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { time?: string };
    cycle_executions?: Array<{ tenure_type: string; cycles_completed: number; cycles_remaining?: number }>;
  };
  links?: PayPalLink[];
}

export interface PayPalPlanSummary {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  status: string;
}

export interface PayPalPlan extends PayPalPlanSummary {
  billing_cycles: Array<{
    tenure_type: string;
    frequency: { interval_unit: string; interval_count: number };
    pricing_scheme?: { fixed_price?: { value: string; currency_code: string } };
  }>;
}

/** What GymGO asks of PayPal. The real client calls PayPal; tests pass a fake. */
export interface PayPalApi {
  mode: PayPalMode;
  listPlans(productId: string): Promise<PayPalPlanSummary[]>;
  getPlan(id: string): Promise<PayPalPlan>;
  createSubscription(params: { planId: string; customId: string; returnUrl: string; cancelUrl: string; requestId: string }): Promise<PayPalSubscription>;
  getSubscription(id: string): Promise<PayPalSubscription>;
  cancelSubscription(id: string, reason: string): Promise<void>;
  /** PayPal's own check of a webhook's signature (its verify-webhook-signature endpoint). */
  verifyWebhook(params: { headers: Record<string, string | undefined>; webhookId: string; event: unknown }): Promise<boolean>;
  /** For the setup script. */
  getProduct(id: string): Promise<{ id: string } | null>;
  createProduct(params: { id: string; name: string; description: string }): Promise<{ id: string }>;
  createPlan(params: Record<string, unknown>): Promise<PayPalPlan>;
  /** A plan whose price changed is retired: its subscribers keep it, nobody new joins it. */
  deactivatePlan(id: string): Promise<void>;
}

export class PayPalError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

const HOSTS: Record<PayPalMode, string> = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

/** Where someone manages or cancels a PayPal subscription: their automatic payments in PayPal. */
export function paypalManageUrl(mode: PayPalMode): string {
  return mode === 'live' ? 'https://www.paypal.com/myaccount/autopay/' : 'https://www.sandbox.paypal.com/myaccount/autopay/';
}

/** The real client: PayPal's REST API over fetch, with its OAuth token kept until it expires. */
export function createPayPal(config: { clientId: string; secret: string; mode: PayPalMode; fetch?: typeof fetch }): PayPalApi {
  const host = HOSTS[config.mode];
  const call = config.fetch ?? fetch;
  let token: { value: string; until: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && Date.now() < token.until) return token.value;
    const response = await call(`${host}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) throw new PayPalError(response.status, 'PayPal didn’t accept GymGO’s PayPal keys.', 'paypal_auth');
    const body = (await response.json()) as { access_token: string; expires_in: number };
    // A minute early, so a token never runs out mid-request.
    token = { value: body.access_token, until: Date.now() + Math.max(0, body.expires_in - 60) * 1000 };
    return token.value;
  }

  async function request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    const response = await call(`${host}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as unknown) : undefined;
    if (!response.ok) {
      const detail = parsed as { name?: string; message?: string } | undefined;
      throw new PayPalError(response.status, detail?.message ?? `PayPal answered ${response.status}.`, detail?.name);
    }
    return parsed as T;
  }

  return {
    mode: config.mode,
    async listPlans(productId) {
      const body = await request<{ plans?: PayPalPlanSummary[] }>('GET', `/v1/billing/plans?product_id=${encodeURIComponent(productId)}&page_size=20`);
      return body.plans ?? [];
    },
    getPlan: (id) => request<PayPalPlan>('GET', `/v1/billing/plans/${encodeURIComponent(id)}`),
    createSubscription: ({ planId, customId, returnUrl, cancelUrl, requestId }) =>
      request<PayPalSubscription>(
        'POST',
        '/v1/billing/subscriptions',
        {
          plan_id: planId,
          custom_id: customId,
          application_context: {
            brand_name: 'GymGO',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
        { 'PayPal-Request-Id': requestId },
      ),
    getSubscription: (id) => request<PayPalSubscription>('GET', `/v1/billing/subscriptions/${encodeURIComponent(id)}`),
    async cancelSubscription(id, reason) {
      await request<void>('POST', `/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`, { reason });
    },
    async verifyWebhook({ headers, webhookId, event }) {
      const body = await request<{ verification_status?: string }>('POST', '/v1/notifications/verify-webhook-signature', {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: event,
      });
      return body.verification_status === 'SUCCESS';
    },
    async getProduct(id) {
      try {
        return await request<{ id: string }>('GET', `/v1/catalogs/products/${encodeURIComponent(id)}`);
      } catch (error) {
        if (error instanceof PayPalError && error.status === 404) return null;
        throw error;
      }
    },
    createProduct: ({ id, name, description }) => request<{ id: string }>('POST', '/v1/catalogs/products', { id, name, description, type: 'SERVICE', category: 'SOFTWARE' }),
    createPlan: (params) => request<PayPalPlan>('POST', '/v1/billing/plans', params),
    async deactivatePlan(id) {
      await request<void>('POST', `/v1/billing/plans/${encodeURIComponent(id)}/deactivate`);
    },
  };
}

// --- Plans: GymGO's prices, as PayPal has them ---------------------------------------------

/** The PayPal product every GymGO plan belongs to (the setup script makes it). */
export const PAYPAL_PRODUCT_ID = 'GYMGO-PRO';

/** How a plan names the price it is, in its description: "gymgo:<lookup key>", ":trial" with the free trial. */
export function planTag(lookupKey: string, trial: boolean): string {
  return `gymgo:${lookupKey}${trial ? ':trial' : ''}`;
}

export function readPlanTag(description: string | undefined): { lookupKey: string; trial: boolean } | null {
  const match = /^gymgo:([a-z0-9_]+)(:trial)?$/.exec((description ?? '').trim());
  return match ? { lookupKey: match[1]!, trial: match[2] !== undefined } : null;
}

export interface PayPalPrice extends ProPrice {
  planId: string;
  plan: 'pro' | 'duo';
  trial: boolean;
}

/** A PayPal plan as one of GymGO's prices, if it's a GymGO plan in a form GymGO sells; else null. */
export function priceFromPlan(plan: PayPalPlan): PayPalPrice | null {
  if (plan.status !== 'ACTIVE') return null;
  const tag = readPlanTag(plan.description);
  if (!tag) return null;
  const known = [...PRO_PRICES, ...DUO_PRICES].find((price) => price.lookupKey === tag.lookupKey);
  if (!known) return null;
  const regular = plan.billing_cycles.find((cycle) => cycle.tenure_type === 'REGULAR');
  const unit = regular?.frequency.interval_unit;
  const interval: BillingInterval | null = regular?.frequency.interval_count === 1 ? (unit === 'MONTH' ? 'month' : unit === 'YEAR' ? 'year' : null) : null;
  const fixed = regular?.pricing_scheme?.fixed_price;
  const currency = fixed?.currency_code.toLowerCase();
  if (!interval || !fixed || (currency !== 'aud' && currency !== 'usd')) return null;
  // PayPal writes amounts in major units ("3.99"); GymGO counts cents.
  const amountMinor = Math.round(Number(fixed.value) * 100);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return null;
  // The plan must be the price it says it is, or it's not used: never a different interval or currency than shown.
  if (interval !== known.interval || currency !== known.currency) return null;
  return { lookupKey: known.lookupKey, interval, currency, amountMinor, planId: plan.id, plan: isDuoLookupKey(known.lookupKey) ? 'duo' : 'pro', trial: tag.trial };
}

/** The plans the setup script makes: every price GymGO sells, and monthly Pro again with the free trial. */
export function plannedPlans(): Array<{ price: ProPrice; trial: boolean }> {
  const all = [...PRO_PRICES, ...DUO_PRICES].map((price) => ({ price, trial: false }));
  const trials = PRO_PRICES.filter((price) => price.interval === 'month').map((price) => ({ price, trial: true }));
  return [...all, ...trials];
}

/** The body for PayPal's create-plan call, for one of GymGO's prices. */
export function planBody(price: ProPrice, trial: boolean, productId: string = PAYPAL_PRODUCT_ID): Record<string, unknown> {
  const name = `GymGO ${isDuoLookupKey(price.lookupKey) ? 'Duo' : 'Pro'}, ${price.interval === 'month' ? 'monthly' : 'yearly'} (${price.currency.toUpperCase()})${trial ? `, ${TRIAL_DAYS} days free` : ''}`;
  const regular = {
    frequency: { interval_unit: price.interval === 'month' ? 'MONTH' : 'YEAR', interval_count: 1 },
    tenure_type: 'REGULAR',
    sequence: trial ? 2 : 1,
    total_cycles: 0,
    pricing_scheme: { fixed_price: { value: (price.amountMinor / 100).toFixed(2), currency_code: price.currency.toUpperCase() } },
  };
  return {
    product_id: productId,
    name,
    description: planTag(price.lookupKey, trial),
    status: 'ACTIVE',
    billing_cycles: trial
      ? [{ frequency: { interval_unit: 'DAY', interval_count: TRIAL_DAYS }, tenure_type: 'TRIAL', sequence: 1, total_cycles: 1 }, regular]
      : [regular],
    payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CANCEL', payment_failure_threshold: 1 },
  };
}

// --- Status --------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** One interval on from a moment (a month or a year), as the calendar has it. */
function addInterval(from: Date, interval: BillingInterval): Date {
  const next = new Date(from);
  if (interval === 'month') next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

/**
 * A PayPal subscription in GymGO's (Stripe's) terms, for the subscriptions
 * table: its status, when the period paid for ends, and when Pro stops if
 * it was cancelled. A cancelled one keeps Pro until the end of what was
 * paid for (or of the free trial), as a cancelled Stripe one does.
 */
export function readStatus(
  subscription: PayPalSubscription,
  price: Pick<PayPalPrice, 'interval' | 'trial'> | null,
  now: Date,
): { status: string; periodEnd: string | null; cancelAt: string | null } {
  const next = subscription.billing_info?.next_billing_time ?? null;
  const lastPaid = subscription.billing_info?.last_payment?.time ?? null;
  const inTrial = subscription.billing_info?.cycle_executions?.some((cycle) => cycle.tenure_type === 'TRIAL' && (cycle.cycles_remaining ?? 0) > 0) ?? false;
  switch (subscription.status) {
    case 'ACTIVE':
      return { status: inTrial ? 'trialing' : 'active', periodEnd: next, cancelAt: null };
    case 'APPROVAL_PENDING':
    case 'APPROVED':
      return { status: 'incomplete', periodEnd: null, cancelAt: null };
    case 'SUSPENDED':
      // A payment PayPal couldn't take: Pro pauses until it's paid.
      return { status: 'paused', periodEnd: next, cancelAt: null };
    case 'CANCELLED':
    case 'EXPIRED': {
      let paidThrough: Date | null = null;
      if (lastPaid && price) paidThrough = addInterval(new Date(lastPaid), price.interval);
      else if (price?.trial && subscription.start_time) paidThrough = new Date(Date.parse(subscription.start_time) + TRIAL_DAYS * DAY_MS);
      if (paidThrough && paidThrough.getTime() > now.getTime()) {
        return { status: 'active', periodEnd: paidThrough.toISOString(), cancelAt: paidThrough.toISOString() };
      }
      return { status: 'canceled', periodEnd: paidThrough?.toISOString() ?? null, cancelAt: paidThrough?.toISOString() ?? null };
    }
    default:
      return { status: 'incomplete', periodEnd: null, cancelAt: null };
  }
}

// --- Pro through PayPal ---------------------------------------------------------------------

const PLAN_CACHE_MS = 10 * 60_000;
export const PAYPAL_ID_PREFIX = 'paypal:';

export interface PayPalProOptions {
  api: PayPalApi | null;
  /** The id of the webhook pointed at /api/billing/paypal/webhook (PAYPAL_WEBHOOK_ID), for checking its signatures. */
  webhookId: string | null;
  now: () => Date;
  /** Already Pro by a subscription of their own (Stripe's or PayPal's). */
  subscribedPro: (userId: string) => boolean;
  /** The free trial this account may start, if any (billing.ts). */
  trialFor: (userId: string) => TrialOffer | null;
}

export class PayPalPro {
  private planCache: { at: number; prices: PayPalPrice[] } | null = null;
  private syncedAt = new Map<string, number>();

  constructor(
    private readonly db: Db,
    private readonly options: PayPalProOptions,
  ) {}

  /** PayPal's keys are set. */
  get connected(): boolean {
    return this.options.api !== null;
  }

  private get api(): PayPalApi {
    if (!this.options.api) throw new PayPalError(503, 'PayPal isn’t connected on this GymGO server yet.', 'paypal_off');
    return this.options.api;
  }

  /** Where people manage or cancel it: their automatic payments, at PayPal. */
  manageUrl(): string | null {
    return this.options.api ? paypalManageUrl(this.options.api.mode) : null;
  }

  /** GymGO's plans at PayPal, as prices; empty until the setup script has made them. */
  async prices(): Promise<PayPalPrice[]> {
    if (!this.connected) return [];
    const now = this.options.now().getTime();
    if (this.planCache && now - this.planCache.at < PLAN_CACHE_MS) return this.planCache.prices;
    const summaries = (await this.api.listPlans(PAYPAL_PRODUCT_ID)).filter((plan) => plan.status === 'ACTIVE' && readPlanTag(plan.description));
    const plans = await Promise.all(summaries.map((plan) => this.api.getPlan(plan.id)));
    const prices = plans.map(priceFromPlan).filter((price): price is PayPalPrice => price !== null);
    this.planCache = { at: now, prices };
    return prices;
  }

  /** Pro can be bought with PayPal here: connected, and the plans are there. */
  async ready(): Promise<boolean> {
    if (!this.connected) return false;
    return (await this.prices().catch(() => [])).some((price) => price.plan === 'pro' && !price.trial);
  }

  /** A subscription for this account, and PayPal's page to approve it. */
  async checkout(
    account: { id: string },
    choice: { interval: BillingInterval; currency: BillingCurrency; plan?: 'pro' | 'duo'; trial?: boolean },
    urls: { success: string; cancel: string },
  ): Promise<string> {
    const api = this.api;
    if (this.options.subscribedPro(account.id)) throw new PayPalError(409, 'You already have GymGO Pro.', 'already_pro');
    const plan = choice.plan ?? 'pro';
    const trial = choice.trial === true;
    if (trial) {
      if (plan !== 'pro' || choice.interval !== 'month') throw new PayPalError(400, 'The free trial is for monthly Pro.', 'trial_monthly_only');
      if (!this.options.trialFor(account.id)) throw new PayPalError(409, 'The free trial isn’t available on this account any more. You can still subscribe.', 'trial_unavailable');
    }
    const price = (await this.prices()).find(
      (item) => item.plan === plan && item.interval === choice.interval && item.currency === choice.currency && item.trial === trial,
    );
    if (!price) throw new PayPalError(503, 'That price isn’t on sale with PayPal yet. Run the PayPal setup (see docs/PAYMENTS.md).', 'paypal_price_missing');
    const subscription = await api.createSubscription({
      planId: price.planId,
      customId: account.id,
      returnUrl: urls.success,
      cancelUrl: urls.cancel,
      // The same click twice makes one subscription, not two.
      requestId: `gymgo-${account.id}-${price.planId}-${Math.floor(this.options.now().getTime() / 60_000)}`,
    });
    const approve = subscription.links?.find((link) => link.rel === 'approve')?.href;
    if (!approve) throw new PayPalError(502, 'PayPal didn’t return a page to approve the subscription. Try again.');
    // Nothing is recorded yet: only an approved subscription is (confirm), as with Stripe, so someone
    // who turns back at PayPal hasn't "subscribed" and keeps their free trial.
    return approve;
  }

  /**
   * After PayPal: read the subscription from PayPal and record it for the
   * account it was made for. A subscription made for someone else, or that
   * isn't GymGO's, is ignored.
   */
  async confirm(subscriptionId: string): Promise<void> {
    if (!/^I-[A-Z0-9]{6,40}$/.test(subscriptionId)) return;
    const subscription = await this.api.getSubscription(subscriptionId);
    const userId = subscription.custom_id ?? '';
    const known = this.db.prepare('select id from users where id = ?').get(userId) as { id: string } | undefined;
    if (!known) return;
    const price = (await this.prices()).find((item) => item.planId === subscription.plan_id) ?? null;
    if (!price) return;
    this.store(subscription, known.id, price);
  }

  /** Re-read this account's PayPal subscriptions that could still change. */
  async syncUser(userId: string): Promise<void> {
    if (!this.connected) return;
    const rows = this.db
      .prepare("select stripe_subscription_id as id, status from subscriptions where user_id = ? and stripe_subscription_id like 'paypal:%'")
      .all(userId) as Array<{ id: string; status: string }>;
    for (const row of rows) {
      if (row.status === 'canceled') continue;
      await this.confirm(row.id.slice(PAYPAL_ID_PREFIX.length)).catch(() => undefined);
    }
  }

  /**
   * Without PayPal's webhooks a cancellation made at PayPal would never
   * arrive, so reading the plan re-reads PayPal now and then.
   */
  async syncUserIfStale(userId: string): Promise<void> {
    if (!this.connected || this.options.webhookId || !this.hasSubscriptions(userId)) return;
    const now = this.options.now().getTime();
    const last = this.syncedAt.get(userId);
    if (last !== undefined && now - last < PLAN_CACHE_MS) return;
    this.syncedAt.set(userId, now);
    await this.syncUser(userId);
  }

  /** The account has a PayPal subscription to keep in step. */
  hasSubscriptions(userId: string): boolean {
    return this.db.prepare("select 1 from subscriptions where user_id = ? and stripe_subscription_id like 'paypal:%' limit 1").get(userId) !== undefined;
  }

  /**
   * One of PayPal's webhook events: its signature checked by PayPal, each
   * event acted on once, the subscription it's about re-read from PayPal.
   */
  async handleWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<void> {
    const webhookId = this.options.webhookId;
    if (!this.connected || !webhookId) throw new PayPalError(503, 'PayPal webhooks aren’t set up on this server.', 'webhooks_off');
    let event: { id?: string; event_type?: string; resource_type?: string; resource?: { id?: string; billing_agreement_id?: string } };
    try {
      event = JSON.parse(rawBody.toString('utf8')) as typeof event;
    } catch {
      throw new PayPalError(400, 'That isn’t a PayPal event.');
    }
    if (!event.id || !event.event_type) throw new PayPalError(400, 'That isn’t a PayPal event.');
    const genuine = await this.api.verifyWebhook({ headers, webhookId, event }).catch(() => false);
    if (!genuine) throw new PayPalError(400, 'That webhook signature doesn’t check out.');
    const fresh = this.db
      .prepare('insert or ignore into paypal_events (id, type, received_at) values (?, ?, ?)')
      .run(event.id, event.event_type, this.options.now().toISOString());
    if (fresh.changes === 0) return; // Already handled: PayPal sends some events more than once.
    // A subscription event carries the subscription; a payment, the subscription it paid for.
    const subscriptionId = event.resource_type === 'subscription' ? event.resource?.id : event.resource?.billing_agreement_id;
    if (!subscriptionId) return;
    try {
      await this.confirm(subscriptionId);
    } catch (error) {
      // Forget it, so PayPal's retry gets another go.
      this.db.prepare('delete from paypal_events where id = ?').run(event.id);
      throw error;
    }
  }

  /** Before an account is deleted: stop its PayPal subscriptions, so nobody keeps paying. */
  async cancelAllFor(userId: string): Promise<void> {
    const rows = this.db
      .prepare("select stripe_subscription_id as id, status from subscriptions where user_id = ? and stripe_subscription_id like 'paypal:%'")
      .all(userId) as Array<{ id: string; status: string }>;
    const running = rows.filter((row) => row.status !== 'canceled' && row.status !== 'incomplete');
    if (running.length === 0) return;
    if (!this.connected) {
      throw new PayPalError(409, 'This account has a GymGO Pro subscription through PayPal, and PayPal isn’t connected on this server to cancel it. Cancel it in PayPal first.', 'subscription_running');
    }
    for (const row of running) {
      const id = row.id.slice(PAYPAL_ID_PREFIX.length);
      await this.api.cancelSubscription(id, 'GymGO account deleted');
      await this.confirm(id);
    }
  }

  private store(subscription: PayPalSubscription, userId: string, price: PayPalPrice): void {
    const read = readStatus(subscription, price, this.options.now());
    this.db
      .prepare(
        `insert into subscriptions
           (stripe_subscription_id, user_id, status, interval, currency, amount_minor, price_lookup_key,
            current_period_end, cancel_at, cancel_at_period_end, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         on conflict(stripe_subscription_id) do update set
           status = excluded.status, interval = excluded.interval, currency = excluded.currency,
           amount_minor = excluded.amount_minor, price_lookup_key = excluded.price_lookup_key,
           current_period_end = excluded.current_period_end, cancel_at = excluded.cancel_at,
           updated_at = excluded.updated_at`,
      )
      .run(
        `${PAYPAL_ID_PREFIX}${subscription.id}`,
        userId,
        read.status,
        price.interval,
        price.currency,
        price.amountMinor,
        price.lookupKey,
        read.periodEnd,
        read.cancelAt,
        this.options.now().toISOString(),
      );
  }
}
