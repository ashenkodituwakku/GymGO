import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { openDb, type Db } from './db';
import { cleanComment, MAX_COMMENT } from './feed';

let clock = new Date('2026-11-20T10:00:00Z');
let server: Server;
let base: string;
let db: Db;

beforeAll(async () => {
  db = openDb(':memory:');
  server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000, now: () => clock }));
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
async function person(name: string) {
  people += 1;
  const result = await call('POST', '/api/auth/signup', {
    body: { email: `feed${people}@example.com`, password: 'correct horse', displayName: name, birthMonth: '1990-01', acceptTerms: true },
  });
  expect(result.status).toBe(201);
  const token = result.body!.token as string;
  const code = (await call('GET', '/api/friends', { token })).body!.code as string;
  return { token, id: result.body!.account.id as string, code, name };
}

async function befriend(a: { token: string; id: string }, b: { token: string; code: string }) {
  expect((await call('POST', '/api/friends', { token: a.token, body: { code: b.code } })).status).toBe(200);
  expect((await call('POST', `/api/friends/${a.id}/accept`, { token: b.token })).status).toBe(200);
}

let minute = 0;
/** A workout finished a minute before the last one logged, with these sets of bench press (kg). */
async function log(token: string, name: string, bench: Array<[number | null, number]>, extra: Record<string, unknown> = {}) {
  minute += 1;
  const finished = new Date(clock.getTime() - minute * 60_000);
  const started = new Date(finished.getTime() - 50 * 60_000);
  const result = await call('POST', '/api/training', {
    token,
    body: {
      name,
      unit: 'kg',
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
      exercises: [{ exerciseId: 'barbell-bench-press', sets: bench.map(([weight, reps]) => ({ weight, reps })) }],
      note: 'left knee sore',
      ...extra,
    },
  });
  expect(result.status).toBe(201);
  return result.body!.session.id as string;
}

