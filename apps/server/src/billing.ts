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
  GIFT_PRICES,
  LIMITS,
  MAX_PRICES,
  PRO_PRICES,
  TRIAL_DAYS,
  formatPlanPrice,
  PRO_STATUSES,
  isMaxLookupKey,
  isProStatus,
  trialOffer,
  type GiftPrice,
  type TrialOffer,
  type BillingCurrency,
  type BillingInterval,
  type PayWith,
  type PlanId,
  type PlanLimits,
  type ProPrice,
  type WalletButtons,
} from '@gymgo/domain';
import type { Db } from './db';
import { PAYPAL_ID_PREFIX, type PayPalPro } from './paypal';

/** What a subscription checkout is for: Pro or Max, monthly or yearly, A$ or US$, and the free trial. */
export interface SubscriptionChoice {
  interval: BillingInterval;
  currency: BillingCurrency;
  plan?: 'pro' | 'max';
  trial?: boolean;
}

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
  /** When a free trial ends and the first payment is taken (missing from older test fakes). */
  trial_end?: number | null;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  customer: Expandable;
  client_reference_id: string | null;
  subscription: Expandable;
  /** 'payment' for one-off payments (a gift, a day pass); 'subscription' for Pro. */
  mode?: string;
  payment_status?: string;
  metadata?: Record<string, string> | null;
  /** For a checkout shown on GymGO's own page by Stripe.js (ui_mode 'elements'): what the page opens it with. */
  client_secret?: string | null;
}

/** One of Stripe's payment method settings (Dashboard → Settings → Payment methods): which are offered. */
export interface StripePaymentMethodConfiguration {
  id: string;
  active: boolean;
  is_default: boolean;
  /** Set for a Connect platform's child settings, never for the account's own. */
  application?: string | null;
  card?: { available: boolean };
  apple_pay?: { available: boolean };
  google_pay?: { available: boolean };
  link?: { available: boolean };
  paypal?: { available: boolean };
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
  /** Which payment methods the account offers (card, Apple Pay, Google Pay, Link, PayPal…). */
  paymentMethodConfigurations?: {
    list(params: { active?: boolean; limit?: number }): Promise<{ data: StripePaymentMethodConfiguration[] }>;
    retrieve(id: string): Promise<StripePaymentMethodConfiguration>;
  };
  /** Uploaded files: GymGO's icon for the checkout page, from the setup script. */
  files?: {
    list(params: { purpose: 'business_icon'; limit?: number }): Promise<{ data: Array<{ id: string; filename: string | null }> }>;
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
  /** Bought through Stripe (or PayPal), so its page can change or cancel it. The local dev account's Pro can't be. */
  manageable: boolean;
  /** Who takes the payments: Stripe, or PayPal (paypal.ts). */
  provider: 'stripe' | 'paypal';
  /** Where a PayPal subscription is managed or cancelled (PayPal's automatic payments); null for Stripe's (its portal). */
  manageUrl: string | null;
  /** In its free trial: `renewsAt` is when the trial ends and the first payment is taken. */
  trial: boolean;
}

/** Pro from something other than your own subscription: a gifted year. */
export interface ProGrant {
  via: 'gift';
  /** When the gifted year ends. */
  endsAt: string | null;
}

export interface PlanView {
  plan: PlanId;
  limits: PlanLimits;
  subscription: SubscriptionView | null;
  /** Your own subscription is Max: Pro, with Max's extras. */
  max: boolean;
  /** Pro through a gift, when your own subscription isn't what makes you Pro. */
  grant: ProGrant | null;
  /** The free trial of monthly Pro this account can start (a new account's, once), or null. */
  trial: TrialOffer | null;
}

interface SubscriptionRow {
  stripe_subscription_id: string;
  user_id: string;
  status: string;
  interval: string | null;
  currency: string | null;
  amount_minor: number | null;
  price_lookup_key: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  cancel_at_period_end: number;
  updated_at: string;
}

/**
 * SQL for whether the user whose id is in `idColumn` is on Max now (their own
 * subscription, in a status that counts), for the Max badge by their name
 * where friends see it. Built from constants only.
 */
export const isMaxSql = (idColumn: string): string =>
  `exists (select 1 from subscriptions s where s.user_id = ${idColumn} and s.status in (${PRO_STATUSES.map((status) => `'${status}'`).join(', ')}) and s.price_lookup_key in (${MAX_PRICES.map((price) => `'${price.lookupKey}'`).join(', ')}))`;

const iso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);
const idOf = (value: Expandable) => (value === null ? null : typeof value === 'string' ? value : value.id);
const PRICE_CACHE_MS = 10 * 60_000;
const SYNC_EVERY_MS = 10 * 60_000;

