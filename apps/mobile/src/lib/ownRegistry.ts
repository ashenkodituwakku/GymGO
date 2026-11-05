/**
 * Exercises and splits of your own, put beside GymGO's: after this, every
 * lookup by id (lib/workout.ts exerciseById, exerciseName), every icon
 * (lib/exerciseGlyphs.ts, through the exercise each borrows) and every
 * template lookup (lib/templates.ts allTemplates) finds them.
 *
 * No React Native here, so it is unit-tested in Node; lib/ownTraining.ts
 * keeps the lists in step with your account and calls it.
 */

import type { OwnExercise, Split } from '@gymgo/domain';
import { setGlyphAliases } from './exerciseGlyphs';
import { setOwnTemplates, templateOfSplit } from './templates';
import { fromOwn, setOwnExercises } from './workout';

export function registerOwnTraining(exercises: readonly OwnExercise[], splits: readonly Split[]): void {
  setOwnExercises(exercises.map(fromOwn));
  setGlyphAliases(new Map(exercises.flatMap((exercise) => (exercise.drawnAs ? [[exercise.id, exercise.drawnAs] as const] : []))));
  setOwnTemplates(splits.map(templateOfSplit));
}
