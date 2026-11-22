import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PRO_PRICES, TRIAL_DAYS } from '@gymgo/domain';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { createApp } from './app';
import type { StripeApi, StripePaymentMethodConfiguration } from './billing';
import { openDb, seedGyms, type Db } from './db';
import {
  PAYPAL_PRODUCT_ID,
  createPayPal,
  planBody,
  plannedPlans,
  priceFromPlan,
  readStatus,
  type PayPalApi,
  type PayPalPlan,
  type PayPalSubscription,
} from './paypal';

// --- A pretend PayPal: records what GymGO asks for; never touches the network. ---

function makeFakePayPal() {
  const calls: Array<{ method: string; params: unknown }> = [];
  const plans = new Map<string, PayPalPlan>();
  const subscriptions = new Map<string, PayPalSubscription>();
  let genuine = true;
  // The setup script's plans, as PayPal would hold them.
  for (const { price, trial } of plannedPlans()) {
    const id = `P-${plans.size + 1}GYMGO`;
    plans.set(id, { ...(planBody(price, trial) as unknown as PayPalPlan), id, status: 'ACTIVE' });
  }
  const api: PayPalApi = {
    mode: 'sandbox',
    async listPlans(productId) {
      calls.push({ method: 'listPlans', params: productId });
      return [...plans.values()].filter((plan) => plan.product_id === productId).map(({ billing_cycles: _cycles, ...summary }) => summary);
    },
    async getPlan(id) {
      const plan = plans.get(id);
      if (!plan) throw new Error('No such plan');
      return plan;
    },
    async createSubscription(params) {
      calls.push({ method: 'createSubscription', params });
      const id = `I-SUB${subscriptions.size + 1}ABCDEF`;
      const subscription: PayPalSubscription = {
        id,
        status: 'APPROVAL_PENDING',
        plan_id: params.planId,
        custom_id: params.customId,
        links: [{ rel: 'approve', href: `https://www.sandbox.paypal.test/webapps/billing/subscriptions?ba_token=BA-${id}` }],
      };
      subscriptions.set(id, subscription);
      return subscription;
    },
    async getSubscription(id) {
      calls.push({ method: 'getSubscription', params: id });
      const subscription = subscriptions.get(id);
      if (!subscription) throw new Error('No such subscription');
      return subscription;
    },
    async cancelSubscription(id, reason) {
      calls.push({ method: 'cancelSubscription', params: { id, reason } });
      subscriptions.set(id, { ...subscriptions.get(id)!, status: 'CANCELLED' });
    },
    async verifyWebhook(params) {
      calls.push({ method: 'verifyWebhook', params });
      return genuine;
    },
    async getProduct() {
      return { id: PAYPAL_PRODUCT_ID };
    },
    async createProduct(params) {
      return { id: params.id };
    },
    async createPlan(params) {
      return { ...(params as unknown as PayPalPlan), id: 'P-NEW' };
    },
    async deactivatePlan() {},
  };

  /** What PayPal would hold once someone approves the subscription and pays. */
  function approve(id: string, fields: Partial<PayPalSubscription> = {}) {
    const subscription: PayPalSubscription = {
      ...subscriptions.get(id)!,
      status: 'ACTIVE',
      start_time: '2026-09-24T12:00:00Z',
      billing_info: { next_billing_time: '2026-10-24T12:00:00Z', last_payment: { time: '2026-09-24T12:00:00Z' } },
      ...fields,
    };
    subscriptions.set(id, subscription);
    return subscription;
  }

  const planFor = (lookupKey: string, trial = false) => [...plans.values()].find((plan) => plan.description === `gymgo:${lookupKey}${trial ? ':trial' : ''}`)!;

  return {
    api,
    calls,
    plans,
    subscriptions,
    approve,
    planFor,
    set genuine(value: boolean) {
      genuine = value;
    },
  };
}

