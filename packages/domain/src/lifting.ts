/**
 * What a logged workout is, and what it adds up to: the sets that count,
 * an estimated one-rep max, personal records and a session's volume.
 *
 * Shared by the app (apps/mobile/src/lib/training.ts re-exports it, with the
 * rest of training there) and the server, which works out the records a
 * workout broke for the friends' feed, so a friend sees the same records you
 * do. Pure functions, no React Native, unit-tested in Node.
 */

export type WeightUnit = 'kg' | 'lb';

export const LB_PER_KG = 2.20462262185;

export const toKg = (weight: number, unit: WeightUnit) => (unit === 'kg' ? weight : weight / LB_PER_KG);
export const fromKg = (kg: number, unit: WeightUnit) => (unit === 'kg' ? kg : kg * LB_PER_KG);

/**
 * A set that isn't an ordinary working set: a warm-up (left out of records,
 * totals and set counts), a drop set (straight after the set before, lighter,
 * with no rest between) or a set taken to failure. An ordinary set has none.
 */
export type SetKind = 'warmup' | 'drop' | 'failure';

export interface LoggedSet {
  /** In the session's unit; null is body weight (a push-up), not zero. */
  weight: number | null;
  reps: number;
  /** Absent for an ordinary working set. */
  kind?: SetKind;
  /** How hard it was (RPE), when you chose to say. */
  rpe?: number;
  /**
   * How long, in whole seconds, for work done by the clock: a plank, a hold,
   * a row or a bike sprint. Its reps are then 0, and its weight is any added
   * (a plate on your back), else null.
   */
  seconds?: number;
  /** How far, in metres, for a carry or a run; reps 0 again, the weight carried if any. */
  metres?: number;
}

/** A set that was done: reps, or a time or distance for work that isn't counted in reps. */
export function isDoneSet(set: { reps: number; seconds?: number; metres?: number }): boolean {
  return set.reps > 0 || (set.seconds ?? 0) > 0 || (set.metres ?? 0) > 0;
}

/** Done by the clock or the tape, not in reps (a plank, a carry). */
export const isTimedSet = (set: { reps: number; seconds?: number; metres?: number }) => set.reps <= 0 && ((set.seconds ?? 0) > 0 || (set.metres ?? 0) > 0);

/**
 * The sets that count: done (reps above 0, or a time or distance) and not
 * warm-ups. Records, totals, set counts, muscle balance and "last time" use
 * only these.
 */
export function workingSets<T extends { reps: number; kind?: SetKind; seconds?: number; metres?: number }>(sets: readonly T[]): T[] {
  return sets.filter((set) => isDoneSet(set) && set.kind !== 'warmup');
}

/** A time, short: "45 s"; from a minute, a clock ("1:30", "1:05:00"). A non-breaking space, as for weights. */
export function secondsLabel(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  if (whole < 60) return `${whole}\u00a0s`;
  const secs = String(whole % 60).padStart(2, '0');
  if (whole < 3600) return `${Math.floor(whole / 60)}:${secs}`;
  return `${Math.floor(whole / 3600)}:${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')}:${secs}`;
}