describe('sharing workouts with friends', () => {
  it('is off until you turn it on, and then only your friends see them', async () => {
    const ana = await person('Ana');
    const ben = await person('Ben');
    const cy = await person('Cy');
    await befriend(ana, ben);
    const workout = await log(ana.token, 'Push day', [
      [60, 8],
      [60, 8],
    ]);
    // Not sharing yet: Ben sees nothing, and can't open it.
    expect((await call('GET', '/api/feed', { token: ben.token })).body).toEqual({ sharing: false, items: [], next: null, activity: [] });
    expect((await call('GET', `/api/feed/${workout}`, { token: ben.token })).status).toBe(404);
    // Ana's own feed is empty while she doesn't share (it shows what friends see).
    expect((await call('GET', '/api/feed', { token: ana.token })).body!.items).toEqual([]);

    expect((await call('PUT', '/api/me/sharing', { token: ana.token, body: { workouts: 'yes' } })).status).toBe(400);
    expect((await call('PUT', '/api/me/sharing', { token: ana.token, body: { workouts: true } })).body).toEqual({ workouts: true });
    const seen = (await call('GET', '/api/feed', { token: ben.token })).body!;
    expect(seen.sharing).toBe(false);
    expect(seen.items).toHaveLength(1);
    const item = seen.items[0];
    expect(item).toMatchObject({ id: workout, person: { id: ana.id, displayName: 'Ana' }, you: false, name: 'Push day', unit: 'kg', volumeKg: 960, sets: 2, likes: 0, liked: false, comments: 0 });
    // Never the note, the gym or the saved workout; and "hidden" is only on your own.
    for (const key of ['note', 'gymId', 'workoutId', 'hidden']) expect(item).not.toHaveProperty(key);
    // Ana sees her own, marked as hers.
    expect((await call('GET', '/api/feed', { token: ana.token })).body!.items[0]).toMatchObject({ id: workout, you: true, hidden: false });
    // Someone who isn't her friend sees nothing.
    expect((await call('GET', '/api/feed', { token: cy.token })).body!.items).toEqual([]);
    expect((await call('GET', `/api/feed/${workout}`, { token: cy.token })).status).toBe(404);
    expect((await call('GET', '/api/feed')).status).toBe(401);
  });

  it('keeps a hidden workout from friends, and turning sharing off hides them all', async () => {
    const dee = await person('Dee');
    const eli = await person('Eli');
    await befriend(dee, eli);
    await call('PUT', '/api/me/sharing', { token: dee.token, body: { workouts: true } });
    const shown = await log(dee.token, 'Legs', [[100, 5]]);
    const secret = await log(dee.token, 'Rehab', [[20, 15]]);
    expect((await call('PATCH', `/api/training/${secret}`, { token: dee.token, body: { hidden: 'no' } })).status).toBe(400);
    const hid = await call('PATCH', `/api/training/${secret}`, { token: dee.token, body: { hidden: true } });
    expect(hid.status).toBe(200);
    expect(hid.body!.session.hidden).toBe(true);
    // In your own list, it says so.
    expect((await call('GET', '/api/training', { token: dee.token })).body!.sessions.find((s: { id: string }) => s.id === secret).hidden).toBe(true);
    expect((await call('GET', '/api/feed', { token: eli.token })).body!.items.map((i: { id: string }) => i.id)).toEqual([shown]);
    expect((await call('GET', `/api/feed/${secret}`, { token: eli.token })).status).toBe(404);
    // Dee can still open her hidden one.
    expect((await call('GET', `/api/feed/${secret}`, { token: dee.token })).body!.item.hidden).toBe(true);
    await call('PUT', '/api/me/sharing', { token: dee.token, body: { workouts: false } });
    expect((await call('GET', '/api/feed', { token: eli.token })).body!.items).toEqual([]);
    expect((await call('GET', `/api/feed/${shown}`, { token: eli.token })).status).toBe(404);
  });

  it('pages newest first', async () => {
    const fay = await person('Fay');
    const gus = await person('Gus');
    await befriend(fay, gus);
    await call('PUT', '/api/me/sharing', { token: fay.token, body: { workouts: true } });
    const ids: string[] = [];
    for (let i = 0; i < 23; i++) ids.push(await log(fay.token, `Session ${i}`, [[50, 10]]));
    // Each logged a minute earlier than the one before: the first logged is the newest.
    const first = (await call('GET', '/api/feed', { token: gus.token })).body!;
    expect(first.items).toHaveLength(20);
    expect(first.items[0].id).toBe(ids[0]);
    expect(first.next).toBeTruthy();
    const second = (await call('GET', `/api/feed?after=${encodeURIComponent(first.next)}`, { token: gus.token })).body!;
    expect(second.items.map((i: { id: string }) => i.id)).toEqual(ids.slice(20));
    expect(second.next).toBeNull();
    expect((await call('GET', '/api/feed?after=nonsense', { token: gus.token })).status).toBe(400);
  });
});

