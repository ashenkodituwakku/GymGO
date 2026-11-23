/**
 * "Previous", beside each set as you train: the set at the same place last
 * time you did the exercise (a warm-up beside a warm-up, the second working
 * set beside the second), in this workout's unit. Tap it to copy it in.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { fromKg, toKg, type LoggedSet, type SetKind, type WeightUnit } from './training';

const isWarmUp = (set: { kind?: SetKind }) => set.kind === 'warmup';

/** Weights as a gym loads them: kilograms to the half, pounds to the whole. */
function loadable(weight: number, unit: WeightUnit): number {
  return unit === 'kg' ? Math.round(weight * 2) / 2 : Math.round(weight);
}

export interface PreviousSet {
  /** What to type in: the weight (empty for body weight) and the reps. */
  weight: string;
  reps: string;
  /** "95 × 5", "12 reps". */
  label: string;
}

export function previousSet(
  last: { sets: readonly LoggedSet[]; unit: WeightUnit } | null,
  sets: ReadonlyArray<{ kind?: SetKind }>,
  at: number,
  unit: WeightUnit,
): PreviousSet | null {
  const here = sets[at];
  if (!last || !here) return null;
  // Its place among sets of its own sort (warm-ups, or the rest), and the same place last time.
  const warm = isWarmUp(here);
  const place = sets.slice(0, at).filter((set) => isWarmUp(set) === warm).length;
  const then = last.sets.filter((set) => set.reps > 0 && isWarmUp(set) === warm)[place];
  if (!then) return null;
  const weight = then.weight === null || then.weight <= 0 ? null : loadable(fromKg(toKg(then.weight, last.unit), unit), unit);
  return {
    weight: weight === null ? '' : String(weight),
    reps: String(then.reps),
    label: weight === null ? `${then.reps} reps` : `${weight} × ${then.reps}`,
  };
}
