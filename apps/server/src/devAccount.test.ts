import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { openDb, type Db } from './db';
import { DEV_PRO_EMAIL, DEV_PRO_PASSWORD, devAccountRefusal, ensureDevProAccount } from './devAccount';

let server: Server;
let base: string;
let db: Db;

beforeAll(async () => {
  db = openDb(':memory:');
  ensureDevProAccount(db, new Date('2026-09-25T00:00:00Z'));
  server = createServer(
    createApp({
      db,
      attribution: 'test',
      area: { fetchImpl: (async () => Response.json({ elements: [] })) as typeof fetch, endpoints: ['https://overpass.test/api'], log: () => undefined },
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
});

const login = (password: string) =>
  fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: DEV_PRO_EMAIL, password }),
  });

describe('the dev Pro account', () => {
  it('signs in with its password, and is Pro', async () => {
    const response = await login(DEV_PRO_PASSWORD);
    expect(response.status).toBe(200);
    const { token } = (await response.json()) as { token: string };
    const plan = (await (await fetch(`${base}/api/billing`, { headers: { authorization: `Bearer ${token}` } })).json()) as { plan: string };
    expect(plan.plan).toBe('pro');
    // Pro opens every country: Paris searched by someone whose country is Australia.
    const paris = await fetch(`${base}/api/area?south=48.84&west=2.33&north=48.88&east=2.37&home=AU`, { headers: { authorization: `Bearer ${token}` } });
    expect(paris.status).toBe(200);
  });

  it('is still a real login: a wrong password is refused', async () => {
    expect((await login('not the password')).status).toBe(401);
  });

  it('comes back the same on every start: one account, its password restored, still Pro', () => {
    db.prepare('update users set password_hash = ? where email = ?').run('scrypt$1$1$1$x$y', DEV_PRO_EMAIL);
    ensureDevProAccount(db);
    ensureDevProAccount(db);
    expect((db.prepare('select count(*) as n from users where email = ?').get(DEV_PRO_EMAIL) as { n: number }).n).toBe(1);
    expect((db.prepare("select count(*) as n from subscriptions where stripe_subscription_id = 'dev_local_pro'").get() as { n: number }).n).toBe(1);
  });

  it('is never made where GymGO may be hosted or real money is in play', () => {
    expect(devAccountRefusal({ publicUrl: null, stripeKey: null })).toBeNull();
    expect(devAccountRefusal({ publicUrl: null, stripeKey: 'sk_test_abc' })).toBeNull();
    expect(devAccountRefusal({ publicUrl: 'https://gymgo.example', stripeKey: null })).toMatch(/public address/);
    expect(devAccountRefusal({ publicUrl: null, stripeKey: 'sk_live_abc' })).toMatch(/live Stripe/);
  });
});
