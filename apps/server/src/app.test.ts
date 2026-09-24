import { createServer, get as httpGet, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { createApp, isAllowedOrigin } from './app';
import { hashPassword, verifyPassword } from './auth';
import { openDb, seedGyms, type Db } from './db';

let server: Server;
let base: string;
let db: Db;

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, [...MELBOURNE_GYMS, ...DEMO_GYMS]);
  server = createServer(createApp({ db, attribution: 'test attribution', signupsPerHour: 1000 }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
});

async function call(method: string, path: string, options: { token?: string; body?: unknown; origin?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.origin) headers.origin = options.origin;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? (JSON.parse(text) as Record<string, any>) : null };
}

let counter = 0;
async function signUp(name = 'Sam') {
  counter += 1;
  const email = `person${counter}@example.com`;
  const result = await call('POST', '/api/auth/signup', { body: { email, password: 'correct horse', displayName: name } });
  expect(result.status).toBe(201);
  return { token: result.body!.token as string, email, id: result.body!.account.id as string };
}

describe('compression', () => {
  it('gzips the gym list for clients that accept it, and not for those that don’t', async () => {
    const zipped = await fetch(`${base}/api/gyms`, { headers: { 'accept-encoding': 'gzip' } });
    expect(zipped.headers.get('content-encoding')).toBe('gzip');
    expect(zipped.headers.get('vary')).toContain('Accept-Encoding');
    // fetch unzips it, as phones and browsers do.
    expect(((await zipped.json()) as { gyms: unknown[] }).gyms.length).toBeGreaterThan(20);

    const plain = await new Promise<{ encoding: string | undefined; body: string }>((resolve, reject) => {
      const request = httpGet(`${base}/api/gyms`, { headers: { 'accept-encoding': 'identity' } }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => (body += chunk));
        response.on('end', () => resolve({ encoding: response.headers['content-encoding'], body }));
      });
      request.on('error', reject);
    });
    expect(plain.encoding).toBeUndefined();
    expect((JSON.parse(plain.body) as { gyms: unknown[] }).gyms.length).toBeGreaterThan(20);
  });

  it('leaves small answers alone', async () => {
    const health = await fetch(`${base}/api/health`, { headers: { 'accept-encoding': 'gzip' } });
    expect(health.headers.get('content-encoding')).toBeNull();
  });
});

describe('changing your name and password', () => {
  it('lets a browser send every method the app uses, including PATCH', async () => {
    const preflight = await fetch(`${base}/api/me`, {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:8081', 'access-control-request-method': 'PATCH' },
    });
    const allowed = (preflight.headers.get('access-control-allow-methods') ?? '').split(',').map((method) => method.trim());
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) expect(allowed).toContain(method);
  });

  it('renames you, and shows the new name on your account', async () => {
    const me = await signUp('Sam');
    expect((await call('PATCH', '/api/me', { token: me.token, body: { displayName: '  Sam   Lee ' } })).body!.account.displayName).toBe('Sam Lee');
    expect((await call('GET', '/api/me', { token: me.token })).body!.account.displayName).toBe('Sam Lee');
    expect((await call('PATCH', '/api/me', { token: me.token, body: { displayName: '' } })).status).toBe(400);
    expect((await call('PATCH', '/api/me', { body: { displayName: 'Nobody' } })).status).toBe(401);
  });

  it('changes your password only with the current one, and signs out your other devices', async () => {
    const me = await signUp('Pat');
    const otherDevice = (await call('POST', '/api/auth/login', { body: { email: me.email, password: 'correct horse' } })).body!.token as string;
    expect((await call('GET', '/api/me', { token: otherDevice })).status).toBe(200);

    expect((await call('POST', '/api/me/password', { token: me.token, body: { currentPassword: 'wrong horse', newPassword: 'battery staple' } })).status).toBe(403);
    expect((await call('POST', '/api/me/password', { token: me.token, body: { currentPassword: 'correct horse', newPassword: 'short' } })).status).toBe(400);
    expect((await call('POST', '/api/me/password', { token: me.token, body: { currentPassword: 'correct horse', newPassword: 'battery staple' } })).status).toBe(204);

    // This device stays signed in; the other one is out.
    expect((await call('GET', '/api/me', { token: me.token })).status).toBe(200);
    expect((await call('GET', '/api/me', { token: otherDevice })).status).toBe(401);
    // Only the new password works now.
    expect((await call('POST', '/api/auth/login', { body: { email: me.email, password: 'correct horse' } })).status).toBe(401);
    expect((await call('POST', '/api/auth/login', { body: { email: me.email, password: 'battery staple' } })).status).toBe(200);
  });
});

