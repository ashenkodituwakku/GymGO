/**
 * Training of your own: exercises you add and splits you make (both Pro),
 * as the app sends them and the server keeps them. One set of rules on both
 * sides, so what the app lets you type is what the server takes, and a
 * damaged or hand-made request gets a sentence saying what's wrong.
 *
 * The muscles and kit are the app's own (apps/mobile/src/lib/workout.ts,
 * whose test checks these lists match it).
 */

export const TRAINING_MUSCLES = [
  'chest',
  'deltoids',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'upper-back',
  'trapezius',
  'lower-back',
  'gluteal',
  'quadriceps',
  'hamstring',
  'adductors',
  'calves',
] as const;
export type TrainingMuscle = (typeof TRAINING_MUSCLES)[number];

/** The kit an exercise can need: the gym equipment the workout builder knows. */
export const TRAINING_KIT = [
  'power_rack',
  'squat_rack',
  'smith_machine',
  'lifting_platform',
  'cable_station',
  'dumbbells',
  'barbells',
  'bench',
  'leg_press',
  'hack_squat',
  'lat_pulldown',
  'treadmill',
  'rower',
  'assault_bike',
  'turf_sled',
] as const;
export type TrainingKit = (typeof TRAINING_KIT)[number];

export const OWN_LIMITS = {
  /** Exercises of your own kept at once (archived ones don't count). */
  exercises: 100,
  splits: 30,
  /** Days in a split: a week's worth. */
  days: 7,
  /** Exercises in a day of a split, or in a saved workout. */
  dayExercises: 12,
  name: 60,
  dayName: 40,
  cue: 200,
} as const;

export type Cleaned<T> = { ok: true; value: T } | { ok: false; problem: string };

/** An exercise's own id: "mine-" and ten letters or digits, made by the server. */
export const OWN_EXERCISE_ID = /^mine-[a-z0-9]{10}$/;
export const isOwnExerciseId = (id: string) => OWN_EXERCISE_ID.test(id);

/** Spaces folded and trimmed; no control characters. */
export function tidyName(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

/**
 * Reps as a plan writes them, tidied: a count ("8"), a range ("8–10", typed
 * "8-10" too), seconds ("30 s", "30–45 s") or metres ("40 m"). Null for
 * anything else, or a range the wrong way round.
 */
export function cleanReps(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*(s|sec|secs|seconds|m)?$/i.exec(value.trim());
  if (!match) return null;
  const low = Number(match[1]);
  const high = match[2] === undefined ? null : Number(match[2]);
  if (low < 1 || (high !== null && high <= low)) return null;
  const unit = match[3] ? (match[3].toLowerCase() === 'm' ? ' m' : ' s') : '';
  return `${low}${high !== null ? `–${high}` : ''}${unit}`;
}

export interface OwnExerciseFields {
  name: string;
  /** What it mainly works: one or two muscles. */
  primary: TrainingMuscle[];
  /** What it works second: up to four. */
  secondary: TrainingMuscle[];
  /** What it needs, all at once; none is body weight. */
  kit: TrainingKit[];
  /** Done for time (a hold, a carry) rather than counted in reps. */
  timed: boolean;
  /** How to do it, in your words. */
  cue: string;
  /** One of GymGO's exercises whose moving icon it borrows, or none (a plain dumbbell). */
  drawnAs: string | null;
}

export interface OwnExercise extends OwnExerciseFields {
  id: string;
  /** Deleted: kept so workouts you logged with it still say its name, but no longer offered. */
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

const muscleList = (value: unknown): TrainingMuscle[] | null => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && (TRAINING_MUSCLES as readonly string[]).includes(item))) return null;
  return [...new Set(value as TrainingMuscle[])];
};

/** An exercise of your own as typed, or what's wrong with it. */
export function cleanOwnExercise(input: unknown): Cleaned<OwnExerciseFields> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = tidyName(raw.name);
  if (name.length < 2 || name.length > OWN_LIMITS.name) return { ok: false, problem: `Give it a name of 2 to ${OWN_LIMITS.name} characters.` };
  const primary = muscleList(raw.primary);
  if (!primary || primary.length < 1 || primary.length > 2) return { ok: false, problem: 'Pick the one or two muscles it mainly works.' };
  const secondary = muscleList(raw.secondary);
  if (!secondary) return { ok: false, problem: 'Those muscles aren’t ones GymGO knows.' };
  const second = secondary.filter((muscle) => !primary.includes(muscle));
  if (second.length > 4) return { ok: false, problem: 'Pick up to four muscles it works second.' };
  const kitInput = raw.kit === undefined ? [] : raw.kit;
  if (!Array.isArray(kitInput) || !kitInput.every((item) => typeof item === 'string' && (TRAINING_KIT as readonly string[]).includes(item))) {
    return { ok: false, problem: 'That kit isn’t something GymGO knows.' };
  }
  const kit = [...new Set(kitInput as TrainingKit[])];
  if (kit.length > 3) return { ok: false, problem: 'Pick up to three things it needs at once.' };
  const cue = typeof raw.cue === 'string' ? raw.cue.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim() : '';
  if (cue.length > OWN_LIMITS.cue) return { ok: false, problem: `Keep how to do it to ${OWN_LIMITS.cue} characters.` };
  const drawnAs = raw.drawnAs === null || raw.drawnAs === undefined || raw.drawnAs === '' ? null : raw.drawnAs;
  if (drawnAs !== null && (typeof drawnAs !== 'string' || !/^[a-z0-9-]{1,40}$/.test(drawnAs) || isOwnExerciseId(drawnAs))) {
    return { ok: false, problem: 'Its icon has to be one of GymGO’s exercises.' };
  }
  return { ok: true, value: { name, primary, secondary: second, kit, timed: raw.timed === true, cue, drawnAs } };
}

