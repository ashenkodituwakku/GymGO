import { describe, expect, it } from 'vitest';
import {
  clockLabel,
  draftToLogged,
  durationLabel,
  e1rmSeries,
  formatWeight,
  lastTime,
  nextTarget,
  oneRepMax,
  parseReps,
  parseWeight,
  personalRecords,
  plateLoad,
  recordsBroken,
  repRange,
  sessionsThisWeek,
  setsSummary,
  unitFor,
  volumeKg,
  weekStreak,
  type LoggedSet,
  type TrainingSession,
  type WeightUnit,
} from './training';

let next = 0;
function session(finishedAt: string, exercises: Record<string, Array<[number | null, number]>>, unit: WeightUnit = 'kg'): TrainingSession {
  next += 1;
  return {
    id: `s${next}`,
    name: 'Push',
    unit,
    startedAt: finishedAt,
    finishedAt,
    workoutId: null,
    gymId: null,
    exercises: Object.entries(exercises).map(([exerciseId, sets]) => ({ exerciseId, sets: sets.map(([weight, reps]) => ({ weight, reps })) })),
  };
}

describe('units', () => {
  it('uses pounds in the US and kilograms elsewhere', () => {
    expect(unitFor('US')).toBe('lb');
    expect(unitFor('AU')).toBe('kg');
    expect(unitFor('GB')).toBe('kg');
    expect(unitFor(null)).toBe('kg');
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg');
    expect(formatWeight(135, 'lb')).toBe('135 lb');
  });
});

describe('strength', () => {
  it('estimates a one-rep max from low-rep sets only', () => {
    expect(oneRepMax(100, 1)).toBe(100);
    expect(oneRepMax(100, 5)).toBeCloseTo(116.67, 2);
    expect(oneRepMax(100, 15)).toBeNull();
    expect(oneRepMax(0, 5)).toBeNull();
  });

  it('keeps the heaviest lift, the best estimate and body-weight reps apart', () => {
    const records = personalRecords([
      session('2026-09-01T10:00:00Z', { 'bench-press': [[80, 5], [85, 2]], 'push-up': [[null, 20]] }),
      session('2026-09-08T10:00:00Z', { 'bench-press': [[82.5, 5]], 'push-up': [[null, 25]] }),
    ]);
    const bench = records.get('bench-press')!;
    expect(bench.heaviestSet).toMatchObject({ weight: 85, reps: 2 });
    expect(bench.e1rmSet).toMatchObject({ weight: 82.5, reps: 5 });
    expect(bench.sessions).toBe(2);
    expect(records.get('push-up')!.mostReps).toBe(25);
    expect(records.get('push-up')!.heaviestKg).toBeNull();
  });

  it('compares pounds and kilograms as the same weight', () => {
    const records = personalRecords([session('2026-09-01T10:00:00Z', { deadlift: [[140, 3]] }), session('2026-09-02T10:00:00Z', { deadlift: [[315, 3]] }, 'lb')]);
    // 315 lb is 142.9 kg: heavier.
    expect(records.get('deadlift')!.heaviestSet).toMatchObject({ weight: 315, unit: 'lb' });
  });

  it('counts a record only when it beats what came before', () => {
    const first = session('2026-09-01T10:00:00Z', { squat: [[100, 5]] });
    expect(recordsBroken(first, [])).toEqual([]);
    const better = session('2026-09-08T10:00:00Z', { squat: [[105, 5]], lunge: [[20, 10]] });
    expect(recordsBroken(better, [first])).toEqual([{ exerciseId: 'squat', kind: 'heaviest' }]);
    const moreReps = session('2026-09-15T10:00:00Z', { squat: [[105, 7]] });
    expect(recordsBroken(moreReps, [first, better])).toEqual([{ exerciseId: 'squat', kind: 'e1rm' }]);
    const same = session('2026-09-22T10:00:00Z', { squat: [[100, 5]] });
    expect(recordsBroken(same, [first, better, moreReps])).toEqual([]);
  });
});

