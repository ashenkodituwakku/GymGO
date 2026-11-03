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

/**
 * "62.5 kg", "135 lb": no trailing ".0", and a non-breaking space, as for
 * times and distances, so a wrapped line never leaves "100" at the end of
 * one line and "kg" at the start of the next.
 */
export function formatWeight(weight: number, unit: WeightUnit): string {
  return `${Number(weight.toFixed(2))}\u00a0${unit}`;
}

// --- What a session is ---------------------------------------------------------

/**
 * A set that isn't an ordinary working set: a warm-up (left out of records,
 * totals and set counts), a drop set (straight after the set before, lighter,
 * with no rest between) or a set taken to failure. An ordinary set has none.
 */
export type SetKind = 'warmup' | 'drop' | 'failure';
export const SET_KINDS: readonly SetKind[] = ['warmup', 'drop', 'failure'];
export const isSetKind = (value: unknown): value is SetKind => SET_KINDS.includes(value as SetKind);

/** How each type of set is shown and explained. */
export const SET_KIND_WORDS: Record<SetKind, { letter: string; label: string; spoken: string; about: string }> = {
  warmup: { letter: 'W', label: 'Warm-up', spoken: 'warm-up set', about: 'Lighter, before your working sets. Left out of records, totals and set counts.' },
  drop: { letter: 'D', label: 'Drop set', spoken: 'drop set', about: 'Straight after the set before, with less weight: no rest before it.' },
  failure: { letter: 'F', label: 'To failure', spoken: 'failure set', about: 'As many reps as you could do.' },
};

/**
 * What each set is called: on screen "W", "1", "2", "D" (ordinary sets
 * numbered among themselves), and to a screen reader "warm-up set 1",
 * "set 2", "drop set 1".
 */
export function setTags(sets: ReadonlyArray<{ kind?: SetKind }>): Array<{ tag: string; spoken: string }> {
  const counts: Record<SetKind | 'normal', number> = { normal: 0, warmup: 0, drop: 0, failure: 0 };
  return sets.map((set) => {
    const kind = set.kind ?? 'normal';
    counts[kind] += 1;
    if (kind === 'normal') return { tag: String(counts.normal), spoken: `set ${counts.normal}` };
    return { tag: SET_KIND_WORDS[kind].letter, spoken: `${SET_KIND_WORDS[kind].spoken} ${counts[kind]}` };
  });
}

/**
 * The sets with a warm-up ramp put before the first working set. Warm-ups
 * not yet done are replaced rather than added to, so asking twice (after
 * changing the working weight) doesn't double them.
 */
export function withWarmUps(sets: readonly DraftSet[], ramp: ReadonlyArray<{ weight: number; reps: number }>): DraftSet[] {
  const kept = sets.filter((set) => !(set.kind === 'warmup' && !set.done));
  const firstWork = kept.findIndex((set) => set.kind !== 'warmup');
  const at = firstWork < 0 ? kept.length : firstWork;
  const added: DraftSet[] = ramp.map((step) => ({ weight: String(Number(step.weight.toFixed(2))), reps: String(step.reps), done: false, kind: 'warmup' }));
  return [...kept.slice(0, at), ...added, ...kept.slice(at)];
}

/** Rate of perceived exertion, 6 to 10 in half steps: 10 is nothing left, 9 one more rep, 8 two more. */
export const RPE_VALUES: readonly number[] = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
export const isRpe = (value: unknown): value is number => typeof value === 'number' && RPE_VALUES.includes(value);

const RPE_MEANS: Record<string, string> = {
  '10': 'Nothing left',
  '9.5': 'Maybe one more rep',
  '9': 'One more rep left',
  '8.5': 'One or two more',
  '8': 'Two more reps left',
  '7.5': 'Two or three more',
  '7': 'Three more reps left',
  '6.5': 'Three or four more',
  '6': 'Four or more left',
};
/** What an RPE means, in reps you had left: 8 is "Two more reps left". */
export const rpeMeaning = (rpe: number) => RPE_MEANS[String(rpe)] ?? '';

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

/** How many warm-up sets were done. */
export const warmUpCount = (sets: ReadonlyArray<{ reps: number; kind?: SetKind }>) => sets.filter((set) => set.reps > 0 && set.kind === 'warmup').length;

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

/** What you could lift for `reps` (1 to 12), from a 1-rep max: the same formula turned round. */
export function repMax(oneRm: number, reps: number): number | null {
  if (!(oneRm > 0) || !(reps >= 1) || reps > 12) return null;
  return reps === 1 ? oneRm : oneRm / (1 + reps / 30);
}

