/**
 * Training: what you lifted, and what it adds up to. Sessions you log, your
 * records, what to aim for next time, and which plates to put on the bar.
 *
 * All of it is your own numbers, worked out here; nothing is estimated
 * from anyone else. A weight you didn't enter is body weight (null), never
 * zero. No React Native here, so it is unit-tested in Node.
 */

export type WeightUnit = 'kg' | 'lb';

export const LB_PER_KG = 2.20462262185;

/** Pounds where gyms load in pounds (the US and the two others that don't use metric); kilograms everywhere else. */
export function unitFor(country: string | null | undefined): WeightUnit {
  return country === 'US' || country === 'LR' || country === 'MM' ? 'lb' : 'kg';
}

export const toKg = (weight: number, unit: WeightUnit) => (unit === 'kg' ? weight : weight / LB_PER_KG);
export const fromKg = (kg: number, unit: WeightUnit) => (unit === 'kg' ? kg : kg * LB_PER_KG);

/** "62.5 kg", "135 lb": no trailing ".0". */
export function formatWeight(weight: number, unit: WeightUnit): string {
  return `${Number(weight.toFixed(2))} ${unit}`;
}

// --- What a session is ---------------------------------------------------------

export interface LoggedSet {
  /** In the session's unit; null is body weight (a push-up), not zero. */
  weight: number | null;
  reps: number;
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
}

// --- Strength ------------------------------------------------------------------

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
  sessions: number;
}

/** Your records for every exercise you've logged. */
export function personalRecords(sessions: TrainingSession[]): Map<string, ExerciseRecords> {
  const records = new Map<string, ExerciseRecords>();
  for (const session of [...sessions].sort(byDate)) {
    for (const logged of session.exercises) {
      const record = records.get(logged.exerciseId) ?? { e1rmKg: null, e1rmSet: null, heaviestKg: null, heaviestSet: null, mostReps: null, sessions: 0 };
      if (logged.sets.some((set) => set.reps > 0)) record.sessions += 1;
      for (const set of logged.sets) {
        if (set.reps < 1) continue;
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
      }
      records.set(logged.exerciseId, record);
    }
  }
  return records;
}

export interface NewRecord {
  exerciseId: string;
  kind: 'heaviest' | 'e1rm' | 'reps';
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
    if (mine.heaviestKg !== null && old.heaviestKg !== null && mine.heaviestKg > old.heaviestKg + 1e-6) broken.push({ exerciseId, kind: 'heaviest' });
    else if (mine.e1rmKg !== null && old.e1rmKg !== null && mine.e1rmKg > old.e1rmKg + 1e-6) broken.push({ exerciseId, kind: 'e1rm' });
    if (mine.mostReps !== null && old.mostReps !== null && mine.mostReps > old.mostReps) broken.push({ exerciseId, kind: 'reps' });
  }
  return broken;
}

/** The last time you did this exercise: its sets, in that session's unit. */
export function lastTime(sessions: TrainingSession[], exerciseId: string): { sets: LoggedSet[]; unit: WeightUnit; date: string } | null {
  for (const session of [...sessions].sort(byDate).reverse()) {
    const logged = session.exercises.find((item) => item.exerciseId === exerciseId);
    const sets = logged?.sets.filter((set) => set.reps > 0) ?? [];
    if (sets.length) return { sets, unit: session.unit, date: session.finishedAt };
  }
  return null;
}

/** "60 kg × 10, 10, 9", "× 12, 10" for body weight, "60 kg × 10 · 62.5 kg × 8". */
export function setsSummary(sets: LoggedSet[], unit: WeightUnit): string {
  const groups: Array<{ weight: number | null; reps: number[] }> = [];
  for (const set of sets) {
    const last = groups[groups.length - 1];
    if (last && last.weight === set.weight) last.reps.push(set.reps);
    else groups.push({ weight: set.weight, reps: [set.reps] });
  }
  return groups.map((group) => `${group.weight ? `${formatWeight(group.weight, unit)} ` : ''}× ${group.reps.join(', ')}`).join(' · ');
}

// --- What to aim for next ------------------------------------------------------

/** "8–10" → 8 to 10; "5" → 5 to 5; timed or distance work ("30–45 s") → null. */
export function repRange(reps: string): { low: number; high: number } | null {
  const match = /^(\d+)(?:\s*[–-]\s*(\d+))?$/.exec(reps.trim());
  if (!match) return null;
  const low = Number(match[1]);
  const high = match[2] ? Number(match[2]) : low;
  return low > 0 && high >= low ? { low, high } : null;
}

/** The smallest jump most gyms load: 2.5 kg (two 1.25 kg plates) or 5 lb (two 2.5 lb plates). */
export const INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

export interface Target {
  weight: number | null;
  reps: number;
  why: string;
}

