import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { createApp } from './app';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { openDb, seedGyms, type Db } from './db';

let clock = new Date('2026-10-01T18:00:00Z');
let server: Server;
let base: string;
let db: Db;
let reader: string;

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, [...MELBOURNE_GYMS, ...DEMO_GYMS], clock);
  server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000, now: () => clock }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // Reading gyms needs an account, like everything else in GymGO.
  reader = (await person()).token;
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
async function person() {
  people += 1;
  const result = await call('POST', '/api/auth/signup', {
    body: { email: `trust${people}@example.com`, password: 'correct horse', displayName: `Member ${people}`, birthMonth: '1990-01', acceptTerms: true },
  });
  expect(result.status).toBe(201);
  return { token: result.body!.token as string, id: result.body!.account.id as string };
}

describe('is it busy?', () => {
  const busy = '/api/gyms/carlton-fitness/busy';

  it('shows a level only once three members have said so in the last hour', async () => {
    expect((await call('GET', busy, { token: reader })).body).toEqual({ level: null, count: 0, latestAt: null, windowMinutes: 60, minimum: 3, mine: null });
    expect((await call('PUT', busy, { body: { level: 'busy' } })).status).toBe(401);
    const [a, b, c] = [await person(), await person(), await person()];
    expect((await call('PUT', busy, { token: a.token, body: { level: 'heaving' } })).status).toBe(400);
    await call('PUT', busy, { token: a.token, body: { level: 'packed' } });
    await call('PUT', busy, { token: b.token, body: { level: 'busy' } });
    const two = (await call('GET', busy, { token: a.token })).body!;
    expect(two).toMatchObject({ level: null, count: 2, mine: { level: 'packed' } });
    await call('PUT', busy, { token: c.token, body: { level: 'quiet' } });
    expect((await call('GET', busy, { token: reader })).body).toMatchObject({ level: 'busy', count: 3 });
    // Saying it again replaces your last word rather than adding to it.
    await call('PUT', busy, { token: c.token, body: { level: 'packed' } });
    expect((await call('GET', busy, { token: reader })).body).toMatchObject({ level: 'packed', count: 3 });
    // An hour on, it's old news.
    clock = new Date(clock.getTime() + 61 * 60_000);
    expect((await call('GET', busy, { token: a.token })).body).toMatchObject({ level: null, count: 0, mine: null });
    expect((await call('DELETE', busy, { token: a.token })).status).toBe(204);
    // A day on, nobody's report is kept at all.
    clock = new Date(clock.getTime() + 24 * 60 * 60_000);
    await call('GET', busy, { token: reader });
    expect((db.prepare('select count(*) as n from busy_reports where gym_id = ?').get('carlton-fitness') as { n: number }).n).toBe(0);
  });

  it('isn’t taken for invented demo gyms, and is in your data download', async () => {
    const { token } = await person();
    expect((await call('PUT', `/api/gyms/${DEMO_GYMS[0]!.location.id}/busy`, { token, body: { level: 'quiet' } })).status).toBe(400);
    await call('PUT', '/api/gyms/dohertys-gym-city/busy', { token, body: { level: 'steady' } });
    const mine = (await call('GET', '/api/me/export', { token })).body!;
    expect(mine.busyReports).toEqual([expect.objectContaining({ gymId: 'dohertys-gym-city', level: 'steady' })]);
  });
});

