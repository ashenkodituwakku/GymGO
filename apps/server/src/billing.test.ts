import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import Stripe from 'stripe';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LIMITS, PRO_PRICES } from '@gymgo/domain';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { US_GYMS } from '@gymgo/usa-data';
import { createApp } from './app';
import { safeReturnUrl, withQuery, type StripeApi, type StripeCheckoutSession, type StripeSubscription } from './billing';
import { openDb, seedGyms, type Db } from './db';

// --- A pretend Stripe: records what GymGO asks for; never touches the network. ---

const WEBHOOK_SECRET = 'whsec_test_gymgo';
const DAY = 24 * 60 * 60;

function makeFakeStripe() {
  const calls: Array<{ method: string; params: unknown; options?: unknown }> = [];
  const subscriptions = new Map<string, StripeSubscription>();
  const sessions = new Map<string, StripeCheckoutSession>();
  let customers = 0;
  let failRetrieve = false;
  const prices = PRO_PRICES.map((price, index) => ({
    id: `price_${index}`,
    active: true,
    lookup_key: price.lookupKey,
    currency: price.currency,
    unit_amount: price.amountMinor,
    recurring: { interval: price.interval },
  }));

  const stripe: StripeApi = {
    customers: {
      async create(params, options) {
        calls.push({ method: 'customers.create', params, options });
        customers += 1;
        return { id: `cus_${customers}` };
      },
    },
    checkout: {
      sessions: {
        async create(params) {
          calls.push({ method: 'checkout.sessions.create', params });
          const id = `cs_test_${'a'.repeat(20)}${sessions.size}`;
          const session = { id, url: `https://checkout.stripe.test/${id}`, customer: params.customer as string, client_reference_id: params.client_reference_id as string, subscription: null };
          sessions.set(id, session);
          return session;
        },
        async retrieve(id) {
          calls.push({ method: 'checkout.sessions.retrieve', params: id });
          const session = sessions.get(id);
          if (!session) throw new Error('No such checkout session');
          return session;
        },
      },
    },
    billingPortal: {
      sessions: {
        async create(params) {
          calls.push({ method: 'billingPortal.sessions.create', params });
          return { url: 'https://billing.stripe.test/portal' };
        },
      },
      configurations: {
        async list() {
          return { data: [{ id: 'bpc_gymgo', metadata: { gymgo: 'pro' } }] };
        },
      },
    },
    subscriptions: {
      async list(params) {
        calls.push({ method: 'subscriptions.list', params });
        return { data: [...subscriptions.values()].filter((sub) => sub.customer === params.customer) };
      },
      async retrieve(id) {
        calls.push({ method: 'subscriptions.retrieve', params: id });
        if (failRetrieve) throw new Error('Stripe is having a moment');
        const sub = subscriptions.get(id);
        if (!sub) throw new Error('No such subscription');
        return sub;
      },
      async cancel(id) {
        calls.push({ method: 'subscriptions.cancel', params: id });
        const sub = subscriptions.get(id)!;
        const cancelled = { ...sub, status: 'canceled' };
        subscriptions.set(id, cancelled);
        return cancelled;
      },
    },
    prices: {
      async list(params) {
        calls.push({ method: 'prices.list', params });
        return { data: prices.filter((price) => params.lookup_keys.includes(price.lookup_key)) };
      },
    },
  };

  /** What Stripe would hold after someone pays at checkout. */
  function pay(sessionId: string, fields: Partial<StripeSubscription> = {}) {
    const session = sessions.get(sessionId)!;
    const sub = makeSubscription({ ...fields, id: `sub_${subscriptions.size + 1}`, customer: session.customer as string });
    subscriptions.set(sub.id, sub);
    sessions.set(sessionId, { ...session, subscription: sub.id });
    return sub;
  }

  return {
    stripe,
    calls,
    subscriptions,
    sessions,
    pay,
    set failRetrieve(value: boolean) {
      failRetrieve = value;
    },
  };
}

