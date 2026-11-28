import { describe, expect, it } from 'vitest';
import { exerciseTotals, stepWarmUps } from './training';
import { exerciseById, warmUpKit } from './workout';

describe('warm-ups for dumbbells and machines', () => {
  it('ramps to about half then three quarters, in dumbbell steps', () => {
    expect(stepWarmUps(30, 'kg', 'dumbbell')).toEqual([
      { weight: 15, reps: 8 },
      { weight: 22.5, reps: 4 },
    ]);
    expect(stepWarmUps(27, 'kg', 'dumbbell')).toEqual([
      { weight: 12.5, reps: 8 },
      { weight: 20, reps: 4 },
    ]);
    expect(stepWarmUps(60, 'lb', 'dumbbell')).toEqual([
      { weight: 30, reps: 8 },
      { weight: 45, reps: 4 },
    ]);
  });

  it('rounds a machine to its stack’s steps', () => {
    expect(stepWarmUps(62, 'kg', 'machine')).toEqual([
      { weight: 30, reps: 8 },
      { weight: 45, reps: 4 },
    ]);
  });

  it('gives a light weight one warm-up or none', () => {
    expect(stepWarmUps(5, 'kg', 'dumbbell')).toEqual([{ weight: 2.5, reps: 8 }]);
    expect(stepWarmUps(4, 'kg', 'dumbbell')).toEqual([{ weight: 2.5, reps: 4 }]);
    expect(stepWarmUps(2.5, 'kg', 'dumbbell')).toEqual([]);
    expect(stepWarmUps(0, 'kg', 'machine')).toEqual([]);
  });
});

describe('how an exercise warms up', () => {
  it('knows a barbell, dumbbells and a machine', () => {
    expect(warmUpKit(exerciseById('bench-press'))).toBe('barbell');
    expect(warmUpKit(exerciseById('goblet-squat'))).toBe('dumbbell');
    expect(warmUpKit(exerciseById('lat-pulldown') ?? exerciseById('cable-fly'))).toBe('machine');
  });

  it('has none for body weight, a bar to hang from, a hold or a carry', () => {
    expect(warmUpKit(exerciseById('push-up'))).toBeNull();
    expect(warmUpKit(exerciseById('pull-up'))).toBeNull();
    expect(warmUpKit(exerciseById('plank'))).toBeNull();
    expect(warmUpKit(exerciseById('farmer-carry'))).toBeNull();
    expect(warmUpKit(null)).toBeNull();
  });
});

describe('an exercise over your whole log', () => {
  const session = (id: string, finishedAt: string, sets: Array<{ weight: number | null; reps: number; kind?: 'warmup'; seconds?: number }>, unit: 'kg' | 'lb' = 'kg') => ({
    id,
    name: 'Push',
    unit,
    startedAt: finishedAt,
    finishedAt,
    workoutId: null,
    gymId: null,
    exercises: [{ exerciseId: 'bench-press', sets }],
  });

  it('adds up working sets, reps and weight, and knows when it was last done', () => {
    const totals = exerciseTotals(
      [
        session('a', '2026-11-01T10:00:00Z', [{ weight: 20, reps: 10, kind: 'warmup' }, { weight: 60, reps: 8 }, { weight: 60, reps: 6 }]),
        session('b', '2026-11-20T10:00:00Z', [{ weight: null, reps: 12 }]),
        { ...session('c', '2026-11-25T10:00:00Z', []), exercises: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] }] },
      ],
      'bench-press',
    );
    expect(totals).toEqual({ sets: 3, reps: 26, volumeKg: 840, last: '2026-11-20T10:00:00Z' });
  });

  it('is empty for one never done', () => {
    expect(exerciseTotals([], 'bench-press')).toEqual({ sets: 0, reps: 0, volumeKg: 0, last: null });
  });
});