describe('records in the feed', () => {
  it('shows the records a workout broke against its owner’s earlier ones, and works them out again after a change', async () => {
    const hal = await person('Hal');
    const ivy = await person('Ivy');
    await befriend(hal, ivy);
    await call('PUT', '/api/me/sharing', { token: hal.token, body: { workouts: true } });
    // Logged newest first: the heavier one is later.
    const heavier = await log(hal.token, 'Heavy', [[100, 3]]);
    const lighter = await log(hal.token, 'Light', [[80, 3]]);
    const items = (await call('GET', '/api/feed', { token: ivy.token })).body!.items as Array<{ id: string; records: unknown[] }>;
    expect(items.find((i) => i.id === heavier)!.records).toEqual([{ exerciseId: 'barbell-bench-press', kind: 'heaviest' }]);
    // The first time an exercise is logged sets a baseline, not a record.
    expect(items.find((i) => i.id === lighter)!.records).toEqual([]);
    // The earlier one changed to be heavier still: the later one is no longer a record.
    expect((await call('PATCH', `/api/training/${lighter}`, { token: hal.token, body: { exercises: [{ exerciseId: 'barbell-bench-press', sets: [{ weight: 120, reps: 3 }] }] } })).status).toBe(200);
    const after = (await call('GET', '/api/feed', { token: ivy.token })).body!.items as Array<{ id: string; records: unknown[] }>;
    expect(after.find((i) => i.id === heavier)!.records).toEqual([]);
    // Deleted: the later one is a baseline again.
    expect((await call('DELETE', `/api/training/${lighter}`, { token: hal.token })).status).toBe(204);
    expect(((await call('GET', '/api/feed', { token: ivy.token })).body!.items as Array<{ id: string; records: unknown[] }>).find((i) => i.id === heavier)!.records).toEqual([]);
  });

  it('names exercises their owner made', async () => {
    const jo = await person('Jo');
    const kai = await person('Kai');
    await befriend(jo, kai);
    await call('PUT', '/api/me/sharing', { token: jo.token, body: { workouts: true } });
    db.prepare('insert into own_exercises (id, user_id, name, fields_json, created_at, updated_at) values (?, ?, ?, ?, ?, ?)').run(
      'mine-abcdefghij',
      jo.id,
      'Landmine twist',
      '{}',
      clock.toISOString(),
      clock.toISOString(),
    );
    minute += 1;
    const finished = new Date(clock.getTime() - minute * 60_000);
    await call('POST', '/api/training', {
      token: jo.token,
      body: { name: 'Core', unit: 'kg', startedAt: new Date(finished.getTime() - 600_000).toISOString(), finishedAt: finished.toISOString(), exercises: [{ exerciseId: 'mine-abcdefghij', sets: [{ weight: 20, reps: 12 }] }, { exerciseId: 'plank', sets: [{ weight: null, reps: 1 }] }] },
    });
    const item = (await call('GET', '/api/feed', { token: kai.token })).body!.items[0];
    expect(item.exercises).toEqual([
      { exerciseId: 'mine-abcdefghij', name: 'Landmine twist', sets: [{ weight: 20, reps: 12 }] },
      { exerciseId: 'plank', sets: [{ weight: null, reps: 1 }] },
    ]);
  });
});

