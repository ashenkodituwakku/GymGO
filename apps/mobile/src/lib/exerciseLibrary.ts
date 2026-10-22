/**
 * The exercise library (app/exercises.tsx): every exercise GymGO plans,
 * found by name or muscle and by the kit you have, with the moves that
 * train the same muscle. And when you last trained each muscle, from your
 * own log, for the workout builder.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import type { TrainingSession } from './training';
import { EXERCISES, KIT_LABEL, MUSCLES, doseFor, muscleLabel, wayToDo, type Exercise, type Kit, type Muscle } from './workout';

/** Kit filters, as people think of them rather than by machine. */
export type KitFilter = 'any' | 'body' | 'dumbbells' | 'barbell' | 'cables' | 'machines';

export const KIT_FILTERS: Array<{ id: KitFilter; label: string }> = [
  { id: 'any', label: 'Any kit' },
  { id: 'body', label: 'Body weight' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'cables', label: 'Cables' },
  { id: 'machines', label: 'Machines' },
];

/** What each filter lets you use, and the kit an exercise must use to count as one. */
const FILTER_KIT: Record<Exclude<KitFilter, 'any' | 'body'>, { allows: Kit[]; uses: Kit[] }> = {
  dumbbells: { allows: ['dumbbells', 'bench'], uses: ['dumbbells'] },
  barbell: { allows: ['barbells', 'bench', 'squat_rack', 'power_rack', 'lifting_platform'], uses: ['barbells'] },
  cables: { allows: ['cable_station', 'bench'], uses: ['cable_station'] },
  machines: { allows: ['leg_press', 'hack_squat', 'lat_pulldown', 'smith_machine', 'bench', 'treadmill', 'rower', 'assault_bike'], uses: ['leg_press', 'hack_squat', 'lat_pulldown', 'smith_machine', 'treadmill', 'rower', 'assault_bike'] },
};

/** Does the exercise fit the kit filter: doable with only that kit, and using it? */
export function fitsKit(exercise: Exercise, filter: KitFilter): boolean {
  if (filter === 'any') return true;
  if (filter === 'body') return exercise.needs.some((option) => option.length === 0);
  const { allows, uses } = FILTER_KIT[filter];
  return exercise.needs.some((option) => option.length > 0 && option.every((kit) => allows.includes(kit)) && option.some((kit) => uses.includes(kit)));
}

const words = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * Does the exercise match what's typed: every word typed starts a word of
 * its name or of a muscle it works ("db" doesn't, "dumb" does; "row" finds
 * every row, "back" every back move).
 */
export function matchesQuery(exercise: Exercise, query: string): boolean {
  const typed = words(query);
  if (typed.length === 0) return true;
  const known = [...words(exercise.name), ...[...exercise.primary, ...exercise.secondary].flatMap((muscle) => words(muscleLabel(muscle)))];
  return typed.every((word) => known.some((item) => item.startsWith(word)));
}

export interface LibraryQuery {
  query: string;
  muscle: Muscle | null;
  kit: KitFilter;
}

/** A group in the library: a muscle, or the conditioning finishers (rower, bike), which have none of their own. */
export type LibraryGroup = Muscle | 'conditioning';

export const groupLabel = (group: LibraryGroup) => (group === 'conditioning' ? 'Conditioning' : muscleLabel(group));

/** The muscles' order on the body diagram, for grouping; conditioning last. */
const ORDER = new Map<LibraryGroup, number>([...MUSCLES.map((item, index) => [item.id, index] as const), ['conditioning', 99]]);

/** The exercises that fit, grouped by the muscle each mainly trains, in the body's order. */
export function libraryGroups(search: LibraryQuery, exercises: Exercise[] = EXERCISES): Array<{ muscle: LibraryGroup; exercises: Exercise[] }> {
  const groups = new Map<LibraryGroup, Exercise[]>();
  for (const exercise of exercises) {
    if (!matchesQuery(exercise, search.query) || !fitsKit(exercise, search.kit)) continue;
    if (search.muscle && !exercise.primary.includes(search.muscle) && !exercise.secondary.includes(search.muscle)) continue;
    // Under the muscle picked, else the one it mainly trains.
    const home: LibraryGroup = search.muscle ?? exercise.primary[0] ?? 'conditioning';
    groups.set(home, [...(groups.get(home) ?? []), exercise]);
  }
  return [...groups]
    .sort(([a], [b]) => (ORDER.get(a) ?? 98) - (ORDER.get(b) ?? 98))
    .map(([muscle, list]) => ({
      muscle,
      // Picked by muscle: the moves that mainly train it first.
      exercises: search.muscle ? [...list].sort((a, b) => Number(!a.primary.includes(search.muscle!)) - Number(!b.primary.includes(search.muscle!))) : list,
    }));
}