describe('passwords', () => {
  it('hashes with a salt and verifies only the right password', () => {
    const one = hashPassword('correct horse');
    const two = hashPassword('correct horse');
    expect(one).not.toBe(two);
    expect(one).not.toContain('correct horse');
    expect(verifyPassword('correct horse', one)).toBe(true);
    expect(verifyPassword('wrong horse', one)).toBe(false);
  });
});

describe('gyms', () => {
  it('serves every record, real Melbourne gyms with their sources', async () => {
    const result = await call('GET', '/api/gyms');
    expect(result.status).toBe(200);
    expect(result.body!.gyms).toHaveLength(MELBOURNE_GYMS.length + DEMO_GYMS.length);
    const city = result.body!.gyms.find((gym: any) => gym.location.id === 'dohertys-gym-city');
    expect(city.location.isDemoData).toBe(false);
    expect(city.offers[0].provenance.sources[0].evidenceRef).toBe('https://dohertysgym.com/membership/');
    expect(result.body!.attribution).toBe('test attribution');
  });
});

describe('accounts', () => {
  it('signs up, signs in, and knows who you are', async () => {
    const { token, email } = await signUp('Alex');
    const me = await call('GET', '/api/me', { token });
    expect(me.body!.account).toMatchObject({ email, displayName: 'Alex', role: 'member' });
    expect(me.body!.account).not.toHaveProperty('password_hash');

    const login = await call('POST', '/api/auth/login', { body: { email: email.toUpperCase(), password: 'correct horse' } });
    expect(login.status).toBe(200);
    expect(login.body!.token).not.toBe(token);
  });

  it('refuses a wrong password without saying whether the email exists', async () => {
    const { email } = await signUp();
    const wrong = await call('POST', '/api/auth/login', { body: { email, password: 'nope nope' } });
    const missing = await call('POST', '/api/auth/login', { body: { email: 'nobody@example.com', password: 'nope nope' } });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body!.error).toBe(missing.body!.error);
  });

  it('rejects short passwords, bad emails and duplicate accounts', async () => {
    expect((await call('POST', '/api/auth/signup', { body: { email: 'a@b.co', password: 'short', displayName: 'A' } })).status).toBe(400);
    expect((await call('POST', '/api/auth/signup', { body: { email: 'not-an-email', password: 'long enough', displayName: 'A' } })).status).toBe(400);
    const { email } = await signUp();
    expect((await call('POST', '/api/auth/signup', { body: { email, password: 'long enough', displayName: 'A' } })).status).toBe(409);
  });

  it('ends a session on sign-out', async () => {
    const { token } = await signUp();
    expect((await call('POST', '/api/auth/logout', { token })).status).toBe(204);
    expect((await call('GET', '/api/me', { token })).status).toBe(401);
  });

  it('slows down repeated wrong passwords', async () => {
    const { email } = await signUp();
    let last = 0;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      last = (await call('POST', '/api/auth/login', { body: { email, password: 'wrong wrong' } })).status;
    }
    expect(last).toBe(429);
  });

  it('deletes an account and everything attached to it', async () => {
    const { token, id } = await signUp();
    await call('PUT', '/api/saved/dohertys-gym-city', { token });
    expect((await call('DELETE', '/api/me', { token })).status).toBe(204);
    expect((await call('GET', '/api/me', { token })).status).toBe(401);
    expect(db.prepare('select count(*) as n from saved_gyms where user_id = ?').get(id)).toEqual({ n: 0 });
  });
});

describe('saved gyms', () => {
  it('saves and unsaves per account', async () => {
    const one = await signUp();
    const two = await signUp();
    expect((await call('PUT', '/api/saved/dohertys-gym-city', { token: one.token })).status).toBe(204);
    expect((await call('PUT', '/api/saved/dohertys-gym-city', { token: one.token })).status).toBe(204);
    expect((await call('GET', '/api/saved', { token: one.token })).body!.gymIds).toEqual(['dohertys-gym-city']);
    expect((await call('GET', '/api/saved', { token: two.token })).body!.gymIds).toEqual([]);
    await call('DELETE', '/api/saved/dohertys-gym-city', { token: one.token });
    expect((await call('GET', '/api/saved', { token: one.token })).body!.gymIds).toEqual([]);
  });

  it('needs an account, and a real gym', async () => {
    expect((await call('GET', '/api/saved')).status).toBe(401);
    const { token } = await signUp();
    expect((await call('PUT', '/api/saved/no-such-gym', { token })).status).toBe(404);
  });
});

