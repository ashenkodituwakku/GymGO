import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
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
async function person(name?: string) {
  people += 1;
  const displayName = name ?? `Lifter ${people}`;
  const result = await call('POST', '/api/auth/signup', {
    body: { email: `friend${people}@example.com`, password: 'correct horse', displayName, birthMonth: '1990-01', acceptTerms: true },
  });
  expect(result.status).toBe(201);
  const token = result.body!.token as string;
  const id = result.body!.account.id as string;
  const code = (await call('GET', '/api/friends', { token })).body!.code as string;
  return { token, id, code, displayName };
}

const card = (id: string, city: string, days: string[]) => ({
  id,
  name: `Gym ${id}`,
  suburb: 'Fitzroy',
  city,
  countryCode: 'AU',
  brand: null,
  days,
  firstAt: `${days[0]}T08:00:00.000Z`,
  lastAt: `${days[days.length - 1]}T08:00:00.000Z`,
  seed: `seed-${id}`,
});

async function collect(token: string, gyms: ReturnType<typeof card>[]) {
  expect((await call('PUT', '/api/collection', { token, body: { gyms, resetAt: null } })).status).toBe(200);
}

describe('friends', () => {
  it('need an account, a code, and the other person’s yes', async () => {
    expect((await call('GET', '/api/friends')).status).toBe(401);
    const ana = await person('Ana');
    const ben = await person('Ben');
    expect(ana.code).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    // The same code every time it's asked for.
    expect((await call('GET', '/api/friends', { token: ana.token })).body!.code).toBe(ana.code);

    expect((await call('POST', '/api/friends', { token: ana.token, body: { code: ana.code } })).status).toBe(400);
    expect((await call('POST', '/api/friends', { token: ana.token, body: { code: 'ZZZZ-ZZZZ' } })).status).toBe(404);
    expect((await call('POST', '/api/friends', { token: ana.token, body: { code: 'nope' } })).status).toBe(400);

    const asked = await call('POST', '/api/friends', { token: ana.token, body: { code: ben.code.toLowerCase().replace('-', ' ') } });
    expect(asked.body).toMatchObject({ status: 'requested', friend: { displayName: 'Ben' } });
    expect((await call('POST', '/api/friends', { token: ana.token, body: { code: ben.code } })).status).toBe(409);
    // Not friends yet: no collection.
    expect((await call('GET', `/api/friends/${ben.id}/collection`, { token: ana.token })).status).toBe(404);

    const bens = (await call('GET', '/api/friends', { token: ben.token })).body!;
    expect(bens.incoming.map((who: { displayName: string }) => who.displayName)).toEqual(['Ana']);
    expect((await call('GET', '/api/friends', { token: ana.token })).body!.outgoing).toHaveLength(1);
    // Ana can't accept her own request.
    expect((await call('POST', `/api/friends/${ben.id}/accept`, { token: ana.token })).status).toBe(404);
    const accepted = await call('POST', `/api/friends/${ana.id}/accept`, { token: ben.token });
    expect(accepted.body!.friends.map((who: { displayName: string }) => who.displayName)).toEqual(['Ana']);
    // Nobody's email, ever.
    expect(JSON.stringify(accepted.body)).not.toContain('@example.com');
  });

  it('asking someone who already asked you makes you friends', async () => {
    const cy = await person();
    const di = await person();
    await call('POST', '/api/friends', { token: cy.token, body: { code: di.code } });
    expect((await call('POST', '/api/friends', { token: di.token, body: { code: cy.code } })).body!.status).toBe('accepted');
    expect((await call('GET', '/api/friends', { token: cy.token })).body!.friends).toHaveLength(1);
  });

  it('see each other’s cards and totals, never the days', async () => {
    const ed = await person();
    const fay = await person();
    await call('POST', '/api/friends', { token: ed.token, body: { code: fay.code } });
    await call('POST', `/api/friends/${ed.id}/accept`, { token: fay.token });
    await collect(fay.token, [card('a', 'Melbourne', ['2026-09-01', '2026-09-03']), card('b', 'Sydney', ['2026-09-10'])]);
    const seen = await call('GET', `/api/friends/${fay.id}/collection`, { token: ed.token });
    expect(seen.status).toBe(200);
    expect(seen.body!.totals).toEqual({ gyms: 2, visits: 3, cities: 2, countries: 1 });
    expect(seen.body!.cards[0]).toMatchObject({ id: 'b', visits: 1, since: '2026-09' });
    expect(seen.body!.cards[0]).toHaveProperty('rarity');
    expect(JSON.stringify(seen.body)).not.toMatch(/2026-09-0[13]/);
    const list = (await call('GET', '/api/friends', { token: ed.token })).body!;
    expect(list.friends[0].totals.gyms).toBe(2);
  });

  it('can invite each other to train, answer, and take an invite back; unfriending clears both', async () => {
    const gil = await person();
    const hal = await person();
    const stranger = await person();
    await call('POST', '/api/friends', { token: gil.token, body: { code: hal.code } });
    await call('POST', `/api/friends/${gil.id}/accept`, { token: hal.token });
    const at = '2026-10-02T07:00:00.000Z';
    expect((await call('POST', `/api/friends/${stranger.id}/invites`, { token: gil.token, body: { gymId: 'g', gymName: 'G', at } })).status).toBe(404);
    expect((await call('POST', `/api/friends/${hal.id}/invites`, { token: gil.token, body: { gymId: 'g', gymName: 'G', at: '2027-06-01T07:00:00Z' } })).status).toBe(400);
    const sent = await call('POST', `/api/friends/${hal.id}/invites`, {
      token: gil.token,
      body: { gymId: 'carlton-fitness', gymName: 'Carlton Fitness', at, note: 'Leg day?' },
    });
    expect(sent.status).toBe(201);
    const invite = sent.body!;
    expect(invite).toMatchObject({ gymName: 'Carlton Fitness', at, note: 'Leg day?', answer: null });
    const hals = (await call('GET', '/api/friends', { token: hal.token })).body!;
    expect(hals.invites.incoming.map((item: { id: string }) => item.id)).toEqual([invite.id]);
    // Only the person invited answers; only the sender takes it back.
    expect((await call('POST', `/api/invites/${invite.id}`, { token: gil.token, body: { answer: 'yes' } })).status).toBe(404);
    expect((await call('POST', `/api/invites/${invite.id}`, { token: hal.token, body: { answer: 'maybe' } })).status).toBe(400);
    expect((await call('POST', `/api/invites/${invite.id}`, { token: hal.token, body: { answer: 'yes' } })).body!.answer).toBe('yes');
    expect((await call('DELETE', `/api/invites/${invite.id}`, { token: hal.token })).status).toBe(404);
    expect((await call('DELETE', `/api/invites/${invite.id}`, { token: gil.token })).status).toBe(204);

    await call('POST', `/api/friends/${hal.id}/invites`, { token: gil.token, body: { gymId: 'g', gymName: 'G', at } });
    expect((await call('DELETE', `/api/friends/${gil.id}`, { token: hal.token })).status).toBe(204);
    const after = (await call('GET', '/api/friends', { token: gil.token })).body!;
    expect(after.friends).toEqual([]);
    expect(after.invites.outgoing).toEqual([]);
  });
});

