import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { openDb, type Db } from './db';
import { DEFAULT_MODELS } from './gymPal';
import { MAX_NOTE_CHARS, NOTE_TASK, cleanCatalogue, cleanNote, cleanRequest, readWorkout, workoutTask, type CatalogueEntry } from './gymPalMax';

const CATALOGUE: CatalogueEntry[] = [
  { id: 'bench-press', name: 'Barbell bench press', measure: 'reps' },
  { id: 'db-row', name: 'Dumbbell row', measure: 'reps' },
  { id: 'plank', name: 'Plank', measure: 'time' },
  { id: 'farmer-carry', name: 'Farmer’s carry', measure: 'distance' },
];

describe('reading what the app sends', () => {
  it('keeps a request to one plain paragraph, and needs one', () => {
    expect(cleanRequest('  45 minutes,\n upper body <b>please</b>  ')).toBe('45 minutes, upper body b please /b');
    expect(() => cleanRequest('  ')).toThrow(/Say what you’d like/);
    expect(cleanRequest('x'.repeat(900))).toHaveLength(500);
  });

  it('keeps exercises with ids and names it can trust, each once', () => {
    const list = cleanCatalogue([
      { id: 'bench-press', name: 'Barbell bench press' },
      { id: 'bench-press', name: 'Again' },
      { id: '../etc', name: 'Sneaky' },
      { id: 'plank', name: 'Plank', measure: 'time' },
      { id: 'mine-3f9a', name: 'My cable fly', measure: 'nonsense' },
      { id: 'nameless' },
    ]);
    expect(list).toEqual([
      { id: 'bench-press', name: 'Barbell bench press', measure: 'reps' },
      { id: 'plank', name: 'Plank', measure: 'time' },
      { id: 'mine-3f9a', name: 'My cable fly', measure: 'reps' },
    ]);
    expect(() => cleanCatalogue('bench')).toThrow();
    expect(() => cleanCatalogue([])).toThrow();
  });

  it('tells GymPal the list, the shape and how timed and distance ones are counted', () => {
    const task = workoutTask(CATALOGUE);
    expect(task).toContain('JSON only');
    expect(task).toContain('bench-press | Barbell bench press');
    expect(task).toContain('plank | Plank (timed: reps as "30–45 s")');
    expect(task).toContain('farmer-carry | Farmer’s carry (distance: reps as "30–40 m")');
  });
});

describe('reading GymPal’s workout', () => {
  it('takes the JSON from inside an answer, keeping only exercises on the list with sensible numbers', () => {
    const answer = `Here you go!\n\`\`\`json\n${JSON.stringify({
      name: 'Upper body, 45 minutes, with a long name that goes on',
      note: 'Pressing first, then pulling, then the core.',
      items: [
        { id: 'bench-press', sets: 4, reps: '6-8', rest: 120 },
        { id: 'leg-press', sets: 3, reps: '10', rest: 90 },
        { id: 'db-row', sets: 3, reps: 10, rest: 9000 },
        { id: 'bench-press', sets: 3, reps: '8', rest: 60 },
        { id: 'plank', sets: 3, reps: '30–45 s' },
        { id: 'farmer-carry', sets: 9, reps: '40 m' },
      ],
    })}\n\`\`\``;
    expect(readWorkout(answer, CATALOGUE)).toEqual({
      name: 'Upper body, 45 minutes, with a long name',
      note: 'Pressing first, then pulling, then the core.',
      items: [
        { exerciseId: 'bench-press', sets: 4, reps: '6–8', restSeconds: 120 },
        { exerciseId: 'db-row', sets: 3, reps: '10', restSeconds: 300 },
        { exerciseId: 'plank', sets: 3, reps: '30–45 s', restSeconds: 90 },
      ],
    });
  });

  it('gives up on an answer with no usable workout', () => {
    expect(readWorkout('Sorry, I can’t help with that.', CATALOGUE)).toBeNull();
    expect(readWorkout('{"items": [{"id": "leg-press", "sets": 3, "reps": "10"}]}', CATALOGUE)).toBeNull();
    expect(readWorkout('{"items": [{"id": "bench-press", "sets": 3, "reps": "a lot"}]}', CATALOGUE)).toBeNull();
    expect(readWorkout('{not json}', CATALOGUE)).toBeNull();
  });

  it('names a workout that came without one', () => {
    expect(readWorkout('{"items": [{"id": "plank", "sets": 2, "reps": 40}]}', CATALOGUE)).toEqual({ name: 'GymPal’s workout', note: null, items: [{ exerciseId: 'plank', sets: 2, reps: '40 s', restSeconds: 90 }] });
  });
});

describe('the coach’s note', () => {
  it('is plain text of a sensible length', () => {
    expect(cleanNote('**Great work.** You added 2.5 kg.\n\n\nNext time: one more rep.')).toBe('Great work. You added 2.5 kg.\nNext time: one more rep.');
    expect(cleanNote('word '.repeat(400)).length).toBeLessThanOrEqual(MAX_NOTE_CHARS + 1);
    expect(() => cleanNote('   ')).toThrow();
    expect(NOTE_TASK).toContain('Never invent a number');
  });
});

