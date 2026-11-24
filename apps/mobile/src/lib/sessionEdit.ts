/**
 * Changing a workout after it's logged (app/session-edit.tsx): its sets as
 * rows to type in, and back again, checked so nothing is quietly dropped.
 * A set left blank says so rather than vanishing; a blank weight is body
 * weight, as when logging.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import {
  clockLabel,
  isDoneSet,
  isTimedSet,
  parseDistance,
  parseReps,
  parseTime,
  parseWeight,
  setTags,
  type DraftSet,
  type LoggedExercise,
  type LoggedSet,
  type SetMeasure,
  type TrainingSession,
  type WeightUnit,
} from './training';
import { exerciseName, setMeasure } from './workout';

export interface EditedExercise {
  exerciseId: string;
  sets: DraftSet[];
  /** Reps, or a time (a plank) or distance (a carry): which boxes its sets have. */
  measure: SetMeasure;
}

/** How a logged exercise was measured: by its sets (a time or distance), else by what GymGO knows of it. */
function loggedMeasure(exerciseId: string, sets: readonly LoggedSet[]): SetMeasure {
  const timed = sets.find(isTimedSet);
  if (timed) return timed.metres ? 'distance' : 'time';
  return sets.some((set) => set.reps > 0) ? 'reps' : setMeasure(exerciseId);
}

/** A logged session's exercises as rows to edit: every set done, its numbers as text. */
export function draftsOf(session: TrainingSession): EditedExercise[] {
  return session.exercises.map((logged) => ({
    exerciseId: logged.exerciseId,
    measure: loggedMeasure(logged.exerciseId, logged.sets),
    sets: logged.sets.filter(isDoneSet).map((set) => ({
      weight: set.weight === null ? '' : String(set.weight),
      reps: isTimedSet(set) ? '' : String(set.reps),
      done: true,
      ...(set.seconds ? { time: clockLabel(set.seconds) } : {}),
      ...(set.metres ? { distance: String(set.metres) } : {}),
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
      if (draft.measure === 'time' || draft.measure === 'distance') {
        // A time, or a distance (with a time if it had one); any weight added or carried.
        const typedTime = (set.time ?? '').trim();
        const seconds = typedTime ? parseTime(typedTime) : undefined;
        const metres = draft.measure === 'distance' ? parseDistance(set.distance ?? '') : undefined;
        if (draft.measure === 'time' && seconds === undefined) return { ok: false, problem: `${where}: type how long it took (1:30, or 90 for 90 seconds), or remove the set.` };
        if (draft.measure === 'distance' && metres === undefined) return { ok: false, problem: `${where}: type how far it was in metres, or remove the set.` };
        if (typedTime && seconds === undefined) return { ok: false, problem: `${where}: that time doesn’t read as minutes and seconds.` };
        const weight = parseWeight(set.weight);
        if (weight === undefined) return { ok: false, problem: `${where}: that weight doesn’t read as a number of ${unit}.` };
        sets.push({ weight, reps: 0, ...(seconds !== undefined ? { seconds } : {}), ...(metres !== undefined ? { metres } : {}), ...(set.kind ? { kind: set.kind } : {}) });
        continue;
      }
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
