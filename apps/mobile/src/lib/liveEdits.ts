/**
 * Changing a workout in progress from an exercise's menu (app/train.tsx):
 * moving it up or down, replacing it with another exercise, removing it,
 * and removing one of its sets.
 *
 * A superset or circuit moves as one: an exercise outside one hops over
 * the whole group, and one inside moves within it (or, at its edge, takes
 * the group with it). Unlink is how one leaves a group, so moving never
 * quietly breaks one up.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import type { ActiveItem } from './activeSession';
import { addedPlan } from './exerciseLibrary';
import { tidyGroups, type Groupable } from './supersets';
import { setMeasure, type Exercise } from './workout';

/** Runs of neighbours that move together: a group, or one exercise on its own. */
function blocks(items: readonly Groupable[]): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  items.forEach((item, index) => {
    const last = runs[runs.length - 1];
    if (last && item.group && items[index - 1]?.group === item.group) last.end = index;
    else runs.push({ start: index, end: index });
  });
  return runs;
}

/** Whether the exercise at `index` can move that way at all. */
export function canMove(items: readonly Groupable[], index: number, way: 'up' | 'down'): boolean {
  return way === 'up' ? index > 0 : index < items.length - 1;
}

/**
 * The workout with one exercise moved a place up or down, and where it
 * ended up. `group` is true when its whole superset or circuit moved.
 */
export function moveExercise<T extends Groupable>(items: readonly T[], index: number, way: 'up' | 'down'): { items: T[]; at: number; group: boolean } {
  if (!canMove(items, index, way)) return { items: [...items], at: index, group: false };
  const step = way === 'up' ? -1 : 1;
  const item = items[index]!;
  const neighbour = items[index + step];
  // Inside a group, with a partner that way: trade places with it.
  if (item.group && neighbour?.group === item.group) {
    const next = [...items];
    next[index] = neighbour as T;
    next[index + step] = item;
    return { items: tidyGroups(next), at: index + step, group: false };
  }
  // Otherwise its block (itself, or its whole group) hops over the next block that way.
  const runs = blocks(items);
  const mine = runs.findIndex((run) => index >= run.start && index <= run.end);
  const other = runs[mine + step];
  const own = runs[mine]!;
  if (!other) return { items: [...items], at: index, group: false };
  const first = way === 'up' ? other : own;
  const second = way === 'up' ? own : other;
  const before = items.slice(0, first.start);
  const after = items.slice(second.end + 1);
  const next = [...before, ...items.slice(second.start, second.end + 1), ...items.slice(first.start, first.end + 1), ...after];
  const offset = index - own.start;
  const at = way === 'up' ? other.start + offset : own.start + (other.end - other.start + 1) + offset;
  return { items: tidyGroups(next), at, group: own.end > own.start };
}

/** The workout without one exercise; a group it leaves with one member is undone. */
export function removeExercise<T extends Groupable>(items: readonly T[], index: number): T[] {
  return tidyGroups(items.filter((_, at) => at !== index));
}

/**
 * One exercise put in another's place: the same number of sets, all
 * blank. It keeps the plan's reps and rest when it's measured the same way
 * (reps for reps, a time for a time); otherwise it takes the usual plan
 * for it. A place in a superset stays.
 */
export function replaceExercise(item: ActiveItem, exercise: Exercise): ActiveItem {
  const same = setMeasure(exercise.id) === setMeasure(item.exerciseId, item.reps);
  const plan = same ? { reps: item.reps, restSeconds: item.restSeconds } : addedPlan(exercise);
  const { muscle: _muscle, ...rest } = item;
  return {
    ...rest,
    exerciseId: exercise.id,
    reps: plan.reps,
    restSeconds: plan.restSeconds,
    sets: item.sets.map(() => ({ weight: '', reps: '', done: false })),
  };
}

/** One exercise's sets without the one at `at`; never fewer than one. */
export function removeSet<S>(sets: readonly S[], at: number): S[] {
  if (sets.length <= 1) return [...sets];
  return sets.filter((_, index) => index !== at);
}
