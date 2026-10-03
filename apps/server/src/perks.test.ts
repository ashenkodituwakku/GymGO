import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DUO_PRICES, GIFT_PRICES, PRO_PRICES } from '@gymgo/domain';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { createApp } from './app';
import type { StripeApi, StripeCheckoutSession, StripeSubscription } from './billing';
import { openDb, seedGyms, type Db } from './db';

const WEBHOOK_SECRET = 'whsec_test_perks';
const clock = new Date('2026-10-01T10:00:00Z');

// A pretend Stripe: checkout sessions it can mark paid, and subscriptions.
const sessions = new Map<string, StripeCheckoutSession & { line_items?: unknown }>();
const subscriptions = new Map<string, StripeSubscription>();
const created: Array<Record<string, unknown>> = [];
const prices = [...PRO_PRICES, ...DUO_PRICES].map((price, index) => ({
  id: `price_${index}`,
  active: true,
  lookup_key: price.lookupKey,
  currency: price.currency,
  unit_amount: price.amountMinor,
  recurring: { interval: price.interval },
}));
const giftPrices = GIFT_PRICES.map((price, index) => ({ id: `price_gift_${index}`, active: true, lookup_key: price.lookupKey, currency: price.currency, unit_amount: price.amountMinor, recurring: null }));
let customers = 0;
const stripe: StripeApi = {
  customers: { create: async () => ({ id: `cus_${++customers}` }) },
  checkout: {
    sessions: {
      async create(params) {
        created.push(params);
        const id = `cs_test_${'b'.repeat(20)}${sessions.size}`;
        const session = {
          id,
          url: `https://checkout.stripe.test/${id}`,
          customer: params.customer as string,
          client_reference_id: params.client_reference_id as string,
          subscription: null,
          mode: params.mode as string,
          payment_status: 'unpaid',
          metadata: params.metadata as Record<string, string>,
        };
        sessions.set(id, session);
        return session;
      },
      async retrieve(id) {
        const session = sessions.get(id);
        if (!session) throw new Error('No such session');
        return session;
      },
    },
  },
  billingPortal: { sessions: { create: async () => ({ url: 'x' }) }, configurations: { list: async () => ({ data: [] }) } },
  subscriptions: {
    list: async (params) => ({ data: [...subscriptions.values()].filter((sub) => sub.customer === params.customer) }),
    retrieve: async (id) => subscriptions.get(id)!,
    cancel: async (id) => ({ ...subscriptions.get(id)!, status: 'canceled' }),
  },
  prices: { list: async (params) => ({ data: [...prices, ...giftPrices].filter((price) => params.lookup_keys.includes(price.lookup_key)) }) },
};

let server: Server;
let base: string;
let db: Db;

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, MELBOURNE_GYMS, clock);
  server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000, now: () => clock, billing: { stripe, webhookSecret: WEBHOOK_SECRET } }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
});

