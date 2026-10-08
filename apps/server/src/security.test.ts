import { createServer, request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { AttemptLimiter, forgetExpired, startSession, weakPasswordReason } from './auth';
import { openDb, type Db } from './db';
import type { MailMessage } from './mail';

const servers: Array<{ server: Server; db: Db }> = [];

afterAll(() => {
  for (const { server, db } of servers) {
    server.close();
    db.close();
  }
});

async function start(options: Partial<Parameters<typeof createApp>[0]> = {}) {
  const db = openDb(':memory:');
  const server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000, ...options }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push({ server, db });
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  async function call(method: string, path: string, init: { token?: string; body?: unknown; headers?: Record<string, string>; form?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { ...init.headers };
    if (init.token) headers.authorization = `Bearer ${init.token}`;
    let body: string | undefined;
    if (init.form) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(init.form).toString();
    } else if (init.body !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(init.body);
    }
    const response = await fetch(`${base}${path}`, { method, headers, body });
    const text = await response.text();
    let json: Record<string, any> | null = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: response.status, headers: response.headers, text, json };
  }
  let people = 0;
  async function signUp(extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    people += 1;
    const email = `secure${people}@example.com`;
    const result = await call('POST', '/api/auth/signup', {
      body: { email, password: 'correct horse', displayName: `Secure ${people}`, birthMonth: '1990-01', acceptTerms: true, ...extra },
      headers,
    });
    return { ...result, email };
  }
  return { db, port, call, signUp };
}

describe('security headers', () => {
  it('go on every answer, with HSTS only when the server is on https', async () => {
    const plain = await start();
    const answer = await plain.call('GET', '/api/health');
    expect(answer.headers.get('x-content-type-options')).toBe('nosniff');
    expect(answer.headers.get('x-frame-options')).toBe('DENY');
    expect(answer.headers.get('referrer-policy')).toBe('no-referrer');
    expect(answer.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(answer.headers.get('permissions-policy')).toContain('geolocation=()');
    expect(answer.headers.get('strict-transport-security')).toBeNull();

    const hosted = await start({ publicUrl: 'https://gymgo.example.com' });
    expect((await hosted.call('GET', '/api/health')).headers.get('strict-transport-security')).toContain('max-age=31536000');
  });
});

describe('behind a proxy', () => {
  it('limits each caller by the address the proxy passes on, only when told to trust it', async () => {
    const proxied = await start({ trustProxy: true, signupsPerHour: 2 });
    const from = (address: string) => ({ 'x-forwarded-for': `203.0.113.250, ${address}` });
    expect((await proxied.signUp({}, from('198.51.100.1'))).status).toBe(201);
    expect((await proxied.signUp({}, from('198.51.100.1'))).status).toBe(201);
    expect((await proxied.signUp({}, from('198.51.100.1'))).status).toBe(429);
    // Someone else behind the same proxy isn't held up.
    expect((await proxied.signUp({}, from('198.51.100.2'))).status).toBe(201);

    // Not behind a proxy: the header is ignored, so it can't buy more tries.
    const direct = await start({ signupsPerHour: 2 });
    expect((await direct.signUp({}, from('198.51.100.1'))).status).toBe(201);
    expect((await direct.signUp({}, from('198.51.100.2'))).status).toBe(201);
    expect((await direct.signUp({}, from('198.51.100.3'))).status).toBe(429);
  });

  it('stops guessing one account’s password from many addresses', async () => {
    const { call, signUp } = await start({ trustProxy: true });
    const { email } = await signUp();
    let status = 0;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      status = (await call('POST', '/api/auth/login', { body: { email, password: `wrong ${attempt}` }, headers: { 'x-forwarded-for': `198.51.100.${attempt}` } })).status;
    }
    expect(status).toBe(429);
  });
});

describe('passwords', () => {
  it('turns down the commonest ones, one character repeated, and your own email', () => {
    expect(weakPasswordReason('Password123')).toMatch(/most common/);
    expect(weakPasswordReason('qwertyuiop')).toMatch(/most common/);
    expect(weakPasswordReason('aaaaaaaaaa')).toMatch(/over and over/);
    expect(weakPasswordReason('sam.lifts@example.com', 'Sam.Lifts@example.com')).toMatch(/email/);
    expect(weakPasswordReason('samlifts', 'samlifts@example.com')).toMatch(/email/);
    expect(weakPasswordReason('correct horse battery', 'sam@example.com')).toBeNull();
  });

  it('when signing up and changing a password', async () => {
    const { call, signUp } = await start();
    expect((await signUp({ password: '12345678' })).status).toBe(400);
    const made = await signUp();
    const change = await call('POST', '/api/me/password', { token: made.json!.token, body: { currentPassword: 'correct horse', newPassword: 'iloveyou' } });
    expect(change.status).toBe(400);
    expect(change.json!.error).toMatch(/most common/);
  });
});