describe('likes and comments', () => {
  it('between friends, on workouts they can see', async () => {
    const lee = await person('Lee');
    const max = await person('Max');
    const ned = await person('Ned');
    await befriend(lee, max);
    await call('PUT', '/api/me/sharing', { token: lee.token, body: { workouts: true } });
    const workout = await log(lee.token, 'Pull day', [[70, 6]]);

    expect((await call('PUT', `/api/feed/${workout}/like`, { token: max.token })).body).toEqual({ likes: 1, liked: true });
    // Liking twice is still one like.
    expect((await call('PUT', `/api/feed/${workout}/like`, { token: max.token })).body).toEqual({ likes: 1, liked: true });
    expect((await call('PUT', `/api/feed/${workout}/like`, { token: lee.token })).body).toEqual({ likes: 2, liked: true });
    // Not a friend: can't like or comment.
    expect((await call('PUT', `/api/feed/${workout}/like`, { token: ned.token })).status).toBe(404);
    expect((await call('POST', `/api/feed/${workout}/comments`, { token: ned.token, body: { body: 'hi' } })).status).toBe(404);

    expect((await call('POST', `/api/feed/${workout}/comments`, { token: max.token, body: { body: '   ' } })).status).toBe(400);
    expect((await call('POST', `/api/feed/${workout}/comments`, { token: max.token, body: { body: 'x'.repeat(MAX_COMMENT + 1) } })).status).toBe(400);
    const posted = await call('POST', `/api/feed/${workout}/comments`, { token: max.token, body: { body: '  Strong   pull!  ' } });
    expect(posted.status).toBe(201);
    expect(posted.body!.comment).toMatchObject({ body: 'Strong pull!', you: true, canDelete: true, person: { displayName: 'Max' } });
    clock = new Date(clock.getTime() + 1000);
    await call('POST', `/api/feed/${workout}/comments`, { token: lee.token, body: { body: 'Thanks' } });

    const opened = (await call('GET', `/api/feed/${workout}`, { token: lee.token })).body!;
    expect(opened.item).toMatchObject({ likes: 2, liked: true, comments: 2 });
    // You first among who liked it.
    expect(opened.item.likedBy.map((p: { displayName: string }) => p.displayName)).toEqual(['Lee', 'Max']);
    expect(opened.comments.map((c: { body: string; canDelete: boolean }) => [c.body, c.canDelete])).toEqual([
      ['Strong pull!', true], // on Lee's workout, so Lee can delete it
      ['Thanks', true],
    ]);
    // Max can't delete Lee's comment; Lee can delete Max's (it's on her workout).
    const leeComment = opened.comments[1].id;
    const maxComment = opened.comments[0].id;
    expect((await call('GET', `/api/feed/${workout}`, { token: max.token })).body!.comments[1].canDelete).toBe(false);
    expect((await call('DELETE', `/api/feed/comments/${leeComment}`, { token: max.token })).status).toBe(403);
    expect((await call('DELETE', `/api/feed/comments/${maxComment}`, { token: lee.token })).status).toBe(204);
    expect((await call('DELETE', `/api/feed/comments/${maxComment}`, { token: lee.token })).status).toBe(404);

    expect((await call('DELETE', `/api/feed/${workout}/like`, { token: max.token })).body).toEqual({ likes: 1, liked: false });
  });

  it('can be reported, once each, and go when the friendship ends', async () => {
    const oz = await person('Oz');
    const pia = await person('Pia');
    await befriend(oz, pia);
    await call('PUT', '/api/me/sharing', { token: oz.token, body: { workouts: true } });
    await call('PUT', '/api/me/sharing', { token: pia.token, body: { workouts: true } });
    const ozWorkout = await log(oz.token, 'Arms', [[30, 10]]);
    const piaWorkout = await log(pia.token, 'Back', [[90, 5]]);
    const comment = (await call('POST', `/api/feed/${ozWorkout}/comments`, { token: pia.token, body: { body: 'Rude words' } })).body!.comment.id;
    await call('PUT', `/api/feed/${ozWorkout}/like`, { token: pia.token });
    await call('POST', `/api/feed/${piaWorkout}/comments`, { token: oz.token, body: { body: 'Nice' } });
    await call('PUT', `/api/feed/${piaWorkout}/like`, { token: oz.token });

    // Your own comment isn't yours to report.
    expect((await call('POST', `/api/feed/comments/${comment}/report`, { token: pia.token })).status).toBe(400);
    const before = (db.prepare('select count(*) as n from bug_reports').get() as { n: number }).n;
    expect((await call('POST', `/api/feed/comments/${comment}/report`, { token: oz.token })).body).toEqual({ reported: true });
    expect((await call('POST', `/api/feed/comments/${comment}/report`, { token: oz.token })).body).toEqual({ reported: true });
    const reports = db.prepare('select description from bug_reports order by created_at desc').all() as Array<{ description: string }>;
    expect(reports.length - before).toBe(1);
    expect(reports[0]!.description).toContain('Rude words');

    // Unfriended: each one's likes and comments on the other's workouts go.
    expect((await call('DELETE', `/api/friends/${pia.id}`, { token: oz.token })).status).toBe(204);
    expect((db.prepare('select count(*) as n from feed_comments where session_id in (?, ?)').get(ozWorkout, piaWorkout) as { n: number }).n).toBe(0);
    expect((db.prepare('select count(*) as n from feed_likes where session_id in (?, ?)').get(ozWorkout, piaWorkout) as { n: number }).n).toBe(0);
    expect((await call('GET', '/api/feed', { token: oz.token })).body!.items.map((i: { id: string }) => i.id)).toEqual([ozWorkout]);
  });

  it('are in Download my data, and go with the account', async () => {
    const quin = await person('Quin');
    const ros = await person('Ros');
    await befriend(quin, ros);
    await call('PUT', '/api/me/sharing', { token: quin.token, body: { workouts: true } });
    const workout = await log(quin.token, 'Full body', [[40, 10]]);
    await call('POST', `/api/feed/${workout}/comments`, { token: ros.token, body: { body: 'Go Quin' } });
    await call('PUT', `/api/feed/${workout}/like`, { token: ros.token });
    const mine = (await call('GET', '/api/me/export', { token: ros.token })).body!;
    expect(mine.feedComments).toMatchObject([{ workoutId: workout, body: 'Go Quin' }]);
    expect(mine.feedLikes).toMatchObject([{ workoutId: workout }]);
    expect(mine.sharesWorkoutsWithFriends).toBe(false);
    expect((await call('GET', '/api/me/export', { token: quin.token })).body!.sharesWorkoutsWithFriends).toBe(true);

    db.prepare('delete from users where id = ?').run(ros.id);
    expect((await call('GET', `/api/feed/${workout}`, { token: quin.token })).body!.item).toMatchObject({ likes: 0, comments: 0 });
  });
});

