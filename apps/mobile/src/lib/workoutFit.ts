/**
 * "Can I do this workout here?": a workout you saved, checked against what a
 * gym is known to have (its own published equipment and members' reports,
 * knownKit in workout.ts). Each exercise is one of:
 *
 *  - there: some way of doing it uses only kit known to be at this gym;
 *  - missing: every way of doing it needs something members say isn't there;
 *  - not known: nobody has said either way about something it needs. Unknown
 *    is never counted as there, nor as missing.
 *
 * For anything not there, a swap: the closest exercise for the same muscle
 * that the known kit allows (swapFor), never one already in the workout.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { EXERCISES, swapFor, wayToDo, type Exercise, type Kit, type Muscle } from './workout';

export type FitState = 'there' | 'missing' | 'unknown';

export interface FitItem {
  exerciseId: string;
  state: FitState;
  /**
   * there: the kit it would use (none for body weight), all needed. missing:
   * what members say isn't there, any one of which rules out a way of doing
   * it. unknown: what nobody has reported either way, all needed.
   */
  kit: Kit[];
  /** Something for the same muscle the known kit allows, for an exercise that isn't there. */
  swap: Exercise | null;
}

export interface WorkoutFit {
  items: FitItem[];
  counts: Record<FitState, number>;
}

export function checkWorkout(
  items: ReadonlyArray<{ exerciseId: string; muscle?: Muscle }>,
  known: { has: readonly Kit[]; lacks: readonly Kit[] },
): WorkoutFit {
  const has = new Set(known.has);
  const lacks = new Set(known.lacks);
  const counts: Record<FitState, number> = { there: 0, missing: 0, unknown: 0 };
  const checked = items.map((item, index): FitItem => {
    const exercise = EXERCISES.find((candidate) => candidate.id === item.exerciseId);
    if (!exercise) {
      counts.unknown += 1;
      return { exerciseId: item.exerciseId, state: 'unknown', kit: [], swap: null };
    }
    const way = wayToDo(exercise, has);
    if (way) {
      counts.there += 1;
      return { exerciseId: item.exerciseId, state: 'there', kit: way, swap: null };
    }
    // The ways of doing it, each with what isn't confirmed: ruled out if members say a piece isn't there.
    const ways = exercise.needs.map((option) => {
      const open = option.filter((kit) => !has.has(kit));
      return { open, ruledOut: open.some((kit) => lacks.has(kit)) };
    });
    const swap = swapFor(items, index, [...has]);
    const possible = ways.filter((option) => !option.ruledOut);
    if (possible.length === 0) {
      counts.missing += 1;
      // Everything members say isn't there that some way of doing it needs ("no squat rack or power rack").
      const missing = [...new Set(ways.flatMap((option) => option.open.filter((kit) => lacks.has(kit))))];
      return { exerciseId: item.exerciseId, state: 'missing', kit: missing, swap };
    }
    counts.unknown += 1;
    const closest = [...possible].sort((a, b) => a.open.length - b.open.length)[0]!;
    return { exerciseId: item.exerciseId, state: 'unknown', kit: closest.open, swap };
  });
  return { items: checked, counts };
}

/** "4 of 6 are here for sure · 1 missing · 1 not known yet". */
export function fitSummary(counts: Record<FitState, number>): string {
  const total = counts.there + counts.missing + counts.unknown;
  if (total === 0) return 'Nothing in this workout to check';
  if (counts.there === total) return total === 1 ? 'It’s all here' : `All ${total} are here`;
  const parts = [`${counts.there} of ${total} ${counts.there === 1 ? 'is' : 'are'} here for sure`];
  if (counts.missing) parts.push(`${counts.missing} missing`);
  if (counts.unknown) parts.push(`${counts.unknown} not known yet`);
  return parts.join(' · ');
}

/**
 * The workout's items with the chosen swaps put in, each keeping its sets,
 * reps and rest. `swapped` holds the indexes swapped.
 */
export function withSwaps<T extends { exerciseId: string }>(items: readonly T[], fit: WorkoutFit, swapped: ReadonlySet<number>): T[] {
  return items.map((item, index) => {
    const swap = swapped.has(index) ? fit.items[index]?.swap : null;
    return swap ? { ...item, exerciseId: swap.id } : item;
  });
}
