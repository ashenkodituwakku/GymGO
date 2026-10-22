import { describe, expect, it } from 'vitest';
import { agoLabel, alternativesFor, daysAgo, fitsKit, freshMuscles, groupLabel, kitText, lastTrained, libraryGroups, matchesQuery, addableExercises, addedPlan } from './exerciseLibrary';
import type { TrainingSession } from './training';
import { EXERCISES } from './workout';

const byId = (id: string) => EXERCISES.find((exercise) => exercise.id === id)!;

const session = (finishedAt: string, ids: string[], sets = 1): TrainingSession => ({
  id: finishedAt,
  name: 'Workout',
  unit: 'kg',
  startedAt: finishedAt,
  finishedAt,
  workoutId: null,
  gymId: null,
  exercises: ids.map((exerciseId) => ({ exerciseId, sets: Array.from({ length: sets }, () => ({ weight: 20, reps: 8 })) })),
});

describe('exercise library', () => {
  it('finds by the start of any word in the name or a muscle it works', () => {
    expect(matchesQuery(byId('db-bench'), 'dumb bench')).toBe(true);
    expect(matchesQuery(byId('db-bench'), 'chest')).toBe(true);
    expect(matchesQuery(byId('db-bench'), 'tricep')).toBe(true);
    expect(matchesQuery(byId('db-bench'), 'squat')).toBe(false);
    expect(matchesQuery(byId('db-bench'), '')).toBe(true);
  });

  it('filters by kit: doable with only that kit, and using it', () => {
    expect(fitsKit(byId('push-up'), 'body')).toBe(true);
    expect(fitsKit(byId('push-up'), 'dumbbells')).toBe(false);
    expect(fitsKit(byId('db-bench'), 'dumbbells')).toBe(true);
    expect(fitsKit(byId('bench-press'), 'dumbbells')).toBe(false);
    expect(fitsKit(byId('bench-press'), 'barbell')).toBe(true);
    expect(fitsKit(byId('pulldown'), 'machines')).toBe(true);
    expect(fitsKit(byId('cable-fly'), 'cables')).toBe(true);
    for (const exercise of EXERCISES) expect(fitsKit(exercise, 'any')).toBe(true);
  });

  it('groups by main muscle in the body’s order, every exercise once', () => {
    const groups = libraryGroups({ query: '', muscle: null, kit: 'any' });
    expect(groups.flatMap((group) => group.exercises)).toHaveLength(EXERCISES.length);
    expect(groups[0]!.muscle).toBe('chest');
    // Every group has a name: the conditioning finishers, which work no muscle mainly, go last.
    for (const group of groups) expect(groupLabel(group.muscle)).toMatch(/^[A-Z]/);
    expect(groups.at(-1)!.muscle).toBe('conditioning');
  });

  it('picked by muscle: everything that works it, main movers first', () => {
    const [group] = libraryGroups({ query: '', muscle: 'triceps', kit: 'any' });
    expect(group!.muscle).toBe('triceps');
    expect(group!.exercises[0]!.primary).toContain('triceps');
    expect(group!.exercises.some((exercise) => exercise.id === 'bench-press')).toBe(true);
    const firstSecondary = group!.exercises.findIndex((exercise) => !exercise.primary.includes('triceps'));
    expect(group!.exercises.slice(firstSecondary).every((exercise) => !exercise.primary.includes('triceps'))).toBe(true);
  });

  it('says the kit in words, every way to do it', () => {
    expect(kitText(byId('push-up'))).toBe('Body weight');
    expect(kitText(byId('db-bench'))).toBe('Dumbbells + Bench');
    expect(kitText(byId('ohp'))).toBe('Barbell + Squat rack, or Barbell + Power rack');
  });

  it('offers swaps for the same main muscle, never itself', () => {
    const swaps = alternativesFor(byId('bench-press'));
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.length).toBeLessThanOrEqual(4);
    for (const swap of swaps) {
      expect(swap.id).not.toBe('bench-press');
      expect(swap.primary).toContain('chest');
    }
  });
});

describe('when you last trained each muscle', () => {
  const now = new Date('2026-10-17T09:00:00');
  const log = [session('2026-10-16T18:00:00', ['bench-press']), session('2026-10-10T18:00:00', ['back-squat', 'bench-press']), session('2026-10-15T18:00:00', ['pulldown'], 0)];

  it('takes the latest session with a set for each main muscle', () => {
    const last = lastTrained(log);
    expect(last.get('chest')).toBe('2026-10-16T18:00:00');
    expect(last.has('upper-back')).toBe(false); // no sets logged
    expect(last.has('triceps')).toBe(false); // only a secondary muscle of the bench press
  });

  it('counts calendar days and says them plainly', () => {
    expect(daysAgo('2026-10-17T06:00:00', now)).toBe(0);
    expect(daysAgo('2026-10-16T23:30:00', now)).toBe(1);
    expect(agoLabel(0)).toBe('Today');
    expect(agoLabel(1)).toBe('Yesterday');
    expect(agoLabel(5)).toBe('5 days ago');
    expect(agoLabel(21)).toBe('3 weeks ago');
  });

  it('picks the muscles not trained for two days or more, longest rested first', () => {
    const last = lastTrained(log);
    const fresh = freshMuscles(['chest', 'quadriceps', 'biceps'], last, now);
    expect(fresh).not.toContain('chest');
    expect(fresh[0]).toBe('biceps'); // never trained
    expect(fresh).toContain('quadriceps');
  });
});

describe('adding an exercise mid-workout', () => {
  it('finds by name or muscle, never one already in the workout', () => {
    const found = addableExercises('curl', ['db-curl']).map((exercise) => exercise.id);
    expect(found.length).toBeGreaterThan(0);
    expect(found).not.toContain('db-curl');
    expect(addableExercises('curl', []).map((exercise) => exercise.id)).toContain('db-curl');
  });

  it('with nothing typed, suggests moves for the muscles already trained first', () => {
    const suggested = addableExercises('', ['bench-press'], 3);
    expect(suggested).toHaveLength(3);
    expect(suggested.every((exercise) => exercise.primary.includes('chest') || exercise.secondary.includes('chest') || exercise.primary.includes('triceps'))).toBe(true);
    expect(suggested.map((exercise) => exercise.id)).not.toContain('bench-press');
  });

  it('plans an added exercise as the builder would, and a finisher once', () => {
    const bench = EXERCISES.find((exercise) => exercise.id === 'bench-press')!;
    expect(addedPlan(bench)).toEqual({ sets: 4, reps: '8–10', restSeconds: 90 });
    const rower = EXERCISES.find((exercise) => exercise.cardio)!;
    expect(addedPlan(rower)).toEqual({ sets: 1, reps: 'see cue', restSeconds: 0 });
  });
});