function makeSubscription(fields: Partial<StripeSubscription> & { id: string; customer: string }): StripeSubscription {
  const periodEnd = Math.floor(Date.parse('2026-10-24T00:00:00Z') / 1000);
  return {
    status: 'active',
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: {},
    items: {
      data: [
        {
          current_period_end: periodEnd,
          price: { id: 'price_1', active: true, lookup_key: 'gymgo_pro_year_aud', currency: 'aud', unit_amount: 2999, recurring: { interval: 'year' } },
        },
      ],
    },
    ...fields,
  };
}

// --- Servers --------------------------------------------------------------------

let db: Db;
let fake: ReturnType<typeof makeFakeStripe>;
let withStripe: { server: Server; base: string };
let withoutStripe: { server: Server; base: string };
let clock = new Date('2026-09-24T12:00:00Z');

async function start(stripe: StripeApi | null) {
  const server = createServer(
    createApp({ db, attribution: 'test', signupsPerHour: 1000, now: () => clock, billing: { stripe, webhookSecret: stripe ? WEBHOOK_SECRET : null } }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, [...MELBOURNE_GYMS, ...US_GYMS.slice(0, 20)]);
  fake = makeFakeStripe();
  withStripe = await start(fake.stripe);
  withoutStripe = await start(null);
});

afterAll(() => {
  withStripe.server.close();
  withoutStripe.server.close();
  db.close();
});

beforeEach(() => {
  clock = new Date('2026-09-24T12:00:00Z');
  fake.calls.length = 0;
});

async function call(base: string, method: string, path: string, options: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
  const text = await response.text();
  const json = response.headers.get('content-type')?.includes('json') && text ? JSON.parse(text) : null;
  return { status: response.status, text, body: json };
}

let counter = 0;
async function signUp(base = withStripe.base) {
  counter += 1;
  const result = await call(base, 'POST', '/api/auth/signup', {
    body: { email: `pro${counter}@example.com`, password: 'correct horse', displayName: `Lifter ${counter}` },
  });
  return { token: result.body.token as string, id: result.body.account.id as string };
}

/** Sign up and go through checkout and the return page: a Pro account. */
async function proAccount(fields: Partial<StripeSubscription> = {}) {
  const person = await signUp();
  const checkout = await call(withStripe.base, 'POST', '/api/billing/checkout', {
    token: person.token,
    body: { interval: 'year', currency: 'aud', returnUrl: 'exp://192.168.1.20:8081/--/pro' },
  });
  const sessionId = new URL(checkout.body.url).pathname.slice(1);
  const sub = fake.pay(sessionId, { metadata: { gymgo_account_id: person.id }, ...fields });
  await call(withStripe.base, 'GET', `/api/billing/return?result=success&session_id=${sessionId}&to=${encodeURIComponent('exp://192.168.1.20:8081/--/pro')}`);
  return { ...person, sub, sessionId };
}

function signedWebhook(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  return { raw: payload, headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }), 'content-type': 'application/json' } };
}

// --- Tests --------------------------------------------------------------------------

describe('GymGO Pro without Stripe connected', () => {
  it('shows the planned prices, marked as not on sale, and everyone is Free', async () => {
    const plans = await call(withoutStripe.base, 'GET', '/api/billing/plans');
    expect(plans.body.available).toBe(false);
    expect(plans.body.prices).toEqual(PRO_PRICES);
    const { token } = await signUp(withoutStripe.base);
    const me = await call(withoutStripe.base, 'GET', '/api/billing', { token });
    expect(me.body).toMatchObject({ plan: 'free', limits: LIMITS.free, subscription: null, available: false });
  });

  it('says plainly that checkout isn’t possible yet', async () => {
    const { token } = await signUp(withoutStripe.base);
    const result = await call(withoutStripe.base, 'POST', '/api/billing/checkout', {
      token,
      body: { interval: 'month', currency: 'aud', returnUrl: 'http://localhost:8081/pro' },
    });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('billing_off');
  });
});