/**
 * GymGO sells Pro itself, under its own Terms and Refunds policy, so a
 * checkout opts out of Stripe's Managed Payments (Stripe as the seller of
 * record). Stripe now turns that on by default for new accounts, and with it
 * on refuses a checkout carrying GymGO's own text by the pay button: the
 * renewal terms and the links to the Terms and Refunds pages.
 */
const SELLER_IS_GYMGO = { managed_payments: { enabled: false } } as const;

/** GymGO's icon as the setup script uploads it to Stripe (stripe-setup.ts). */
export const CHECKOUT_ICON_NAME = 'gymgo-icon.png';

/**
 * Stripe's checkout page in GymGO's own look: its name, the app's indigo on
 * the pay button, the grey behind its grouped lists, Inter (the app's font
 * wherever SF Pro isn't there) and rounded corners. The icon is added once
 * the setup script has uploaded it.
 */
export const CHECKOUT_LOOK = {
  display_name: 'GymGO',
  button_color: '#5856D6',
  background_color: '#F2F2F7',
  font_family: 'inter',
  border_style: 'rounded',
} as const;

/**
 * A refund or dispute on one of GymGO's Stripe payments. Kept and passed on
 * so the owner hears about it; it changes nobody's access. A refund doesn't
 * cancel a subscription, and whether a dispute should end Pro is the
 * owner's decision, made in Stripe's dashboard.
 */
export interface MoneyEvent {
  eventId: string;
  kind: 'refund' | 'dispute_opened' | 'dispute_closed';
  chargeId: string | null;
  disputeId: string | null;
  /** For a refund, the total refunded on the charge so far. */
  amountMinor: number;
  currency: string;
  /** A dispute's reason, as Stripe names it (fraudulent, duplicate, …). */
  reason: string | null;
  /** A refund: full or partial. A dispute: Stripe's status (needs_response, won, lost, …). */
  status: string | null;
  /** When evidence for a dispute is due. */
  respondBy: string | null;
  /** The GymGO account the payment's customer belongs to, when known. */
  userId: string | null;
  at: string;
}

/** The Stripe events kept as money events. */
export const MONEY_EVENT_TYPES = ['charge.refunded', 'charge.dispute.created', 'charge.dispute.closed'] as const;

/** An amount as the owner reads it: A$9.99, US$54.99, or the code for anything else. */
export function moneyLabel(amountMinor: number, currency: string): string {
  const code = currency.toUpperCase();
  const symbol = code === 'AUD' ? 'A$' : code === 'USD' ? 'US$' : `${code} `;
  return `${symbol}${(amountMinor / 100).toFixed(2)}`;
}

/** The email the owner gets for a refund or dispute: what happened, and what's theirs to do. */
export function moneyEventEmail(event: MoneyEvent): { subject: string; text: string } {
  const amount = moneyLabel(event.amountMinor, event.currency);
  const charge = event.chargeId ?? 'unknown';
  const account = event.userId ? `GymGO account: ${event.userId}` : 'Not linked to a GymGO account.';
  const dashboard = event.kind === 'refund' || !event.disputeId
    ? `https://dashboard.stripe.com/payments/${charge}`
    : `https://dashboard.stripe.com/disputes/${event.disputeId}`;
  const lines =
    event.kind === 'refund'
      ? [
          `Stripe refunded ${amount} on charge ${charge} (${event.status === 'full' ? 'the full amount' : 'part of it'}).`,
          account,
          '',
          'GymGO hasn’t changed anyone’s access. A refund doesn’t cancel a subscription, so to end Pro or Max as well, cancel the subscription in Stripe’s dashboard.',
        ]
      : event.kind === 'dispute_opened'
        ? [
            `A customer disputed ${amount} on charge ${charge}${event.reason ? ` (reason: ${event.reason.replace(/_/g, ' ')})` : ''}.`,
            account,
            '',
            event.respondBy
              ? `Respond in Stripe’s dashboard by ${event.respondBy.slice(0, 10)}. Evidence can’t be sent after that.`
              : 'Respond in Stripe’s dashboard.',
            'GymGO hasn’t changed anyone’s access.',
          ]
        : [`The dispute on charge ${charge} has closed: ${(event.status ?? 'unknown').replace(/_/g, ' ')}.`, account];
  const subject =
    event.kind === 'refund'
      ? `GymGO payments: ${amount} refunded`
      : event.kind === 'dispute_opened'
        ? `GymGO payments: a dispute for ${amount}`
        : `GymGO payments: dispute closed (${(event.status ?? 'unknown').replace(/_/g, ' ')})`;
  return { subject, text: [...lines, '', `Stripe: ${dashboard}`, `Event ${event.eventId}, ${event.at}.`].join('\n') };
}

