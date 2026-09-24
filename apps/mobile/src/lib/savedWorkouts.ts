/**
 * Saved workouts, read back into the builder's own shapes. An exercise GymGO
 * no longer has is left out, and counted, rather than shown as something else.
 */

import type { SavedWorkoutPlan } from './api';
import { EXERCISES, type Kit, type Muscle, type Workout } from './workout';

export function workoutFromSaved(plan: SavedWorkoutPlan): { workout: Workout; missing: number } {
  const items = plan.items.flatMap((item) => {
    const exercise = EXERCISES.find((candidate) => candidate.id === item.exerciseId);
    if (!exercise) return [];
    return [{ exercise, sets: item.sets, reps: item.reps, restSeconds: item.restSeconds, uses: item.uses as Kit[], confirmed: item.confirmed }];
  });
  return { workout: { items, uncovered: plan.uncovered as Muscle[] }, missing: plan.items.length - items.length };
}
