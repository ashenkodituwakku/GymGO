/**
 * Bringing a workout log in from a CSV file (app/import.tsx): another
 * workout app's export, or GymGO's own (Progress → Export your log).
 *
 * Three layouts are read, found by their headings:
 *  - one with title, start_time, end_time, exercise_title, set_index,
 *    set_type, weight_kg (or weight_lbs), reps, distance_km (or
 *    distance_miles), duration_seconds and rpe;
 *  - one with Date, Workout Name, Duration, Exercise Name, Set Order,
 *    Weight, Reps, Distance, Seconds, Workout Notes and RPE, whose weights
 *    are in whatever unit you used there (so you say which);
 *  - GymGO's own: date, time, workout, exercise, set, weight, unit, reps,
 *    type, rpe, note, seconds, metres.
 *
 * Each workout becomes one to log, as the server takes them (40 exercises,
 * 30 sets each, a day long at most). An exercise is matched to GymGO's by
 * name ("Bench Press (Barbell)" is Barbell bench press); one it can't
 * match keeps its own name, so nothing is lost and its records still add
 * up. Nothing is sent from here.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { EXERCISES, type Exercise } from './workout';
import type { LoggedSet, SetKind, WeightUnit } from './training';

// --- CSV ---------------------------------------------------------------------------

/** A CSV file's rows and cells: quoted cells, doubled quotes, commas or semicolons, any line ending. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.slice(0, clean.search(/\r?\n|$/));
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let at = 0; at < clean.length; at += 1) {
    const char = clean[at]!;
    if (quoted) {
      if (char === '"' && clean[at + 1] === '"') {
        cell += '"';
        at += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[at + 1] === '\n') at += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

// --- Matching exercises -----------------------------------------------------------

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

/** Words that say the kit, not the move: dropped when the move can't be matched with them. */
const KIT_WORDS = new Set(['barbell', 'dumbbell', 'dumbbells', 'cable', 'cables', 'machine', 'bodyweight', 'body', 'weight', 'weighted', 'band', 'bands', 'smith', 'kettlebell', 'ez', 'bar', 'plate', 'loaded']);

/** Names another app may use for one of GymGO's moves, as their words. */
const ALIASES: Record<string, string> = {
  'military press': 'ohp',
  'shoulder press barbell': 'ohp',
  'overhead press': 'ohp',
  'bicep curl dumbbell': 'db-curl',
  'biceps curl dumbbell': 'db-curl',
  'bicep curl barbell': 'bb-curl',
  'biceps curl barbell': 'bb-curl',
  'bicep curl cable': 'cable-curl',
  'triceps pushdown': 'pushdown',
  'tricep pushdown': 'pushdown',
  'triceps rope pushdown': 'pushdown',
  'bent over row barbell': 'bb-row',
  'bent over row': 'bb-row',
  'dumbbell row': 'db-row',
  'seated row cable': 'cable-row',
  'seated cable row': 'cable-row',
  'chest fly cable': 'cable-fly',
  'cable crossover': 'cable-fly',
  'lunge': 'lunge',
  'lunges': 'lunge',
  'walking lunges': 'lunge',
  'calf raise': 'calf-raise',
  'crunch cable': 'cable-crunch',
  'pull up': 'pull-up',
  'pull ups': 'pull-up',
  'chin ups': 'chin-up',
  'push ups': 'push-up',
  'squat': 'back-squat',
};

/** An id the server takes for an exercise GymGO doesn't list: its name in lower case, words joined by hyphens. */
function slugOf(name: string): string {
  return words(name).join('-').replace(/^mine-/, '').slice(0, 60).replace(/-+$/, '');
}

export interface ExerciseMatch {
  /** The name in the file. */
  source: string;
  /** GymGO's id, or one made from the name. */
  exerciseId: string;
  /** GymGO's own exercise, when it matched one. */
  exercise: Exercise | null;
}

