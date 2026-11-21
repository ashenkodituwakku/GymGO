import { describe, expect, it } from 'vitest';
import { changeWord, monthKeyOf, monthReport, monthShareText, monthsWithTraining, reportMonth, shiftMonth, timeChangeWord } from './monthReport';
import type { LoggedSet, TrainingSession } from './training';

let next = 0;
const workout = (finishedAt: string, minutes: number, exercises: Record<string, LoggedSet[]>, name = 'Push'): TrainingSession => {
  next += 1;
  return {
    id: `w${next}`,
    name,
    unit: 'kg',
    startedAt: new Date(Date.parse(finishedAt) - minutes * 60_000).toISOString(),
    finishedAt,
    workoutId: null,
    gymId: null,
    exercises: Object.entries(exercises).map(([exerciseId, sets]) => ({ exerciseId, sets })),
  };
};
// Local times, so the month is the same on any machine's clock.
const at = (year: number, month: number, day: number, hour = 9) => new Date(year, month - 1, day, hour).toISOString();

const september = [workout(at(2026, 9, 20), 40, { 'bench-press': [{ weight: 90, reps: 5 }, { weight: 90, reps: 5 }] })];
const october = [
  workout(at(2026, 10, 2), 50, { 'bench-press': [{ weight: 60, reps: 10, kind: 'warmup' }, { weight: 95, reps: 5 }, { weight: 95, reps: 5 }], 'back-squat': [{ weight: 100, reps: 5 }] }, 'Day A'),
  workout(at(2026, 10, 2, 18), 30, { 'push-up': [{ weight: null, reps: 20 }, { weight: null, reps: 15 }] }, 'Evening'),
  workout(at(2026, 10, 9), 60, { 'bench-press': [{ weight: 100, reps: 3 }], 'back-squat': [{ weight: 110, reps: 5 }, { weight: 110, reps: 5 }] }, 'Day B'),
];
const log = [...september, ...october, workout(at(2026, 11, 1), 45, { 'back-squat': [{ weight: 100, reps: 5 }] })];

describe('months', () => {
  it('keys, shifts and lists the months you trained in', () => {
    expect(monthKeyOf(at(2026, 10, 31, 23))).toBe('2026-10');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthsWithTraining(log)).toEqual(['2026-11', '2026-10', '2026-09']);
  });

  it('opens on the last finished month, or this one while it’s the only one', () => {
    expect(reportMonth(log, new Date(2026, 10, 3))).toBe('2026-10');
    expect(reportMonth([log[log.length - 1]!], new Date(2026, 10, 3))).toBe('2026-11');
    expect(reportMonth([], new Date(2026, 10, 3))).toBeNull();
  });
});

describe('a month’s report', () => {
  const report = monthReport(log, '2026-10');

  it('adds up the month and the one before, warm-ups aside', () => {
    expect(report.totals).toEqual({ workouts: 3, days: 2, minutes: 140, sets: 8, volumeKg: 950 + 500 + 300 + 1100, reps: 10 + 5 + 20 + 15 + 3 + 10 });
    expect(report.before).toMatchObject({ workouts: 1, sets: 2, volumeKg: 900 });
  });

  it('lists the records broken, the most-done exercises and the biggest workout', () => {
    expect(report.records.map((record) => `${record.exerciseId}:${record.kind}`)).toEqual(['bench-press:heaviest', 'bench-press:heaviest', 'back-squat:heaviest']);
    expect(report.topExercises.map((item) => `${item.exerciseId}:${item.sets}`)).toEqual(['back-squat:3', 'bench-press:3', 'push-up:2']);
    expect(report.biggest).toMatchObject({ name: 'Day A', volumeKg: 1450 });
  });

  it('counts sets for each muscle against the month before', () => {
    const chest = report.muscles.find((entry) => entry.muscle === 'chest');
    // Bench 3 + push-ups 2 this month; bench 2 in September.
    expect(chest).toMatchObject({ sets: 5, before: 2 });
    expect(report.muscles[0]!.sets).toBeGreaterThanOrEqual(report.muscles[1]!.sets);
  });

  it('says the change, and shares totals only', () => {
    expect(changeWord(3, 1)).toBe('+2');
    expect(changeWord(1, 3)).toBe('−2');
    expect(changeWord(2.4, 2)).toBe('same');
    const text = monthShareText(report, 'October 2026', '2,850 kg');
    expect(text).toBe('October 2026 on GymGO\n3 workouts · 2 h 20 min · 8 sets · 2,850 kg lifted\n3 personal records\nMost done: Barbell back squat');
  });

  it('says a change in time in hours and minutes, as the Time tile says the total', () => {
    expect(timeChangeWord(375, 0)).toBe('+6 h 15 min');
    expect(timeChangeWord(60, 180)).toBe('−2 h');
    expect(timeChangeWord(100, 140)).toBe('−40 min');
    expect(timeChangeWord(90.4, 90)).toBe('same');
  });
});