export interface BillingOptions {
  stripe: StripeApi | null;
  webhookSecret: string | null;
  now: () => Date;
  /** Pro that isn't a subscription of your own (perks.ts: gifts). */
  grantFor?: (userId: string) => ProGrant | null;
  /** A one-off payment went through (a gift, a day pass): perks.ts fulfils it, once. */
  onPaid?: (session: StripeCheckoutSession) => void;
  /** A refund or dispute arrived (app.ts emails the owner). Nobody's access changes. */
  onMoneyEvent?: (event: MoneyEvent) => void;
  /**
   * The payment method setting (pmc_…) GymGO's checkouts use, when not the
   * account's default (STRIPE_PAYMENT_METHOD_CONFIGURATION).
   */
  paymentMethodConfiguration?: string | null;
  /** Pro paid with PayPal through GymGO's own PayPal account (paypal.ts), when connected. */
  paypal?: PayPalPro | null;
  /**
   * Stripe's publishable key (pk_…, STRIPE_PUBLISHABLE_KEY): public by
   * design, it lets the Pro page show Apple Pay's and Google Pay's own
   * buttons (Stripe's Express Checkout). Without it, those are only on
   * Stripe's checkout page.
   */
  publishableKey?: string | null;
}

export class Billing {
  private priceCache: { at: number; prices: Array<ProPrice & { id: string; plan: 'pro' | 'max' }> } | null = null;
  private giftCache: { at: number; prices: Array<GiftPrice & { id: string }> } | null = null;
  private portalConfig: { id: string | null } | null = null;
  private iconCache: { at: number; file: string | null } | null = null;
  private payWithCache: { at: number; stripe: Omit<PayWith, 'paypal'> & { paypal: boolean } } | null = null;

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
  async prices(): Promise<{ available: boolean; prices: ProPrice[]; max: ProPrice[]; gifts: GiftPrice[] }> {
    if (!this.enabled) return { available: false, prices: PRO_PRICES, max: MAX_PRICES, gifts: GIFT_PRICES };
    const live = await this.stripePrices();
    const strip = ({ id: _id, plan: _plan, ...price }: ProPrice & { id: string; plan: string }) => price;
    return {
      available: live.some((price) => price.plan === 'pro'),
      prices: live.filter((price) => price.plan === 'pro').map(strip),
      max: live.filter((price) => price.plan === 'max').map(strip),
      gifts: (await this.giftPrices()).map(({ id: _id, ...price }) => price),
    };
  }

  /**
   * The ways to pay that checkout will really offer, from Stripe's own
   * payment method settings: so the app says "Pay by card, Apple Pay or
   * Google Pay" only when they're on. Null when that can't be read (payments
   * off, or Stripe didn't answer): the app then names none.
   */
  async payWith(): Promise<PayWith | null> {
    if (!this.enabled) return null;
    const now = this.options.now().getTime();
    if (!this.payWithCache || now - this.payWithCache.at >= PRICE_CACHE_MS) {
      const read = await this.readPaymentMethods().catch(() => null);
      // Unread, only what Stripe's checkout always takes (a card) is claimed; and PayPal, if it's GymGO's own.
      if (!read) return { card: true, applePay: false, googlePay: false, link: false, paypal: (await this.paypalDirect()) ? 'direct' : null };
      this.payWithCache = { at: now, stripe: read };
    }
    const { paypal, ...stripe } = this.payWithCache.stripe;
    return { ...stripe, paypal: paypal ? 'stripe' : (await this.paypalDirect()) ? 'direct' : null };
  }

