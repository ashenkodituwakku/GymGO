/**
 * Folders for My workouts (app/workouts/index.tsx, app/workout-folder.tsx):
 * your saved workouts grouped by the folder each is kept in, folders A to Z
 * and the ones in no folder last. A folder exists while a workout is in it.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import type { SavedWorkout } from './api';

export interface FolderGroup {
  /** The folder's name, or null for the workouts in none. */
  folder: string | null;
  workouts: SavedWorkout[];
}

/** A folder name as the server keeps it: spaces tidied, at most 40 characters; blank is none. */
export function tidyFolder(name: string): string | null {
  const tidy = name.trim().replace(/\s+/g, ' ');
  return tidy ? tidy.slice(0, 40) : null;
}

/** Your folders' names, A to Z. */
export function folderNames(workouts: readonly SavedWorkout[]): string[] {
  return [...new Set(workouts.map((workout) => workout.folder ?? null).filter((name): name is string => Boolean(name)))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }),
  );
}

/** The workouts by folder, each folder's in the order given (newest first from the server), those in none last. */
export function groupByFolder(workouts: readonly SavedWorkout[]): FolderGroup[] {
  const groups: FolderGroup[] = folderNames(workouts).map((folder) => ({ folder, workouts: workouts.filter((workout) => workout.folder === folder) }));
  const loose = workouts.filter((workout) => !workout.folder);
  if (loose.length) groups.push({ folder: null, workouts: loose });
  return groups;
}

/** "Moved to Upper body." / "Taken out of Upper body." / "Already in Upper body." */
export function moveLine(from: string | null, to: string | null): string {
  if (from === to) return to ? `Already in ${to}.` : 'Not in a folder.';
  return to ? `Moved to ${to}.` : `Taken out of ${from}.`;
}
