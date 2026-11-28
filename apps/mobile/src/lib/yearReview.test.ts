import { describe, expect, it } from 'vitest';
import type { TrainingSession } from './training';
import { yearReview, yearShareText } from './yearReview';

let n = 0;
const session = (started: Date, weight: number, gymName: string | null = null, exerciseId = 'bench-press'): TrainingSession => {
  n += 1;
  return {
    id: `s${n}`,
    name: `Workout ${n}`,
    unit: 'kg',
    startedAt: started.toISOString(),
    finishedAt: new Date(started.getTime() + 60 * 60_000).toISOString(),
    workoutId: null,
    gymId: gymName ? gymName.toLowerCase() : null,
    ...(gymName ? { gymName } : {}),
    exercises: [{ exerciseId, sets: [{ weight: 40, reps: 10, kind: 'warmup' as const }, { weight, reps: 5 }, { weight, reps: 5 }] }],
  } as TrainingSession;
};

describe('yearReview', () => {
  const log = [
    session(new Date(2025, 11, 29, 9), 60, 'Older Gym'), // last year: counts for records only
    session(new Date(2026, 0, 5, 9), 70, 'Doherty’s Gym'), // Mon 5 Jan: a record
    session(new Date(2026, 0, 12, 9), 72.5, 'Doherty’s Gym'), // the next week: a record
    session(new Date(2026, 0, 19, 9), 70, 'Snap Fitness'), // the week after
    session(new Date(2026, 0, 21, 18), 70, null, 'back-squat'),
    session(new Date(2026, 2, 2, 9), 80, 'Doherty’s Gym'), // March: a record
    session(new Date(2026, 9, 14, 7), 65, null),
  ];
  const review = yearReview(log, 2026);

  it('adds up the year, leaving last year and warm-ups out', () => {
    expect(review.totals.workouts).toBe(6);
    expect(review.totals.days).toBe(6);
    expect(review.totals.sets).toBe(12);
    expect(review.totals.minutes).toBe(360);
  });

  it('has each month, and the best of them', () => {
    expect(review.months.map((m) => m.workouts)).toEqual([4, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
    expect(review.months[0]).toMatchObject({ key: '2026-01', label: 'January' });
    expect(review.bestMonth).toMatchObject({ key: '2026-01', label: 'January', workouts: 4 });
  });

  it('finds the longest run of weeks, within the year', () => {
    // 29 Dec 2025's week isn't this year's; 5, 12 and 19 Jan are three in a row.
    expect(review.longestRun).toBe(3);
  });

  it('counts records against everything before, and names the favourite gym and top lifts', () => {
    expect(review.records).toBeGreaterThanOrEqual(3);
    expect(review.favouriteGym).toEqual({ name: 'Doherty’s Gym', visits: 3 });
    expect(review.topExercises[0]).toMatchObject({ exerciseId: 'bench-press', sets: 10 });
    expect(review.topMuscle?.label).toBe('Chest');
    expect(review.biggest).toMatchObject({ volumeKg: 800 });
  });

  it('is empty for a year with nothing in it', () => {
    const empty = yearReview(log, 2024);
    expect(empty.totals.workouts).toBe(0);
    expect(empty.bestMonth).toBeNull();
    expect(empty.longestRun).toBe(0);
    expect(empty.favouriteGym).toBeNull();
    expect(empty.biggest).toBeNull();
  });

  it('shares totals only, never where you trained', () => {
    const text = yearShareText(review, '4,325 kg');
    expect(text).toContain('My 2026 in GymGO');
    expect(text).toContain('6 workouts on 6 days');
    expect(text).toContain('3 weeks in a row at best');
    expect(text).not.toContain('Doherty');
  });
});