  /**
   * Apple Pay's and Google Pay's own buttons on the Pro page: with the
   * publishable key set, and each only when the payment method settings
   * have it on (a wallet pays by card, so cards must be on too).
   */
  async wallets(): Promise<WalletButtons | null> {
    const key = this.options.publishableKey;
    if (!key || !this.enabled) return null;
    const payWith = await this.payWith();
    if (!payWith?.card || (!payWith.applePay && !payWith.googlePay)) return null;
    return { publishableKey: key, applePay: payWith.applePay, googlePay: payWith.googlePay };
  }

  /** PayPal through GymGO's own account is ready: connected, and its plans made. */
  private async paypalDirect(): Promise<boolean> {
    return (await this.options.paypal?.ready().catch(() => false)) ?? false;
  }

  private async readPaymentMethods(): Promise<(Omit<PayWith, 'paypal'> & { paypal: boolean }) | null> {
    const settings = this.stripe.paymentMethodConfigurations;
    if (!settings) return null;
    const chosen = this.options.paymentMethodConfiguration;
    const configuration = chosen
      ? await settings.retrieve(chosen)
      : (await settings.list({ active: true, limit: 20 })).data.find((item) => item.is_default && !item.application);
    if (!configuration) return null;
    const on = (method: { available: boolean } | undefined) => method?.available === true;
    return {
      card: on(configuration.card),
      applePay: on(configuration.apple_pay),
      googlePay: on(configuration.google_pay),
      link: on(configuration.link),
      paypal: on(configuration.paypal),
    };
  }

  /** The chosen payment method setting, for a checkout; nothing for the account's default. */
  private paymentMethodSetting(): { payment_method_configuration?: string } {
    const chosen = this.options.paymentMethodConfiguration;
    return chosen ? { payment_method_configuration: chosen } : {};
  }

  private async stripePrices(): Promise<Array<ProPrice & { id: string; plan: 'pro' | 'max' }>> {
    const now = this.options.now().getTime();
    if (this.priceCache && now - this.priceCache.at < PRICE_CACHE_MS) return this.priceCache.prices;
    const planned = [...PRO_PRICES, ...MAX_PRICES];
    const listed = await this.stripe.prices.list({ lookup_keys: planned.map((price) => price.lookupKey), active: true, limit: 20 });
    const prices = listed.data.flatMap((price): Array<ProPrice & { id: string; plan: 'pro' | 'max' }> => {
      const known = planned.find((item) => item.lookupKey === price.lookup_key);
      const interval = price.recurring?.interval;
      const currency = price.currency;
      if (!known || price.unit_amount === null) return [];
      if ((interval !== 'month' && interval !== 'year') || (currency !== 'aud' && currency !== 'usd')) return [];
      return [{ id: price.id, lookupKey: known.lookupKey, interval, currency, amountMinor: price.unit_amount, plan: isMaxLookupKey(known.lookupKey) ? 'max' : 'pro' }];
    });
    this.priceCache = { at: now, prices };
    return prices;
  }

  /**
   * Make a checkout page. The look is only a nicety: should Stripe ever
   * refuse it (a setting it no longer takes, an icon file gone), the page is
   * made again without it rather than the purchase failing.
   */
  private async createCheckout(params: Record<string, unknown>): Promise<StripeCheckoutSession> {
    try {
      return await this.stripe.checkout.sessions.create(params);
    } catch (error) {
      if (!('branding_settings' in params) || !/branding_settings/.test(error instanceof Error ? error.message : String(error))) throw error;
      console.warn(`Stripe refused the checkout page's look, so it opened without it: ${error instanceof Error ? error.message : error}`);
      this.iconCache = null;
      const { branding_settings: _look, ...plain } = params;
      return this.stripe.checkout.sessions.create(plain);
    }
  }

  /** The checkout page's look, with GymGO's icon when the setup script has uploaded it. */
  private async checkoutLook(): Promise<{ branding_settings: Record<string, unknown> }> {
    const now = this.options.now().getTime();
    if (!this.iconCache || now - this.iconCache.at >= PRICE_CACHE_MS) {
      let file: string | null = null;
      try {
        const listed = await this.stripe.files?.list({ purpose: 'business_icon', limit: 100 });
        file = listed?.data.find((item) => item.filename === CHECKOUT_ICON_NAME)?.id ?? null;
      } catch {
        // No icon is fine: the page still has GymGO's name and colours.
      }
      this.iconCache = { at: now, file };
    }
    const icon = this.iconCache.file ? { icon: { type: 'file', file: this.iconCache.file } } : {};
    return { branding_settings: { ...CHECKOUT_LOOK, ...icon } };
  }

