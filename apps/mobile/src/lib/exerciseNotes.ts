/**
 * Your own note on an exercise ("seat on 4", "grip just outside the
 * rings"), pinned to it in every workout and on its page. Kept on this
 * device only, like your notes on gyms: never sent to the server.
 */

import { deviceStore } from './deviceStore';

/** A line or two: what you'd want to see before the first set. */
export const EXERCISE_NOTE_LIMIT = 200;
/** More exercises than GymGO lists, with room for your own. */
const MOST_NOTES = 300;

export type ExerciseNotes = Record<string, string>;

/** What was stored, kept to notes that are text, trimmed, of a sane length, on exercise ids GymGO could use. */
export function cleanExerciseNotes(stored: unknown): ExerciseNotes {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const notes: ExerciseNotes = {};
  for (const [id, text] of Object.entries(stored).slice(0, MOST_NOTES)) {
    if (!/^[a-z0-9-]{1,60}$/.test(id) || typeof text !== 'string') continue;
    const clean = tidyNote(text);
    if (clean) notes[id] = clean;
  }
  return notes;
}

/** Spaces folded, ends trimmed, cut to the limit; line breaks kept, at most one blank line. */
export function tidyNote(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, EXERCISE_NOTE_LIMIT);
}

export const exerciseNotes = deviceStore<ExerciseNotes>('gymgo.exercise-notes.v1', cleanExerciseNotes, {});

/** Keep a note on an exercise; a blank one is removed. */
export function setExerciseNote(exerciseId: string, text: string): void {
  const clean = tidyNote(text);
  exerciseNotes.update((notes) => {
    const { [exerciseId]: _old, ...others } = notes;
    return clean ? { ...others, [exerciseId]: clean } : others;
  });
}

/** The note on one exercise, or '' when there's none. */
export const useExerciseNote = (exerciseId: string): string => exerciseNotes.use()[exerciseId] ?? '';
