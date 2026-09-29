import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COLLECTION_BATCH, createApp } from './app';
import { openDb, type Db } from './db';

const NOW = new Date('2026-09-29T10:00:00Z');
let server: Server;
let base: string;
let db: Db;

beforeAll(async () => {
  db = openDb(':memory:');
  server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000, now: () => NOW }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
});

async function call(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${base}${path}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, any>) : null };
}

let people = 0;
async function signUp() {
  people += 1;
  const result = await call('POST', '/api/auth/signup', { body: { email: `collector${people}@example.com`, password: 'correct horse', displayName: `Collector ${people}`, birthMonth: '1990-01' } });
  expect(result.status).toBe(201);
  return result.body!.token as string;
}

const card = (id: string, days: string[], seed: string) => ({
  id,
  name: `Gym ${id}`,
  suburb: 'Fitzroy',
  city: 'Melbourne',
  countryCode: 'AU',
  brand: null,
  days,
  firstAt: `${days[0]}T08:00:00.000Z`,
  lastAt: `${days[days.length - 1]}T08:00:00.000Z`,
  seed,
});

describe('the gym collection on your account', () => {
  it('needs an account, and starts empty', async () => {
    expect((await call('GET', '/api/collection')).status).toBe(401);
    const token = await signUp();
    expect((await call('GET', '/api/collection', { token })).body).toEqual({ gyms: [], resetAt: null });
  });

  it('merges what each device sends, never overwriting a visit or a card', async () => {
    const token = await signUp();
    const phone = await call('PUT', '/api/collection', { token, body: { gyms: [card('a', ['2026-09-01', '2026-09-03'], 'phone')], resetAt: null } });
    expect(phone.status).toBe(200);
    // Another device that checked in elsewhere, and at the same gym on other days.
    const laptop = await call('PUT', '/api/collection', {
      token,
      body: { gyms: [card('a', ['2026-09-03', '2026-09-20'], 'laptop'), card('b', ['2026-09-10'], 'b1')], resetAt: null },
    });
    expect(laptop.status).toBe(200);
    const gyms = Object.fromEntries((laptop.body!.gyms as Array<{ id: string }>).map((gym) => [gym.id, gym])) as Record<string, any>;
    expect(gyms.a.days).toEqual(['2026-09-01', '2026-09-03', '2026-09-20']);
    // The first card synced keeps its looks everywhere.
    expect(gyms.a.seed).toBe('phone');
    expect(gyms.b.days).toEqual(['2026-09-10']);
    // What isn't a collected gym is left out, not the whole request.
    const mixed = await call('PUT', '/api/collection', { token, body: { gyms: [{ id: 'c' }, card('d', ['2026-09-28'], 'd1')], resetAt: null } });
    expect((mixed.body!.gyms as Array<{ id: string }>).map((gym) => gym.id)).toEqual(['a', 'b', 'd']);
    // Someone else's collection is theirs.
    const other = await signUp();
    expect((await call('GET', '/api/collection', { token: other })).body!.gyms).toEqual([]);
  });

  it('sends a big collection in batches', async () => {
    const token = await signUp();
    const many = Array.from({ length: COLLECTION_BATCH + 1 }, (_, at) => card(`g${at}`, ['2026-09-01'], `s${at}`));
    expect((await call('PUT', '/api/collection', { token, body: { gyms: many, resetAt: null } })).status).toBe(400);
  });

  it('resets everything, and a device that hasn’t heard is told before it can put the old cards back', async () => {
    const token = await signUp();
    await call('PUT', '/api/collection', { token, body: { gyms: [card('a', ['2026-09-01'], 'a1')], resetAt: null } });
    const reset = await call('DELETE', '/api/collection', { token });
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ gyms: [], resetAt: NOW.toISOString() });
    expect((await call('GET', '/api/collection', { token })).body).toEqual({ gyms: [], resetAt: NOW.toISOString() });
    // A device still holding the old collection, which doesn't know of the reset.
    const stale = await call('PUT', '/api/collection', { token, body: { gyms: [card('a', ['2026-09-01'], 'a1')], resetAt: null } });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ code: 'collection_reset', resetAt: NOW.toISOString() });
    // Once it knows, what it sends counts.
    const after = await call('PUT', '/api/collection', { token, body: { gyms: [card('b', ['2026-09-29'], 'b1')], resetAt: NOW.toISOString() } });
    expect((after.body!.gyms as Array<{ id: string }>).map((gym) => gym.id)).toEqual(['b']);
  });

  it('is in your data download, and goes with the account', async () => {
    const token = await signUp();
    await call('PUT', '/api/collection', { token, body: { gyms: [card('a', ['2026-09-01'], 'a1')], resetAt: null } });
    const exported = await call('GET', '/api/me/export', { token });
    expect(exported.body!.collection).toEqual([expect.objectContaining({ id: 'a', days: ['2026-09-01'] })]);
    expect(exported.body!.collectionResetAt).toBeNull();
    const me = (await call('GET', '/api/me', { token })).body!.account.id as string;
    expect((await call('DELETE', '/api/me', { token })).status).toBe(204);
    expect((db.prepare('select count(*) as n from collection_gyms where user_id = ?').get(me) as { n: number }).n).toBe(0);
  });
});