  /** Gift Pro's one-off prices, read from Stripe by lookup key. */
  private async giftPrices(): Promise<Array<GiftPrice & { id: string }>> {
    const now = this.options.now().getTime();
    if (this.giftCache && now - this.giftCache.at < PRICE_CACHE_MS) return this.giftCache.prices;
    const listed = await this.stripe.prices.list({ lookup_keys: GIFT_PRICES.map((price) => price.lookupKey), active: true, limit: 10 });
    const prices = listed.data.flatMap((price): Array<GiftPrice & { id: string }> => {
      const known = GIFT_PRICES.find((item) => item.lookupKey === price.lookup_key);
      if (!known || price.unit_amount === null || price.recurring !== null || (price.currency !== 'aud' && price.currency !== 'usd')) return [];
      return [{ id: price.id, lookupKey: known.lookupKey, currency: price.currency, amountMinor: price.unit_amount }];
    });
    this.giftCache = { at: now, prices };
    return prices;
  }

  // --- Who is Pro --------------------------------------------------------------------

  /** The subscription that makes this account Pro (or Max), if one does (not a gift). */
  private currentSubscription(userId: string): { row: SubscriptionRow | null; shown: SubscriptionRow | null } {
    const rows = this.db
      .prepare('select * from subscriptions where user_id = ? order by updated_at desc')
      .all(userId) as unknown as SubscriptionRow[];
    const now = this.options.now().getTime();
    const current = rows.find((row) => isProStatus(row.status) && !this.endedLocally(row, now)) ?? null;
    return { row: current, shown: current ?? rows[0] ?? null };
  }

  /** Pro by a subscription of your own; and whether it's Max. */
  subscribed(userId: string): { pro: boolean; max: boolean } {
    const { row } = this.currentSubscription(userId);
    return { pro: row !== null, max: row !== null && isMaxLookupKey(row.price_lookup_key) };
  }

  /** Max, by a subscription of your own (a gift is a year of Pro, not Max). */
  isMax(userId: string): boolean {
    return this.subscribed(userId).max;
  }

  planFor(userId: string): PlanView {
    const { row, shown } = this.currentSubscription(userId);
    const grant = row ? null : (this.options.grantFor?.(userId) ?? null);
    const plan: PlanId = row || grant ? 'pro' : 'free';
    return {
      plan,
      limits: LIMITS[plan],
      subscription: shown ? this.view(shown, this.customerIdFor(userId) !== null) : null,
      max: row !== null && isMaxLookupKey(row.price_lookup_key),
      grant,
      trial: plan === 'pro' ? null : this.trialFor(userId),
    };
  }

  /**
   * The free trial this account can start: only while payments are on, in
   * the account's first 30 days, and once (any subscription it has ever had,
   * a trial included, rules it out).
   */
  trialFor(userId: string): TrialOffer | null {
    if (!this.enabled) return null;
    const account = this.db.prepare('select created_at from users where id = ?').get(userId) as { created_at: string } | undefined;
    if (!account) return null;
    const everSubscribed = this.db.prepare('select 1 from subscriptions where user_id = ? limit 1').get(userId) !== undefined;
    return trialOffer({ createdAt: account.created_at, everSubscribed }, this.options.now());
  }

  isPro(userId: string): boolean {
    return this.planFor(userId).plan === 'pro';
  }

  /** Set to end, and that moment has passed, even if no webhook has said so yet. */
  private endedLocally(row: SubscriptionRow, now: number): boolean {
    const end = row.cancel_at ?? (row.cancel_at_period_end ? row.current_period_end : null);
    return end !== null && Date.parse(end) <= now;
  }

  private view(row: SubscriptionRow, stripeCustomer: boolean): SubscriptionView {
    const ending = row.cancel_at ?? (row.cancel_at_period_end ? row.current_period_end : null);
    const live = isProStatus(row.status);
    const paypal = row.stripe_subscription_id.startsWith(PAYPAL_ID_PREFIX);
    const manageUrl = paypal ? (this.options.paypal?.manageUrl() ?? null) : null;
    return {
      provider: paypal ? 'paypal' : 'stripe',
      manageUrl,
      manageable: paypal ? manageUrl !== null : stripeCustomer,
      status: row.status,
      interval: row.interval === 'month' || row.interval === 'year' ? row.interval : null,
      currency: row.currency === 'aud' || row.currency === 'usd' ? row.currency : null,
      amountMinor: row.amount_minor,
      renewsAt: live && !ending ? row.current_period_end : null,
      endsAt: live ? ending : null,
      trial: row.status === 'trialing',
    };
  }