describe('/api/gympal/workout and /api/gympal/note', () => {
  let server: Server;
  let base: string;
  let db: Db;
  const asked: any[] = [];
  // A stand-in for the models: a workout as JSON for a workout, a note for a note.
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    asked.push(body);
    const system = body.messages[0].content as string;
    const content = system.includes('Build one workout')
      ? JSON.stringify({ name: 'Push, 40 minutes', note: 'Heavy press first.', items: [{ id: 'bench-press', sets: 4, reps: '6–8', rest: 120 }, { id: 'smith-squat', sets: 3, reps: '8', rest: 90 }] })
      : 'Nice work: 62.5 kg for 8 is 2.5 kg up on last time. Next time, aim for a third set.';
    return new Response(JSON.stringify({ model: DEFAULT_MODELS[0], choices: [{ message: { role: 'assistant', content } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000, gymPal: { key: 'test-key', fetchImpl } }));
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
      headers: { ...(options.token ? { authorization: `Bearer ${options.token}` } : {}), ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  let people = 0;
  async function signUp(plan: 'free' | 'pro' | 'max') {
    people += 1;
    const result = await call('POST', '/api/auth/signup', {
      body: { email: `max${people}@example.com`, password: 'correct horse', displayName: `Tester ${people}`, birthMonth: '1990-01', acceptTerms: true },
    });
    if (plan !== 'free') {
      db.prepare(
        `insert into subscriptions (stripe_subscription_id, user_id, status, interval, currency, amount_minor, price_lookup_key, current_period_end, cancel_at, cancel_at_period_end, updated_at)
         values (?, ?, 'active', 'month', 'aud', ?, ?, '2099-01-01T00:00:00Z', null, 0, '2026-10-01T00:00:00Z')`,
      ).run(`sub_max_${people}`, result.body.account.id, plan === 'max' ? 999 : 399, plan === 'max' ? 'gymgo_max_month_aud' : 'gymgo_pro_month_aud');
    }
    return result.body.token as string;
  }

  const exercises = [
    { id: 'bench-press', name: 'Barbell bench press', measure: 'reps' },
    { id: 'db-row', name: 'Dumbbell row', measure: 'reps' },
  ];

  it('are for Max: Free and Pro are told so, and nothing is asked of the models', async () => {
    for (const plan of ['free', 'pro'] as const) {
      const token = await signUp(plan);
      const built = await call('POST', '/api/gympal/workout', { token, body: { request: 'Push day', exercises } });
      expect(built.status).toBe(403);
      expect(built.body.code).toBe('max_required');
      expect((await call('POST', '/api/gympal/note', { token, body: { sessionId: 'x' } })).body.code).toBe('max_required');
    }
    expect((await call('POST', '/api/gympal/workout', { body: { request: 'Push day', exercises } })).status).toBe(401);
    expect(asked).toHaveLength(0);
  });

  it('build a workout from the exercises the app offered, leaving out any it didn’t', async () => {
    const token = await signUp('max');
    const built = await call('POST', '/api/gympal/workout', { token, body: { request: '40 minutes of pushing', exercises } });
    expect(built.status).toBe(200);
    expect(built.body.workout).toEqual({ name: 'Push, 40 minutes', note: 'Heavy press first.', items: [{ exerciseId: 'bench-press', sets: 4, reps: '6–8', restSeconds: 120 }] });
    const sent = asked.at(-1);
    expect(sent.messages.at(-1)).toEqual({ role: 'user', content: '40 minutes of pushing' });
    expect(sent.messages[0].content).toContain('db-row | Dumbbell row');
    // No training log unless they said GymPal may see it.
    expect(sent.messages[0].content).not.toContain('Their own training log');
    expect((await call('POST', '/api/gympal/workout', { token, body: { request: '', exercises } })).status).toBe(400);
  });

  it('write a coach’s note on your own workout, beside the ones before it, never its gym or note', async () => {
    const token = await signUp('max');
    const log = async (name: string, weight: number, hoursAgo: number) => {
      const finished = new Date(Date.now() - hoursAgo * 3600_000);
      return call('POST', '/api/training', {
        token,
        body: {
          name,
          unit: 'kg',
          startedAt: new Date(finished.getTime() - 45 * 60_000).toISOString(),
          finishedAt: finished.toISOString(),
          gymId: 'melbourne-secret-gym',
          note: 'left knee a bit sore',
          exercises: [{ exerciseId: 'bench-press', sets: [{ weight, reps: 8 }] }],
        },
      });
    };
    await log('Push, last week', 60, 24 * 7);
    const latest = await log('Push today', 62.5, 1);
    const id = latest.body.session?.id ?? latest.body.id;
    const note = await call('POST', '/api/gympal/note', { token, body: { sessionId: id } });
    expect(note.status).toBe(200);
    expect(note.body.note).toContain('62.5 kg');
    const system = asked.at(-1).messages[0].content as string;
    expect(system).toContain('The workout they just finished');
    expect(system).toContain('Push today');
    expect(system).toContain('Push, last week');
    expect(system).not.toContain('knee');
    expect(system).not.toContain('melbourne-secret-gym');
    // Someone else's workout, or none, isn't theirs to ask about.
    const other = await signUp('max');
    expect((await call('POST', '/api/gympal/note', { token: other, body: { sessionId: id } })).status).toBe(404);
  });
});