describe('checkout', () => {
  it('reads the prices from Stripe by lookup key', async () => {
    const plans = await call(withStripe.base, 'GET', '/api/billing/plans');
    expect(plans.body.available).toBe(true);
    expect(plans.body.prices).toHaveLength(4);
  });

  it('needs an account, a real choice, and a return address GymGO trusts', async () => {
    expect((await call(withStripe.base, 'POST', '/api/billing/checkout', { body: { interval: 'month', currency: 'aud' } })).status).toBe(401);
    const { token } = await signUp();
    const post = (body: unknown) => call(withStripe.base, 'POST', '/api/billing/checkout', { token, body });
    expect((await post({ interval: 'week', currency: 'aud', returnUrl: 'gymgo://pro' })).status).toBe(400);
    expect((await post({ interval: 'month', currency: 'eur', returnUrl: 'gymgo://pro' })).status).toBe(400);
    expect((await post({ interval: 'month', currency: 'aud', returnUrl: 'https://evil.example/pro' })).status).toBe(400);
    expect((await post({ interval: 'month', currency: 'aud', returnUrl: 'javascript:alert(1)' })).status).toBe(400);
  });

  it('opens Stripe Checkout for the chosen price, for this account, coming back through the server', async () => {
    const { token, id } = await signUp();
    const result = await call(withStripe.base, 'POST', '/api/billing/checkout', {
      token,
      body: { interval: 'month', currency: 'usd', returnUrl: 'http://localhost:8081/pro' },
    });
    expect(result.status).toBe(200);
    expect(result.body.url).toMatch(/^https:\/\/checkout\.stripe\.test\//);
    const created = fake.calls.find((item) => item.method === 'checkout.sessions.create')!.params as Record<string, any>;
    expect(created.mode).toBe('subscription');
    expect(created.client_reference_id).toBe(id);
    expect(created.line_items).toEqual([{ price: `price_${PRO_PRICES.findIndex((p) => p.lookupKey === 'gymgo_pro_month_usd')}`, quantity: 1 }]);
    expect(created.subscription_data.metadata.gymgo_account_id).toBe(id);
    // Stripe replaces {CHECKOUT_SESSION_ID} itself, so it must arrive unencoded.
    expect(created.success_url).toContain('session_id={CHECKOUT_SESSION_ID}');
    expect(created.success_url).toContain('/api/billing/return?to=http%3A%2F%2Flocalhost%3A8081%2Fpro');
    expect(created.cancel_url).toContain('result=cancelled');
    const customer = fake.calls.find((item) => item.method === 'customers.create')!;
    expect(customer.options).toEqual({ idempotencyKey: `gymgo-customer-${id}` });
  });

  it('reuses the Stripe customer on a second try', async () => {
    const { token } = await signUp();
    const body = { interval: 'month', currency: 'aud', returnUrl: 'gymgo://pro' };
    await call(withStripe.base, 'POST', '/api/billing/checkout', { token, body });
    await call(withStripe.base, 'POST', '/api/billing/checkout', { token, body });
    expect(fake.calls.filter((item) => item.method === 'customers.create')).toHaveLength(1);
  });
});

describe('coming back from Stripe', () => {
  it('turns Pro on straight away, and forwards into the app', async () => {
    const person = await signUp();
    const returnUrl = 'exp://192.168.1.20:8081/--/pro';
    const checkout = await call(withStripe.base, 'POST', '/api/billing/checkout', { token: person.token, body: { interval: 'year', currency: 'aud', returnUrl } });
    const sessionId = new URL(checkout.body.url).pathname.slice(1);
    fake.pay(sessionId);
    const page = await call(withStripe.base, 'GET', `/api/billing/return?result=success&session_id=${sessionId}&to=${encodeURIComponent(returnUrl)}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain('You’re on GymGO Pro');
    expect(page.text).toContain('exp://192.168.1.20:8081/--/pro?checkout=success');
    const me = await call(withStripe.base, 'GET', '/api/billing', { token: person.token });
    expect(me.body.plan).toBe('pro');
    expect(me.body.limits).toEqual(LIMITS.pro);
    expect(me.body.subscription).toMatchObject({ status: 'active', interval: 'year', currency: 'aud', amountMinor: 2999, renewsAt: '2026-10-24T00:00:00.000Z', endsAt: null });
  });

  it('never forwards anywhere it doesn’t trust', async () => {
    const page = await call(withStripe.base, 'GET', `/api/billing/return?result=cancelled&to=${encodeURIComponent('https://evil.example')}`);
    expect(page.text).toContain('No charge made');
    expect(page.text).not.toContain('evil.example');
  });

  it('won’t start a second subscription for someone already on Pro', async () => {
    const { token } = await proAccount();
    const again = await call(withStripe.base, 'POST', '/api/billing/checkout', { token, body: { interval: 'month', currency: 'aud', returnUrl: 'gymgo://pro' } });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('already_pro');
  });
});

describe('webhooks', () => {
  it('refuses anything not signed by Stripe', async () => {
    const payload = JSON.stringify({ id: 'evt_forged', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } });
    const forged = await call(withStripe.base, 'POST', '/api/billing/webhook', {
      raw: payload,
      headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_wrong' }) },
    });
    expect(forged.status).toBe(400);
    expect((await call(withStripe.base, 'POST', '/api/billing/webhook', { raw: payload })).status).toBe(400);
  });

  it('keeps status in step with Stripe, re-reading the subscription each time, once per event', async () => {
    const { token, sub } = await proAccount();
    fake.calls.length = 0;
    // Cancelled in Stripe's portal: Pro to the end of the paid period.
    fake.subscriptions.set(sub.id, { ...sub, cancel_at_period_end: true });
    const event = signedWebhook({ id: 'evt_cancel_1', type: 'customer.subscription.updated', data: { object: { id: sub.id } } });
    expect((await call(withStripe.base, 'POST', '/api/billing/webhook', event)).status).toBe(200);
    expect((await call(withStripe.base, 'POST', '/api/billing/webhook', event)).status).toBe(200);
    expect(fake.calls.filter((item) => item.method === 'subscriptions.retrieve' && item.params === sub.id)).toHaveLength(1);
    let me = await call(withStripe.base, 'GET', '/api/billing', { token });
    expect(me.body.plan).toBe('pro');
    expect(me.body.subscription).toMatchObject({ renewsAt: null, endsAt: '2026-10-24T00:00:00.000Z' });

    // The period ends before any webhook says so: Free, on the date.
    clock = new Date('2026-10-24T00:00:01Z');
    me = await call(withStripe.base, 'GET', '/api/billing', { token });
    expect(me.body.plan).toBe('free');

    // Then Stripe ends it.
    fake.subscriptions.set(sub.id, { ...sub, status: 'canceled', cancel_at_period_end: true });
    await call(withStripe.base, 'POST', '/api/billing/webhook', signedWebhook({ id: 'evt_deleted_1', type: 'customer.subscription.deleted', data: { object: { id: sub.id } } }));
    me = await call(withStripe.base, 'GET', '/api/billing', { token });
    expect(me.body.plan).toBe('free');
    expect(me.body.subscription.status).toBe('canceled');
  });

  it('keeps Pro while Stripe retries a failed payment', async () => {
    const { token, sub } = await proAccount();
    fake.subscriptions.set(sub.id, { ...sub, status: 'past_due' });
    await call(withStripe.base, 'POST', '/api/billing/webhook', signedWebhook({ id: 'evt_pastdue', type: 'customer.subscription.updated', data: { object: { id: sub.id } } }));
    expect((await call(withStripe.base, 'GET', '/api/billing', { token })).body.plan).toBe('pro');
    fake.subscriptions.set(sub.id, { ...sub, status: 'unpaid' });
    await call(withStripe.base, 'POST', '/api/billing/webhook', signedWebhook({ id: 'evt_unpaid', type: 'customer.subscription.updated', data: { object: { id: sub.id } } }));
    expect((await call(withStripe.base, 'GET', '/api/billing', { token })).body.plan).toBe('free');
  });

  it('lets Stripe retry an event that failed halfway', async () => {
    const { token, sub } = await proAccount();
    fake.subscriptions.set(sub.id, { ...sub, status: 'canceled' });
    const event = signedWebhook({ id: 'evt_retry', type: 'customer.subscription.deleted', data: { object: { id: sub.id } } });
    fake.failRetrieve = true;
    expect((await call(withStripe.base, 'POST', '/api/billing/webhook', event)).status).toBe(500);
    fake.failRetrieve = false;
    expect((await call(withStripe.base, 'POST', '/api/billing/webhook', event)).status).toBe(200);
    expect((await call(withStripe.base, 'GET', '/api/billing', { token })).body.plan).toBe('free');
  });
});

describe('managing a subscription', () => {
  it('opens Stripe’s portal for subscribers, coming back through the server', async () => {
    const free = await signUp();
    expect((await call(withStripe.base, 'POST', '/api/billing/portal', { token: free.token, body: { returnUrl: 'gymgo://profile' } })).status).toBe(404);
    const { token } = await proAccount();
    const portal = await call(withStripe.base, 'POST', '/api/billing/portal', { token, body: { returnUrl: 'gymgo://profile' } });
    expect(portal.body.url).toBe('https://billing.stripe.test/portal');
    const created = fake.calls.find((item) => item.method === 'billingPortal.sessions.create')!.params as Record<string, string>;
    expect(created.configuration).toBe('bpc_gymgo');
    expect(created.return_url).toContain('/api/billing/return?to=gymgo%3A%2F%2Fprofile&result=portal');
  });

  it('re-reads from Stripe on request', async () => {
    const { token, sub } = await proAccount();
    fake.subscriptions.set(sub.id, { ...sub, status: 'canceled' });
    const synced = await call(withStripe.base, 'POST', '/api/billing/sync', { token });
    expect(synced.body.plan).toBe('free');
  });
});

describe('what Pro unlocks', () => {
  const gymIds = [...MELBOURNE_GYMS, ...US_GYMS.slice(0, 20)].map((record) => record.location.id);

  it(`saves ${LIMITS.free.savedGyms} gyms on Free, and more on Pro`, async () => {
    const free = await signUp();
    for (const gymId of gymIds.slice(0, LIMITS.free.savedGyms)) {
      expect((await call(withStripe.base, 'PUT', `/api/saved/${gymId}`, { token: free.token })).status).toBe(204);
    }
    const over = await call(withStripe.base, 'PUT', `/api/saved/${gymIds[LIMITS.free.savedGyms]}`, { token: free.token });
    expect(over.status).toBe(403);
    expect(over.body.code).toBe('pro_required');
    // Saving one that's already saved is still fine.
    expect((await call(withStripe.base, 'PUT', `/api/saved/${gymIds[0]}`, { token: free.token })).status).toBe(204);

    const pro = await proAccount();
    for (const gymId of gymIds.slice(0, LIMITS.free.savedGyms + 5)) {
      expect((await call(withStripe.base, 'PUT', `/api/saved/${gymId}`, { token: pro.token })).status).toBe(204);
    }
  });

  const plan = {
    muscles: ['chest', 'triceps'],
    goal: 'muscle',
    gymName: 'Doherty’s Gym',
    items: [
      { exerciseId: 'bench-press', sets: 4, reps: '8–10', restSeconds: 90, uses: ['barbells', 'bench'], confirmed: false },
      { exerciseId: 'push-up', sets: 3, reps: '10–15', restSeconds: 60, uses: [], confirmed: true },
    ],
    uncovered: [],
  };

  it('keeps a workout library on Pro only, and lets anyone tidy theirs', async () => {
    const free = await signUp();
    const refused = await call(withStripe.base, 'POST', '/api/workouts', { token: free.token, body: { name: 'Push', plan } });
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('pro_required');

    const pro = await proAccount();
    const saved = await call(withStripe.base, 'POST', '/api/workouts', { token: pro.token, body: { name: '  Push   day ', gymId: 'dohertys-gym-city', plan } });
    expect(saved.status).toBe(201);
    expect(saved.body.workout).toMatchObject({ name: 'Push day', gymId: 'dohertys-gym-city' });
    expect(saved.body.workout.plan.items).toHaveLength(2);
    const bad = await call(withStripe.base, 'POST', '/api/workouts', { token: pro.token, body: { name: 'Bad', plan: { items: [{ exerciseId: 'x', sets: 99 }] } } });
    expect(bad.status).toBe(400);

    const listed = await call(withStripe.base, 'GET', '/api/workouts', { token: pro.token });
    expect(listed.body.workouts.map((item: { name: string }) => item.name)).toEqual(['Push day']);
    // Someone else can't delete it.
    expect((await call(withStripe.base, 'DELETE', `/api/workouts/${saved.body.workout.id}`, { token: free.token })).status).toBe(404);

    // Pro ends: the library stays readable and tidy-able, but doesn't grow.
    fake.subscriptions.set(pro.sub.id, { ...pro.sub, status: 'canceled' });
    await call(withStripe.base, 'POST', '/api/billing/sync', { token: pro.token });
    expect((await call(withStripe.base, 'GET', '/api/workouts', { token: pro.token })).body.workouts).toHaveLength(1);
    expect((await call(withStripe.base, 'POST', '/api/workouts', { token: pro.token, body: { name: 'Pull', plan } })).status).toBe(403);
    expect((await call(withStripe.base, 'DELETE', `/api/workouts/${saved.body.workout.id}`, { token: pro.token })).status).toBe(204);
  });
});

describe('deleting an account', () => {
  it('cancels a running subscription in Stripe first', async () => {
    const pro = await proAccount();
    expect((await call(withStripe.base, 'DELETE', '/api/me', { token: pro.token })).status).toBe(204);
    expect(fake.calls.some((item) => item.method === 'subscriptions.cancel' && item.params === pro.sub.id)).toBe(true);
    expect(fake.subscriptions.get(pro.sub.id)!.status).toBe('canceled');
  });

  it('refuses, and deletes nothing, if the subscription can’t be cancelled', async () => {
    const pro = await proAccount();
    const refused = await call(withoutStripe.base, 'DELETE', '/api/me', { token: pro.token });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('subscription_running');
    expect((await call(withoutStripe.base, 'GET', '/api/me', { token: pro.token })).status).toBe(200);
  });
});

describe('return addresses', () => {
  const web = (origin: string) => origin === 'http://localhost:8081';
  it('allows the app’s own links and trusted web pages only', () => {
    expect(safeReturnUrl('gymgo://pro', web)).toBe('gymgo://pro');
    expect(safeReturnUrl('exp://192.168.1.5:8081/--/pro', web)).toBe('exp://192.168.1.5:8081/--/pro');
    expect(safeReturnUrl('http://localhost:8081/pro', web)).toBe('http://localhost:8081/pro');
    expect(safeReturnUrl('https://evil.example/pro', web)).toBeNull();
    expect(safeReturnUrl('javascript:alert(1)', web)).toBeNull();
    expect(safeReturnUrl(42, web)).toBeNull();
  });

  it('adds to a query without breaking what’s there', () => {
    expect(withQuery('gymgo://pro', { checkout: 'success' })).toBe('gymgo://pro?checkout=success');
    expect(withQuery('http://localhost:8081/pro?from=home#top', { checkout: 'cancelled' })).toBe('http://localhost:8081/pro?from=home&checkout=cancelled#top');
  });
});