describe('last time and next time', () => {
  const history = [
    session('2026-09-01T10:00:00Z', { 'bench-press': [[60, 10], [60, 10], [60, 9]] }),
    session('2026-09-08T10:00:00Z', { 'db-curl': [[12, 12]] }),
  ];

  it('finds the last session that had the exercise, and says it briefly', () => {
    const last = lastTime(history, 'bench-press')!;
    expect(setsSummary(last.sets, last.unit)).toBe('60 kg × 10, 10, 9');
    expect(lastTime(history, 'squat')).toBeNull();
    expect(setsSummary([{ weight: 60, reps: 10 }, { weight: 62.5, reps: 8 }], 'kg')).toBe('60 kg × 10 · 62.5 kg × 8');
    expect(setsSummary([{ weight: null, reps: 12 }], 'kg')).toBe('× 12');
  });

  it('reads rep ranges, and leaves timed work alone', () => {
    expect(repRange('8–10')).toEqual({ low: 8, high: 10 });
    expect(repRange('5')).toEqual({ low: 5, high: 5 });
    expect(repRange('30–45 s')).toBeNull();
    expect(repRange('see cue')).toBeNull();
  });

  it('keeps the weight until every set reaches the top of the range', () => {
    const last = lastTime(history, 'bench-press')!;
    expect(nextTarget(last, '8–10', 'kg')).toMatchObject({ weight: 60, reps: 10 });
  });

  it('then adds the smallest jump and goes back to the bottom', () => {
    const all: LoggedSet[] = [{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }];
    expect(nextTarget({ sets: all, unit: 'kg' }, '8–10', 'kg')).toMatchObject({ weight: 62.5, reps: 8 });
    expect(nextTarget({ sets: [{ weight: 135, reps: 5 }], unit: 'lb' }, '5', 'lb')).toMatchObject({ weight: 140, reps: 5 });
  });

  it('asks for one more rep on body-weight work, and nothing for timed work', () => {
    expect(nextTarget({ sets: [{ weight: null, reps: 15 }, { weight: null, reps: 12 }], unit: 'kg' }, '10–15', 'kg')).toMatchObject({ weight: null, reps: 16 });
    expect(nextTarget({ sets: [{ weight: null, reps: 1 }], unit: 'kg' }, '30–45 s', 'kg')).toBeNull();
    expect(nextTarget(null, '8–10', 'kg')).toBeNull();
  });

  it('converts when you switch units', () => {
    const target = nextTarget({ sets: [{ weight: 100, reps: 5 }], unit: 'kg' }, '5', 'lb')!;
    expect(target.weight).toBe(225.5); // 220.5 lb, plus 5
  });
});

describe('plates', () => {
  it('loads a bar per side, heaviest first', () => {
    expect(plateLoad(100, 'kg')).toEqual({ bar: 20, perSide: [25, 15], total: 100, short: 0 });
    expect(plateLoad(225, 'lb')).toEqual({ bar: 45, perSide: [45, 45], total: 225, short: 0 });
    expect(plateLoad(62.5, 'kg').perSide).toEqual([20, 1.25]);
  });

  it('says when the plates can’t make it exactly', () => {
    expect(plateLoad(101, 'kg')).toMatchObject({ total: 100, short: 1 });
    expect(plateLoad(15, 'kg')).toMatchObject({ perSide: [], total: 20, short: 0 });
  });
});

describe('over time', () => {
  it('adds up what was lifted, leaving body weight out', () => {
    expect(volumeKg(session('2026-09-01T10:00:00Z', { squat: [[100, 5], [100, 5]], 'push-up': [[null, 20]] }))).toBe(1000);
  });

  it('draws one point per session: its best estimate', () => {
    const series = e1rmSeries(
      [session('2026-09-08T10:00:00Z', { squat: [[105, 5]] }), session('2026-09-01T10:00:00Z', { squat: [[100, 5], [90, 8]] }), session('2026-09-04T10:00:00Z', { lunge: [[20, 10]] })],
      'squat',
    );
    expect(series.map((point) => point.date)).toEqual(['2026-09-01T10:00:00Z', '2026-09-08T10:00:00Z']);
    expect(series[0]!.kg).toBeCloseTo(116.67, 2);
  });

  it('counts weeks in a row, without losing the streak on a Monday morning', () => {
    const wednesday = new Date(2026, 8, 23, 12); // Wed 23 Sep 2026
    const at = (y: number, m: number, d: number) => session(new Date(y, m, d, 18).toISOString(), { squat: [[100, 5]] });
    const sessions = [at(2026, 8, 21), at(2026, 8, 16), at(2026, 8, 8), at(2026, 7, 25)];
    expect(weekStreak(sessions, wednesday)).toBe(3); // this week, last week, the week before; then a gap
    const nextMonday = new Date(2026, 8, 28, 7);
    expect(weekStreak(sessions, nextMonday)).toBe(3);
    expect(weekStreak(sessions, new Date(2026, 9, 6))).toBe(0);
    expect(sessionsThisWeek(sessions, wednesday)).toBe(1);
  });

  it('says how long, briefly', () => {
    expect(durationLabel(48 * 60_000)).toBe('48 min');
    expect(durationLabel(65 * 60_000)).toBe('1 h 5 min');
    expect(clockLabel(90)).toBe('1:30');
    expect(clockLabel(4.2)).toBe('0:05');
  });
});

describe('a session in progress', () => {
  it('reads what was typed, forgivingly but never guessing', () => {
    expect(parseWeight('62.5')).toBe(62.5);
    expect(parseWeight('62,5')).toBe(62.5);
    expect(parseWeight('  ')).toBeNull();
    expect(parseWeight('0')).toBeNull();
    expect(parseWeight('abc')).toBeUndefined();
    expect(parseWeight('-5')).toBeUndefined();
    expect(parseReps('8')).toBe(8);
    expect(parseReps('8.5')).toBeUndefined();
    expect(parseReps('')).toBeUndefined();
  });

  it('keeps only the sets you ticked', () => {
    expect(
      draftToLogged([
        { exerciseId: 'squat', sets: [{ weight: '100', reps: '5', done: true }, { weight: '100', reps: '5', done: false }, { weight: 'x', reps: '5', done: true }] },
        { exerciseId: 'push-up', sets: [{ weight: '', reps: '20', done: true }] },
        { exerciseId: 'plank', sets: [{ weight: '', reps: '', done: false }] },
      ]),
    ).toEqual([
      { exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] },
      { exerciseId: 'push-up', sets: [{ weight: null, reps: 20 }] },
    ]);
  });
});