/**
 * GymGO's exercise for a name in another app's file: the same words (in
 * any order), else its words with at most one more ("Squat (Barbell)" is
 * Barbell back squat), else the same without the kit words, else a known
 * other name. One left unclear keeps its own name.
 */
export function matchExercise(source: string, exercises: readonly Exercise[] = EXERCISES): ExerciseMatch {
  const mine = words(source);
  const alias = ALIASES[mine.join(' ')] ?? ALIASES[mine.filter((word) => !KIT_WORDS.has(word)).join(' ')];
  const byId = (id: string) => exercises.find((exercise) => exercise.id === id) ?? null;
  const best = (wanted: string[]) => {
    if (wanted.length === 0) return null;
    const scored = exercises
      .map((exercise) => {
        const theirs = new Set(words(exercise.name));
        if (!wanted.every((word) => theirs.has(word))) return null;
        return { exercise, extra: theirs.size - new Set(wanted).size };
      })
      .filter((entry): entry is { exercise: Exercise; extra: number } => entry !== null && entry.extra <= 1)
      .sort((a, b) => a.extra - b.extra);
    if (scored.length === 0) return null;
    // Two equally close is a guess: leave it.
    if (scored.length > 1 && scored[0]!.extra === scored[1]!.extra) return null;
    return scored[0]!.exercise;
  };
  const found = best(mine) ?? best(mine.filter((word) => !KIT_WORDS.has(word))) ?? (alias ? byId(alias) : null);
  if (found) return { source, exerciseId: found.id, exercise: found };
  const slug = slugOf(source);
  const known = byId(slug);
  return { source, exerciseId: slug, exercise: known };
}

// --- Reading a file ----------------------------------------------------------------

export type ImportFormat = 'columns' | 'named' | 'gymgo';

export interface ImportedSession {
  name: string;
  unit: WeightUnit;
  startedAt: string;
  finishedAt: string;
  note: string | null;
  exercises: Array<{ exerciseId: string; sets: LoggedSet[] }>;
}

export interface ImportResult {
  format: ImportFormat;
  sessions: ImportedSession[];
  /** Each name in the file once, with what it became. */
  matches: ExerciseMatch[];
  /** Workouts left out: nothing to log in them, or dated in the future. */
  skipped: number;
  /** Whether the file says its weights' unit, or the one you picked was used. */
  unitInFile: boolean;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "2024-01-06 10:31:00", "2024-01-06T10:31", "6 Jan 2024, 10:31" (local time) or one with its zone; null if none of those. */
export function readDate(text: string): Date | null {
  const value = text.trim();
  if (!value) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))) return new Date(value);
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] ?? 12), Number(match[5] ?? 0), Number(match[6] ?? 0));
  match = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})$/.exec(value);
  if (match) {
    const month = MONTHS.indexOf(match[2]!.toLowerCase());
    if (month >= 0) return new Date(Number(match[3]), month, Number(match[1]), Number(match[4]), Number(match[5]));
  }
  return null;
}

/** "1h 5m", "45m", "1h", "50s" → seconds; null if it doesn't read. */
function readDuration(text: string): number | null {
  const match = /^\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s)?\s*$/i.exec(text);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

const number = (text: string | undefined) => {
  const value = Number((text ?? '').trim().replace(',', '.'));
  return (text ?? '').trim() !== '' && Number.isFinite(value) ? value : null;
};