/** Just enough of Stripe for the ways to pay and a checkout's settings. */
function makeLittleStripe(settings: StripePaymentMethodConfiguration[] | 'unreadable') {
  const created: Array<Record<string, unknown>> = [];
  const stripe: StripeApi = {
    customers: { create: async () => ({ id: 'cus_1' }) },
    checkout: {
      sessions: {
        async create(params) {
          created.push(params);
          return { id: 'cs_test_aaaaaaaaaaaaaaaaaaaa0', url: 'https://checkout.stripe.test/cs', customer: 'cus_1', client_reference_id: null, subscription: null };
        },
        retrieve: async () => {
          throw new Error('unused');
        },
      },
    },
    billingPortal: { sessions: { create: async () => ({ url: '' }) }, configurations: { list: async () => ({ data: [] }) } },
    subscriptions: {
      list: async () => ({ data: [] }),
      retrieve: async () => {
        throw new Error('unused');
      },
      cancel: async () => {
        throw new Error('unused');
      },
    },
    prices: {
      list: async () => ({
        data: PRO_PRICES.map((price, index) => ({ id: `price_${index}`, active: true, lookup_key: price.lookupKey, currency: price.currency, unit_amount: price.amountMinor, recurring: { interval: price.interval } })),
      }),
    },
    paymentMethodConfigurations: {
      async list() {
        if (settings === 'unreadable') throw new Error('Stripe is having a moment');
        return { data: settings };
      },
      async retrieve(id) {
        if (settings === 'unreadable') throw new Error('Stripe is having a moment');
        const found = settings.find((item) => item.id === id);
        if (!found) throw new Error('No such payment method configuration');
        return found;
      },
    },
  };
  return { stripe, created };
}

const on = { available: true };
const off = { available: false };
const DEFAULT_SETTINGS: StripePaymentMethodConfiguration = { id: 'pmc_default', active: true, is_default: true, card: on, apple_pay: on, google_pay: on, link: off, paypal: off };

// --- Servers --------------------------------------------------------------------

let db: Db;
let clock = new Date('2026-09-24T12:00:00Z');
const servers: Server[] = [];

async function start(options: { stripe?: StripeApi | null; paypal?: PayPalApi | null; webhookId?: string | null; paymentMethodConfiguration?: string | null }) {
  const server = createServer(
    createApp({
      db,
      attribution: 'test',
      signupsPerHour: 1000,
      now: () => clock,
      billing: { stripe: options.stripe ?? null, webhookSecret: null, paymentMethodConfiguration: options.paymentMethodConfiguration ?? null },
      paypal: { api: options.paypal ?? null, webhookId: options.webhookId ?? null },
    }),
  );
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

let paypal: ReturnType<typeof makeFakePayPal>;
let withPayPal: string;
let withoutPayPal: string;

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, MELBOURNE_GYMS.slice(0, 10));
  paypal = makeFakePayPal();
  withPayPal = await start({ stripe: makeLittleStripe([DEFAULT_SETTINGS]).stripe, paypal: paypal.api, webhookId: 'WH-GYMGO' });
  withoutPayPal = await start({ stripe: makeLittleStripe([DEFAULT_SETTINGS]).stripe });
});

afterAll(() => {
  for (const server of servers) server.close();
  db.close();
});

beforeEach(() => {
  clock = new Date('2026-09-24T12:00:00Z');
  paypal.calls.length = 0;
  paypal.genuine = true;
});

async function call(base: string, method: string, path: string, options: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body !== undefined || options.raw !== undefined ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
  const text = await response.text();
  const json = response.headers.get('content-type')?.includes('json') && text ? JSON.parse(text) : null;
  return { status: response.status, text, body: json };
}

let counter = 0;
async function signUp(base = withPayPal) {
  counter += 1;
  const result = await call(base, 'POST', '/api/auth/signup', {
    body: { email: `paypal${counter}@example.com`, password: 'correct horse', displayName: `Payer ${counter}`, birthMonth: '1990-01', acceptTerms: true },
  });
  return { token: result.body.token as string, id: result.body.account.id as string };
}

const RETURN = 'exp://192.168.1.20:8081/--/pro';