describe('activity on your workouts', () => {
  it('lists friends’ likes and comments on yours, newest first, never your own', async () => {
    const sue = await person('Sue');
    const tom = await person('Tom');
    await befriend(sue, tom);
    await call('PUT', '/api/me/sharing', { token: sue.token, body: { workouts: true } });
    const workout = await log(sue.token, 'Hinge day', [[120, 3]]);
    await call('PUT', `/api/feed/${workout}/like`, { token: sue.token });
    await call('PUT', `/api/feed/${workout}/like`, { token: tom.token });
    clock = new Date(clock.getTime() + 1000);
    await call('POST', `/api/feed/${workout}/comments`, { token: tom.token, body: { body: 'Big pull' } });
    await call('POST', `/api/feed/${workout}/comments`, { token: sue.token, body: { body: 'Ta' } });
    const first = (await call('GET', '/api/feed', { token: sue.token })).body!;
    expect(first.activity.map((a: { kind: string; person: { displayName: string }; workoutName: string; body?: string }) => [a.kind, a.person.displayName, a.workoutName, a.body ?? null])).toEqual([
      ['comment', 'Tom', 'Hinge day', 'Big pull'],
      ['like', 'Tom', 'Hinge day', null],
    ]);
    // Only with the first page.
    expect((await call('GET', `/api/feed?after=${encodeURIComponent(`${clock.toISOString()}|zzz`)}`, { token: sue.token })).body).not.toHaveProperty('activity');
  });
});

describe('head to head', () => {
  const makePro = (id: string) =>
    db
      .prepare(
        `insert into subscriptions (stripe_subscription_id, user_id, status, interval, currency, amount_minor, price_lookup_key, current_period_end, cancel_at, cancel_at_period_end, updated_at)
         values (?, ?, 'active', 'year', 'aud', 2999, 'gymgo_pro_year_aud', '2099-01-01T00:00:00Z', null, 0, '2026-10-01T00:00:00Z')`,
      )
      .run(`sub_feed_${id}`, id);

  it('is Pro, with a friend who shares, on exercises you’ve both done, from what they share', async () => {
    const uma = await person('Uma');
    const vic = await person('Vic');
    await befriend(uma, vic);
    await log(uma.token, 'Bench', [[70, 5]]);
    await log(vic.token, 'Bench', [[90, 3]]);
    // Vic's heavier one is hidden from friends: it doesn't count.
    const hidden = await log(vic.token, 'Secret', [[150, 1]]);
    await call('PATCH', `/api/training/${hidden}`, { token: vic.token, body: { hidden: true } });
    const free = await call('GET', `/api/feed/compare/${vic.id}`, { token: uma.token });
    expect(free.status).toBe(403);
    expect(free.body!.code).toBe('pro_required');
    makePro(uma.id);
    // Not sharing yet.
    expect((await call('GET', `/api/feed/compare/${vic.id}`, { token: uma.token })).status).toBe(404);
    await call('PUT', '/api/me/sharing', { token: vic.token, body: { workouts: true } });
    const compared = (await call('GET', `/api/feed/compare/${vic.id}`, { token: uma.token })).body!;
    expect(compared.friend.displayName).toBe('Vic');
    expect(compared.rows).toEqual([
      { exerciseId: 'barbell-bench-press', you: { heaviestKg: 70, e1rmKg: 81.7, mostReps: null }, them: { heaviestKg: 90, e1rmKg: 99, mostReps: null } },
    ]);
    // Not a friend: nothing to compare.
    const stranger = await person('Wyn');
    expect((await call('GET', `/api/feed/compare/${stranger.id}`, { token: uma.token })).status).toBe(404);
  });
});

describe('a comment’s text', () => {
  it('is trimmed, its spaces folded, and kept to a length', () => {
    expect(cleanComment('  a \t b  \n\n\n\nc ')).toBe('a b\n\nc');
    expect(() => cleanComment('')).toThrow();
    expect(() => cleanComment(42)).toThrow();
    expect(() => cleanComment('x'.repeat(MAX_COMMENT + 1))).toThrow();
  });
});