describe('the rate limiter', () => {
  it('forgets keys once their window has passed', () => {
    const limiter = new AttemptLimiter(2, 1000);
    limiter.allow('198.51.100.1', 0);
    limiter.allow('198.51.100.2', 500);
    expect(limiter.size).toBe(2);
    limiter.sweep(1200);
    expect(limiter.size).toBe(1);
    limiter.sweep(1600);
    expect(limiter.size).toBe(0);
  });
});

describe('expired sign-ins', () => {
  it('are deleted', async () => {
    const { db, signUp } = await start();
    const made = await signUp();
    const id = made.json!.account.id as string;
    startSession(db, id, new Date('2020-01-01T00:00:00Z'));
    const count = () => (db.prepare('select count(*) as n from sessions where user_id = ?').get(id) as { n: number }).n;
    expect(count()).toBe(2);
    forgetExpired(db, new Date());
    expect(count()).toBe(1);
  });
});

describe('forgotten passwords', () => {
  it('can’t be reset without email, or without the server’s own address', async () => {
    const sent: MailMessage[] = [];
    const noMail = await start({ publicUrl: 'https://gymgo.example.com' });
    expect((await noMail.call('POST', '/api/auth/forgot', { body: { email: 'a@example.com' } })).json!.code).toBe('reset_off');
    const noAddress = await start({ mail: async (message) => void sent.push(message) });
    expect((await noAddress.call('POST', '/api/auth/forgot', { body: { email: 'a@example.com' } })).status).toBe(503);
    expect(sent).toHaveLength(0);
  });

  it('emails a one-time link to the server’s own address, and answers the same for anyone', async () => {
    const sent: MailMessage[] = [];
    const { call, signUp, port } = await start({ publicUrl: 'https://gymgo.example.com', mail: async (message) => void sent.push(message) });
    const made = await signUp();
    const oldToken = made.json!.token as string;

    const nobody = await call('POST', '/api/auth/forgot', { body: { email: 'nobody@example.com' } });
    expect(nobody.status).toBe(200);
    expect(sent).toHaveLength(0);

    // A Host header pointing elsewhere changes nothing: the link is the server's own.
    const asked = await new Promise<number>((resolve, reject) => {
      const body = JSON.stringify({ email: made.email.toUpperCase() });
      const req = httpRequest(
        { host: '127.0.0.1', port, path: '/api/auth/forgot', method: 'POST', headers: { host: 'evil.example', 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        },
      );
      req.on('error', reject);
      req.end(body);
    });
    expect(asked).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toEqual([made.email]);
    const link = /https:\/\/gymgo\.example\.com\/reset-password\?token=([A-Za-z0-9_-]+)/.exec(sent[0]!.text);
    expect(link).not.toBeNull();
    expect(sent[0]!.text).not.toContain('evil.example');
    const token = link![1]!;

    expect((await call('GET', '/reset-password?token=not-a-token')).text).toContain('stopped working');
    const form = await call('GET', `/reset-password?token=${token}`);
    expect(form.text).toContain('Choose a new password');
    expect(form.headers.get('cache-control')).toBe('no-store');
    expect(form.headers.get('content-security-policy')).toContain("form-action 'self'");

    expect((await call('POST', '/reset-password', { form: { token, password: 'new strong pass', confirm: 'different pass' } })).text).toContain('don’t match');
    expect((await call('POST', '/reset-password', { form: { token, password: 'password1', confirm: 'password1' } })).text).toContain('most common');
    const done = await call('POST', '/reset-password', { form: { token, password: 'new strong pass', confirm: 'new strong pass' } });
    expect(done.status).toBe(200);
    expect(done.text).toContain('Password changed');

    // Signed out everywhere; the new password works; the link works once.
    expect((await call('GET', '/api/me', { token: oldToken })).status).toBe(401);
    expect((await call('POST', '/api/auth/login', { body: { email: made.email, password: 'new strong pass' } })).status).toBe(200);
    expect((await call('POST', '/reset-password', { form: { token, password: 'another pass 2', confirm: 'another pass 2' } })).status).toBe(400);
  });

  it('sends only a few to one address', async () => {
    const sent: MailMessage[] = [];
    const { call, signUp } = await start({ publicUrl: 'https://gymgo.example.com', mail: async (message) => void sent.push(message) });
    const { email } = await signUp();
    const statuses: number[] = [];
    for (let ask = 0; ask < 4; ask += 1) statuses.push((await call('POST', '/api/auth/forgot', { body: { email } })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});
