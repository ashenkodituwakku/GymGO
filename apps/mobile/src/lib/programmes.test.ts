import { describe, expect, it } from 'vitest';
import {
  PROGRAMME_DAYS,
  PROGRAMME_GOALS,
  dayPlan,
  isEasierWeek,
  nextProgrammeDay,
  programmeDayName,
  programmeDays,
  programmeProgress,
  programmeTarget,
  progressionRule,
  weekOf,
  type Programme,
} from './programmes';
import { readProgramme } from './programmeStore';
import { PROGRAMME_TITLES, upNext, workoutTitle } from './templates';
import type { TrainingSession } from './training';
import { EXERCISES } from './workout';

const programme = (over: Partial<Programme> = {}): Programme => ({ goal: 'strength', days: 3, weeks: 8, startedOn: '2026-11-02', swaps: {}, ...over });
const session = (name: string, finishedAt: string, exercises: TrainingSession['exercises'] = []): TrainingSession => ({
  id: `${name}-${finishedAt}`,
  name,
  unit: 'kg',
  startedAt: finishedAt,
  finishedAt,
  workoutId: null,
  gymId: null,
  exercises,
});

describe('plans', () => {
  it('has a plan for every goal and number of days, all with GymGO’s own exercises', () => {
    for (const goal of PROGRAMME_GOALS) {
      for (const perWeek of PROGRAMME_DAYS) {
        const plan = programmeDays(goal.id, perWeek);
        expect(plan.length).toBeGreaterThan(0);
        for (const day of plan) for (const each of day.items) expect(EXERCISES.some((exercise) => exercise.id === each.exerciseId), each.exerciseId).toBe(true);
      }
    }
  });

  it('names its workouts so the log can tell them apart, and Home’s template Up next isn’t thrown by them', () => {
    expect(PROGRAMME_TITLES).toEqual(PROGRAMME_GOALS.map((goal) => goal.title));
    const name = programmeDayName({ goal: 'muscle' }, { name: 'Upper A', items: [] });
    expect(name).toBe('Upper A · Muscle programme');
    expect(workoutTitle(name)).toEqual({ title: 'Upper A', plan: 'Muscle programme' });
    // A template workout, then a programme one: Up next is still the template's.
    const log = [session('5×5 A · 5×5 strength', '2026-11-01T10:00:00Z'), session(name, '2026-11-03T10:00:00Z')];
    expect(upNext(log)?.template.id).toBe('five-by-five');
  });
});

describe('weeks', () => {
  it('counts weeks from the day it started', () => {
    expect(weekOf(programme(), new Date(2026, 10, 2, 9))).toBe(1);
    expect(weekOf(programme(), new Date(2026, 10, 8, 23))).toBe(1);
    expect(weekOf(programme(), new Date(2026, 10, 9, 0, 30))).toBe(2);
    expect(weekOf(programme(), new Date(2026, 11, 28))).toBe(9);
  });

  it('makes every fourth week easier: half the sets, never under two', () => {
    expect([1, 2, 3, 4, 5, 8, 12].map(isEasierWeek)).toEqual([false, false, false, true, false, true, true]);
    const normal = dayPlan(programme(), 0, false);
    const easier = dayPlan(programme(), 0, true);
    expect(normal[0]).toMatchObject({ exerciseId: 'back-squat', sets: 5 });
    expect(easier[0]).toMatchObject({ exerciseId: 'back-squat', sets: 3 });
    // The deadlift's one set stays one.
    expect(dayPlan(programme(), 1, true).find((each) => each.exerciseId === 'deadlift')?.sets).toBe(1);
  });

  it('puts your swaps in', () => {
    expect(dayPlan(programme({ swaps: { 'back-squat': 'leg-press' } }), 0, false)[0]!.exerciseId).toBe('leg-press');
  });

  it('keeps supersets in a plan that has them', () => {
    const fitness = dayPlan(programme({ goal: 'fitness' }), 0, false);
    expect(fitness.filter((each) => each.group === 'A')).toHaveLength(2);
  });
});

describe('progress', () => {
  const p = programme();
  it('takes turns through the days, from its own workouts since it started', () => {
    expect(nextProgrammeDay(p, [])).toBe(0);
    const log = [session('5×5 A · Strength programme', '2026-11-02T18:00:00Z')];
    expect(nextProgrammeDay(p, log)).toBe(1);
    // One from before it started, or another plan's, doesn't count.
    expect(nextProgrammeDay(p, [session('5×5 A · Strength programme', '2026-10-01T18:00:00Z'), session('5×5 A · 5×5 strength', '2026-11-03T18:00:00Z')])).toBe(0);
  });

  it('says where you are: week, workouts this week, an easier week, finished', () => {
    const log = [
      session('5×5 A · Strength programme', '2026-11-03T08:00:00Z'),
      session('5×5 B · Strength programme', '2026-11-10T08:00:00Z'),
      session('5×5 A · Strength programme', '2026-11-12T08:00:00Z'),
    ];
    expect(programmeProgress(p, log, new Date(2026, 10, 13))).toMatchObject({ week: 2, doneThisWeek: 2, doneInAll: 3, easier: false, finished: false });
    expect(programmeProgress(p, log, new Date(2026, 10, 24))).toMatchObject({ week: 4, easier: true, doneThisWeek: 0 });
    expect(programmeProgress(p, log, new Date(2026, 11, 30))).toMatchObject({ week: 8, finished: true, easier: false });
  });

  it('counts only the workouts in its own weeks, not ones of the same name after it ended', () => {
    const later = [
      session('5×5 A · Strength programme', '2026-11-03T08:00:00Z'),
      // Long after its weeks were over.
      session('5×5 B · Strength programme', '2027-03-01T08:00:00Z'),
    ];
    expect(programmeProgress(p, later, new Date(2027, 2, 2))).toMatchObject({ finished: true, doneInAll: 1 });
  });
});

describe('targets', () => {
  const last = { sets: [{ weight: 60, reps: 5 }, { weight: 60, reps: 5 }], unit: 'kg' as const };
  it('adds weight when every set reached the top of its range, as a workout’s target does', () => {
    expect(programmeTarget(last, '5', 'kg', false)).toMatchObject({ weight: 62.5, reps: 5 });
  });

  it('goes about 10% lighter in an easier week, to a plate step', () => {
    expect(programmeTarget(last, '5', 'kg', true)).toMatchObject({ weight: 55, reps: 5 });
    expect(programmeTarget({ sets: [{ weight: 135, reps: 5 }], unit: 'lb' }, '5', 'lb', true)!.weight).toBe(120);
  });

  it('says the rule in words for everyone', () => {
    expect(progressionRule('kg')).toMatch(/add 2\.5\skg next time/);
    expect(progressionRule('lb')).toMatch(/add 5\slb next time/);
  });
});

describe('the stored programme', () => {
  it('reads back only a well-formed one', () => {
    expect(readProgramme(JSON.stringify(programme({ swaps: { 'back-squat': 'leg-press', bad: 3 as unknown as string } })))).toEqual(programme({ swaps: { 'back-squat': 'leg-press' } }));
    expect(readProgramme(JSON.stringify({ ...programme(), days: 5 }))).toBeNull();
    expect(readProgramme(JSON.stringify({ ...programme(), startedOn: 'yesterday' }))).toBeNull();
    expect(readProgramme('not json')).toBeNull();
    expect(readProgramme(null)).toBeNull();
  });
});