describe('verified gym owners', () => {
  const gym = 'carlton-fitness';
  const role = (id: string, value: string) => db.prepare('update users set role = ? where id = ?').run(value, id);

  it('claim, get checked by an admin, then submit updates a moderator approves before anyone sees them', async () => {
    const owner = await person();
    const admin = await person();
    const moderator = await person();
    const nosy = await person();
    role(admin.id, 'admin');
    role(moderator.id, 'moderator');

    expect((await call('GET', `/api/gyms/${gym}/owner`, { token: reader })).body).toEqual({ verified: false, since: null, updates: [], you: { claim: null, owner: false, submissions: [] } });
    expect((await call('POST', `/api/gyms/${gym}/claim`, { token: owner.token, body: { roleTitle: 'Owner', contact: '', evidence: 'x' } })).status).toBe(400);
    const claim = await call('POST', `/api/gyms/${gym}/claim`, {
      token: owner.token,
      body: { roleTitle: 'Owner', contact: 'sam@carltonfitness.example', evidence: 'Named as owner on the website’s About page.' },
    });
    expect(claim.status).toBe(201);
    expect((await call('POST', `/api/gyms/${gym}/claim`, { token: owner.token, body: { roleTitle: 'Owner', contact: 'a', evidence: 'again, again' } })).status).toBe(409);

    // Owners can't update before they're approved.
    expect((await call('POST', `/api/gyms/${gym}/owner-updates`, { token: owner.token, body: { kind: 'casual_price', amountMinor: 2000 } })).status).toBe(403);

    // Claims hold personal details: admins only, never moderators or anyone else.
    expect((await call('GET', '/api/moderation/claims', { token: moderator.token })).status).toBe(403);
    expect((await call('GET', '/api/moderation/claims', { token: nosy.token })).status).toBe(403);
    const queue = (await call('GET', '/api/moderation/claims', { token: admin.token })).body!.claims;
    expect(queue).toEqual([expect.objectContaining({ gymId: gym, contact: 'sam@carltonfitness.example', roleTitle: 'Owner' })]);
    expect((await call('GET', '/api/moderation/counts', { token: moderator.token })).body).toMatchObject({ claims: null, ownerUpdates: 0 });
    expect((await call('GET', '/api/moderation/counts', { token: admin.token })).body).toMatchObject({ claims: 1 });
    expect((await call('POST', `/api/moderation/claims/${queue[0].id}`, { token: admin.token, body: { decision: 'reject' } })).status).toBe(400);
    expect((await call('POST', `/api/moderation/claims/${queue[0].id}`, { token: admin.token, body: { decision: 'approve' } })).status).toBe(204);

    const view = (await call('GET', `/api/gyms/${gym}/owner`, { token: owner.token })).body!;
    expect(view).toMatchObject({ verified: true, you: { owner: true, claim: { status: 'approved' } } });
    // Nothing about who: not their name, not their contact.
    expect(JSON.stringify((await call('GET', `/api/gyms/${gym}/owner`, { token: reader })).body)).not.toContain('carltonfitness.example');

    expect((await call('POST', `/api/gyms/${gym}/owner-updates`, { token: owner.token, body: { kind: 'casual_price', amountMinor: 3 } })).status).toBe(400);
    const submitted = await call('POST', `/api/gyms/${gym}/owner-updates`, {
      token: owner.token,
      body: { kind: 'casual_price', amountMinor: 1900, anyoneCanBuy: 'yes', photoIdRequired: 'no' },
    });
    expect(submitted.status).toBe(201);
    // Waiting: the gym looks as it did.
    const before = (await call('GET', `/api/gyms/${gym}`, { token: reader })).body!.gym;
    expect(JSON.stringify(before)).not.toContain('owner-casual');
    // Another owner of nothing can't moderate; a member can't either.
    expect((await call('GET', '/api/moderation/owner-updates', { token: nosy.token })).status).toBe(403);
    const updates = (await call('GET', '/api/moderation/owner-updates', { token: moderator.token })).body!.updates;
    expect(updates).toEqual([expect.objectContaining({ gymId: gym, payload: expect.objectContaining({ amountMinor: 1900, currency: 'AUD' }) })]);
    expect((await call('POST', `/api/moderation/owner-updates/${updates[0].id}`, { token: moderator.token, body: { decision: 'approve' } })).status).toBe(204);

    const after = (await call('GET', `/api/gyms/${gym}`, { token: reader })).body!.gym;
    const casual = after.offers.find((offer: { productType: string }) => offer.productType === 'casual_gym_visit');
    expect(casual).toMatchObject({ baseAmountMinor: 1900, provenance: { status: 'owner_confirmed' } });
    const listed = (await call('GET', '/api/gyms', { token: reader })).body!.gyms.find((record: { location: { id: string } }) => record.location.id === gym);
    expect(listed.offers.find((offer: { productType: string }) => offer.productType === 'casual_gym_visit').baseAmountMinor).toBe(1900);
    expect((await call('GET', `/api/gyms/${gym}/owner`, { token: reader })).body!.updates).toEqual([{ kind: 'casual_price', approvedAt: clock.toISOString() }]);

    // In their data download, and gone with their account.
    const mine = (await call('GET', '/api/me/export', { token: owner.token })).body!;
    expect(mine.gymsOwned).toEqual([expect.objectContaining({ gymId: gym })]);
    expect(mine.ownerUpdates).toHaveLength(1);
    expect((await call('DELETE', '/api/me', { token: owner.token, body: { password: 'correct horse' } })).status).toBeLessThan(300);
    expect((await call('GET', `/api/gyms/${gym}/owner`, { token: reader })).body).toMatchObject({ verified: false, updates: [] });
    const gone = (await call('GET', `/api/gyms/${gym}`, { token: reader })).body!.gym;
    expect(JSON.stringify(gone)).not.toContain('owner-casual');
  });

  it('isn’t open to invented demo gyms, and a turned-down claim says why', async () => {
    const someone = await person();
    const admin = await person();
    role(admin.id, 'admin');
    expect(
      (await call('POST', `/api/gyms/${DEMO_GYMS[0]!.location.id}/claim`, { token: someone.token, body: { roleTitle: 'Owner', contact: 'x@y.example', evidence: 'It’s mine, honest.' } })).status,
    ).toBe(400);
    const claim = (await call('POST', '/api/gyms/dohertys-gym-city/claim', { token: someone.token, body: { roleTitle: 'Manager', contact: '03 9000 0000', evidence: 'Call the front desk and ask for me.' } })).body!;
    await call('POST', `/api/moderation/claims/${claim.id}`, { token: admin.token, body: { decision: 'reject', reason: 'The front desk didn’t know you.' } });
    expect((await call('GET', '/api/gyms/dohertys-gym-city/owner', { token: someone.token })).body!.you).toMatchObject({
      owner: false,
      claim: { status: 'rejected', reason: 'The front desk didn’t know you.' },
    });
  });
});
