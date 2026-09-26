import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanTrainingSession, createApp } from './app';
import { openDb, type Db } from './db';

const NOW = new Date('2026-09-25T10:00:00Z');
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
async function signUp() {
  people += 1;
  const result = await call('POST', '/api/auth/signup', { body: { email: `lifter${people}@example.com`, password: 'correct horse', displayName: `Lifter ${people}` } });
  expect(result.status).toBe(201);
  return result.body!.token as string;
}

const push = {
  name: 'Push',
  unit: 'lb',
  startedAt: '2026-09-25T08:00:00Z',
  finishedAt: '2026-09-25T09:02:00Z',
  workoutId: null,
  gymId: 'equinox-new-york',
  exercises: [
    { exerciseId: 'bench-press', sets: [{ weight: 135, reps: 10 }, { weight: 135, reps: 9 }, { weight: 135, reps: 0 }] },
    { exerciseId: 'push-up', sets: [{ weight: null, reps: 20 }] },
  ],
};

describe('the training log', () => {
  it('needs an account, and is free: no Pro asked', async () => {
    expect((await call('GET', '/api/training')).status).toBe(401);
    const token = await signUp();
    const logged = await call('POST', '/api/training', { token, body: push });
    expect(logged.status).toBe(201);
    expect(logged.body!.session).toMatchObject({ name: 'Push', unit: 'lb', gymId: 'equinox-new-york', finishedAt: '2026-09-25T09:02:00.000Z' });
    const list = await call('GET', '/api/training', { token });
    expect(list.body!.sessions).toHaveLength(1);
    // Body weight stays null, not zero; a set not done stays 0 reps.
    expect(list.body!.sessions[0].exercises[1].sets[0]).toEqual({ weight: null, reps: 20 });
    expect(list.body!.sessions[0].exercises[0].sets[2]).toEqual({ weight: 135, reps: 0 });
  });

  it('keeps each person’s sessions to themselves', async () => {
    const mine = await signUp();
    const theirs = await signUp();
    const logged = await call('POST', '/api/training', { token: mine, body: push });
    expect((await call('GET', '/api/training', { token: theirs })).body!.sessions).toHaveLength(0);
    expect((await call('DELETE', `/api/training/${logged.body!.session.id}`, { token: theirs })).status).toBe(404);
    expect((await call('DELETE', `/api/training/${logged.body!.session.id}`, { token: mine })).status).toBe(204);
    expect((await call('GET', '/api/training', { token: mine })).body!.sessions).toHaveLength(0);
  });

  it('is in Download my data, and goes when the account does', async () => {
    const token = await signUp();
    await call('POST', '/api/training', { token, body: push });
    const exported = await call('GET', '/api/me/export', { token });
    expect(exported.body!.trainingSessions).toHaveLength(1);
    expect(exported.body!.trainingSessions[0].exercises[0].exerciseId).toBe('bench-press');
    expect((await call('DELETE', '/api/me', { token })).status).toBe(204);
    expect((db.prepare('select count(*) as n from training_sessions where gym_id = ?').get('equinox-new-york') as { n: number }).n).toBeGreaterThan(0);
    const left = db.prepare('select count(*) as n from training_sessions t left join users u on u.id = t.user_id where u.id is null').get() as { n: number };
    expect(left.n).toBe(0);
  });
});

describe('what a session may hold', () => {
  const clean = (patch: Record<string, unknown>) => cleanTrainingSession({ ...push, ...patch }, NOW);

  it('refuses a weight of zero or less: blank is body weight, sent as null', () => {
    expect(() => clean({ exercises: [{ exerciseId: 'squat', sets: [{ weight: 0, reps: 5 }] }] })).toThrow();
    expect(() => clean({ exercises: [{ exerciseId: 'squat', sets: [{ weight: -20, reps: 5 }] }] })).toThrow();
    expect(clean({ exercises: [{ exerciseId: 'squat', sets: [{ weight: 102.456, reps: 5 }] }] }).exercises[0]!.sets[0]!.weight).toBe(102.46);
  });

  it('refuses half reps, unknown units and odd exercise ids', () => {
    expect(() => clean({ exercises: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 2.5 }] }] })).toThrow();
    expect(() => clean({ unit: 'stone' })).toThrow();
    expect(() => clean({ exercises: [{ exerciseId: '<script>', sets: [{ weight: 100, reps: 5 }] }] })).toThrow();
  });

  it('needs at least one set done, and times that make sense', () => {
    expect(() => clean({ exercises: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 0 }] }] })).toThrow(/at least one set/);
    expect(() => clean({ finishedAt: '2026-09-25T12:00:00Z' })).toThrow(/future/);
    expect(() => clean({ startedAt: '2026-09-25T09:30:00Z' })).toThrow();
    expect(() => clean({ startedAt: '2026-09-23T08:00:00Z' })).toThrow(/up to a day/);
  });
});
