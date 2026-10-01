import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { LEGAL_DOC_IDS, LEGAL_VERSION, legalDoc, legalLinks, type LegalOperator } from '@gymgo/domain';
import { createApp } from './app';
import { openDb, type Db } from './db';

const servers: Array<{ server: Server; db: Db }> = [];

async function start(operator?: LegalOperator, publicUrl: string | null = null) {
  const db = openDb(':memory:');
  const server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000, publicUrl, legal: { operator } }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push({ server, db });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    db,
    async call(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
      const headers: Record<string, string> = {};
      if (options.token) headers.authorization = `Bearer ${options.token}`;
      if (options.body !== undefined) headers['content-type'] = 'application/json';
      const response = await fetch(`${base}${path}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
      return { status: response.status, headers: response.headers, text: await response.text() };
    },
  };
}

afterAll(() => {
  for (const { server, db } of servers) {
    server.close();
    db.close();
  }
});

const owner: LegalOperator = {
  name: 'Lift & <Co>',
  email: 'privacy@example.com',
  address: 'PO Box 1, Melbourne VIC 3000',
  governingLaw: 'Victoria, Australia',
  hostedIn: 'Australia',
};

describe('the legal documents', () => {
  it('are public pages, each linking to the others', async () => {
    const { call } = await start(owner);
    for (const id of LEGAL_DOC_IDS) {
      const page = await call('GET', `/${id}`);
      expect(page.status).toBe(200);
      expect(page.headers.get('content-type')).toContain('text/html');
      expect(page.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
      expect(page.text).toContain(`<h1>${legalDoc(id).title}</h1>`);
      for (const other of LEGAL_DOC_IDS.filter((each) => each !== id)) expect(page.text).toContain(`href="/${other}"`);
    }
    const index = await call('GET', '/legal');
    expect(index.status).toBe(200);
    for (const id of LEGAL_DOC_IDS) expect(index.text).toContain(legalDoc(id).summary);
    expect((await call('GET', '/legal/terms')).status).toBe(404);
  });

  it('name whoever runs GymGO, safely, and fall back to Report a bug without a contact', async () => {
    const named = await start(owner);
    const terms = (await named.call('GET', '/terms')).text;
    expect(terms).toContain('Lift &amp; &lt;Co&gt;');
    expect(terms).not.toContain('<Co>');
    expect(terms).toContain('privacy@example.com');
    expect(terms).toContain('laws of Victoria, Australia');
    expect((await named.call('GET', '/privacy')).text).toContain('backups are in Australia');

    const plain = await start();
    const privacy = (await plain.call('GET', '/privacy')).text;
    expect(privacy).toContain('the GymGO team');
    expect(privacy).toContain('Profile → Report a bug');
  });

  it('say so through the API, with the version people agree to', async () => {
    const { call } = await start(owner);
    const answer = JSON.parse((await call('GET', '/api/legal')).text);
    expect(answer.version).toBe(LEGAL_VERSION);
    expect(answer.operator.email).toBe('privacy@example.com');
  });

  it('turn links into pieces the app and pages can draw', () => {
    expect(legalLinks('See the [Privacy Policy](privacy), or [Stripe’s](https://stripe.com/privacy).')).toEqual([
      { text: 'See the ' },
      { text: 'Privacy Policy', doc: 'privacy' },
      { text: ', or ' },
      { text: 'Stripe’s', url: 'https://stripe.com/privacy' },
      { text: '.' },
    ]);
    // Anything else stays text: no javascript: or relative links.
    expect(legalLinks('[x](javascript:alert(1))')).toEqual([{ text: 'x' }, { text: ')' }]);
  });
});

describe('security.txt', () => {
  it('says where to report a problem once there is somewhere', async () => {
    expect((await (await start()).call('GET', '/.well-known/security.txt')).status).toBe(404);
    const { call } = await start(owner, 'https://gymgo.example.com');
    const file = await call('GET', '/.well-known/security.txt');
    expect(file.status).toBe(200);
    expect(file.text).toContain('Contact: mailto:privacy@example.com');
    expect(file.text).toMatch(/Expires: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
    expect(file.text).toContain('Canonical: https://gymgo.example.com/.well-known/security.txt');
  });
});

describe('agreeing to the terms', () => {
  const signup = (extra: Record<string, unknown>) => ({
    email: `agree${Math.random().toString(36).slice(2)}@example.com`,
    password: 'correct horse',
    displayName: 'Agreeable',
    birthMonth: '1990-01',
    ...extra,
  });

  it('comes before an account is made, and is recorded with its version', async () => {
    const { call, db } = await start();
    const refused = await call('POST', '/api/auth/signup', { body: signup({}) });
    expect(refused.status).toBe(400);
    expect(JSON.parse(refused.text).code).toBe('terms_needed');
    expect((db.prepare('select count(*) as n from users').get() as { n: number }).n).toBe(0);

    const made = await call('POST', '/api/auth/signup', { body: signup({ acceptTerms: true }) });
    expect(made.status).toBe(201);
    const { account } = JSON.parse(made.text);
    expect(account.termsVersion).toBe(LEGAL_VERSION);
    const row = db.prepare('select terms_version, terms_accepted_at from users where id = ?').get(account.id) as Record<string, string>;
    expect(row.terms_version).toBe(LEGAL_VERSION);
    expect(row.terms_accepted_at).toBeTruthy();
  });

  it('can be given again after the terms change, only for the current version', async () => {
    const { call, db } = await start();
    const made = JSON.parse((await call('POST', '/api/auth/signup', { body: signup({ acceptTerms: true }) })).text);
    db.prepare("update users set terms_version = '2020-01-01' where id = ?").run(made.account.id);
    const me = JSON.parse((await call('GET', '/api/me', { token: made.token })).text);
    expect(me.account.termsVersion).toBe('2020-01-01');

    expect((await call('POST', '/api/me/terms', { token: made.token, body: { version: '2020-01-01' } })).status).toBe(409);
    expect((await call('POST', '/api/me/terms', { body: { version: LEGAL_VERSION } })).status).toBe(401);
    const agreed = await call('POST', '/api/me/terms', { token: made.token, body: { version: LEGAL_VERSION } });
    expect(agreed.status).toBe(200);
    expect(JSON.parse(agreed.text).account.termsVersion).toBe(LEGAL_VERSION);
  });
});
