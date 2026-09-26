import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { openDb, type Db } from './db';
import { IdentityVerifier, KEYS_URL } from './identity';

const NOW = new Date('2026-09-25T12:00:00Z');
const nowS = Math.floor(NOW.getTime() / 1000);

// Stand-ins for Google's and Apple's signing keys, and a key nobody lists.
const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
const apple = generateKeyPairSync('rsa', { modulusLength: 2048 });
const stranger = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = (key: KeyObject, kid: string) => ({ ...key.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' });
let keyFetches = 0;
const fetchKeys = (async (url: string | URL) => {
  keyFetches += 1;
  const keys = String(url) === KEYS_URL.google ? [jwk(google.publicKey, 'g1')] : [jwk(apple.publicKey, 'a1')];
  return Response.json({ keys });
}) as typeof fetch;

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(claims: Record<string, unknown>, options: { key?: KeyObject; kid?: string; alg?: string } = {}) {
  const head = b64({ alg: options.alg ?? 'RS256', kid: options.kid ?? 'g1', typ: 'JWT' });
  const body = b64(claims);
  const signature = sign('RSA-SHA256', Buffer.from(`${head}.${body}`), options.key ?? google.privateKey).toString('base64url');
  return `${head}.${body}.${signature}`;
}
const googleClaims = (patch: Record<string, unknown> = {}) => ({
  iss: 'https://accounts.google.com',
  aud: 'web-client.apps.googleusercontent.com',
  sub: 'google-123',
  email: 'Alex@Example.com',
  email_verified: true,
  name: 'Alex Lifter',
  iat: nowS - 10,
  exp: nowS + 3600,
  nonce: 'n-1',
  ...patch,
});
const appleToken = (patch: Record<string, unknown> = {}, rawNonce = 'apple-nonce') =>
  token(
    {
      iss: 'https://appleid.apple.com',
      aud: 'com.alex.gymgo',
      sub: 'apple-001',
      email: 'x7@privaterelay.appleid.com',
      email_verified: 'true',
      iat: nowS - 5,
      exp: nowS + 600,
      nonce: createHash('sha256').update(rawNonce).digest('hex'),
      ...patch,
    },
    { key: apple.privateKey, kid: 'a1' },
  );

describe('checking an ID token', () => {
  const verifier = new IdentityVerifier({ fetchImpl: fetchKeys, now: () => NOW });
  const audiences = ['web-client.apps.googleusercontent.com'];

  it('trusts a token Google signed, for this app, in date, with the nonce', async () => {
    const who = await verifier.verify('google', token(googleClaims()), audiences, 'n-1');
    expect(who).toEqual({ provider: 'google', subject: 'google-123', email: 'alex@example.com', emailVerified: true, name: 'Alex Lifter' });
  });

  it('refuses a forged signature, another app, an old token, another issuer, a missing nonce', async () => {
    await expect(verifier.verify('google', token(googleClaims(), { key: stranger.privateKey }), audiences, 'n-1')).rejects.toThrow(/signature/);
    await expect(verifier.verify('google', token(googleClaims({ aud: 'someone-else' })), audiences, 'n-1')).rejects.toThrow(/different app/);
    await expect(verifier.verify('google', token(googleClaims({ exp: nowS - 3600 })), audiences, 'n-1')).rejects.toThrow(/expired/);
    await expect(verifier.verify('google', token(googleClaims({ iss: 'https://evil.example' })), audiences, 'n-1')).rejects.toThrow(/someone else/);
    await expect(verifier.verify('google', token(googleClaims()), audiences, null)).rejects.toThrow(/doesn’t match/);
    await expect(verifier.verify('google', token(googleClaims()), audiences, 'other')).rejects.toThrow(/doesn’t match/);
  });

  it('refuses tokens that aren’t RS256, or signed with a key the provider doesn’t list', async () => {
    await expect(verifier.verify('google', token(googleClaims(), { alg: 'HS256' }), audiences, 'n-1')).rejects.toThrow(/signed the expected way/);
    await expect(verifier.verify('google', token(googleClaims(), { kid: 'nope' }), audiences, 'n-1')).rejects.toThrow(/doesn’t list/);
    await expect(verifier.verify('google', 'not.a.jwt', audiences, 'n-1')).rejects.toThrow(/shape/);
  });

  it('keeps the keys between sign-ins', async () => {
    const before = keyFetches;
    await verifier.verify('google', token(googleClaims()), audiences, 'n-1');
    await verifier.verify('google', token(googleClaims()), audiences, 'n-1');
    expect(keyFetches).toBe(before);
  });

  it('checks Apple’s hashed nonce against the one the app made', async () => {
    const who = await verifier.verify('apple', appleToken(), ['com.alex.gymgo'], 'apple-nonce');
    expect(who).toMatchObject({ provider: 'apple', subject: 'apple-001', emailVerified: true, name: null });
    await expect(verifier.verify('apple', appleToken(), ['com.alex.gymgo'], 'replayed')).rejects.toThrow(/doesn’t match/);
  });
});

describe('signing in with Google and Apple', () => {
  let server: Server;
  let base: string;
  let db: Db;

  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(
      createApp({
        db,
        attribution: 'test',
        signupsPerHour: 1000,
        now: () => NOW,
        signIn: { google: { web: 'web-client.apps.googleusercontent.com', ios: null, android: null }, apple: ['com.alex.gymgo'], fetchImpl: fetchKeys },
      }),
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
    db.close();
  });

  const call = async (method: string, path: string, options: { token?: string; body?: unknown } = {}) => {
    const headers: Record<string, string> = {};
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const response = await fetch(`${base}${path}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as Record<string, any>) : null };
  };

  it('says which are on, with Google’s public client ids', async () => {
    const providers = await call('GET', '/api/auth/providers');
    expect(providers.body).toEqual({ google: { web: 'web-client.apps.googleusercontent.com', ios: null, android: null }, apple: true });
  });

  it('makes an account the first time, and signs the same person in after', async () => {
    const first = await call('POST', '/api/auth/google', { body: { idToken: token(googleClaims()), nonce: 'n-1' } });
    expect(first.status).toBe(201);
    expect(first.body!.account).toMatchObject({ email: 'alex@example.com', displayName: 'Alex Lifter', hasPassword: false });
    const again = await call('POST', '/api/auth/google', { body: { idToken: token(googleClaims({ email: 'new@example.com' })), nonce: 'n-1' } });
    expect(again.status).toBe(200);
    expect(again.body!.account.id).toBe(first.body!.account.id);
    // No password, so a password login can't get in.
    expect((await call('POST', '/api/auth/login', { body: { email: 'alex@example.com', password: '' } })).status).toBe(400);
    expect((await call('POST', '/api/auth/login', { body: { email: 'alex@example.com', password: 'anything at all' } })).status).toBe(401);
  });

  it('never joins a password account on email alone', async () => {
    await call('POST', '/api/auth/signup', { body: { email: 'sam@example.com', password: 'correct horse', displayName: 'Sam' } });
    const refused = await call('POST', '/api/auth/google', { body: { idToken: token(googleClaims({ sub: 'google-sam', email: 'sam@example.com' })), nonce: 'n-1' } });
    expect(refused.status).toBe(409);
    expect(refused.body!.code).toBe('connect_from_settings');
  });

  it('refuses an unverified email, and a forged token', async () => {
    expect((await call('POST', '/api/auth/google', { body: { idToken: token(googleClaims({ sub: 'g-2', email: 'u@example.com', email_verified: false })), nonce: 'n-1' } })).status).toBe(400);
    expect((await call('POST', '/api/auth/google', { body: { idToken: token(googleClaims({ sub: 'g-3' }), { key: stranger.privateKey }), nonce: 'n-1' } })).status).toBe(401);
  });

  it('lets a signed-in person connect Apple, list both, and not remove the last way in', async () => {
    const signedIn = await call('POST', '/api/auth/signup', { body: { email: 'jo@example.com', password: 'correct horse', displayName: 'Jo' } });
    const session = signedIn.body!.token as string;
    const connected = await call('POST', '/api/me/identities/apple', { token: session, body: { idToken: appleToken(), nonce: 'apple-nonce' } });
    expect(connected.status).toBe(200);
    const listed = await call('GET', '/api/me/identities', { token: session });
    expect(listed.body).toMatchObject({ password: true, identities: [{ provider: 'apple', email: 'x7@privaterelay.appleid.com' }] });
    // Apple now signs Jo in.
    const viaApple = await call('POST', '/api/auth/apple', { body: { idToken: appleToken(), nonce: 'apple-nonce' } });
    expect(viaApple.body!.account.email).toBe('jo@example.com');
    // The same Apple account can't be connected to someone else.
    const other = await call('POST', '/api/auth/signup', { body: { email: 'kim@example.com', password: 'correct horse', displayName: 'Kim' } });
    expect((await call('POST', '/api/me/identities/apple', { token: other.body!.token, body: { idToken: appleToken(), nonce: 'apple-nonce' } })).status).toBe(409);
    expect((await call('DELETE', '/api/me/identities/apple', { token: session })).status).toBe(204);
  });

  it('keeps Google as the way in until a password is set, which needs no old one', async () => {
    const made = await call('POST', '/api/auth/google', { body: { idToken: token(googleClaims({ sub: 'g-only', email: 'only@example.com' })), nonce: 'n-1' } });
    const session = made.body!.token as string;
    expect((await call('DELETE', '/api/me/identities/google', { token: session })).status).toBe(409);
    expect((await call('POST', '/api/me/password', { token: session, body: { currentPassword: '', newPassword: 'a new password' } })).status).toBe(204);
    expect((await call('DELETE', '/api/me/identities/google', { token: session })).status).toBe(204);
    expect((await call('POST', '/api/auth/login', { body: { email: 'only@example.com', password: 'a new password' } })).status).toBe(200);
  });
});
