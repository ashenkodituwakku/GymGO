import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanFolder, createApp } from './app';
import { openDb, type Db } from './db';

describe('folders for saved workouts', () => {
  let db: Db;
  let server: Server;
  let base: string;
  let people = 0;
  const call = async (method: string, path: string, token: string | null, body?: unknown) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as Record<string, any>) : null };
  };
  const signUp = async () => {
    people += 1;
    const result = await call('POST', '/api/auth/signup', null, { email: `folders${people}@example.com`, password: 'correct horse', displayName: `Folders ${people}`, birthMonth: '1990-01', acceptTerms: true });
    return { token: result.body!.token as string, id: result.body!.account.id as string };
  };
  const pro = (id: string) =>
    db
      .prepare(
        `insert into subscriptions (stripe_subscription_id, user_id, status, interval, currency, amount_minor, price_lookup_key, current_period_end, cancel_at, cancel_at_period_end, updated_at)
         values (?, ?, 'active', 'year', 'aud', 2999, 'gymgo_pro_year_aud', '2099-01-01T00:00:00Z', null, 0, '2026-10-01T00:00:00Z')`,
      )
      .run(`sub_folders_${id}`, id);
  const unpro = (id: string) => db.prepare('delete from subscriptions where user_id = ?').run(id);
  const plan = (exerciseId: string) => ({
    muscles: ['chest'],
    goal: 'muscle',
    gymName: null,
    items: [{ exerciseId, sets: 3, reps: '8–10', restSeconds: 90, uses: [], confirmed: true }],
    uncovered: [],
  });

  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000 }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.close();
    db.close();
  });

  it('keeps a workout in a folder, saved there or moved later, even after Pro ends', async () => {
    const me = await signUp();
    pro(me.id);
    const push = await call('POST', '/api/workouts', me.token, { name: 'Push', plan: plan('bench-press'), folder: '  Upper   body ' });
    expect(push.status).toBe(201);
    expect(push.body!.workout.folder).toBe('Upper body');
    const legs = (await call('POST', '/api/workouts', me.token, { name: 'Legs', plan: plan('back-squat') })).body!.workout;
    expect(legs.folder).toBeNull();
    // Pro ends: moving between folders is tidying, so it still works; changing the plan doesn't.
    unpro(me.id);
    const moved = await call('PATCH', `/api/workouts/${legs.id}`, me.token, { folder: 'Lower body' });
    expect(moved.status).toBe(200);
    expect(moved.body!.workout).toMatchObject({ name: 'Legs', folder: 'Lower body' });
    expect((await call('PATCH', `/api/workouts/${legs.id}`, me.token, { name: 'Legs 2', plan: plan('back-squat'), folder: null })).status).toBe(403);
    const listed = (await call('GET', '/api/workouts', me.token)).body!.workouts as Array<{ name: string; folder: string | null }>;
    expect(listed.map((w) => [w.name, w.folder])).toEqual([
      ['Legs', 'Lower body'],
      ['Push', 'Upper body'],
    ]);
    // Out of a folder again; and it's in Download my data.
    expect((await call('PATCH', `/api/workouts/${legs.id}`, me.token, { folder: '' })).body!.workout.folder).toBeNull();
    expect(((await call('GET', '/api/me/export', me.token)).body!.workouts as Array<{ folder: string | null }>).map((w) => w.folder).sort()).toEqual(['Upper body', null].sort());
  });

  it('renames a folder for all its workouts, or empties it, only for its owner', async () => {
    const me = await signUp();
    const other = await signUp();
    pro(me.id);
    for (const [name, exercise] of [['Push', 'bench-press'], ['Pull', 'bb-row']] as const) {
      await call('POST', '/api/workouts', me.token, { name, plan: plan(exercise), folder: 'Week A' });
    }
    expect((await call('PATCH', '/api/workouts/folders', other.token, { from: 'Week A', to: 'Mine' })).status).toBe(404);
    const renamed = await call('PATCH', '/api/workouts/folders', me.token, { from: 'Week A', to: 'Upper days' });
    expect(renamed).toMatchObject({ status: 200, body: { moved: 2 } });
    expect(((await call('GET', '/api/workouts', me.token)).body!.workouts as Array<{ folder: string }>).every((w) => w.folder === 'Upper days')).toBe(true);
    // Renamed to none: the folder goes, its workouts stay.
    expect((await call('PATCH', '/api/workouts/folders', me.token, { from: 'Upper days', to: null })).body!.moved).toBe(2);
    expect(((await call('GET', '/api/workouts', me.token)).body!.workouts as unknown[]).length).toBe(2);
    expect((await call('PATCH', '/api/workouts/folders', me.token, { from: '', to: 'X' })).status).toBe(400);
  });

  it('keeps a copy under a new name, but not the same save twice', async () => {
    const me = await signUp();
    pro(me.id);
    const first = (await call('POST', '/api/workouts', me.token, { name: 'Push', plan: plan('bench-press'), folder: 'Week A' })).body!.workout;
    // A retry: the same name and plan is the one already kept.
    const again = await call('POST', '/api/workouts', me.token, { name: 'Push', plan: plan('bench-press'), folder: 'Week A' });
    expect(again.status).toBe(200);
    expect(again.body!.workout.id).toBe(first.id);
    // Duplicate: a new name, the same plan, kept as well, in the folder asked for.
    const copy = await call('POST', '/api/workouts', me.token, { name: 'Push (copy)', plan: plan('bench-press'), folder: 'Week A' });
    expect(copy.status).toBe(201);
    expect(copy.body!.workout).toMatchObject({ name: 'Push (copy)', folder: 'Week A' });
    expect(copy.body!.workout.id).not.toBe(first.id);
    expect(((await call('GET', '/api/workouts', me.token)).body!.workouts as unknown[]).length).toBe(2);
  });

  it('keeps your notes on a workout, tidied, and changes them when it’s changed', async () => {
    const me = await signUp();
    pro(me.id);
    const made = await call('POST', '/api/workouts', me.token, { name: 'Legs', plan: { ...plan('back-squat'), note: '  Seat on 4.\r\n\r\n\r\nPause at the bottom.  ' } });
    expect(made.status).toBe(201);
    expect(made.body!.workout.plan.note).toBe('Seat on 4.\n\nPause at the bottom.');
    const id = made.body!.workout.id as string;
    const changed = await call('PATCH', `/api/workouts/${id}`, me.token, { name: 'Legs', plan: { ...plan('back-squat'), note: 'Seat on 5.' } });
    expect(changed.status).toBe(200);
    const listed = (await call('GET', '/api/workouts', me.token)).body!.workouts as Array<{ id: string; plan: { note?: string } }>;
    expect(listed.find((each) => each.id === id)!.plan.note).toBe('Seat on 5.');
    // Blank is none; too long, or not text, is turned down.
    const blank = await call('POST', '/api/workouts', me.token, { name: 'Arms', plan: { ...plan('db-curl'), note: '   ' } });
    expect(blank.body!.workout.plan.note).toBeUndefined();
    expect((await call('POST', '/api/workouts', me.token, { name: 'Long', plan: { ...plan('db-curl'), note: 'x'.repeat(501) } })).status).toBe(400);
    expect((await call('POST', '/api/workouts', me.token, { name: 'Odd', plan: { ...plan('db-curl'), note: 5 } })).status).toBe(400);
  });

  it('takes a folder name of up to 40 characters, or none', () => {
    expect(cleanFolder('  Week   A ')).toBe('Week A');
    expect(cleanFolder('')).toBeNull();
    expect(cleanFolder(null)).toBeNull();
    expect(() => cleanFolder('x'.repeat(41))).toThrow();
    expect(() => cleanFolder(42)).toThrow();
    expect(() => cleanFolder('Tab\there')).not.toThrow();
    expect(() => cleanFolder('Bell\u0007')).toThrow();
  });
});