export interface SplitItem {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
  /** Its superset or circuit: a letter shared with the exercises beside it. */
  group?: string;
}

export interface SplitDay {
  name: string;
  items: SplitItem[];
}

export interface SplitFields {
  name: string;
  days: SplitDay[];
}

export interface Split extends SplitFields {
  id: string;
  createdAt: string;
  updatedAt: string;
}

const EXERCISE_ID = /^[a-z0-9-]{1,60}$/;

/**
 * A day's exercises as typed, or what's wrong, naming the place. A
 * superset's letter is kept only on exercises side by side, two or more.
 */
export function cleanPlanItems(input: unknown, where: string): Cleaned<SplitItem[]> {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, problem: `${where}: add at least one exercise.` };
  if (input.length > OWN_LIMITS.dayExercises) return { ok: false, problem: `${where}: up to ${OWN_LIMITS.dayExercises} exercises.` };
  const items: SplitItem[] = [];
  const seen = new Set<string>();
  for (const [at, entry] of input.entries()) {
    const raw = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const place = `${where}, exercise ${at + 1}`;
    if (typeof raw.exerciseId !== 'string' || !EXERCISE_ID.test(raw.exerciseId)) return { ok: false, problem: `${place} isn’t an exercise GymGO knows.` };
    if (seen.has(raw.exerciseId)) return { ok: false, problem: `${place} is in this day twice: add more sets instead.` };
    seen.add(raw.exerciseId);
    const sets = raw.sets;
    if (typeof sets !== 'number' || !Number.isInteger(sets) || sets < 1 || sets > 10) return { ok: false, problem: `${place}: 1 to 10 sets.` };
    const reps = cleanReps(raw.reps);
    if (!reps) return { ok: false, problem: `${place}: reps as a number (8), a range (8–10) or a time (30 s).` };
    const rest = raw.restSeconds;
    if (typeof rest !== 'number' || !Number.isInteger(rest) || rest < 0 || rest > 600) return { ok: false, problem: `${place}: rest of up to 10 minutes.` };
    const group = typeof raw.group === 'string' && /^[A-L]$/.test(raw.group) ? raw.group : undefined;
    items.push({ exerciseId: raw.exerciseId, sets, reps, restSeconds: rest, ...(group ? { group } : {}) });
  }
  // A letter only where it joins neighbours: a lone one, or one split by another exercise, is dropped.
  return { ok: true, value: items.map((item, at) => (item.group && (items[at - 1]?.group === item.group || items[at + 1]?.group === item.group) ? item : withoutGroup(item))) };
}

const withoutGroup = ({ group: _group, ...item }: SplitItem): SplitItem => item;

/** A split as typed, or what's wrong with it. */
export function cleanSplit(input: unknown): Cleaned<SplitFields> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = tidyName(raw.name);
  if (name.length < 2 || name.length > OWN_LIMITS.name) return { ok: false, problem: `Give the split a name of 2 to ${OWN_LIMITS.name} characters.` };
  // A day's workout is called "Day · Split" (lib/templates.ts): a name with " · " would read back wrongly.
  if (name.includes(' · ')) return { ok: false, problem: 'Leave “ · ” out of the split’s name.' };
  if (!Array.isArray(raw.days) || raw.days.length === 0) return { ok: false, problem: 'Add at least one day.' };
  if (raw.days.length > OWN_LIMITS.days) return { ok: false, problem: `Up to ${OWN_LIMITS.days} days in a split.` };
  const days: SplitDay[] = [];
  const names = new Set<string>();
  for (const [at, entry] of raw.days.entries()) {
    const day = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const dayName = tidyName(day.name);
    if (dayName.length < 1 || dayName.length > OWN_LIMITS.dayName) return { ok: false, problem: `Day ${at + 1}: a name of up to ${OWN_LIMITS.dayName} characters.` };
    if (dayName.includes(' · ')) return { ok: false, problem: `Day ${at + 1}: leave “ · ” out of its name.` };
    if (names.has(dayName.toLowerCase())) return { ok: false, problem: `Two days are called “${dayName}”: give each its own name.` };
    names.add(dayName.toLowerCase());
    const items = cleanPlanItems(day.items, dayName);
    if (!items.ok) return items;
    days.push({ name: dayName, items: items.value });
  }
  return { ok: true, value: { name, days } };
}