/** "Barbell + bench, or Smith machine + bench"; "Body weight". */
export function kitText(exercise: Exercise): string {
  return exercise.needs.map((option) => (option.length === 0 ? 'Body weight' : option.map((kit) => KIT_LABEL[kit]).join(' + '))).join(', or ');
}

/** Other moves for the same main muscle, the closest first (shared muscles, then the same kind of move). */
export function alternativesFor(exercise: Exercise, limit = 4, exercises: Exercise[] = EXERCISES): Exercise[] {
  const main = exercise.primary[0];
  const all = new Set([...exercise.primary, ...exercise.secondary]);
  return exercises
    .filter((other) => other.id !== exercise.id && !other.cardio && main !== undefined && other.primary.includes(main))
    .map((other) => ({
      other,
      score: [...other.primary, ...other.secondary].filter((muscle) => all.has(muscle)).length + (other.compound === exercise.compound ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.other.name.localeCompare(b.other.name))
    .slice(0, limit)
    .map((item) => item.other);
}

/**
 * Exercises to add to a workout in progress: those matching what's typed,
 * or, with nothing typed, the ones for the muscles it already trains (the
 * closest first), then the rest. Never one already in it.
 */
export function addableExercises(query: string, inWorkout: readonly string[], limit = 8, exercises: Exercise[] = EXERCISES): Exercise[] {
  const present = new Set(inWorkout);
  const open = exercises.filter((exercise) => !present.has(exercise.id));
  if (query.trim()) return open.filter((exercise) => matchesQuery(exercise, query)).slice(0, limit);
  const trained = new Set(inWorkout.flatMap((id) => exercises.find((exercise) => exercise.id === id)?.primary ?? []));
  const score = (exercise: Exercise) => exercise.primary.filter((muscle) => trained.has(muscle)).length * 2 + exercise.secondary.filter((muscle) => trained.has(muscle)).length;
  return [...open].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

/** How an added exercise is planned: the builder's usual sets, reps and rest; a finisher once, as its cue says. */
export function addedPlan(exercise: Exercise): { sets: number; reps: string; restSeconds: number } {
  if (exercise.cardio) return { sets: 1, reps: 'see cue', restSeconds: 0 };
  const { sets, reps, restSeconds } = doseFor(exercise, 'muscle');
  return { sets, reps, restSeconds };
}

/** Can it be done with the kit here (for "you can do this at this gym")? */
export const doableWith = (exercise: Exercise, kit: Kit[]) => wayToDo(exercise, new Set(kit)) !== null;

// --- When you last trained each muscle ---------------------------------------

const BY_ID = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]));

/**
 * When you last trained each muscle as a main muscle, from logged sessions
 * with at least one set of an exercise for it. Muscles never trained are
 * left out.
 */
export function lastTrained(sessions: TrainingSession[]): Map<Muscle, string> {
  const last = new Map<Muscle, string>();
  for (const session of sessions) {
    for (const item of session.exercises) {
      if (item.sets.length === 0) continue;
      for (const muscle of BY_ID.get(item.exerciseId)?.primary ?? []) {
        const before = last.get(muscle);
        if (!before || before < session.finishedAt) last.set(muscle, session.finishedAt);
      }
    }
  }
  return last;
}

/** Whole days between two moments, by the calendar on this device: 0 today, 1 yesterday. */
export function daysAgo(iso: string, now: Date = new Date()): number {
  const then = new Date(iso);
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.round((day(now) - day(then)) / 86_400_000));
}

/** "Today", "Yesterday", "3 days ago", "2 weeks ago". */
export function agoLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

/**
 * The muscles you haven't trained in at least `restDays` days (or ever),
 * from those offered: a one-tap pick in the workout builder. Of the ones
 * trained, those rested longest come first.
 */
export function freshMuscles(offered: Muscle[], last: Map<Muscle, string>, now: Date = new Date(), restDays = 2): Muscle[] {
  return offered
    .filter((muscle) => {
      const at = last.get(muscle);
      return !at || daysAgo(at, now) >= restDays;
    })
    .sort((a, b) => (last.get(a) ?? '').localeCompare(last.get(b) ?? ''));
}
