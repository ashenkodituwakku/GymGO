/**
 * "Update Push to match today" on the finish summary (app/train.tsx): a
 * workout started from one of My workouts that went differently (an
 * exercise added, dropped or moved, more or fewer sets) can change the
 * saved one to match. What changes is said first, so a day you skipped an
 * exercise doesn't quietly drop it from the plan.
 *
 * An exercise kept keeps its reps, rest and kit from the plan; only its
 * sets follow the day (working sets: warm-ups aren't part of a plan). One
 * added takes its reps from what you did. A superset stays only where its
 * neighbours still share its letter.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import type { SavedWorkoutPlan } from './api';
import { workingSets, type LoggedExercise, type TrainingSession } from './training';

type PlanItem = SavedWorkoutPlan['items'][number];

export interface RoutineChange {
  changed: boolean;
  added: number;
  removed: number;
  /** Exercises kept whose number of sets changed. */
  sets: number;
  moved: boolean;
}

/** Most exercises a saved workout holds (the server's limit). */
const MOST = 12;

/** Reps for an exercise added on the day, as plans write them: "8", "8–10", "30 s", "40 m". */
function repsFrom(logged: LoggedExercise): string {
  const sets = workingSets(logged.sets);
  const range = (values: number[], unit = '') => {
    const low = Math.min(...values);
    const high = Math.max(...values);
    return `${low === high ? low : `${low}–${high}`}${unit}`;
  };
  const metres = sets.map((set) => set.metres ?? 0).filter((value) => value > 0);
  if (metres.length) return range(metres.map(Math.round), ' m');
  const seconds = sets.map((set) => set.seconds ?? 0).filter((value) => value > 0);
  if (seconds.length) return range(seconds.map(Math.round), ' s');
  const reps = sets.map((set) => set.reps).filter((value) => value > 0);
  return reps.length ? range(reps) : '8–12';
}

/** Each logged exercise paired with the plan item it came from (the first unused one with its id), or null if added. */
function pair(plan: SavedWorkoutPlan, session: TrainingSession): Array<{ logged: LoggedExercise; from: number | null }> {
  const used = new Set<number>();
  return session.exercises
    .filter((logged) => workingSets(logged.sets).length > 0)
    .map((logged) => {
      const from = plan.items.findIndex((item, at) => !used.has(at) && item.exerciseId === logged.exerciseId);
      if (from >= 0) used.add(from);
      return { logged, from: from >= 0 ? from : null };
    });
}

/** How the day differed from the saved workout it started from. */
export function routineChange(plan: SavedWorkoutPlan, session: TrainingSession): RoutineChange {
  const pairs = pair(plan, session);
  const kept = pairs.filter((entry) => entry.from !== null);
  const added = pairs.length - kept.length;
  const removed = plan.items.length - kept.length;
  const sets = kept.filter((entry) => workingSets(entry.logged.sets).length !== plan.items[entry.from!]!.sets).length;
  const order = kept.map((entry) => entry.from!);
  const moved = order.some((at, index) => index > 0 && at < order[index - 1]!);
  return { changed: added > 0 || removed > 0 || sets > 0 || moved, added, removed, sets, moved };
}

/** The saved workout as the day went, ready to send; null when there's nothing to keep or too much. */
export function routineFromSession(plan: SavedWorkoutPlan, session: TrainingSession): Omit<SavedWorkoutPlan, 'version'> | null {
  const pairs = pair(plan, session);
  if (pairs.length === 0 || pairs.length > MOST) return null;
  const items: PlanItem[] = pairs.map(({ logged, from }) => {
    const sets = Math.min(10, Math.max(1, workingSets(logged.sets).length));
    if (from === null) return { exerciseId: logged.exerciseId, sets, reps: repsFrom(logged), restSeconds: 90, uses: [], confirmed: false };
    return { ...plan.items[from]!, sets };
  });
  // A superset only where a neighbour still shares the letter.
  const grouped = items.map((item, at) => {
    if (!item.group) return item;
    const together = items[at - 1]?.group === item.group || items[at + 1]?.group === item.group;
    if (together) return item;
    const { group: _group, ...rest } = item;
    return rest;
  });
  const { version: _version, ...rest } = plan;
  return { ...rest, items: grouped };
}

/** "1 exercise added, 2 with different sets", said before it's changed. */
export function changeLine(change: RoutineChange): string {
  const parts = [
    change.added ? `${change.added} ${change.added === 1 ? 'exercise' : 'exercises'} added` : null,
    change.removed ? `${change.removed} not done` : null,
    change.sets ? `${change.sets} with different sets` : null,
    change.moved && !change.added && !change.removed ? 'a new order' : null,
  ].filter(Boolean);
  return parts.join(', ');
}
