import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { BugReports, MAX_ATTEMPTS, bugReportEmail, cleanBugReport } from './bugReports';
import { openDb, type Db } from './db';
import { headerSafe, isEmailAddress, senderFor, type MailMessage } from './mail';

const TEAM = ['ashenkodit@gmail.com', 'mahogany.81926@gmail.com'];

describe('checking a report', () => {
  it('needs a few words, and not an essay', () => {
    expect(() => cleanBugReport({ description: 'broken' })).toThrow('Say a little more');
    expect(() => cleanBugReport({ description: 'x'.repeat(4001) })).toThrow('under 4,000');
    expect(cleanBugReport({ description: '  The map went blank after I searched Austin.  ' }).description).toBe('The map went blank after I searched Austin.');
  });

  it('takes a reply address only if it looks like one', () => {
    expect(() => cleanBugReport({ description: 'The map went blank', replyTo: 'not an email' })).toThrow('doesn’t look right');
    expect(() => cleanBugReport({ description: 'The map went blank', replyTo: 'a@b.com\r\nBcc: x@y.com' })).toThrow();
    expect(cleanBugReport({ description: 'The map went blank', replyTo: ' me@example.com ' }).replyTo).toBe('me@example.com');
    expect(cleanBugReport({ description: 'The map went blank', replyTo: '' }).replyTo).toBeNull();
  });

  it('keeps device details to short single lines, and drops anything malformed', () => {
    const report = cleanBugReport({
      description: 'The map went blank',
      context: [{ label: 'Platform', value: 'ios 18\nBcc: evil@example.com' }, { label: '', value: 'x' }, 'junk', { label: 'Screen', value: 'Explore' }],
    });
    expect(report.context).toEqual([
      { label: 'Platform', value: 'ios 18 Bcc: evil@example.com' },
      { label: 'Screen', value: 'Explore' },
    ]);
    expect(cleanBugReport({ description: 'The map went blank', context: Array.from({ length: 40 }, (_, i) => ({ label: `k${i}`, value: 'v' })) }).context).toHaveLength(16);
  });
});

describe('the email', () => {
  it('has a one-line subject from the report, and everything needed to follow it up', () => {
    const email = bugReportEmail({
      id: 'r1',
      description: '\nSaved gyms vanished\nafter signing in on my PC.',
      replyTo: 'me@example.com',
      context: [{ label: 'App', value: '0.1.0' }],
      reporter: { id: 'u1', email: 'me@example.com', displayName: 'Sam' },
      createdAt: '2026-09-26T10:00:00.000Z',
    });
    expect(email.subject).toBe('GymGO bug report: Saved gyms vanished');
    expect(email.text).toContain('Saved gyms vanished\nafter signing in on my PC.');
    expect(email.text).toContain('Sam <me@example.com>, account u1');
    expect(email.text).toContain('Reply to: me@example.com');
    expect(email.text).toContain('App: 0.1.0');
  });

  it('never lets a line break into a header', () => {
    expect(headerSafe('Hello\r\nBcc: x@y.com', 100)).toBe('Hello Bcc: x@y.com');
    expect(headerSafe('a'.repeat(200), 10)).toHaveLength(10);
    expect(isEmailAddress('ashenkodit@gmail.com')).toBe(true);
    expect(isEmailAddress('a@b')).toBe(false);
  });

  it('is sent as the SMTP account unless told otherwise', () => {
    expect(senderFor('smtps://team%40gmail.com:secret@smtp.gmail.com:465', null)).toBe('"GymGO" <team@gmail.com>');
    expect(senderFor('smtp://apikey:secret@smtp.example.com:587', null)).toBeNull();
    expect(senderFor('smtp://apikey:secret@smtp.example.com:587', 'GymGO <bugs@example.com>')).toBe('GymGO <bugs@example.com>');
  });
});