/**
 * Next session's aim, by double progression: keep the weight until every
 * set reaches the top of the rep range, then add the smallest jump and go
 * back to the bottom of the range. Worked out from your last session only.
 */
export function nextTarget(last: { sets: LoggedSet[]; unit: WeightUnit } | null, reps: string, unit: WeightUnit): Target | null {
  const range = repRange(reps);
  if (!last || !range) return null;
  const done = last.sets.filter((set) => set.reps > 0);
  if (!done.length) return null;
  const weighted = done.filter((set) => set.weight !== null && set.weight > 0);
  if (!weighted.length) {
    const best = Math.max(...done.map((set) => set.reps));
    return { weight: null, reps: best + 1, why: `Last time your best set was ${best}. One more rep.` };
  }
  const top = Math.max(...weighted.map((set) => set.weight!));
  const atTop = weighted.filter((set) => set.weight === top);
  const inUnit = roundTo(fromKg(toKg(top, last.unit), unit), unit === 'kg' ? 0.25 : 0.5);
  if (atTop.every((set) => set.reps >= range.high)) {
    return {
      weight: inUnit + INCREMENT[unit],
      reps: range.low,
      why: `Every set at ${formatWeight(inUnit, unit)} reached ${range.high}: add ${formatWeight(INCREMENT[unit], unit)}.`,
    };
  }
  const aim = Math.min(range.high, Math.min(...atTop.map((set) => set.reps)) + 1);
  return { weight: inUnit, reps: aim, why: `Same weight; aim for ${aim} reps on every set, then add weight at ${range.high}.` };
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

// --- Plates --------------------------------------------------------------------

export const PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
export const BAR: Record<WeightUnit, number> = { kg: 20, lb: 45 };

export interface PlateLoad {
  bar: number;
  /** Heaviest first, for one side of the bar. */
  perSide: number[];
  /** What that loads to. */
  total: number;
  /** How far short of what you asked for, when the plates can't make it exactly. */
  short: number;
}

/** The plates for each side to load a barbell to `total`. */
export function plateLoad(total: number, unit: WeightUnit, bar = BAR[unit]): PlateLoad {
  const perSide: number[] = [];
  let left = Math.max(0, (total - bar) / 2);
  for (const plate of PLATES[unit]) {
    while (left + 1e-9 >= plate) {
      perSide.push(plate);
      left -= plate;
    }
  }
  const loaded = bar + perSide.reduce((sum, plate) => sum + plate, 0) * 2;
  return { bar, perSide, total: loaded, short: Math.max(0, Number((total - loaded).toFixed(2))) };
}

// --- Over time -------------------------------------------------------------------

/** Everything lifted in a session, in kg (weight × reps, body weight left out). */
export function volumeKg(session: TrainingSession): number {
  let sum = 0;
  for (const logged of session.exercises) for (const set of logged.sets) if (set.weight && set.reps > 0) sum += toKg(set.weight, session.unit) * set.reps;
  return sum;
}

export const setCount = (session: TrainingSession) => session.exercises.reduce((sum, logged) => sum + logged.sets.filter((set) => set.reps > 0).length, 0);

/** Your best estimated one-rep max in each session, oldest first: the line on a progress chart. */
export function e1rmSeries(sessions: TrainingSession[], exerciseId: string): Array<{ date: string; kg: number }> {
  const points: Array<{ date: string; kg: number }> = [];
  for (const session of [...sessions].sort(byDate)) {
    const logged = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!logged) continue;
    const best = Math.max(...logged.sets.map((set) => (set.weight ? (oneRepMax(toKg(set.weight, session.unit), set.reps) ?? 0) : 0)), 0);
    if (best > 0) points.push({ date: session.finishedAt, kg: best });
  }
  return points;
}

/** Monday of the week `date` falls in, at local midnight. */
function weekStart(date: Date): number {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day.getTime();
}

/**
 * Weeks in a row with at least one session. This week counts once you've
 * trained; until then the streak runs to last week, so it isn't lost on a
 * Monday morning.
 */
export function weekStreak(sessions: TrainingSession[], now: Date = new Date()): number {
  const weeks = new Set(sessions.map((session) => weekStart(new Date(session.finishedAt))));
  const cursor = new Date(weekStart(now));
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export function sessionsThisWeek(sessions: TrainingSession[], now: Date = new Date()): number {
  const start = weekStart(now);
  return sessions.filter((session) => weekStart(new Date(session.finishedAt)) === start).length;
}

/** "48 min", "1 h 5 min". */
export function durationLabel(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

/** "1:30". */
export function clockLabel(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

const byDate = (a: TrainingSession, b: TrainingSession) => (a.finishedAt < b.finishedAt ? -1 : a.finishedAt > b.finishedAt ? 1 : 0);
