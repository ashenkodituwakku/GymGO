/**
 * Saved workouts, read back into the builder's own shapes. An exercise GymGO
 * no longer has is left out, and counted, rather than shown as something else.
 */

import { startSession } from './activeSession';
import type { SavedWorkout, SavedWorkoutPlan } from './api';
import type { WeightUnit } from './training';
import { EXERCISES, type Kit, type Muscle, type Workout } from './workout';

export function workoutFromSaved(plan: SavedWorkoutPlan): { workout: Workout; missing: number } {
  const items = plan.items.flatMap((item) => {
    const exercise = EXERCISES.find((candidate) => candidate.id === item.exerciseId);
    if (!exercise) return [];
    return [{ exercise, sets: item.sets, reps: item.reps, restSeconds: item.restSeconds, uses: item.uses as Kit[], confirmed: item.confirmed }];
  });
  return { workout: { items, uncovered: plan.uncovered as Muscle[] }, missing: plan.items.length - items.length };
}

/** Starts a saved workout as the one in progress. */
export function startSavedWorkout(saved: SavedWorkout, unit: WeightUnit): void {
  const { workout } = workoutFromSaved(saved.plan);
  startSession({
    name: saved.name,
    workoutId: saved.id,
    gymId: saved.gymId,
    gymName: saved.plan.gymName,
    unit,
    items: workout.items.map((item) => ({ exerciseId: item.exercise.id, sets: item.sets, reps: item.reps, restSeconds: item.restSeconds })),
  });
}

/**
 * What makes two plans the same: the gym, and each exercise with its sets,
 * reps and rest. The builder uses it so Save doesn't keep a second copy.
 */
export function planSignature(gymId: string | null, items: ReadonlyArray<{ exerciseId: string; sets: number; reps: string; restSeconds: number }>): string {
  return `${gymId ?? ''}|${items.map((item) => `${item.exerciseId}:${item.sets}:${item.reps}:${item.restSeconds}`).join(',')}`;
}

/** A saved name ends with its gym ("Legs · Equinox"); the line under it names the gym, so the title needn't. */
export function libraryTitle(name: string, gymName: string | null | undefined): string {
  const suffix = gymName ? ` · ${gymName}` : null;
  return suffix && name.endsWith(suffix) && name.length > suffix.length ? name.slice(0, -suffix.length) : name;
}

const GOAL_SHORT: Record<string, string> = { strength: 'Strength', muscle: 'Muscle', endurance: 'Endurance' };

/**
 * The line under each saved workout: its goal, size, gym and day. Two with
 * the same title saved the same day also get the time, to tell them apart.
 */
export function libraryDetails(workouts: SavedWorkout[], locale?: string): Map<string, string> {
  const day = (workout: SavedWorkout) => new Date(workout.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const seen = new Map<string, number>();
  for (const workout of workouts) {
    const key = `${libraryTitle(workout.name, workout.plan.gymName)}|${day(workout)}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const lines = new Map<string, string>();
  for (const workout of workouts) {
    const count = workout.plan.items.length;
    const twin = (seen.get(`${libraryTitle(workout.name, workout.plan.gymName)}|${day(workout)}`) ?? 0) > 1;
    const when = twin
      ? // The time kept on one line ("5:07 PM", not "5:07" then "PM").
        `${day(workout)}, ${new Date(workout.createdAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '\u00a0')}`
      : day(workout);
    lines.set(
      workout.id,
      [workout.plan.goal ? GOAL_SHORT[workout.plan.goal] : null, `${count} exercise${count === 1 ? '' : 's'}`, workout.plan.gymName, when].filter(Boolean).join(' · '),
    );
  }
  return lines;
}