/** Sign up, approve a PayPal subscription and come back: Pro through PayPal. */
async function payPalPro(choice: { interval?: 'month' | 'year'; trial?: boolean } = {}, fields: Partial<PayPalSubscription> = {}) {
  const person = await signUp();
  const checkout = await call(withPayPal, 'POST', '/api/billing/paypal/checkout', {
    token: person.token,
    body: { interval: choice.interval ?? 'month', currency: 'aud', returnUrl: RETURN, ...(choice.trial ? { trial: true } : {}) },
  });
  expect(checkout.status).toBe(200);
  const made = paypal.calls.filter((item) => item.method === 'createSubscription').at(-1)!.params as { customId: string };
  expect(made.customId).toBe(person.id);
  const id = [...paypal.subscriptions.values()].at(-1)!.id;
  paypal.approve(id, fields);
  const back = await call(withPayPal, 'GET', `/api/billing/paypal/return?result=success&to=${encodeURIComponent(RETURN)}&subscription_id=${id}&ba_token=BA-1&token=T-1`);
  expect(back.status).toBe(200);
  return { ...person, subscriptionId: id };
}

// --- Plans and status, on their own ------------------------------------------------------

describe('PayPal plans', () => {
  it('reads a GymGO plan’s real price back from PayPal, and nothing that isn’t one', () => {
    const monthly = makeFakePayPal().planFor('gymgo_pro_month_aud');
    expect(priceFromPlan(monthly)).toMatchObject({ lookupKey: 'gymgo_pro_month_aud', interval: 'month', currency: 'aud', amountMinor: 399, plan: 'pro', trial: false });
    expect(priceFromPlan({ ...monthly, status: 'INACTIVE' })).toBeNull();
    expect(priceFromPlan({ ...monthly, description: 'Someone else’s plan' })).toBeNull();
    // A plan that says it's monthly A$ but bills yearly or in US$ is never offered as monthly A$.
    const yearly = monthly.billing_cycles.map((cycle) => ({ ...cycle, frequency: { interval_unit: 'YEAR', interval_count: 1 } }));
    expect(priceFromPlan({ ...monthly, billing_cycles: yearly })).toBeNull();
    const usd = monthly.billing_cycles.map((cycle) => ({ ...cycle, pricing_scheme: { fixed_price: { value: '3.99', currency_code: 'USD' } } }));
    expect(priceFromPlan({ ...monthly, billing_cycles: usd })).toBeNull();
  });

  it('plans every price GymGO sells, and monthly Pro again with the free trial first', () => {
    const planned = plannedPlans();
    for (const price of PRO_PRICES) expect(planned.some((item) => item.price.lookupKey === price.lookupKey && !item.trial)).toBe(true);
    const trial = planBody(PRO_PRICES.find((price) => price.interval === 'month')!, true) as { billing_cycles: Array<{ tenure_type: string; frequency: { interval_unit: string; interval_count: number }; pricing_scheme?: unknown }> };
    expect(trial.billing_cycles[0]).toMatchObject({ tenure_type: 'TRIAL', frequency: { interval_unit: 'DAY', interval_count: TRIAL_DAYS } });
    expect(trial.billing_cycles[0]!.pricing_scheme).toBeUndefined();
    expect(trial.billing_cycles[1]).toMatchObject({ tenure_type: 'REGULAR', pricing_scheme: { fixed_price: { value: '3.99', currency_code: 'AUD' } } });
  });
});