  // --- Checkout and the portal -----------------------------------------------------------

  async checkout(
    account: { id: string; email: string; display_name: string },
    choice: SubscriptionChoice,
    urls: { success: string; cancel: string; terms?: string; refunds?: string },
  ): Promise<string> {
    const session = await this.subscriptionCheckout(account, choice, { page: 'stripe', ...urls });
    if (!session.url) throw new BillingError(502, 'Stripe didn’t return a checkout page. Try again.');
    return session.url;
  }

  /**
   * The same subscription, for Apple Pay's or Google Pay's own button on
   * GymGO's Pro page (Stripe's Express Checkout Element): the page opens the
   * wallet itself, with this checkout's client secret, and Stripe sends the
   * browser to `returnUrl` once paid. Made when the page shows the button,
   * before anyone taps it, so it tells Stripe nothing new about the account:
   * the Stripe customer it already has, or none, and Stripe makes one from
   * the wallet's name and email when they pay (linked by
   * client_reference_id, as any checkout is).
   */
  async walletCheckout(
    account: { id: string; email: string; display_name: string },
    choice: SubscriptionChoice,
    returnUrl: string,
  ): Promise<{ clientSecret: string }> {
    if (!this.options.publishableKey) {
      throw new BillingError(503, 'Apple Pay and Google Pay buttons aren’t set up on this GymGO server.', 'wallet_off');
    }
    const session = await this.subscriptionCheckout(account, choice, { page: 'gymgo', returnUrl });
    if (!session.client_secret) throw new BillingError(502, 'Stripe didn’t return the checkout. Try again.');
    return { clientSecret: session.client_secret };
  }

