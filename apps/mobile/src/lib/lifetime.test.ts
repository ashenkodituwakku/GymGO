import { describe, expect, it } from 'vitest';
import { heavyAs, lifetimeStats } from './lifetime';
import type { LoggedExercise, TrainingSession } from './training';

let next = 0;
// Local times, so the weekday and hour are the ones written here wherever the test runs.
const session = (start: Date, minutes: number, exercises: LoggedExercise[], name = 'Push'): TrainingSession => ({
  id: `s${(next += 1)}`,
  name,
  unit: 'kg',
  startedAt: start.toISOString(),
  finishedAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
  workoutId: null,
  gymId: null,
  exercises,
});
const bench = (weight: number, reps: number): LoggedExercise => ({ exerciseId: 'bench-press', sets: [{ weight, reps }, { weight, reps }] });

describe('lifetimeStats', () => {
  it('adds up every workout: time, sets, reps and weight, and the biggest', () => {
    // Mondays 13 and 20 May 2024 at 7 am, and Wednesday the 15th at 6 pm.
    const log = [
      session(new Date(2024, 4, 13, 7), 50, [bench(60, 8)]),
      session(new Date(2024, 4, 15, 18), 40, [bench(70, 5), { exerciseId: 'back-squat', sets: [{ weight: 100, reps: 5 }] }], 'Legs'),
      session(new Date(2024, 4, 20, 7), 60, [bench(62.5, 8), { exerciseId: 'push-up', sets: [{ weight: null, reps: 15 }] }]),
    ];
    const life = lifetimeStats(log)!;
    expect(life.workouts).toBe(3);
    expect(life.minutes).toBe(150);
    expect(life.sets).toBe(2 + 3 + 3);
    expect(life.reps).toBe(16 + 10 + 5 + 16 + 15);
    expect(life.volumeKg).toBe(960 + 700 + 500 + 1000);
    expect(life.biggest).toMatchObject({ name: 'Legs', volumeKg: 1200 });
    expect(life.favourite).toEqual({ exerciseId: 'bench-press', workouts: 3 });
    expect(life.busiestDay).toEqual({ weekday: 0, workouts: 2 });
    expect(life.timeOfDay).toBe('early');
    expect(life.since).toBe(log[0]!.finishedAt);
  });

  it('counts a workout left running as four hours, names no busiest day in a tie, and has nothing for an empty log', () => {
    const log = [session(new Date(2024, 4, 13, 12), 600, [bench(60, 8)]), session(new Date(2024, 4, 14, 12), 30, [bench(60, 8)])];
    const life = lifetimeStats(log)!;
    expect(life.minutes).toBe(240 + 30);
    expect(life.busiestDay).toBeNull();
    expect(life.timeOfDay).toBe('anytime');
    expect(lifetimeStats([])).toBeNull();
  });
});

describe('heavyAs', () => {
  it('compares a total with the biggest round figure it reaches', () => {
    expect(heavyAs(4800)!.words).toBe('3.2 family cars');
    expect(heavyAs(12_000)!.words).toBe('1 double-decker bus');
    expect(heavyAs(2_600_000)!.words).toBe('20 blue whales');
    expect(heavyAs(399)).toBeNull();
  });

  it('names one of each with the right article', () => {
    expect(heavyAs(5_000)!.thing.a).toBe('an elephant');
    expect(heavyAs(1_500)!.thing.a).toBe('a family car');
  });
});
