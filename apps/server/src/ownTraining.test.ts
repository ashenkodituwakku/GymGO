import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { openDb, type Db } from './db';

describe('exercises and splits of your own, and changing a saved workout', () => {
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
  const signUp = async (pro: boolean) => {
    people += 1;
    const result = await call('POST', '/api/auth/signup', null, { email: `own${people}@example.com`, password: 'correct horse', displayName: `Own ${people}`, birthMonth: '1990-01', acceptTerms: true });
    if (pro) {
      db.prepare(
        `insert into subscriptions (stripe_subscription_id, user_id, status, interval, currency, amount_minor, price_lookup_key, current_period_end, cancel_at, cancel_at_period_end, updated_at)
         values (?, ?, 'active', 'year', 'aud', 2999, 'gymgo_pro_year_aud', '2099-01-01T00:00:00Z', null, 0, '2026-10-01T00:00:00Z')`,
      ).run(`sub_own_${people}`, result.body!.account.id);
    }
    return result.body!.token as string;
  };
  const landmine = { name: 'Landmine press', primary: ['deltoids'], secondary: ['triceps'], kit: ['barbells'], timed: false, cue: 'Press up and out.', drawnAs: 'ohp' };
  const split = (name = 'My upper / lower') => ({
    name,
    days: [
      { name: 'Upper', items: [{ exerciseId: 'bench-press', sets: 4, reps: '6-8', restSeconds: 150 }, { exerciseId: 'bb-row', sets: 4, reps: '6–8', restSeconds: 150 }] },
      { name: 'Lower', items: [{ exerciseId: 'back-squat', sets: 4, reps: '5', restSeconds: 180 }] },
    ],
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

  it('needs an account, and Pro to make or change one; Free can still read and delete', async () => {
    expect((await call('GET', '/api/own-exercises', null)).status).toBe(401);
    const free = await signUp(false);
    expect(await call('GET', '/api/own-exercises', free)).toEqual({ status: 200, body: { exercises: [] } });
    const made = await call('POST', '/api/own-exercises', free, landmine);
    expect(made.status).toBe(403);
    expect(made.body).toMatchObject({ code: 'pro_required', error: 'Making your own exercises is part of GymGO Pro.' });
    expect((await call('POST', '/api/splits', free, split())).body).toMatchObject({ code: 'pro_required' });
    expect(await call('GET', '/api/splits', free)).toEqual({ status: 200, body: { splits: [] } });
  });

  it('keeps an exercise of your own, tidied, with an id of its own, and refuses a second of the same name', async () => {
    const pro = await signUp(true);
    const made = await call('POST', '/api/own-exercises', pro, { ...landmine, name: '  Landmine   press ' });
    expect(made.status).toBe(201);
    const exercise = made.body!.exercise;
    expect(exercise).toMatchObject({ name: 'Landmine press', primary: ['deltoids'], secondary: ['triceps'], kit: ['barbells'], timed: false, drawnAs: 'ohp', archived: false });
    expect(exercise.id).toMatch(/^mine-[a-z0-9]{10}$/);
    expect((await call('POST', '/api/own-exercises', pro, { ...landmine, name: 'landmine PRESS' })).body).toEqual({ error: 'You already have an exercise called “landmine PRESS”.' });
    expect((await call('POST', '/api/own-exercises', pro, { ...landmine, name: 'Bad', primary: [] })).status).toBe(400);
    // Changed in place.
    const changed = await call('PATCH', `/api/own-exercises/${exercise.id}`, pro, { ...landmine, name: 'Landmine press (kneeling)', timed: false });
    expect(changed.body!.exercise).toMatchObject({ id: exercise.id, name: 'Landmine press (kneeling)' });
    // Someone else's is no business of yours.
    const other = await signUp(true);
    expect((await call('PATCH', `/api/own-exercises/${exercise.id}`, other, landmine)).status).toBe(404);
    expect((await call('DELETE', `/api/own-exercises/${exercise.id}`, other)).status).toBe(404);
    expect((await call('GET', '/api/own-exercises', other)).body).toEqual({ exercises: [] });
  });

  it('archives a deleted exercise: still listed for your history, no longer changeable, its name free again', async () => {
    const pro = await signUp(true);
    const { id } = (await call('POST', '/api/own-exercises', pro, landmine)).body!.exercise;
    expect((await call('DELETE', `/api/own-exercises/${id}`, pro)).status).toBe(204);
    const listed = (await call('GET', '/api/own-exercises', pro)).body!.exercises;
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id, name: 'Landmine press', archived: true });
    expect((await call('PATCH', `/api/own-exercises/${id}`, pro, landmine)).status).toBe(404);
    expect((await call('DELETE', `/api/own-exercises/${id}`, pro)).status).toBe(404);
    expect((await call('POST', '/api/own-exercises', pro, landmine)).status).toBe(201);
    // A workout logged with it keeps its id, as any other exercise's.
    const logged = await call('POST', '/api/training', pro, {
      name: 'Shoulders',
      unit: 'kg',
      startedAt: '2026-11-01T07:00:00.000Z',
      finishedAt: '2026-11-01T08:00:00.000Z',
      exercises: [{ exerciseId: id, sets: [{ weight: 30, reps: 10 }] }],
    });
    expect(logged.status).toBe(201);
  });

  it('keeps a split of your own, says what’s wrong with one it can’t, and changes and deletes it', async () => {
    const pro = await signUp(true);
    const made = await call('POST', '/api/splits', pro, split());
    expect(made.status).toBe(201);
    const kept = made.body!.split;
    expect(kept.days[0].items[0]).toEqual({ exerciseId: 'bench-press', sets: 4, reps: '6–8', restSeconds: 150 });
    expect((await call('POST', '/api/splits', pro, split('MY UPPER / LOWER'))).body).toEqual({ error: 'You already have a split called “MY UPPER / LOWER”.' });
    expect((await call('POST', '/api/splits', pro, { name: 'Broken', days: [{ name: 'Upper', items: [] }] })).body).toEqual({ error: 'Upper: add at least one exercise.' });
    const changed = await call('PATCH', `/api/splits/${kept.id}`, pro, { ...split('Upper / lower, heavy'), days: split().days.slice(0, 1) });
    expect(changed.body!.split).toMatchObject({ id: kept.id, name: 'Upper / lower, heavy', createdAt: kept.createdAt });
    expect(changed.body!.split.days).toHaveLength(1);
    expect((await call('GET', '/api/splits', pro)).body!.splits).toHaveLength(1);
    expect((await call('DELETE', `/api/splits/${kept.id}`, pro)).status).toBe(204);
    expect((await call('GET', '/api/splits', pro)).body!.splits).toEqual([]);
  });

  it('changes a saved workout in place on Pro, keeping its gym and day', async () => {
    const pro = await signUp(true);
    const plan = { muscles: [], goal: null, gymName: null, uncovered: [], items: [{ exerciseId: 'bench-press', sets: 3, reps: '8–10', restSeconds: 90, uses: [], confirmed: false }] };
    const saved = (await call('POST', '/api/workouts', pro, { name: 'Push', gymId: 'dohertys-gym-city', plan })).body!.workout;
    const changed = await call('PATCH', `/api/workouts/${saved.id}`, pro, { name: 'Push, heavy', plan: { ...plan, items: [...plan.items, { exerciseId: 'ohp', sets: 3, reps: '5', restSeconds: 150, uses: [], confirmed: false }] } });
    expect(changed.body!.workout).toMatchObject({ id: saved.id, name: 'Push, heavy', gymId: 'dohertys-gym-city', createdAt: saved.createdAt });
    expect(changed.body!.workout.plan.items).toHaveLength(2);
    expect((await call('GET', '/api/workouts', pro)).body!.workouts[0].name).toBe('Push, heavy');
    expect((await call('PATCH', `/api/workouts/${saved.id}`, pro, { name: '', plan })).status).toBe(400);
    const free = await signUp(false);
    expect((await call('PATCH', `/api/workouts/${saved.id}`, free, { name: 'Mine now', plan })).body).toMatchObject({ code: 'pro_required' });
    expect((await call('PATCH', `/api/workouts/${saved.id}`, await signUp(true), { name: 'Mine now', plan })).status).toBe(404);
  });

  it('puts both in Download my data', async () => {
    const pro = await signUp(true);
    await call('POST', '/api/own-exercises', pro, landmine);
    await call('POST', '/api/splits', pro, split());
    const data = (await call('GET', '/api/me/export', pro)).body!;
    expect(data.ownExercises.map((each: { name: string }) => each.name)).toEqual(['Landmine press']);
    expect(data.ownSplits.map((each: { name: string }) => each.name)).toEqual(['My upper / lower']);
  });
});