  /** A subscription checkout, on Stripe's page or (for the wallet buttons) on GymGO's. */
  private async subscriptionCheckout(
    account: { id: string; email: string; display_name: string },
    choice: SubscriptionChoice,
    where: { page: 'stripe'; success: string; cancel: string; terms?: string; refunds?: string } | { page: 'gymgo'; returnUrl: string },
  ): Promise<StripeCheckoutSession> {
    const plan = choice.plan ?? 'pro';
    const own = this.subscribed(account.id);
    // Pro to Max (or back) is a change to the subscription you have, on Stripe's page for it, never a second one.
    if (own.pro && own.max !== (plan === 'max')) {
      throw new BillingError(409, `You have GymGO ${own.max ? 'Max' : 'Pro'}. Switch to ${plan === 'max' ? 'Max' : 'Pro'} in Manage subscription.`, 'switch_plan');
    }
    if (own.pro) throw new BillingError(409, `You already have GymGO ${own.max ? 'Max' : 'Pro'}.`, 'already_pro');
    // Only when the app showed the trial, so nobody is charged at once expecting free days, or the other way round.
    if (choice.trial) {
      if (plan !== 'pro' || choice.interval !== 'month') throw new BillingError(400, 'The free trial is for monthly Pro.', 'trial_monthly_only');
      if (!this.trialFor(account.id)) {
        throw new BillingError(409, 'The free trial isn’t available on this account any more. You can still subscribe.', 'trial_unavailable');
      }
    }
    const price = (await this.stripePrices()).find((item) => item.plan === plan && item.interval === choice.interval && item.currency === choice.currency);
    if (!price) throw new BillingError(503, 'That price isn’t on sale yet. Run the Stripe setup (see README).', 'price_missing');
    const customer = where.page === 'stripe' ? await this.customerFor(account) : this.customerIdFor(account.id);
    const common = {
      mode: 'subscription',
      ...(customer ? { customer } : {}),
      client_reference_id: account.id,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { gymgo_account_id: account.id },
      subscription_data: {
        metadata: { gymgo_account_id: account.id },
        // The trial: free for TRIAL_DAYS, then the monthly price, charged to the card given now.
        ...(choice.trial ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } } : {}),
      },
      // A card even when nothing is due today: a trial bills it when it ends.
      ...(choice.trial ? { payment_method_collection: 'always' } : {}),
      // Card, Apple Pay, Google Pay, Link (and PayPal in Europe): whichever the payment method setting turns on.
      ...this.paymentMethodSetting(),
      ...SELLER_IS_GYMGO,
    };
    if (where.page === 'gymgo') {
      // Shown by Stripe.js on the Pro page, which has the renewal terms by the buttons already.
      return this.stripe.checkout.sessions.create({ ...common, ui_mode: 'elements', return_url: where.returnUrl });
    }
    return this.createCheckout({
      ...common,
      success_url: where.success,
      cancel_url: where.cancel,
      ...(await this.checkoutLook()),
      // The renewal terms and where the full terms are, by the button that agrees to them, on Stripe's page too.
      ...(where.terms && where.refunds
        ? {
            custom_text: {
              submit: {
                message: `${
                  choice.trial
                    ? `Free for ${TRIAL_DAYS} days, then ${formatPlanPrice(price.amountMinor, price.currency)} a month until you cancel. Cancel before the trial ends (in GymGO: Profile → Manage subscription) and you aren’t charged.`
                    : 'Renews automatically until you cancel; cancel any time in GymGO (Profile → Manage subscription).'
                } By subscribing you agree to GymGO’s Terms of Service (${where.terms}) and its Refunds and Cancelling policy (${where.refunds}).`,
              },
            },
          }
        : {}),
    });
  }

  /**
   * A one-off payment through Stripe Checkout: a gift, or a day pass with
   * its booking fee as its own line. Fulfilled when Stripe says it's paid
   * (onPaid), never on the way out to Stripe.
   */
  async payOnce(
    account: { id: string; email: string; display_name: string },
    items: Array<{ price: string } | { name: string; amountMinor: number; currency: BillingCurrency }>,
    metadata: Record<string, string>,
    urls: { success: string; cancel: string; terms?: string; refunds?: string },
  ): Promise<{ id: string; url: string }> {
    const customer = await this.customerFor(account);
    const session = await this.createCheckout({
      mode: 'payment',
      customer,
      client_reference_id: account.id,
      line_items: items.map((item) =>
        'price' in item
          ? { price: item.price, quantity: 1 }
          : { quantity: 1, price_data: { currency: item.currency, unit_amount: item.amountMinor, product_data: { name: item.name } } },
      ),
      success_url: urls.success,
      cancel_url: urls.cancel,
      metadata: { ...metadata, gymgo_account_id: account.id },
      payment_intent_data: { metadata: { ...metadata, gymgo_account_id: account.id } },
      ...this.paymentMethodSetting(),
      ...SELLER_IS_GYMGO,
      ...(await this.checkoutLook()),
      ...(urls.terms && urls.refunds
        ? { custom_text: { submit: { message: `By paying you agree to GymGO’s Terms of Service (${urls.terms}) and its Refunds and Cancelling policy (${urls.refunds}).` } } }
        : {}),
    });
    if (!session.url) throw new BillingError(502, 'Stripe didn’t return a checkout page. Try again.');
    return { id: session.id, url: session.url };
  }

  /** Gift Pro's price id for a currency, or a 503 when it isn't on sale. */
  async giftPriceId(currency: BillingCurrency): Promise<{ id: string; amountMinor: number }> {
    const price = (await this.giftPrices()).find((item) => item.currency === currency);
    if (!price) throw new BillingError(503, 'Gift Pro isn’t on sale yet. Run the Stripe setup (see README).', 'price_missing');
    return { id: price.id, amountMinor: price.amountMinor };
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
    await this.options.paypal?.syncUser(userId).catch(() => undefined);
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
    await this.options.paypal?.syncUserIfStale(userId).catch(() => undefined);
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
    if (session.mode === 'payment') {
      if (session.payment_status === 'paid') this.options.onPaid?.(session);
      return;
    }
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
        // In a free trial, the period that matters is the trial: it ends when the first payment is taken.
        iso(subscription.status === 'trialing' && subscription.trial_end ? subscription.trial_end : item?.current_period_end),
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

  private async apply(event: { id: string; type: string; data: { object: Record<string, unknown> } }): Promise<void> {
    const object = event.data.object;
    if ((MONEY_EVENT_TYPES as readonly string[]).includes(event.type)) {
      this.recordMoney(event.id, event.type, object);
      return;
    }
    if ((event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') && object.mode === 'payment') {
      // Re-read from Stripe rather than trusting the event's copy.
      const session = await this.stripe.checkout.sessions.retrieve(String(object.id));
      if (session.payment_status === 'paid') this.options.onPaid?.(session);
      return;
    }
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

  /**
   * Keep a refund or dispute and tell the owner. The event is signed by
   * Stripe and only recorded, so it's read as sent; nobody's access changes.
   */
  private recordMoney(eventId: string, type: string, object: Record<string, unknown>): void {
    const refund = type === 'charge.refunded';
    const customer = refund ? idOf((object.customer ?? null) as Expandable) : null;
    const known = customer
      ? (this.db.prepare('select user_id from billing_customers where stripe_customer_id = ?').get(customer) as { user_id: string } | undefined)
      : undefined;
    const due = refund ? undefined : (object.evidence_details as { due_by?: unknown } | undefined)?.due_by;
    const money: MoneyEvent = {
      eventId,
      kind: refund ? 'refund' : type === 'charge.dispute.created' ? 'dispute_opened' : 'dispute_closed',
      chargeId: refund ? String(object.id) : idOf((object.charge ?? null) as Expandable),
      disputeId: refund ? null : String(object.id),
      amountMinor: Math.max(0, Math.round(Number(refund ? object.amount_refunded : object.amount) || 0)),
      currency: String(object.currency ?? '').toLowerCase(),
      reason: !refund && typeof object.reason === 'string' ? object.reason : null,
      status: refund ? (object.refunded === true ? 'full' : 'partial') : typeof object.status === 'string' ? object.status : null,
      respondBy: typeof due === 'number' ? new Date(due * 1000).toISOString() : null,
      userId: known?.user_id ?? null,
      at: this.options.now().toISOString(),
    };
    this.db
      .prepare(
        `insert or ignore into stripe_money_events (event_id, kind, charge_id, dispute_id, amount_minor, currency, reason, status, respond_by, user_id, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(money.eventId, money.kind, money.chargeId, money.disputeId, money.amountMinor, money.currency, money.reason, money.status, money.respondBy, money.userId, money.at);
    this.options.onMoneyEvent?.(money);
  }

  /** The owner has been emailed about this refund or dispute. */
  markMoneyEmailed(eventId: string): void {
    this.db.prepare('update stripe_money_events set emailed_at = ? where event_id = ?').run(this.options.now().toISOString(), eventId);
  }

  // --- Deleting an account -----------------------------------------------------------------

  /**
   * Stop every running subscription before an account is deleted, so nobody
   * keeps paying for an account that no longer exists.
   */
  async cancelAllFor(userId: string): Promise<void> {
    // PayPal's own first (paypal.ts); then Stripe's.
    await this.options.paypal?.cancelAllFor(userId);
    const running = (
      this.db.prepare('select * from subscriptions where user_id = ?').all(userId) as unknown as SubscriptionRow[]
    ).filter((row) => !row.stripe_subscription_id.startsWith(PAYPAL_ID_PREFIX))
      .filter((row) => isProStatus(row.status) || row.status === 'incomplete' || row.status === 'unpaid' || row.status === 'paused');
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
    success: { title: 'You’re on GymGO Pro', body: 'Thanks for subscribing.' },
    cancelled: { title: 'No charge made', body: 'You didn’t subscribe.' },
    portal: { title: 'All set', body: '' },
  }[result];
  const go = destination
    ? `<p>Taking you back to GymGO…</p><p><a class="button" href="${escapeHtml(destination)}">Back to GymGO</a></p>
       <script>setTimeout(function () { location.replace(${JSON.stringify(destination).replace(/</g, '\\u003c')}); }, 600);</script>`
    : '<p>You can close this page and go back to GymGO.</p>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>GymGO</title>
<style>
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; background: #f2f2f7; color: #1c1c1e;
         font: 17px/1.4 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif; }
  main { max-width: 340px; padding: 32px 24px; text-align: center; background: #fff; border-radius: 24px; margin: 16px; }
  h1 { font-size: 22px; margin: 0 0 8px; } p { color: #636366; margin: 8px 0; }
  .button { display: inline-block; margin-top: 12px; padding: 12px 22px; border-radius: 999px; background: #5856d6;
            color: #fff; text-decoration: none; font-weight: 600; }
</style></head>
<body><main><h1>${copy.title}</h1>${copy.body ? `<p>${copy.body}</p>` : ''}${go}</main></body></html>`;
}