/** A row's set as GymGO keeps one, or null when there's nothing in it (or it's out of range). */
function setOf(parts: { weight: number | null; reps: number | null; seconds: number | null; metres: number | null; kind: SetKind | null; rpe: number | null }): LoggedSet | null {
  const weight = parts.weight !== null && parts.weight > 0 ? Math.round(parts.weight * 100) / 100 : null;
  if (weight !== null && weight > 1500) return null;
  const reps = parts.reps !== null && parts.reps > 0 ? Math.round(parts.reps) : 0;
  const seconds = parts.seconds !== null && parts.seconds >= 1 ? Math.min(6 * 3600, Math.round(parts.seconds)) : null;
  const metres = parts.metres !== null && parts.metres >= 1 ? Math.min(100_000, Math.round(parts.metres)) : null;
  if (reps > 200) return null;
  if (reps === 0 && seconds === null && metres === null) return null;
  const rpe = parts.rpe !== null && parts.rpe >= 6 && parts.rpe <= 10 && Number.isInteger(parts.rpe * 2) && parts.kind !== 'warmup' ? parts.rpe : null;
  return {
    weight,
    reps,
    ...(seconds !== null && reps === 0 ? { seconds } : {}),
    ...(metres !== null && reps === 0 ? { metres } : {}),
    ...(parts.kind ? { kind: parts.kind } : {}),
    ...(rpe !== null ? { rpe } : {}),
  };
}

const kindOf = (text: string): SetKind | null => {
  const value = text.trim().toLowerCase();
  if (value === 'w' || value.startsWith('warm')) return 'warmup';
  if (value === 'd' || value.startsWith('drop')) return 'drop';
  if (value === 'f' || value.startsWith('fail')) return 'failure';
  return null;
};

/**
 * A CSV export, read into workouts to log, or null when its headings
 * aren't one of the layouts above. `unit` is for a file that doesn't say
 * its weights' unit; `now` keeps out workouts dated in the future.
 */
