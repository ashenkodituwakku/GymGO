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
}

/**
 * The sets that count: done (reps above 0) and not warm-ups. Records,
 * totals, set counts, muscle balance and "last time" use only these.
 */
export function workingSets<T extends { reps: number; kind?: SetKind }>(sets: readonly T[]): T[] {
  return sets.filter((set) => set.reps > 0 && set.kind !== 'warmup');
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
  sessions: number;
}

/** Your records for every exercise you've logged. */
export function personalRecords(sessions: TrainingSession[]): Map<string, ExerciseRecords> {
  const records = new Map<string, ExerciseRecords>();
  for (const session of [...sessions].sort(byFinish)) {
    for (const logged of session.exercises) {
      const record =
        records.get(logged.exerciseId) ??
        ({ e1rmKg: null, e1rmSet: null, heaviestKg: null, heaviestSet: null, mostReps: null, setVolumeKg: null, setVolumeSet: null, sessionVolumeKg: null, sessionVolumeDate: null, sessions: 0 } satisfies ExerciseRecords);
      const working = workingSets(logged.sets);
      if (working.length) record.sessions += 1;
      let sessionKg = 0;
      for (const set of working) {
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
  /** Heaviest weight; strongest set (estimated 1-rep max); biggest set (weight × reps); most reps at body weight. */
  kind: 'heaviest' | 'e1rm' | 'volume' | 'reps';
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