describe('leaderboards', () => {
  it('list only people who joined, by name, and your friends among themselves; leaving takes you off', async () => {
    const ivy = await person('Ivy');
    const jo = await person('Jo');
    const kit = await person('Kit');
    await collect(ivy.token, [card('a', 'Melbourne', ['2026-09-01']), card('b', 'Melbourne', ['2026-09-02']), card('c', 'Sydney', ['2026-09-03'])]);
    await collect(jo.token, [card('a', 'Melbourne', ['2026-09-01', '2026-09-05'])]);
    await collect(kit.token, [card('x', 'Melbourne', ['2026-09-01'])]);

    expect((await call('PUT', '/api/me/leaderboard', { token: ivy.token, body: { join: 'yes' } })).status).toBe(400);
    for (const who of [ivy, jo]) expect((await call('PUT', '/api/me/leaderboard', { token: who.token, body: { join: true } })).body).toEqual({ leaderboard: true });

    const everyone = (await call('GET', '/api/leaderboard', { token: kit.token })).body!;
    const names = everyone.rows.map((row: { displayName: string }) => row.displayName);
    expect(names).toContain('Ivy');
    expect(names).toContain('Jo');
    expect(names).not.toContain('Kit');
    expect(everyone.you).toBeNull();
    expect(everyone.joined).toBe(false);
    expect(JSON.stringify(everyone)).not.toContain(ivy.id);

    const melbourne = (await call('GET', '/api/leaderboard?city=Melbourne&country=AU', { token: ivy.token })).body!;
    const ivysRow = melbourne.rows.find((row: { displayName: string }) => row.displayName === 'Ivy');
    expect(ivysRow).toMatchObject({ gyms: 2, visits: 2, you: true });
    expect(melbourne.you).toMatchObject({ displayName: 'Ivy', gyms: 2 });
    expect((await call('GET', '/api/leaderboard?city=Melbourne', { token: ivy.token })).status).toBe(400);

    // Friends: Kit and Jo, without either joining the public board.
    await call('POST', '/api/friends', { token: kit.token, body: { code: jo.code } });
    await call('POST', `/api/friends/${kit.id}/accept`, { token: jo.token });
    const friends = (await call('GET', '/api/leaderboard?scope=friends', { token: kit.token })).body!;
    expect(friends.rows.map((row: { displayName: string; rank: number }) => [row.displayName, row.rank])).toEqual([
      ['Jo', 1],
      ['Kit', 2],
    ]);

    await call('PUT', '/api/me/leaderboard', { token: jo.token, body: { join: false } });
    const later = (await call('GET', '/api/leaderboard', { token: kit.token })).body!;
    expect(later.rows.map((row: { displayName: string }) => row.displayName)).not.toContain('Jo');
  });
});

describe('your data', () => {
  it('lists friends, invites and the leaderboard in the download, and deleting the account removes you from everyone’s', async () => {
    const lee = await person('Lee');
    const max = await person('Max');
    await call('POST', '/api/friends', { token: lee.token, body: { code: max.code } });
    await call('POST', `/api/friends/${lee.id}/accept`, { token: max.token });
    await call('POST', `/api/friends/${max.id}/invites`, { token: lee.token, body: { gymId: 'g', gymName: 'G', at: '2026-10-02T07:00:00.000Z' } });
    await call('PUT', '/api/me/leaderboard', { token: lee.token, body: { join: true } });
    const mine = (await call('GET', '/api/me/export', { token: lee.token })).body!;
    expect(mine.friendCode.code).toBe(lee.code);
    expect(mine.friends).toEqual([expect.objectContaining({ displayName: 'Max', status: 'accepted', who: 'you asked' })]);
    expect(mine.invites).toEqual([expect.objectContaining({ direction: 'sent', gymName: 'G' })]);
    expect(mine.leaderboard).toEqual({ joinedAt: NOW.toISOString() });

    expect((await call('DELETE', '/api/me', { token: lee.token, body: { password: 'correct horse' } })).status).toBeLessThan(300);
    const maxs = (await call('GET', '/api/friends', { token: max.token })).body!;
    expect(maxs.friends).toEqual([]);
    expect(maxs.invites.incoming).toEqual([]);
  });
});