describe('reviews and moderation', () => {
  it('holds a new review for moderation, shows it only to its author, and publishes on approval', async () => {
    const author = await signUp('Jordan');
    const stranger = await signUp();
    const posted = await call('POST', '/api/gyms/prime-athletica-fitzroy/reviews', {
      token: author.token,
      body: { overall: 4, body: 'Good racks, friendly staff at the desk.' },
    });
    expect(posted.status).toBe(201);
    expect(posted.body!.review).toMatchObject({ status: 'pending', verifiedVisit: false, authorDisplayName: 'Jordan' });

    const asAuthor = await call('GET', '/api/gyms/prime-athletica-fitzroy/reviews', { token: author.token });
    expect(asAuthor.body!.reviews).toEqual([]);
    expect(asAuthor.body!.mine).toHaveLength(1);
    const asStranger = await call('GET', '/api/gyms/prime-athletica-fitzroy/reviews', { token: stranger.token });
    expect(asStranger.body!.mine).toEqual([]);

    // A member can't see or work the queue.
    expect((await call('GET', '/api/moderation/reviews', { token: stranger.token })).status).toBe(403);
    const id = posted.body!.review.id as string;
    expect((await call('POST', `/api/moderation/reviews/${id}`, { token: stranger.token, body: { decision: 'publish' } })).status).toBe(403);

    // A moderator can.
    const moderator = await signUp('Mod');
    db.prepare(`update users set role = 'moderator' where id = ?`).run(moderator.id);
    const queue = await call('GET', '/api/moderation/reviews', { token: moderator.token });
    expect(queue.body!.reviews.map((review: any) => review.id)).toContain(id);
    expect((await call('POST', `/api/moderation/reviews/${id}`, { token: moderator.token, body: { decision: 'publish' } })).status).toBe(204);

    const published = await call('GET', '/api/gyms/prime-athletica-fitzroy/reviews');
    expect(published.body!.reviews).toHaveLength(1);
    expect(published.body!.reviews[0].body).toBe('Good racks, friendly staff at the desk.');
  });

  it('needs a reason to reject, and one review per person per gym', async () => {
    const author = await signUp();
    const posted = await call('POST', '/api/gyms/dohertys-gym-city/reviews', {
      token: author.token,
      body: { overall: 5, body: 'Open late and always staffed.' },
    });
    expect(
      (await call('POST', '/api/gyms/dohertys-gym-city/reviews', { token: author.token, body: { overall: 3, body: 'Second go at it.' } })).status,
    ).toBe(409);
    const moderator = await signUp();
    db.prepare(`update users set role = 'moderator' where id = ?`).run(moderator.id);
    const id = posted.body!.review.id as string;
    expect((await call('POST', `/api/moderation/reviews/${id}`, { token: moderator.token, body: { decision: 'reject' } })).status).toBe(400);
    expect(
      (await call('POST', `/api/moderation/reviews/${id}`, { token: moderator.token, body: { decision: 'reject', reason: 'Off-topic' } })).status,
    ).toBe(204);
  });

  it('validates ratings and length, and needs an account to post', async () => {
    expect((await call('POST', '/api/gyms/dohertys-gym-city/reviews', { body: { overall: 5, body: 'Great gym here.' } })).status).toBe(401);
    const { token } = await signUp();
    expect((await call('POST', '/api/gyms/dohertys-gym-city/reviews', { token, body: { overall: 6, body: 'Great gym here.' } })).status).toBe(400);
    expect((await call('POST', '/api/gyms/dohertys-gym-city/reviews', { token, body: { overall: 5, body: 'Short' } })).status).toBe(400);
  });
});

describe('browser access', () => {
  it('allows the app from localhost and the home network, and nowhere else', async () => {
    expect(isAllowedOrigin('http://localhost:8081')).toBe(true);
    expect(isAllowedOrigin('http://192.168.1.20:8081')).toBe(true);
    expect(isAllowedOrigin('http://10.0.0.5:8081')).toBe(true);
    expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
    expect(isAllowedOrigin('http://192.169.1.1')).toBe(false);

    const allowed = await call('GET', '/api/health', { origin: 'http://localhost:8081' });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:8081');
    const refused = await call('GET', '/api/health', { origin: 'https://evil.example.com' });
    expect(refused.headers.get('access-control-allow-origin')).toBeNull();
  });
});