/** A distance: "40 m"; from a kilometre, "1.2 km". */
export function distanceLabel(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)}\u00a0m`;
  return `${Number((metres / 1000).toFixed(2))}\u00a0km`;
}

export interface LoggedExercise {
  exerciseId: string;
  sets: LoggedSet[];
}

export interface TrainingSession {
  id: string;
  name: string;
  unit: WeightUnit;
  startedAt: string;
  finishedAt: string;
  workoutId: string | null;
  gymId: string | null;
  exercises: LoggedExercise[];
  /** Your note on how it went ("left knee sore"), added at Finish or later; absent or null when there's none. */
  note?: string | null;
  /** Kept from your friends' feed, when you share your workouts (absent from older servers). */
  hidden?: boolean;
  /** The tagged gym's name, as GymGO knows it (absent from older servers, and for a gym it doesn't know). */
  gymName?: string | null;
}

/**
 * The most you could lift once, estimated from a set (Epley). Reliable only
 * for lower reps, so past 12 there's no estimate rather than a poor one.
 */
export function oneRepMax(weightKg: number, reps: number): number | null {
  if (!(weightKg > 0) || !(reps >= 1) || reps > 12) return null;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export interface RecordSet {
  weight: number;
  reps: number;
  unit: WeightUnit;
  date: string;
}

export interface ExerciseRecords {
  /** The best estimated one-rep max, in kg, and the set it came from. */
  e1rmKg: number | null;
  e1rmSet: RecordSet | null;
  /** The heaviest weight lifted for at least one rep. */
  heaviestKg: number | null;
  heaviestSet: RecordSet | null;
  /** The most reps in one body-weight set. */
  mostReps: number | null;
  /** The biggest single set by volume (weight × reps), in kg, and the set. */
  setVolumeKg: number | null;
  setVolumeSet: RecordSet | null;
  /** The most lifted in one session (every working set's weight × reps), in kg, and when. */
  sessionVolumeKg: number | null;
  sessionVolumeDate: string | null;
  /** The longest set by the clock (a plank), in seconds, and when. */
  longestSeconds: number | null;
  longestDate: string | null;
  /** The furthest set (a carry), in metres, and when. */
  furthestMetres: number | null;
  furthestDate: string | null;
  sessions: number;
}

/** Your records for every exercise you've logged. */
export function personalRecords(sessions: TrainingSession[]): Map<string, ExerciseRecords> {
  const records = new Map<string, ExerciseRecords>();
  for (const session of [...sessions].sort(byFinish)) {
    for (const logged of session.exercises) {
      const record =
        records.get(logged.exerciseId) ??
        ({
          e1rmKg: null,
          e1rmSet: null,
          heaviestKg: null,
          heaviestSet: null,
          mostReps: null,
          setVolumeKg: null,
          setVolumeSet: null,
          sessionVolumeKg: null,
          sessionVolumeDate: null,
          longestSeconds: null,
          longestDate: null,
          furthestMetres: null,
          furthestDate: null,
          sessions: 0,
        } satisfies ExerciseRecords);
      const working = workingSets(logged.sets);
      if (working.length) record.sessions += 1;
      let sessionKg = 0;
      for (const set of working) {
        // By the clock or the tape: its own records, never a weight's (a 10 kg plate on a plank isn't a 10 kg lift).
        if (isTimedSet(set)) {
          if (set.seconds && (record.longestSeconds === null || set.seconds > record.longestSeconds)) {
            record.longestSeconds = set.seconds;
            record.longestDate = session.finishedAt;
          }
          if (set.metres && (record.furthestMetres === null || set.metres > record.furthestMetres)) {
            record.furthestMetres = set.metres;
            record.furthestDate = session.finishedAt;
          }
          continue;
        }
        if (set.weight === null || set.weight <= 0) {
          if (record.mostReps === null || set.reps > record.mostReps) record.mostReps = set.reps;
          continue;
        }
        const kg = toKg(set.weight, session.unit);
        const at = { weight: set.weight, reps: set.reps, unit: session.unit, date: session.finishedAt };
        if (record.heaviestKg === null || kg > record.heaviestKg + 1e-9) {
          record.heaviestKg = kg;
          record.heaviestSet = at;
        }
        const e1rm = oneRepMax(kg, set.reps);
        if (e1rm !== null && (record.e1rmKg === null || e1rm > record.e1rmKg + 1e-9)) {
          record.e1rmKg = e1rm;
          record.e1rmSet = at;
        }
        const volume = kg * set.reps;
        sessionKg += volume;
        if (record.setVolumeKg === null || volume > record.setVolumeKg + 1e-9) {
          record.setVolumeKg = volume;
          record.setVolumeSet = at;
        }
      }
      if (sessionKg > 0 && (record.sessionVolumeKg === null || sessionKg > record.sessionVolumeKg + 1e-9)) {
        record.sessionVolumeKg = sessionKg;
        record.sessionVolumeDate = session.finishedAt;
      }
      records.set(logged.exerciseId, record);
    }
  }
  return records;
}

export interface NewRecord {
  exerciseId: string;
  /** Heaviest weight; strongest set (estimated 1-rep max); biggest set (weight × reps); most reps at body weight; longest by the clock; furthest. */
  kind: 'heaviest' | 'e1rm' | 'volume' | 'reps' | 'longest' | 'furthest';
}

/**
 * The records this session broke. Only against what you'd done before: the
 * first time you log an exercise sets a baseline, not a record.
 */
export function recordsBroken(session: TrainingSession, earlier: TrainingSession[]): NewRecord[] {
  const before = personalRecords(earlier.filter((item) => item.id !== session.id));
  const now = personalRecords([session]);
  const broken: NewRecord[] = [];
  for (const [exerciseId, mine] of now) {
    const old = before.get(exerciseId);
    if (!old || old.sessions === 0) continue;
    // One weighted record an exercise: the heaviest lift says the most, then the strongest set, then the biggest.
    if (mine.heaviestKg !== null && old.heaviestKg !== null && mine.heaviestKg > old.heaviestKg + 1e-6) broken.push({ exerciseId, kind: 'heaviest' });
    else if (mine.e1rmKg !== null && old.e1rmKg !== null && mine.e1rmKg > old.e1rmKg + 1e-6) broken.push({ exerciseId, kind: 'e1rm' });
    else if (mine.setVolumeKg !== null && old.setVolumeKg !== null && mine.setVolumeKg > old.setVolumeKg + 1e-6) broken.push({ exerciseId, kind: 'volume' });
    if (mine.mostReps !== null && old.mostReps !== null && mine.mostReps > old.mostReps) broken.push({ exerciseId, kind: 'reps' });
    if (mine.longestSeconds !== null && old.longestSeconds !== null && mine.longestSeconds > old.longestSeconds) broken.push({ exerciseId, kind: 'longest' });
    if (mine.furthestMetres !== null && old.furthestMetres !== null && mine.furthestMetres > old.furthestMetres) broken.push({ exerciseId, kind: 'furthest' });
  }
  return broken;
}

/** Everything lifted in a session, in kg (weight × reps, body weight left out). */
export function volumeKg(session: TrainingSession): number {
  let sum = 0;
  for (const logged of session.exercises) for (const set of workingSets(logged.sets)) if (set.weight) sum += toKg(set.weight, session.unit) * set.reps;
  return sum;
}

/** Working sets in a session: warm-ups aren't counted. */
export const setCount = (session: TrainingSession) => session.exercises.reduce((sum, logged) => sum + workingSets(logged.sets).length, 0);

/** Oldest first, by when each finished. */
export const byFinish = (a: { finishedAt: string }, b: { finishedAt: string }) => (a.finishedAt < b.finishedAt ? -1 : a.finishedAt > b.finishedAt ? 1 : 0);