export function readExport(text: string, unit: WeightUnit, now: Date = new Date()): ImportResult | null {
  const rows = parseCsv(text);
  if (rows.length < 2) return null;
  const heads = rows[0]!.map((head) => head.trim().toLowerCase());
  const col = (...names: string[]) => names.map((name) => heads.indexOf(name)).find((at) => at >= 0) ?? -1;
  const get = (row: string[], at: number) => (at >= 0 ? (row[at] ?? '').trim() : '');

  let format: ImportFormat;
  if (heads.includes('exercise_title') && heads.includes('start_time')) format = 'columns';
  else if (heads.includes('exercise name') && heads.includes('date')) format = 'named';
  else if (heads.join(',').startsWith('date,time,workout,exercise,set,weight,unit,reps')) format = 'gymgo';
  else return null;

  const at = {
    name: col('title', 'workout name', 'workout'),
    start: col('start_time', 'date'),
    end: col('end_time'),
    time: format === 'gymgo' ? col('time') : -1,
    duration: col('duration'),
    exercise: col('exercise_title', 'exercise name', 'exercise'),
    kind: col('set_type', 'set order', 'type'),
    weightKg: col('weight_kg'),
    weightLb: col('weight_lbs', 'weight_lb'),
    weight: col('weight'),
    unit: col('unit'),
    reps: col('reps'),
    km: col('distance_km'),
    miles: col('distance_miles'),
    distance: col('distance'),
    seconds: col('duration_seconds', 'seconds'),
    metres: col('metres'),
    rpe: col('rpe'),
    note: col('description', 'workout notes', 'note'),
  };
  const unitInFile = format === 'columns' || format === 'gymgo';

  const matches = new Map<string, ExerciseMatch>();
  const sessions = new Map<string, ImportedSession & { order: string[]; byExercise: Map<string, LoggedSet[]> }>();
  for (const row of rows.slice(1)) {
    const exerciseName = get(row, at.exercise);
    if (!exerciseName) continue;
    // When: its start, and its end (or start plus how long; an hour when the file doesn't say).
    let start: Date | null;
    let end: Date | null = null;
    if (format === 'gymgo') {
      // GymGO's export has when it finished; an hour before that stands for the start.
      end = readDate(`${get(row, at.start)} ${get(row, at.time)}`);
      start = end ? new Date(end.getTime() - 3600_000) : null;
    } else {
      start = readDate(get(row, at.start));
      end = at.end >= 0 ? readDate(get(row, at.end)) : null;
      const lasted = at.duration >= 0 ? readDuration(get(row, at.duration)) : null;
      if (start && !end) end = new Date(start.getTime() + (lasted && lasted > 0 ? lasted * 1000 : 3600_000));
    }
    if (!start || !end) continue;
    if (end.getTime() < start.getTime()) end = start;
    if (end.getTime() - start.getTime() > 24 * 3600_000) end = new Date(start.getTime() + 24 * 3600_000 - 60_000);
    const name = (get(row, at.name) || 'Workout').replace(/\s+/g, ' ').slice(0, 80);
    const key = `${start.toISOString()}|${name}`;
    const rowUnit: WeightUnit =
      format === 'columns' ? (at.weightLb >= 0 && at.weightKg < 0 ? 'lb' : 'kg') : format === 'gymgo' ? (get(row, at.unit) === 'lb' ? 'lb' : get(row, at.unit) === 'kg' ? 'kg' : unit) : unit;
    let session = sessions.get(key);
    if (!session) {
      session = { name, unit: rowUnit, startedAt: start.toISOString(), finishedAt: end.toISOString(), note: null, exercises: [], order: [], byExercise: new Map() };
      sessions.set(key, session);
    }
    const note = get(row, at.note);
    if (note && !session.note) session.note = note.slice(0, 500);

    const match = matches.get(exerciseName) ?? matchExercise(exerciseName);
    matches.set(exerciseName, match);
    if (!match.exerciseId) continue;

    const weight = format === 'columns' ? number(get(row, at.weightKg >= 0 ? at.weightKg : at.weightLb)) : number(get(row, at.weight));
    const miles = at.miles >= 0 ? number(get(row, at.miles)) : null;
    const distanceKm = format === 'columns' ? (at.km >= 0 ? number(get(row, at.km)) : miles !== null ? miles * 1.609344 : null) : null;
    const metres =
      format === 'gymgo'
        ? number(get(row, at.metres))
        : format === 'columns'
          ? distanceKm !== null
            ? distanceKm * 1000
            : null
          : (() => {
              const distance = number(get(row, at.distance));
              return distance === null ? null : unit === 'lb' ? distance * 1609.344 : distance * 1000;
            })();
    const set = setOf({ weight, reps: number(get(row, at.reps)), seconds: number(get(row, at.seconds)), metres, kind: kindOf(get(row, at.kind)), rpe: number(get(row, at.rpe)) });
    if (!set) continue;
    if (!session.byExercise.has(match.exerciseId)) {
      if (session.order.length >= 40) continue;
      session.order.push(match.exerciseId);
      session.byExercise.set(match.exerciseId, []);
    }
    const sets = session.byExercise.get(match.exerciseId)!;
    if (sets.length < 30) sets.push(set);
  }

  const out: ImportedSession[] = [];
  let skipped = 0;
  for (const session of sessions.values()) {
    const exercises = session.order.map((exerciseId) => ({ exerciseId, sets: session.byExercise.get(exerciseId)! })).filter((item) => item.sets.length > 0);
    const logs = exercises.some((item) => item.sets.some((set) => set.kind !== 'warmup'));
    if (!logs || new Date(session.finishedAt).getTime() > now.getTime() + 5 * 60_000) {
      skipped += 1;
      continue;
    }
    out.push({ name: session.name, unit: session.unit, startedAt: session.startedAt, finishedAt: session.finishedAt, note: session.note, exercises });
  }
  out.sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
  return { format, sessions: out, matches: [...matches.values()], skipped, unitInFile };
}

/** Workouts already in your log (the same start, or for GymGO's own export the same finish, to the minute) left out. */
export function newSessions(imported: readonly ImportedSession[], log: ReadonlyArray<{ startedAt: string; finishedAt: string }>, format: ImportFormat): ImportedSession[] {
  const minute = (iso: string) => Math.floor(Date.parse(iso) / 60_000);
  const have = new Set(log.map((session) => minute(format === 'gymgo' ? session.finishedAt : session.startedAt)));
  return imported.filter((session) => !have.has(minute(format === 'gymgo' ? session.finishedAt : session.startedAt)));
}
