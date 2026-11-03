/**
 * Editing a plan of your own, a workout or a day of a split
 * (components/PlanEditor.tsx): adding, moving and removing exercises,
 * their sets, reps and rest, and supersets, kept tidy as you go. What's
 * kept is checked by the same rules the server uses (@gymgo/domain
 * cleanPlanItems).
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { cleanPlanItems, cleanReps, type SplitItem } from '@gymgo/domain';
import { addedPlan } from './exerciseLibrary';
import { tidyGroups } from './supersets';
import type { Exercise } from './workout';

export type PlanItem = SplitItem;

/** Rests to pick from: none, or 30 seconds to 5 minutes. */
export const PLAN_RESTS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300] as const;

/** An exercise as it joins a plan: the builder's usual sets, reps and rest for it. */
export function planItemFor(exercise: Exercise): PlanItem {
  const { sets, reps, restSeconds } = addedPlan(exercise);
  // A finisher is done once as its cue says (the workout shows the cue and a "Done?"): kept as 1 × 1.
  if (exercise.cardio) return { exerciseId: exercise.id, sets: 1, reps: '1', restSeconds: 0 };
  return { exerciseId: exercise.id, sets, reps: cleanReps(reps) ?? '10', restSeconds };
}

/**
 * One place up or down. Within its superset it only changes places in it;
 * past the end of it, it leaves, and what's left stays grouped only where
 * it still joins.
 */
export function moveItem(items: readonly PlanItem[], at: number, by: -1 | 1): PlanItem[] {
  const to = at + by;
  if (at < 0 || to < 0 || at >= items.length || to >= items.length) return [...items];
  const moved = items.map((item) => ({ ...item }));
  const item = moved[at]!;
  const within = item.group !== undefined && moved[to]!.group === item.group;
  moved[at] = moved[to]!;
  if (within) moved[to] = item;
  else {
    const { group: _left, ...rest } = item;
    moved[to] = rest;
  }
  return tidyGroups(moved);
}

export function removeItem(items: readonly PlanItem[], at: number): PlanItem[] {
  return tidyGroups(items.filter((_, other) => other !== at));
}

/** Sets from 1 to 10. */
export const withSets = (item: PlanItem, sets: number): PlanItem => ({ ...item, sets: Math.max(1, Math.min(10, Math.round(sets))) });

/** What's wrong with the plan, naming the exercise, or null when it can be kept. */
export function planProblem(items: readonly PlanItem[], where: string): string | null {
  const checked = cleanPlanItems(items, where);
  return checked.ok ? null : checked.problem;
}

/** The plan as it's kept: reps written the usual way ("8-10" → "8–10"). Assumes planProblem said nothing. */
export function keptPlan(items: readonly PlanItem[], where: string): PlanItem[] {
  const checked = cleanPlanItems(items, where);
  return checked.ok ? checked.value : [...items];
}