describe('delivery', () => {
  let db: Db;
  let clock = new Date('2026-09-26T10:00:00.000Z');
  beforeAll(() => {
    db = openDb(':memory:');
  });
  afterAll(() => db.close());
  const report = (text = 'The plate calculator said 185 lb was short') => cleanBugReport({ description: text });

  it('keeps a report when the mail server fails, tries again, and gives up after five tries', async () => {
    let fail = true;
    const sent: MailMessage[] = [];
    const reports = new BugReports(db, {
      send: async (message) => {
        if (fail) throw new Error('Connection refused');
        sent.push(message);
      },
      to: TEAM,
      now: () => clock,
      log: () => undefined,
    });
    const id = reports.create(report(), null);
    expect(await reports.deliver(id)).toBe(false);
    expect(reports.latest()[0]).toMatchObject({ id, status: 'pending', attempts: 1, lastError: 'Connection refused' });
    fail = false;
    expect(await reports.deliverWaiting()).toBe(1);
    expect(reports.latest()[0]).toMatchObject({ id, status: 'sent', lastError: null });
    expect(sent[0]!.to).toEqual(TEAM);

    fail = true;
    const doomed = reports.create(report('Another one that never goes'), null);
    for (let i = 0; i < MAX_ATTEMPTS + 2; i += 1) await reports.deliver(doomed);
    expect(reports.latest().find((item) => item.id === doomed)).toMatchObject({ status: 'failed', attempts: MAX_ATTEMPTS });
  });

  it('sends no more than the day’s allowance; the rest wait for tomorrow', async () => {
    const sent: MailMessage[] = [];
    const reports = new BugReports(db, { send: async (message) => void sent.push(message), to: TEAM, now: () => clock, perDay: 2 });
    db.exec('delete from bug_reports');
    const ids = [reports.create(report('One: the map went blank'), null), reports.create(report('Two: the map went blank'), null), reports.create(report('Three: the map went blank'), null)];
    for (const id of ids) await reports.deliver(id);
    expect(sent).toHaveLength(2);
    clock = new Date(clock.getTime() + 25 * 3_600_000);
    expect(await reports.deliverWaiting()).toBe(1);
    expect(sent).toHaveLength(3);
  });

  it('answers after a few seconds when the mail server is slow, and still sends', async () => {
    let finish: () => void = () => undefined;
    const reports = new BugReports(db, { send: () => new Promise<void>((resolve) => (finish = resolve)), to: TEAM, now: () => clock });
    const id = reports.create(report('The rest timer skipped a beat'), null);
    expect(await reports.deliverWithin(id, 20)).toBe(false);
    finish();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(reports.latest().find((item) => item.id === id)?.status).toBe('sent');
  });

  it('keeps reports, without sending, when email isn’t set up', async () => {
    const reports = new BugReports(db, { send: null, to: TEAM, now: () => clock });
    const id = reports.create(report('Compare showed the wrong gym'), null);
    expect(reports.emailing).toBe(false);
    expect(await reports.deliver(id)).toBe(false);
    expect(reports.latest().find((item) => item.id === id)?.status).toBe('pending');
  });
});

describe('POST /api/bug-reports', () => {
  let server: Server;
  let base: string;
  let db: Db;
  const outbox: MailMessage[] = [];

  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(
      createApp({ db, attribution: 'test', signupsPerHour: 1000, bugReports: { send: async (message) => void outbox.push(message), to: TEAM } }),
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.close();
    db.close();
  });

  async function call(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  let people = 0;
  async function signUp() {
    people += 1;
    const result = await call('POST', '/api/auth/signup', {
      body: { email: `bugs${people}@example.com`, password: 'correct horse', displayName: `Tester ${people}` },
    });
    return { token: result.body.token as string, id: result.body.account.id as string };
  }

  it('takes a report from someone signed out and emails it to the team', async () => {
    const result = await call('POST', '/api/bug-reports', {
      body: { description: 'Search this area spun forever in Boise.', replyTo: 'reader@example.com', context: [{ label: 'Platform', value: 'web' }] },
    });
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ emailed: true });
    const mail = outbox.at(-1)!;
    expect(mail.to).toEqual(TEAM);
    expect(mail.replyTo).toBe('reader@example.com');
    expect(mail.subject).toBe('GymGO bug report: Search this area spun forever in Boise.');
    expect(mail.text).toContain('Someone not signed in');
    expect(mail.text).toContain('Platform: web');
  });

  it('says who sent it when signed in, and it’s in their data and goes with their account', async () => {
    const me = await signUp();
    const result = await call('POST', '/api/bug-reports', { token: me.token, body: { description: 'My workout list shows two of everything.' } });
    expect(result.status).toBe(201);
    expect(outbox.at(-1)!.text).toContain(`<bugs${people}@example.com>, account ${me.id}`);
    expect(outbox.at(-1)!.replyTo ?? null).toBeNull();

    const exported = await call('GET', '/api/me/export', { token: me.token });
    expect(exported.body.bugReports).toEqual([expect.objectContaining({ description: 'My workout list shows two of everything.', status: 'sent' })]);

    expect((await call('DELETE', '/api/me', { token: me.token, body: { password: 'correct horse' } })).status).toBeLessThan(300);
    expect(db.prepare('select count(*) as n from bug_reports where user_id = ?').get(me.id)).toEqual({ n: 0 });
  });

  it('refuses a report with nothing in it', async () => {
    const result = await call('POST', '/api/bug-reports', { body: { description: '   ' } });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('Say a little more');
  });

  it('shows moderators the reports, and nobody else', async () => {
    const member = await signUp();
    expect((await call('GET', '/api/moderation/bug-reports', { token: member.token })).status).toBe(403);
    expect((await call('GET', '/api/moderation/bug-reports')).status).toBe(401);
    const moderator = await signUp();
    db.prepare(`update users set role = 'moderator' where id = ?`).run(moderator.id);
    const list = await call('GET', '/api/moderation/bug-reports', { token: moderator.token });
    expect(list.status).toBe(200);
    expect(list.body.emailing).toBe(true);
    expect(list.body.reports[0]).toMatchObject({ status: 'sent' });
  });

  it('slows down anyone sending report after report', async () => {
    const me = await signUp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await call('POST', '/api/bug-reports', { token: me.token, body: { description: `Report number ${i} about the map` } })).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });
});
