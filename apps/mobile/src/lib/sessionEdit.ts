/**
 * Changing a workout after it's logged (app/session-edit.tsx): its sets as
 * rows to type in, and back again, checked so nothing is quietly dropped.
 * A set left blank says so rather than vanishing; a blank weight is body
 * weight, as when logging.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { parseReps, parseWeight, setTags, type DraftSet, type LoggedExercise, type TrainingSession, type WeightUnit } from './training';
import { exerciseName } from './workout';

export interface EditedExercise {
  exerciseId: string;
  sets: DraftSet[];
}

/** A logged session's exercises as rows to edit: every set done, its numbers as text. */
export function draftsOf(session: TrainingSession): EditedExercise[] {
  return session.exercises.map((logged) => ({
    exerciseId: logged.exerciseId,
    sets: logged.sets
      .filter((set) => set.reps > 0)
      .map((set) => ({
        weight: set.weight === null ? '' : String(set.weight),
        reps: String(set.reps),
        done: true,
        ...(set.kind ? { kind: set.kind } : {}),
        ...(set.rpe !== undefined ? { rpe: set.rpe } : {}),
      })),
  }));
}

export type EditCheck = { ok: true; exercises: LoggedExercise[] } | { ok: false; problem: string };

/**
 * The rows back as logged exercises, or what's wrong, naming the exercise
 * and set. An exercise with every set removed is left out; at least one set
 * that isn't a warm-up has to stay, as when logging.
 */
export function checkEdits(drafts: readonly EditedExercise[], unit: WeightUnit): EditCheck {
  const exercises: LoggedExercise[] = [];
  for (const draft of drafts) {
    const sets: LoggedExercise['sets'] = [];
    // Each set named as the screen names it ("warm-up set 1", "set 2"), not by its place in the list.
    const tags = setTags(draft.sets);
    for (const [at, set] of draft.sets.entries()) {
      const where = `${exerciseName(draft.exerciseId)}, ${tags[at]!.spoken}`;
      const reps = parseReps(set.reps);
      if (reps === undefined || reps === 0) return { ok: false, problem: `${where}: type how many reps, or remove the set.` };
      const weight = parseWeight(set.weight);
      if (weight === undefined) return { ok: false, problem: `${where}: that weight doesn’t read as a number of ${unit}.` };
      // A warm-up carries no RPE (one given before it was made a warm-up is dropped).
      sets.push({ weight, reps, ...(set.kind ? { kind: set.kind } : {}), ...(set.rpe !== undefined && set.kind !== 'warmup' ? { rpe: set.rpe } : {}) });
    }
    if (sets.length > 0) exercises.push({ exerciseId: draft.exerciseId, sets });
  }
  if (!exercises.some((logged) => logged.sets.some((set) => set.kind !== 'warmup'))) {
    return { ok: false, problem: 'Keep at least one set that isn’t a warm-up, or delete the workout instead.' };
  }
  return { ok: true, exercises };
}

/** "45" minutes → when it finished, from when it started; null if it isn't 1 to 1,440 whole minutes. */
export function finishFor(startedAt: string, minutes: string): string | null {
  const value = Number(minutes.trim());
  if (!Number.isInteger(value) || value < 1 || value > 24 * 60) return null;
  return new Date(Date.parse(startedAt) + value * 60_000).toISOString();
}

/** How long it took, in whole minutes, at least 1. */
export const minutesOf = (session: Pick<TrainingSession, 'startedAt' | 'finishedAt'>) => Math.max(1, Math.round((Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 60_000));