async function call(method: string, path: string, options: { token?: string; body?: unknown; raw?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...options.headers };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${base}${path}`, { method, headers, body: options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body)), redirect: 'manual' });
  const text = await response.text();
  let body: Record<string, any> | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

let people = 0;
async function person(name?: string) {
  people += 1;
  const result = await call('POST', '/api/auth/signup', {
    body: { email: `perk${people}@example.com`, password: 'correct horse', displayName: name ?? `Person ${people}`, birthMonth: '1990-01', acceptTerms: true },
  });
  expect(result.status).toBe(201);
  const token = result.body!.token as string;
  return { token, id: result.body!.account.id as string, code: (await call('GET', '/api/friends', { token })).body!.code as string };
}

/** Stripe marks a checkout paid, and the person comes back through the return page. */
async function pay(url: string) {
  const id = url.split('/').pop()!;
  sessions.set(id, { ...sessions.get(id)!, payment_status: 'paid' });
  await call('GET', `/api/billing/return?result=success&session_id=${id}&to=${encodeURIComponent('gymgo://pro')}`);
  return id;
}

describe('gift Pro', () => {
  it('pays once at Stripe, makes one code however often Stripe says so, and gives whoever redeems it a year of Pro', async () => {
    const buyer = await person('Buyer');
    const friend = await person('Friend');
    const plans = (await call('GET', '/api/billing/plans')).body!;
    expect(plans.gifts).toEqual([expect.objectContaining({ currency: 'aud', amountMinor: 2999 }), expect.objectContaining({ currency: 'usd' })]);

    const checkout = await call('POST', '/api/billing/gift', { token: buyer.token, body: { currency: 'aud', returnUrl: 'gymgo://pro' } });
    expect(checkout.status).toBe(200);
    expect(created.at(-1)).toMatchObject({ mode: 'payment', line_items: [{ price: 'price_gift_0', quantity: 1 }], metadata: { gymgo_kind: 'gift' } });
    // Not paid yet: no code.
    expect((await call('GET', '/api/billing/gifts', { token: buyer.token })).body!.gifts).toEqual([]);
    const id = await pay(checkout.body!.url);
    // The webhook says so too: still one code.
    const payload = JSON.stringify({ id: 'evt_gift_1', type: 'checkout.session.completed', data: { object: { id, mode: 'payment' } } });
    const signed = await call('POST', '/api/billing/webhook', { raw: payload, headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }), 'content-type': 'application/json' } });
    expect(signed.status).toBe(200);
    const gifts = (await call('GET', '/api/billing/gifts', { token: buyer.token })).body!.gifts;
    expect(gifts).toHaveLength(1);
    expect(gifts[0]).toMatchObject({ redeemed: false });
    expect(gifts[0].code).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);

    expect((await call('POST', '/api/billing/redeem', { token: friend.token, body: { code: 'nope' } })).status).toBe(400);
    expect((await call('POST', '/api/billing/redeem', { token: friend.token, body: { code: 'ZZZZ-ZZZZ-ZZZZ' } })).status).toBe(404);
    const redeemed = await call('POST', '/api/billing/redeem', { token: friend.token, body: { code: gifts[0].code.toLowerCase() } });
    expect(redeemed.status).toBe(200);
    expect(redeemed.body).toMatchObject({ plan: 'pro', grant: { via: 'gift', endsAt: '2027-10-01T10:00:00.000Z' } });
    expect((await call('POST', '/api/billing/redeem', { token: buyer.token, body: { code: gifts[0].code } })).status).toBe(409);
    expect((await call('GET', '/api/billing/gifts', { token: buyer.token })).body!.gifts[0].redeemed).toBe(true);
    // Their Pro is the server's: saved gyms past the free limit.
    expect((await call('GET', '/api/billing', { token: friend.token })).body!.plan).toBe('pro');
  });
});

describe('Duo', () => {
  it('lets a Duo subscriber add one person, who is Pro while the Duo is paid for', async () => {
    const payer = await person('Payer');
    const partner = await person('Partner');
    const other = await person('Other');
    expect((await call('PUT', '/api/billing/duo', { token: payer.token, body: { code: partner.code } })).status).toBe(403);

    const checkout = await call('POST', '/api/billing/checkout', { token: payer.token, body: { interval: 'year', currency: 'aud', plan: 'duo', returnUrl: 'gymgo://pro' } });
    expect(checkout.status).toBe(200);
    expect(created.at(-1)).toMatchObject({ mode: 'subscription', line_items: [{ price: `price_${PRO_PRICES.length + 1}`, quantity: 1 }] });
    // Stripe holds the subscription once paid.
    const sessionId = checkout.body!.url.split('/').pop()!;
    const duoPrice = prices[PRO_PRICES.length + 1]!;
    const sub: StripeSubscription = {
      id: 'sub_duo',
      status: 'active',
      customer: sessions.get(sessionId)!.customer,
      cancel_at_period_end: false,
      cancel_at: null,
      metadata: {},
      items: { data: [{ current_period_end: Math.floor(Date.parse('2027-10-01T00:00:00Z') / 1000), price: duoPrice }] },
    };
    subscriptions.set(sub.id, sub);
    sessions.set(sessionId, { ...sessions.get(sessionId)!, subscription: sub.id });
    await call('GET', `/api/billing/return?result=success&session_id=${sessionId}&to=${encodeURIComponent('gymgo://pro')}`);
    expect((await call('GET', '/api/billing', { token: payer.token })).body).toMatchObject({ plan: 'pro', duo: true });

    expect((await call('PUT', '/api/billing/duo', { token: payer.token, body: { code: payer.code } })).status).toBe(400);
    const added = await call('PUT', '/api/billing/duo', { token: payer.token, body: { code: partner.code } });
    expect(added.body).toEqual({ role: 'owner', partner: { displayName: 'Partner' }, canAdd: true });
    expect((await call('GET', '/api/billing', { token: partner.token })).body).toMatchObject({ plan: 'pro', grant: { via: 'duo', from: 'Payer', endsAt: null } });
    expect((await call('GET', '/api/billing/duo', { token: partner.token })).body).toMatchObject({ role: 'member', partner: { displayName: 'Payer' } });

    // Swapping: the new person in, the old one back to Free.
    await call('PUT', '/api/billing/duo', { token: payer.token, body: { code: other.code } });
    expect((await call('GET', '/api/billing', { token: partner.token })).body!.plan).toBe('free');
    expect((await call('GET', '/api/billing', { token: other.token })).body!.plan).toBe('pro');

    // The Duo ends: so does their Pro.
    subscriptions.set(sub.id, { ...sub, status: 'canceled' });
    await call('POST', '/api/billing/sync', { token: payer.token });
    expect((await call('GET', '/api/billing', { token: other.token })).body!.plan).toBe('free');
    // And they can leave any time.
    expect((await call('DELETE', '/api/billing/duo', { token: other.token })).body).toMatchObject({ role: null, partner: null });
  });
});

describe('partner day passes', () => {
  it('exist only once an admin adds one, and book through Stripe with the fee as its own line', async () => {
    const admin = await person('Admin');
    const visitor = await person('Visitor');
    db.prepare(`update users set role = 'admin' where id = ?`).run(admin.id);
    const gym = 'carlton-fitness';
    expect((await call('GET', `/api/gyms/${gym}/passes`)).body).toEqual({ passes: [], available: true });
    const body = { gymId: gym, label: 'Day pass', priceMinor: 1800, feeMinor: 150, currency: 'aud' };
    expect((await call('POST', '/api/admin/passes', { token: visitor.token, body })).status).toBe(403);
    expect((await call('POST', '/api/admin/passes', { token: admin.token, body: { ...body, feeMinor: 5000 } })).status).toBe(400);
    const pass = (await call('POST', '/api/admin/passes', { token: admin.token, body })).body!;
    expect((await call('GET', `/api/gyms/${gym}/passes`)).body!.passes).toEqual([{ id: pass.id, gymId: gym, label: 'Day pass', priceMinor: 1800, feeMinor: 150, currency: 'aud' }]);

    expect((await call('POST', `/api/passes/${pass.id}/book`, { token: visitor.token, body: { forDate: '2026-09-01', returnUrl: 'gymgo://pro' } })).status).toBe(400);
    const booked = await call('POST', `/api/passes/${pass.id}/book`, { token: visitor.token, body: { forDate: '2026-10-03', returnUrl: 'gymgo://pro' } });
    expect(booked.status).toBe(200);
    expect(created.at(-1)).toMatchObject({
      mode: 'payment',
      line_items: [
        { price_data: { currency: 'aud', unit_amount: 1800, product_data: { name: 'Day pass: Carlton Fitness, 2026-10-03' } } },
        { price_data: { currency: 'aud', unit_amount: 150, product_data: { name: 'GymGO booking fee' } } },
      ],
    });
    expect((await call('GET', '/api/passes/mine', { token: visitor.token })).body!.bookings).toEqual([]);
    await pay(booked.body!.url);
    const bookings = (await call('GET', '/api/passes/mine', { token: visitor.token })).body!.bookings;
    expect(bookings).toEqual([expect.objectContaining({ gymId: gym, forDate: '2026-10-03', totalMinor: 1950, currency: 'aud' })]);
    expect(bookings[0].code).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);

    expect((await call('DELETE', `/api/admin/passes/${pass.id}`, { token: admin.token })).status).toBe(204);
    expect((await call('GET', `/api/gyms/${gym}/passes`)).body!.passes).toEqual([]);
    const mine = (await call('GET', '/api/me/export', { token: visitor.token })).body!;
    expect(mine.dayPasses).toEqual([expect.objectContaining({ gymId: gym, status: 'paid' })]);
  });
});