describe('PayPal status, in GymGO’s terms', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  const monthly = { interval: 'month' as const, trial: false };
  const base: PayPalSubscription = { id: 'I-ABCDEF123', status: 'ACTIVE', plan_id: 'P-1', start_time: '2026-09-24T12:00:00Z', billing_info: { next_billing_time: '2026-10-24T12:00:00Z', last_payment: { time: '2026-09-24T12:00:00Z' } } };

  it('is Pro while active, and while its free trial runs', () => {
    expect(readStatus(base, monthly, now)).toEqual({ status: 'active', periodEnd: '2026-10-24T12:00:00Z', cancelAt: null });
    const inTrial = { ...base, billing_info: { next_billing_time: '2026-09-27T12:00:00Z', cycle_executions: [{ tenure_type: 'TRIAL', cycles_completed: 0, cycles_remaining: 1 }] } };
    expect(readStatus(inTrial, { interval: 'month', trial: true }, now).status).toBe('trialing');
  });

  it('isn’t Pro before it’s approved, or while a payment is owed', () => {
    expect(readStatus({ ...base, status: 'APPROVAL_PENDING' }, monthly, now).status).toBe('incomplete');
    expect(readStatus({ ...base, status: 'SUSPENDED' }, monthly, now).status).toBe('paused');
  });

  it('keeps Pro after cancelling until the month paid for ends, then not', () => {
    expect(readStatus({ ...base, status: 'CANCELLED' }, monthly, now)).toEqual({ status: 'active', periodEnd: '2026-10-24T12:00:00.000Z', cancelAt: '2026-10-24T12:00:00.000Z' });
    expect(readStatus({ ...base, status: 'CANCELLED' }, monthly, new Date('2026-10-25T00:00:00Z')).status).toBe('canceled');
    // Cancelled in the free trial: Pro until the trial would have ended.
    const trialStart = { ...base, status: 'CANCELLED', billing_info: {} };
    expect(readStatus(trialStart, { interval: 'month', trial: true }, new Date('2026-09-25T00:00:00Z')).cancelAt).toBe(new Date(Date.parse('2026-09-24T12:00:00Z') + TRIAL_DAYS * 86_400_000).toISOString());
  });
});

// --- The ways to pay ----------------------------------------------------------------------

describe('the ways to pay', () => {
  it('names none without payments connected', async () => {
    const base = await start({});
    expect((await call(base, 'GET', '/api/billing/plans')).body.payWith).toBeNull();
  });

  it('says what Stripe’s checkout will really offer, from its payment method settings', async () => {
    const plans = await call(withoutPayPal, 'GET', '/api/billing/plans');
    expect(plans.body.payWith).toEqual({ card: true, applePay: true, googlePay: true, link: false, paypal: null });
    // Stripe's own PayPal (for businesses in Europe), when it's on there.
    const european = await start({ stripe: makeLittleStripe([{ ...DEFAULT_SETTINGS, paypal: on }]).stripe });
    expect((await call(european, 'GET', '/api/billing/plans')).body.payWith.paypal).toBe('stripe');
  });

  it('claims only a card when Stripe’s settings can’t be read', async () => {
    const base = await start({ stripe: makeLittleStripe('unreadable').stripe });
    expect((await call(base, 'GET', '/api/billing/plans')).body.payWith).toEqual({ card: true, applePay: false, googlePay: false, link: false, paypal: null });
  });

  it('offers PayPal’s own button once PayPal is connected and its plans are made', async () => {
    expect((await call(withPayPal, 'GET', '/api/billing/plans')).body.payWith.paypal).toBe('direct');
  });

  it('uses the chosen payment method setting for checkout, and reads that one', async () => {
    const chosen = { ...DEFAULT_SETTINGS, id: 'pmc_gymgo', is_default: false, apple_pay: off };
    const little = makeLittleStripe([DEFAULT_SETTINGS, chosen]);
    const base = await start({ stripe: little.stripe, paymentMethodConfiguration: 'pmc_gymgo' });
    expect((await call(base, 'GET', '/api/billing/plans')).body.payWith.applePay).toBe(false);
    const person = await signUp(base);
    const checkout = await call(base, 'POST', '/api/billing/checkout', { token: person.token, body: { interval: 'year', currency: 'aud', returnUrl: RETURN } });
    expect(checkout.status).toBe(200);
    expect(little.created.at(-1)!.payment_method_configuration).toBe('pmc_gymgo');
  });
});

// --- Pro with PayPal, end to end ----------------------------------------------------------