/** The shares of your 1-rep max the calculator lists (Pro); Free shows the three most used. */
export const PERCENT_STEPS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50] as const;
export const FREE_PERCENTS: readonly number[] = [90, 80, 70];

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
      const working = workingSets(logged.sets);
      if (working.length) record.sessions += 1;
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
    const sets = logged ? workingSets(logged.sets) : [];
    if (sets.length) return { sets, unit: session.unit, date: session.finishedAt };
  }
  return null;
}

/** Reps without a weight: "12 reps", "12, 10 reps", "1 rep". */
export const repsWords = (reps: number[]) => `${reps.join(', ')} ${reps.length === 1 && reps[0] === 1 ? 'rep' : 'reps'}`;

/** One set's reps as a summary says them: "8", "7 to failure", "10 (drop)". */
const repsOf = (set: LoggedSet) => (set.kind === 'failure' ? `${set.reps} to failure` : set.kind === 'drop' ? `${set.reps} (drop)` : String(set.reps));

/**
 * "60 kg × 10, 10, 9", "12, 10 reps" for body weight, "60 kg × 10 · 62.5 kg
 * × 8". The working sets, saying which went to failure or were drop sets,
 * and how many warm-ups came first ("· 2 warm-ups").
 */
export function setsSummary(sets: LoggedSet[], unit: WeightUnit): string {
  const groups: Array<{ weight: number | null; sets: LoggedSet[] }> = [];
  for (const set of workingSets(sets)) {
    const last = groups[groups.length - 1];
    if (last && last.weight === set.weight) last.sets.push(set);
    else groups.push({ weight: set.weight, sets: [set] });
  }
  const parts = groups.map((group) => {
    if (group.weight) return `${formatWeight(group.weight, unit)} × ${group.sets.map(repsOf).join(', ')}`;
    const plain = group.sets.every((set) => !set.kind);
    return plain ? repsWords(group.sets.map((set) => set.reps)) : `${group.sets.map(repsOf).join(', ')} reps`;
  });
  const warmUps = warmUpCount(sets);
  if (warmUps) parts.push(`${warmUps} warm-up${warmUps === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

// --- What to aim for next ------------------------------------------------------

/**
 * The weight a set you haven't typed in stands for: the nearest earlier set's
 * this session (you mostly lift the same again), else `guess` (the target, or
 * last time's). Blank when there's nothing to go on. Without the earlier set,
 * typing 22.5 for set 1 and ticking set 2 logged set 2 with no weight at all.
 */
export function weightFor(sets: ReadonlyArray<{ weight: string; kind?: SetKind }>, at: number, guess: number | null): string {
  // A working set never takes a warm-up's (lighter) weight.
  const working = sets[at]?.kind !== 'warmup';
  for (let earlier = at - 1; earlier >= 0; earlier--) {
    if (working && sets[earlier]?.kind === 'warmup') continue;
    const typed = sets[earlier]?.weight.trim();
    if (typed) return typed;
  }
  return guess !== null ? String(guess) : '';
}

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

/** Every plate a gym might have, heaviest first: the standard set plus change plates. */
export const PLATE_CHOICES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5],
  lb: [55, 45, 35, 25, 15, 10, 5, 2.5, 1.25],
};

/** A set of plates you picked, kept to real plate sizes, heaviest first; null if nothing usable is left. */
export function cleanPlates(plates: unknown, unit: WeightUnit): number[] | null {
  if (!Array.isArray(plates)) return null;
  const allowed = new Set(PLATE_CHOICES[unit]);
  const kept = [...new Set(plates.filter((plate): plate is number => typeof plate === 'number' && allowed.has(plate)))].sort((a, b) => b - a);
  return kept.length ? kept : null;
}

export interface PlateLoad {
  bar: number;
  /** Heaviest first, for one side of the bar. */
  perSide: number[];
  /** What that loads to. */
  total: number;
  /** How far short of what you asked for, when the plates can't make it exactly. */
  short: number;
}

/** The plates for each side to load a barbell to `total`, from the standard set or the ones your gym has. */
export function plateLoad(total: number, unit: WeightUnit, bar = BAR[unit], plates: number[] = PLATES[unit]): PlateLoad {
  const perSide: number[] = [];
  let left = Math.max(0, (total - bar) / 2);
  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (left + 1e-9 >= plate) {
      perSide.push(plate);
      left -= plate;
    }
  }
  const loaded = bar + perSide.reduce((sum, plate) => sum + plate, 0) * 2;
  return { bar, perSide, total: loaded, short: Math.max(0, Number((total - loaded).toFixed(2))) };
}

export interface WarmUpSet {
  weight: number;
  reps: number;
  load: PlateLoad;
}

/**
 * A warm-up ramp to a working weight on a barbell: the empty bar for 10,
 * then about 40%, 60% and 80% for 5, 3 and 2, each rounded down to what
 * the plates can make. Steps that would land on the bar again, or on the
 * working weight, are left out, so a light working weight gets a short
 * ramp rather than repeats.
 */
export function warmUpSets(working: number, unit: WeightUnit, bar = BAR[unit], plates: number[] = PLATES[unit]): WarmUpSet[] {
  if (!(working > bar) || plates.length === 0) return [];
  const out: WarmUpSet[] = [{ weight: bar, reps: 10, load: plateLoad(bar, unit, bar, plates) }];
  for (const [share, reps] of [[0.4, 5], [0.6, 3], [0.8, 2]] as const) {
    // What the plates actually make at or under the share, so an odd set of plates still rounds down truly.
    const load = plateLoad(working * share, unit, bar, plates);
    const weight = Number(load.total.toFixed(2));
    if (weight <= out[out.length - 1]!.weight || weight >= working) continue;
    out.push({ weight, reps, load });
  }
  return out;
}

// --- Over time -------------------------------------------------------------------

/** Everything lifted in a session, in kg (weight × reps, body weight left out). */
export function volumeKg(session: TrainingSession): number {
  let sum = 0;
  for (const logged of session.exercises) for (const set of workingSets(logged.sets)) if (set.weight) sum += toKg(set.weight, session.unit) * set.reps;
  return sum;
}

/** Working sets in a session: warm-ups aren't counted. */
export const setCount = (session: TrainingSession) => session.exercises.reduce((sum, logged) => sum + workingSets(logged.sets).length, 0);

/**
 * Your best estimated one-rep max on each day you did the exercise, oldest
 * first: the line on a progress chart. Two sessions on one day (a morning
 * and an evening) make one point, the day's best, so the line never doubles
 * back on itself.
 */
export function e1rmSeries(sessions: TrainingSession[], exerciseId: string): Array<{ date: string; kg: number }> {
  const points: Array<{ date: string; kg: number; day: string }> = [];
  for (const session of [...sessions].sort(byDate)) {
    const logged = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!logged) continue;
    const best = Math.max(...workingSets(logged.sets).map((set) => (set.weight ? (oneRepMax(toKg(set.weight, session.unit), set.reps) ?? 0) : 0)), 0);
    if (best <= 0) continue;
    const day = dayKey(new Date(session.finishedAt));
    const previous = points[points.length - 1];
    if (previous?.day === day) {
      if (best > previous.kg) Object.assign(previous, { kg: best, date: session.finishedAt });
    } else points.push({ date: session.finishedAt, kg: best, day });
  }
  return points.map(({ date, kg }) => ({ date, kg }));
}

/** The local calendar day a moment falls on, as a key that sessions on the same day share. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export interface SessionDay {
  key: string;
  /** "Today", "Yesterday", or the date, with its year once it isn't this year. */
  label: string;
  sessions: TrainingSession[];
}

/**
 * The log split into the days you trained, keeping its order (newest first),
 * so a day with a morning and an evening session reads as one day, not two
 * rows repeating the same date. A session belongs to the day it finished, as
 * it does for the streak and the chart.
 */
export function sessionsByDay(sessions: TrainingSession[], now: Date = new Date()): SessionDay[] {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const days = new Map<string, SessionDay>();
  for (const session of sessions) {
    const finished = new Date(session.finishedAt);
    const key = dayKey(finished);
    let day = days.get(key);
    if (!day) {
      const label =
        key === today
          ? 'Today'
          : key === yesterday
            ? 'Yesterday'
            : finished.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: finished.getFullYear() === now.getFullYear() ? undefined : 'numeric',
              });
      day = { key, label, sessions: [] };
      days.set(key, day);
    }
    day.sessions.push(session);
  }
  return [...days.values()];
}

/** Monday of the week `date` falls in, at local midnight. */
function weekStart(date: Date): number {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day.getTime();
}

export interface Streak {
  /** Weeks you trained, in a row. */
  weeks: number;
  /** The Mondays of missed weeks a streak freeze carried the run through, newest first. */
  frozen: number[];
}

/**
 * Weeks in a row with at least one session. This week counts once you've
 * trained; until then the streak runs to last week, so it isn't lost on a
 * Monday morning.
 *
 * With `freezes` (Pro's streak freeze), a missed week doesn't end the run,
 * once in a calendar month, as long as you trained the week before it. The
 * frozen week keeps the run going; it doesn't add to it.
 */
export function streakOf(sessions: TrainingSession[], now: Date = new Date(), freezes = false): Streak {
  const weeks = new Set(sessions.map((session) => weekStart(new Date(session.finishedAt))));
  const cursor = new Date(weekStart(now));
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  const frozen: number[] = [];
  const months = new Set<string>();
  let streak = 0;
  for (;;) {
    if (weeks.has(cursor.getTime())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
      continue;
    }
    const before = new Date(cursor);
    before.setDate(before.getDate() - 7);
    const month = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    if (!freezes || months.has(month) || !weeks.has(before.getTime())) break;
    months.add(month);
    frozen.push(cursor.getTime());
    cursor.setTime(before.getTime());
  }
  return { weeks: streak, frozen };
}

export function weekStreak(sessions: TrainingSession[], now: Date = new Date()): number {
  return streakOf(sessions, now).weeks;
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

/** A rest, short: "45 s", "1 min", "1½ min", "2 min"; anything else as a clock ("1:40"). */
export function restLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  if (seconds % 60 === 30) return `${Math.floor(seconds / 60)}½ min`;
  return clockLabel(seconds);
}

/** "1:30"; past an hour, "1:05:30". */
export function clockLabel(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const secs = String(whole % 60).padStart(2, '0');
  if (whole < 3600) return `${Math.floor(whole / 60)}:${secs}`;
  return `${Math.floor(whole / 3600)}:${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')}:${secs}`;
}

/**
 * When a workout ended, for the log. Usually now; but if nothing has
 * changed for over an hour (it was left open, maybe overnight), it ended
 * with the last thing you did, not hours later.
 */
export function finishedAtFor(startedAt: string, lastActiveAt: string | undefined, now: Date = new Date()): string {
  const last = Date.parse(lastActiveAt ?? startedAt);
  if (Number.isFinite(last) && now.getTime() - last > 60 * 60_000) return new Date(last).toISOString();
  return now.toISOString();
}

const byDate = (a: TrainingSession, b: TrainingSession) => (a.finishedAt < b.finishedAt ? -1 : a.finishedAt > b.finishedAt ? 1 : 0);

// --- A session in progress -------------------------------------------------------

/** One set as it's being typed: text until it's done. */
export interface DraftSet {
  weight: string;
  reps: string;
  done: boolean;
  /** Absent for an ordinary set. */
  kind?: SetKind;
  rpe?: number;
}

/** "62.5", "62,5" or " 135 " → the number; blank → null (body weight); anything else → undefined. */
export function parseWeight(text: string): number | null | undefined {
  const clean = text.trim().replace(',', '.');
  if (!clean) return null;
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(clean)) return undefined;
  const value = Number(clean);
  return value > 0 && value <= 1500 ? value : clean === '0' ? null : undefined;
}

/** Whole reps, 0 to 200; anything else → undefined. */
export function parseReps(text: string): number | undefined {
  const clean = text.trim();
  if (!/^\d{1,3}$/.test(clean)) return undefined;
  const value = Number(clean);
  return value <= 200 ? value : undefined;
}

/**
 * Which ticked sets of an exercise beat your best, as you tick them: each
 * against your records from before this workout (`before`) and the sets
 * ticked above it, so only a set that's the best so far is marked. As
 * recordsBroken: an exercise's first time sets a baseline, not a record,
 * and a heavier weight counts first, then a stronger set.
 */
export function bestSoFar(sets: DraftSet[], unit: WeightUnit, before: ExerciseRecords | undefined): Array<NewRecord['kind'] | null> {
  if (!before || before.sessions === 0) return sets.map(() => null);
  let { heaviestKg, e1rmKg, mostReps } = before;
  return sets.map((set) => {
    // A warm-up is never a record.
    if (!set.done || set.kind === 'warmup') return null;
    const weight = parseWeight(set.weight);
    const reps = parseReps(set.reps);
    if (weight === undefined || reps === undefined || reps < 1) return null;
    if (weight === null) {
      if (mostReps === null || reps <= mostReps) return null;
      mostReps = reps;
      return 'reps';
    }
    const kg = toKg(weight, unit);
    const e1rm = oneRepMax(kg, reps);
    let kind: NewRecord['kind'] | null = null;
    if (heaviestKg !== null && kg > heaviestKg + 1e-6) kind = 'heaviest';
    else if (e1rmKg !== null && e1rm !== null && e1rm > e1rmKg + 1e-6) kind = 'e1rm';
    if (heaviestKg !== null) heaviestKg = Math.max(heaviestKg, kg);
    if (e1rmKg !== null && e1rm !== null) e1rmKg = Math.max(e1rmKg, e1rm);
    return kind;
  });
}

/** The sets you ticked, as they'll be kept. Sets left unticked, or unreadable, aren't logged. */
export function draftToLogged(items: Array<{ exerciseId: string; sets: DraftSet[] }>): LoggedExercise[] {
  return items
    .map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets.flatMap((set) => {
        if (!set.done) return [];
        const weight = parseWeight(set.weight);
        const reps = parseReps(set.reps);
        if (weight === undefined || reps === undefined || reps === 0) return [];
        return [{ weight, reps, ...(set.kind ? { kind: set.kind } : {}), ...(set.rpe !== undefined && isRpe(set.rpe) ? { rpe: set.rpe } : {}) }];
      }),
    }))
    .filter((item) => item.sets.length > 0);
}