describe('Pro with PayPal', () => {
  it('says plainly when PayPal isn’t connected', async () => {
    const person = await signUp(withoutPayPal);
    const refused = await call(withoutPayPal, 'POST', '/api/billing/paypal/checkout', { token: person.token, body: { interval: 'month', currency: 'aud', returnUrl: RETURN } });
    expect(refused.status).toBe(503);
    expect(refused.body.code).toBe('paypal_off');
  });

  it('sends people to PayPal to approve, coming back through the server, and records nothing until they do', async () => {
    const person = await signUp();
    const checkout = await call(withPayPal, 'POST', '/api/billing/paypal/checkout', { token: person.token, body: { interval: 'year', currency: 'aud', returnUrl: RETURN } });
    expect(checkout.status).toBe(200);
    expect(checkout.body.url).toMatch(/^https:\/\/www\.sandbox\.paypal\.test\//);
    const made = paypal.calls.find((item) => item.method === 'createSubscription')!.params as { planId: string; returnUrl: string; cancelUrl: string };
    expect(made.planId).toBe(paypal.planFor('gymgo_pro_year_aud').id);
    expect(made.returnUrl).toContain('/api/billing/paypal/return?to=');
    expect(made.returnUrl).toContain('result=success');
    expect(made.cancelUrl).toContain('result=cancelled');
    // Turning back at PayPal: still Free, and the free trial still offered.
    const plan = await call(withPayPal, 'GET', '/api/billing', { token: person.token });
    expect(plan.body.plan).toBe('free');
    expect(plan.body.trial).not.toBeNull();
  });

  it('needs an account and a real choice', async () => {
    expect((await call(withPayPal, 'POST', '/api/billing/paypal/checkout', { body: { interval: 'month', currency: 'aud', returnUrl: RETURN } })).status).toBe(401);
    const person = await signUp();
    expect((await call(withPayPal, 'POST', '/api/billing/paypal/checkout', { token: person.token, body: { interval: 'week', currency: 'aud', returnUrl: RETURN } })).status).toBe(400);
  });

  it('turns Pro on when they come back, with PayPal as where it’s managed', async () => {
    const pro = await payPalPro();
    const plan = await call(withPayPal, 'GET', '/api/billing', { token: pro.token });
    expect(plan.body.plan).toBe('pro');
    expect(plan.body.subscription).toMatchObject({ provider: 'paypal', status: 'active', interval: 'month', currency: 'aud', amountMinor: 399, manageable: true, manageUrl: 'https://www.sandbox.paypal.com/myaccount/autopay/' });
    expect(plan.body.subscription.renewsAt).toBe('2026-10-24T12:00:00Z');
  });

  it('starts the free trial with PayPal too, once', async () => {
    const pro = await payPalPro({ trial: true }, { billing_info: { next_billing_time: '2026-09-27T12:00:00Z', cycle_executions: [{ tenure_type: 'TRIAL', cycles_completed: 0, cycles_remaining: 1 }] } });
    const made = paypal.calls.filter((item) => item.method === 'createSubscription').at(-1)!.params as { planId: string };
    expect(made.planId).toBe(paypal.planFor('gymgo_pro_month_aud', true).id);
    const plan = await call(withPayPal, 'GET', '/api/billing', { token: pro.token });
    expect(plan.body.subscription.trial).toBe(true);
    expect(plan.body.trial).toBeNull();
  });

  it('won’t start a second subscription for someone already on Pro', async () => {
    const pro = await payPalPro();
    const again = await call(withPayPal, 'POST', '/api/billing/paypal/checkout', { token: pro.token, body: { interval: 'month', currency: 'aud', returnUrl: RETURN } });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('already_pro');
  });

  it('ignores a made-up subscription id, and one made for nobody here', async () => {
    const person = await signUp();
    await call(withPayPal, 'GET', `/api/billing/paypal/return?result=success&to=${encodeURIComponent(RETURN)}&subscription_id=not-an-id`);
    const stranger = await paypal.api.createSubscription({ planId: paypal.planFor('gymgo_pro_month_aud').id, customId: 'someone-else', returnUrl: '', cancelUrl: '', requestId: 'x' });
    paypal.approve(stranger.id);
    await call(withPayPal, 'GET', `/api/billing/paypal/return?result=success&to=${encodeURIComponent(RETURN)}&subscription_id=${stranger.id}`);
    expect((await call(withPayPal, 'GET', '/api/billing', { token: person.token })).body.plan).toBe('free');
  });

  it('never forwards anywhere it doesn’t trust', async () => {
    const back = await call(withPayPal, 'GET', `/api/billing/paypal/return?result=cancelled&to=${encodeURIComponent('https://evil.example/steal')}`);
    expect(back.status).toBe(200);
    expect(back.text).not.toContain('evil.example');
  });
});

describe('PayPal webhooks', () => {
  const event = (id: string, type: string, resource: Record<string, unknown>) => JSON.stringify({ id, event_type: type, resource_type: type.startsWith('PAYMENT.') ? 'sale' : 'subscription', resource });

  it('refuses anything PayPal doesn’t vouch for', async () => {
    paypal.genuine = false;
    const refused = await call(withPayPal, 'POST', '/api/billing/paypal/webhook', { raw: event('WH-1', 'BILLING.SUBSCRIPTION.CANCELLED', { id: 'I-NOPE12345' }) });
    expect(refused.status).toBe(400);
    expect(paypal.calls.some((item) => item.method === 'getSubscription')).toBe(false);
  });

  it('checks the signature with PayPal, re-reads the subscription, and acts once per event', async () => {
    // Last paid on 26 August: the month paid for runs to 26 September (sign-ins last 30 days, so the clock stays within them).
    const pro = await payPalPro({}, { billing_info: { next_billing_time: '2026-09-26T12:00:00Z', last_payment: { time: '2026-08-26T12:00:00Z' } } });
    paypal.subscriptions.set(pro.subscriptionId, { ...paypal.subscriptions.get(pro.subscriptionId)!, status: 'CANCELLED' });
    const body = event('WH-CANCEL-1', 'BILLING.SUBSCRIPTION.CANCELLED', { id: pro.subscriptionId, status: 'ACTIVE' });
    const headers = { 'paypal-transmission-id': 'T-1', 'paypal-transmission-sig': 'sig', 'paypal-transmission-time': '2026-09-24T12:00:00Z', 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/cert' };
    expect((await call(withPayPal, 'POST', '/api/billing/paypal/webhook', { raw: body, headers })).status).toBe(200);
    const checked = paypal.calls.find((item) => item.method === 'verifyWebhook')!.params as { webhookId: string; headers: Record<string, string> };
    expect(checked.webhookId).toBe('WH-GYMGO');
    expect(checked.headers['paypal-transmission-id']).toBe('T-1');
    // Cancelled, but paid for until 26 September: still Pro until then, and it says when it ends.
    const plan = await call(withPayPal, 'GET', '/api/billing', { token: pro.token });
    expect(plan.body.plan).toBe('pro');
    expect(plan.body.subscription.endsAt).toBe('2026-09-26T12:00:00.000Z');
    // The same event again: handled already.
    paypal.calls.length = 0;
    await call(withPayPal, 'POST', '/api/billing/paypal/webhook', { raw: body, headers });
    expect(paypal.calls.some((item) => item.method === 'getSubscription')).toBe(false);
    // After the month paid for: Free.
    clock = new Date('2026-09-27T00:00:00Z');
    expect((await call(withPayPal, 'GET', '/api/billing', { token: pro.token })).body.plan).toBe('free');
  });

  it('follows a payment to the subscription it paid for', async () => {
    const pro = await payPalPro();
    paypal.calls.length = 0;
    await call(withPayPal, 'POST', '/api/billing/paypal/webhook', { raw: event('WH-SALE-1', 'PAYMENT.SALE.COMPLETED', { id: 'SALE-1', billing_agreement_id: pro.subscriptionId }) });
    expect(paypal.calls.some((item) => item.method === 'getSubscription' && item.params === pro.subscriptionId)).toBe(true);
  });
});

describe('deleting an account paid with PayPal', () => {
  it('cancels the subscription at PayPal first', async () => {
    const pro = await payPalPro();
    expect((await call(withPayPal, 'DELETE', '/api/me', { token: pro.token })).status).toBe(204);
    expect(paypal.calls.some((item) => item.method === 'cancelSubscription' && (item.params as { id: string }).id === pro.subscriptionId)).toBe(true);
    expect(paypal.subscriptions.get(pro.subscriptionId)!.status).toBe('CANCELLED');
  });

  it('refuses, and deletes nothing, when PayPal isn’t connected to cancel it', async () => {
    const pro = await payPalPro();
    const refused = await call(withoutPayPal, 'DELETE', '/api/me', { token: pro.token });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('subscription_running');
    expect((await call(withoutPayPal, 'GET', '/api/me', { token: pro.token })).status).toBe(200);
  });
});

// --- The real client, against a stand-in fetch ----------------------------------------------

describe('the PayPal client', () => {
  function fakeFetch(answers: Array<{ status: number; body?: unknown }>) {
    const sent: Array<{ url: string; init: RequestInit }> = [];
    const impl = (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      const answer = answers.shift() ?? { status: 500 };
      return new Response(answer.body === undefined ? null : JSON.stringify(answer.body), { status: answer.status, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    return { impl, sent };
  }

  it('gets a token once and reuses it, and sends a subscription PayPal can return from', async () => {
    const { impl, sent } = fakeFetch([
      { status: 200, body: { access_token: 'A21', expires_in: 3600 } },
      { status: 201, body: { id: 'I-NEW1234567', status: 'APPROVAL_PENDING', plan_id: 'P-1', links: [{ rel: 'approve', href: 'https://paypal.test/approve' }] } },
      { status: 200, body: { id: 'I-NEW1234567', status: 'ACTIVE', plan_id: 'P-1' } },
    ]);
    const client = createPayPal({ clientId: 'id', secret: 'secret', mode: 'sandbox', fetch: impl });
    await client.createSubscription({ planId: 'P-1', customId: 'acct', returnUrl: 'https://gymgo.test/back', cancelUrl: 'https://gymgo.test/cancel', requestId: 'req-1' });
    await client.getSubscription('I-NEW1234567');
    expect(sent.filter((item) => item.url.endsWith('/v1/oauth2/token'))).toHaveLength(1);
    expect(sent[0]!.url).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token');
    const create = sent[1]!;
    expect((create.init.headers as Record<string, string>)['PayPal-Request-Id']).toBe('req-1');
    expect(JSON.parse(String(create.init.body))).toMatchObject({ plan_id: 'P-1', custom_id: 'acct', application_context: { return_url: 'https://gymgo.test/back', cancel_url: 'https://gymgo.test/cancel', shipping_preference: 'NO_SHIPPING' } });
  });

  it('passes on PayPal’s own words when it refuses', async () => {
    const { impl } = fakeFetch([
      { status: 200, body: { access_token: 'A21', expires_in: 3600 } },
      { status: 422, body: { name: 'UNPROCESSABLE_ENTITY', message: 'The plan is inactive.' } },
    ]);
    const client = createPayPal({ clientId: 'id', secret: 'secret', mode: 'live', fetch: impl });
    await expect(client.getSubscription('I-X')).rejects.toMatchObject({ status: 422, message: 'The plan is inactive.', code: 'UNPROCESSABLE_ENTITY' });
  });

  it('asks PayPal to check a webhook with its headers and the webhook id', async () => {
    const { impl, sent } = fakeFetch([
      { status: 200, body: { access_token: 'A21', expires_in: 3600 } },
      { status: 200, body: { verification_status: 'SUCCESS' } },
    ]);
    const client = createPayPal({ clientId: 'id', secret: 'secret', mode: 'sandbox', fetch: impl });
    const ok = await client.verifyWebhook({ headers: { 'paypal-transmission-id': 'T', 'paypal-auth-algo': 'A', 'paypal-cert-url': 'C', 'paypal-transmission-sig': 'S', 'paypal-transmission-time': 'TT' }, webhookId: 'WH', event: { id: 'E' } });
    expect(ok).toBe(true);
    expect(JSON.parse(String(sent[1]!.init.body))).toEqual({ auth_algo: 'A', cert_url: 'C', transmission_id: 'T', transmission_sig: 'S', transmission_time: 'TT', webhook_id: 'WH', webhook_event: { id: 'E' } });
  });
});
