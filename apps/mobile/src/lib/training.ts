/**
 * Training: what you lifted, and what it adds up to. Sessions you log, your
 * records, what to aim for next time, and which plates to put on the bar.
 *
 * All of it is your own numbers, worked out here; nothing is estimated
 * from anyone else. A weight you didn't enter is body weight (null), never
 * zero. No React Native here, so it is unit-tested in Node.
 */

import {
  LB_PER_KG,
  byFinish as byDate,
  distanceLabel,
  fromKg,
  isDoneSet,
  isTimedSet,
  oneRepMax,
  secondsLabel,
  toKg,
  workingSets,
  type ExerciseRecords,
  type LoggedExercise,
  type LoggedSet,
  type NewRecord,
  type RecordSet,
  type SetKind,
  type TrainingSession,
  type WeightUnit,
} from '@gymgo/domain';

// What a session is and its records are shared with the server (packages/domain/src/lifting.ts), so friends see the same records you do.
export {
  LB_PER_KG,
  distanceLabel,
  fromKg,
  isDoneSet,
  isTimedSet,
  oneRepMax,
  personalRecords,
  recordsBroken,
  setCount,
  secondsLabel,
  toKg,
  volumeKg,
  workingSets,
  type ExerciseRecords,
  type LoggedExercise,
  type LoggedSet,
  type NewRecord,
  type RecordSet,
  type SetKind,
  type TrainingSession,
  type WeightUnit,
} from '@gymgo/domain';

/** Pounds where gyms load in pounds (the US and the two others that don't use metric); kilograms everywhere else. */
export function unitFor(country: string | null | undefined): WeightUnit {
  return country === 'US' || country === 'LR' || country === 'MM' ? 'lb' : 'kg';
}

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
export const SET_KINDS: readonly SetKind[] = ['warmup', 'drop', 'failure'];
/** How each type of set is shown and explained. */
export const SET_KIND_WORDS: Record<SetKind, { letter: string; label: string; spoken: string; about: string }> = {
  warmup: { letter: 'W', label: 'Warm-up', spoken: 'warm-up set', about: 'Lighter, before your working sets. Left out of records, totals and set counts.' },
  drop: { letter: 'D', label: 'Drop set', spoken: 'drop set', about: 'Done straight after the previous set with less weight, without resting.' },
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

/** How many warm-up sets were done. */
export const warmUpCount = (sets: ReadonlyArray<{ reps: number; kind?: SetKind; seconds?: number; metres?: number }>) => sets.filter((set) => isDoneSet(set) && set.kind === 'warmup').length;

// --- Strength ------------------------------------------------------------------

/** What you could lift for `reps` (1 to 12), from a 1-rep max: the same formula turned round. */
export function repMax(oneRm: number, reps: number): number | null {
  if (!(oneRm > 0) || !(reps >= 1) || reps > 12) return null;
  return reps === 1 ? oneRm : oneRm / (1 + reps / 30);
}

/** The shares of your 1-rep max the calculator lists (Pro); Free shows the three most used. */
export const PERCENT_STEPS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50] as const;
export const FREE_PERCENTS: readonly number[] = [90, 80, 70];

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
 * One set by the clock or the tape: "1:30", "45 s", "20 kg · 1:00" (a plate
 * on a plank), "24 kg × 40 m" (a carry), "400 m in 1:45".
 */
export function timedSetLine(set: LoggedSet, unit: WeightUnit, clock = false): string {
  const weight = set.weight !== null && set.weight > 0 ? formatWeight(set.weight, unit) : null;
  // In a list with a minute or more in it, every time as a clock ("1:15, 0:45"), not "1:15, 45 s".
  const said = (seconds: number) => (clock ? clockLabel(seconds) : secondsLabel(seconds));
  if (set.metres) {
    const far = distanceLabel(set.metres);
    const line = set.seconds ? `${far} in ${said(set.seconds)}` : far;
    return weight ? `${weight} × ${line}` : line;
  }
  const time = said(set.seconds ?? 0);
  return weight ? `${weight} · ${time}` : time;
}

/** Any one set, as a line: "100 kg × 5", "12 reps", "1:30", "24 kg × 40 m". */
export function setLine(set: LoggedSet, unit: WeightUnit): string {
  if (isTimedSet(set)) return timedSetLine(set, unit);
  return set.weight !== null && set.weight > 0 ? `${formatWeight(set.weight, unit)} × ${set.reps}` : repsWords([set.reps]);
}

/**
 * "60 kg × 10, 10, 9", "12, 10 reps" for body weight, "60 kg × 10 · 62.5 kg
 * × 8". The working sets, saying which went to failure or were drop sets,
 * and how many warm-ups came first ("· 2 warm-ups"). Sets by the clock or
 * the tape say their time or distance ("0:45, 1:00").
 */
export function setsSummary(sets: LoggedSet[], unit: WeightUnit): string {
  const timed = workingSets(sets).filter(isTimedSet);
  if (timed.length > 0) {
    const clock = timed.length > 1 && timed.some((set) => (set.seconds ?? 0) >= 60);
    const parts = timed.map((set) => timedSetLine(set, unit, clock));
    const warmUps = warmUpCount(sets);
    if (warmUps) parts.push(`${warmUps} warm-up${warmUps === 1 ? '' : 's'}`);
    return parts.join(', ');
  }
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

/** How a weighted exercise is loaded, for its warm-ups: a bar and plates, a pair of dumbbells, or a machine's stack. */
export type WarmUpKit = 'barbell' | 'dumbbell' | 'machine';

/** The smallest jump dumbbells and a weight stack usually make. */
export const WARM_UP_STEP: Record<Exclude<WarmUpKit, 'barbell'>, Record<WeightUnit, number>> = {
  dumbbell: { kg: 2.5, lb: 5 },
  machine: { kg: 5, lb: 10 },
};

/**
 * Warm-ups for dumbbells or a machine: about half the working weight for
 * 8, then three quarters for 4, each rounded down to a step the kit can
 * make. Two sets, not a barbell's four, as there's no empty bar to start
 * from. A step that rounds to nothing, repeats or reaches the working
 * weight is left out, so a light weight gets one warm-up or none.
 */
export function stepWarmUps(working: number, unit: WeightUnit, kit: Exclude<WarmUpKit, 'barbell'>): Array<{ weight: number; reps: number }> {
  const step = WARM_UP_STEP[kit][unit];
  const out: Array<{ weight: number; reps: number }> = [];
  if (!(working > 0)) return out;
  for (const [share, reps] of [[0.5, 8], [0.75, 4]] as const) {
    const weight = Number((Math.floor((working * share) / step + 1e-9) * step).toFixed(2));
    if (weight <= 0 || weight >= working || (out.length > 0 && weight <= out[out.length - 1]!.weight)) continue;
    out.push({ weight, reps });
  }
  return out;
}

/**
 * One exercise over your whole log: its working sets, the reps in them (a
 * hold's or carry's sets count as sets, not reps), the weight lifted
 * (weight × reps, in kg; body weight left out) and when you last did it.
 */
export function exerciseTotals(sessions: readonly TrainingSession[], exerciseId: string): { sets: number; reps: number; volumeKg: number; last: string | null } {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  let last: string | null = null;
  for (const session of sessions) {
    let did = false;
    for (const logged of session.exercises) {
      if (logged.exerciseId !== exerciseId) continue;
      for (const set of workingSets(logged.sets)) {
        did = true;
        sets += 1;
        if (isTimedSet(set)) continue;
        reps += set.reps;
        if (set.weight && set.weight > 0) volume += toKg(set.weight, session.unit) * set.reps;
      }
    }
    if (did && (last === null || session.finishedAt > last)) last = session.finishedAt;
  }
  return { sets, reps, volumeKg: volume, last };
}

// --- Over time -------------------------------------------------------------------

/** What an exercise's chart can follow over time. */
export type ExerciseMetric = 'e1rm' | 'heaviest' | 'setVolume' | 'sessionVolume' | 'reps' | 'longest' | 'furthest';

export const EXERCISE_METRICS: ReadonlyArray<{ id: ExerciseMetric; label: string; title: string; about: string }> = [
  { id: 'e1rm', label: '1-rep max', title: 'Estimated 1-rep max', about: 'Each point is your best set that day, as an estimated 1-rep max (sets of 12 reps or fewer).' },
  { id: 'heaviest', label: 'Heaviest', title: 'Heaviest weight', about: 'Each point is the heaviest weight you lifted that day, for any reps.' },
  { id: 'setVolume', label: 'Best set', title: 'Best set (weight × reps)', about: 'Your biggest set each day, measured as weight times reps.' },
  { id: 'sessionVolume', label: 'Volume', title: 'Weight lifted that day', about: 'All your working sets each day, added up as weight times reps.' },
  { id: 'reps', label: 'Reps', title: 'Reps that day', about: 'Each point is every working rep you did that day.' },
];

/** The charts for work by the clock (a plank) or the tape (a carry). */
export const TIMED_METRICS: ReadonlyArray<{ id: ExerciseMetric; label: string; title: string; about: string }> = [
  { id: 'longest', label: 'Longest', title: 'Longest set', about: 'Each point is your longest set that day, in seconds.' },
  { id: 'furthest', label: 'Furthest', title: 'Furthest set', about: 'Each point is your furthest set that day, in metres.' },
];

/** One session's value for a metric, in kg (or reps); 0 when it has none (a body-weight set has no weight). */
function sessionValue(sets: LoggedSet[], unit: WeightUnit, metric: ExerciseMetric): number {
  const all = workingSets(sets);
  // A weight's charts count lifts in reps; a plank's plate isn't a lift.
  const working = metric === 'longest' || metric === 'furthest' ? all : all.filter((set) => !isTimedSet(set));
  const kgOf = (set: LoggedSet) => (set.weight && set.weight > 0 ? toKg(set.weight, unit) : 0);
  switch (metric) {
    case 'e1rm':
      return Math.max(0, ...working.map((set) => (kgOf(set) ? (oneRepMax(kgOf(set), set.reps) ?? 0) : 0)));
    case 'heaviest':
      return Math.max(0, ...working.map(kgOf));
    case 'setVolume':
      return Math.max(0, ...working.map((set) => kgOf(set) * set.reps));
    case 'sessionVolume':
      return working.reduce((sum, set) => sum + kgOf(set) * set.reps, 0);
    case 'reps':
      return working.reduce((sum, set) => sum + set.reps, 0);
    case 'longest':
      return Math.max(0, ...working.map((set) => (isTimedSet(set) ? (set.seconds ?? 0) : 0)));
    case 'furthest':
      return Math.max(0, ...working.map((set) => (isTimedSet(set) ? (set.metres ?? 0) : 0)));
  }
}

/**
 * A metric on each day you did the exercise, oldest first: the line on its
 * chart. Two sessions on one day (a morning and an evening) make one point,
 * so the line never doubles back on itself: the day's best for a best
 * (1-rep max, heaviest, best set), the two added up for a total (volume,
 * reps). A day with nothing to count (no weight, for a weight) is left out.
 */
export function exerciseSeries(sessions: TrainingSession[], exerciseId: string, metric: ExerciseMetric = 'e1rm'): Array<{ date: string; kg: number }> {
  const total = metric === 'sessionVolume' || metric === 'reps';
  const points: Array<{ date: string; kg: number; day: string }> = [];
  for (const session of [...sessions].sort(byDate)) {
    const logged = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!logged) continue;
    const value = sessionValue(logged.sets, session.unit, metric);
    if (value <= 0) continue;
    const day = dayKey(new Date(session.finishedAt));
    const previous = points[points.length - 1];
    if (previous?.day === day) {
      if (total) Object.assign(previous, { kg: previous.kg + value, date: session.finishedAt });
      else if (value > previous.kg) Object.assign(previous, { kg: value, date: session.finishedAt });
    } else points.push({ date: session.finishedAt, kg: value, day });
  }
  return points.map(({ date, kg }) => ({ date, kg }));
}

/** Your best estimated one-rep max on each day you did the exercise, oldest first (`exerciseSeries`'s first chart). */
export const e1rmSeries = (sessions: TrainingSession[], exerciseId: string) => exerciseSeries(sessions, exerciseId, 'e1rm');

export interface RepRecord {
  reps: number;
  kg: number;
  set: RecordSet;
}

/**
 * The heaviest you've lifted for each number of reps (1 to 20), fewest
 * reps first: your rep records. A heavier set for more reps also beats the
 * fewer, so a row only shows when nothing heavier was done for more reps
 * (100 kg × 5 makes 95 kg × 3 no record at all).
 */
export function repRecords(sessions: TrainingSession[], exerciseId: string): RepRecord[] {
  const best = new Map<number, RepRecord>();
  for (const session of [...sessions].sort(byDate)) {
    for (const logged of session.exercises) {
      if (logged.exerciseId !== exerciseId) continue;
      for (const set of workingSets(logged.sets)) {
        if (!set.weight || set.weight <= 0 || set.reps < 1 || set.reps > 20) continue;
        const kg = toKg(set.weight, session.unit);
        const now = best.get(set.reps);
        if (!now || kg > now.kg + 1e-9) best.set(set.reps, { reps: set.reps, kg, set: { weight: set.weight, reps: set.reps, unit: session.unit, date: session.finishedAt } });
      }
    }
  }
  const rows = [...best.values()].sort((a, b) => a.reps - b.reps);
  return rows.filter((row) => !rows.some((other) => other.reps > row.reps && other.kg >= row.kg - 1e-9));
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

/** A time as a screen reader should say it: "42 seconds", "1 minute 5 seconds", "1 hour 2 minutes". */
export function spokenClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const parts: Array<[number, string]> = [
    [Math.floor(whole / 3600), 'hour'],
    [Math.floor((whole % 3600) / 60), 'minute'],
    [whole % 60, 'second'],
  ];
  const said = parts.filter(([count]) => count > 0).map(([count, unit]) => `${count} ${unit}${count === 1 ? '' : 's'}`);
  return said.length ? said.join(' ') : '0 seconds';
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


// --- A session in progress -------------------------------------------------------

/** One set as it's being typed: text until it's done. */
export interface DraftSet {
  weight: string;
  reps: string;
  done: boolean;
  /** Absent for an ordinary set. */
  kind?: SetKind;
  rpe?: number;
  /** For work by the clock: the time as typed ("1:30", "90"). */
  time?: string;
  /** For a carry or a run: the distance as typed, in metres ("40", "1.2 km"). */
  distance?: string;
}

/** How a set of an exercise is measured: reps, a time (a plank, a bike sprint) or a distance (a carry). */
export type SetMeasure = 'reps' | 'time' | 'distance';

/** Six hours: no set lasts longer. */
const MAX_SECONDS = 6 * 3600;

/**
 * A typed time, in whole seconds: "90" or "90 s" is 90, "1:30" is 90,
 * "1:05:00" is 3,900, "2 min" is 120, "1m 30s" is 90. Blank or unreadable,
 * or over six hours, is undefined.
 */
export function parseTime(text: string): number | undefined {
  const clean = text.trim().toLowerCase().replace(',', '.');
  if (!clean) return undefined;
  let seconds: number | undefined;
  const clock = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})$/.exec(clean);
  const words = /^(?:(\d{1,3})\s*(?:m|min|mins|minutes?))?\s*(?:(\d{1,4})\s*(?:s|sec|secs|seconds?))?$/.exec(clean);
  if (clock) {
    const secs = Number(clock[3]);
    if (secs < 60) seconds = Number(clock[1] ?? 0) * 3600 + Number(clock[2]) * 60 + secs;
  } else if (/^\d{1,5}$/.test(clean)) seconds = Number(clean);
  else if (/^\d{1,3}(\.\d)?\s*(m|min|mins|minutes?)$/.test(clean)) seconds = Math.round(parseFloat(clean) * 60);
  else if (words && (words[1] || words[2])) seconds = Number(words[1] ?? 0) * 60 + Number(words[2] ?? 0);
  return seconds !== undefined && seconds >= 1 && seconds <= MAX_SECONDS ? seconds : undefined;
}

/** A typed time tidied to a clock ("90" → "1:30", "45" → "0:45"); anything unreadable comes back as typed. */
export function tidyTime(text: string): string {
  const seconds = parseTime(text);
  return seconds === undefined ? text : clockLabel(seconds);
}

/**
 * A typed distance, in metres: "40" or "40 m" is 40, "1.2 km" is 1,200,
 * "0,4km" is 400. Whole metres, 1 m to 100 km; anything else is undefined.
 */
export function parseDistance(text: string): number | undefined {
  const clean = text.trim().toLowerCase().replace(',', '.');
  const match = /^(\d{1,6}(?:\.\d{1,3})?)\s*(m|metres?|meters?|km|kms|kilometres?|kilometers?)?$/.exec(clean);
  if (!match) return undefined;
  const value = Number(match[1]) * (match[2]?.startsWith('k') ? 1000 : 1);
  const metres = Math.round(value);
  return metres >= 1 && metres <= 100_000 ? metres : undefined;
}

/** A typed distance tidied to whole metres ("1.2 km" → "1200"); unreadable comes back as typed. */
export function tidyDistance(text: string): string {
  const metres = parseDistance(text);
  return metres === undefined ? text : String(metres);
}

/**
 * A typed number's comma, read as people write it: "62,5" and "2,25" are a
 * decimal comma, but a comma before groups of three digits groups them, so
 * "1,000" and "1,200.5" are over a thousand (a pound workout's leg press).
 * Read as a point, "1,000" was 1, and 1 is a weight, so nothing said so.
 */
function decimalPoint(text: string): string {
  return /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.');
}

/** "62.5", "62,5", "1,000" or " 135 " → the number; blank → null (body weight); anything else → undefined. */
export function parseWeight(text: string): number | null | undefined {
  const clean = decimalPoint(text.trim());
  if (!clean) return null;
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(clean)) return undefined;
  const value = Number(clean);
  return value > 0 && value <= 1500 ? value : clean === '0' ? null : undefined;
}

/**
 * What was typed in a weight box, tidied into a plain number in your unit,
 * accepting what people type rather than refusing it: "62.5 kg", "62,5kg",
 * "1,000 lb" and "100." read as 62.5, 62.5, 1000 and 100; "135 lb" in a kg workout (or
 * "60 kg" in a pound one) is converted, to a tenth. Anything that still
 * isn't a weight comes back as typed, so the box's own hint shows.
 */
export function tidyWeight(text: string, unit: WeightUnit): string {
  let clean = text.trim().toLowerCase();
  const named = /\s*(kgs?|kilos?|kilograms?)$/.exec(clean) ? 'kg' : /\s*(lbs?|pounds?)$/.exec(clean) ? 'lb' : null;
  clean = decimalPoint(clean.replace(/\s*(kgs?|kilos?|kilograms?|lbs?|pounds?)$/, '').trim()).replace(/\.$/, '');
  if (!/^\d{1,4}(\.\d+)?$/.test(clean)) return text;
  let value = Number(clean);
  if (named && named !== unit) value = named === 'lb' ? value / LB_PER_KG : value * LB_PER_KG;
  // Two places at most, as the box keeps (a conversion to a tenth).
  value = named && named !== unit ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;
  return String(value);
}

/** What was typed in a reps box, tidied: "8 reps", "8x", "x8" or "08" read as 8. Anything else comes back as typed. */
export function tidyReps(text: string): string {
  const clean = text.trim().toLowerCase().replace(/^[x×]\s*/, '').replace(/\s*(reps?|[x×])$/, '').trim();
  // "08" is 8.
  return /^\d{1,3}$/.test(clean) ? String(Number(clean)) : text;
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
export function bestSoFar(sets: DraftSet[], unit: WeightUnit, before: ExerciseRecords | undefined, measure: SetMeasure = 'reps'): Array<NewRecord['kind'] | null> {
  if (!before || before.sessions === 0) return sets.map(() => null);
  let { heaviestKg, e1rmKg, mostReps, setVolumeKg, longestSeconds, furthestMetres } = before;
  return sets.map((set) => {
    // A warm-up is never a record.
    if (!set.done || set.kind === 'warmup') return null;
    // By the clock or the tape: longer or further than ever, against a time or distance you'd logged before.
    if (measure === 'time') {
      const seconds = parseTime(set.time ?? '');
      if (seconds === undefined || longestSeconds === null || seconds <= longestSeconds) return null;
      longestSeconds = seconds;
      return 'longest';
    }
    if (measure === 'distance') {
      const metres = parseDistance(set.distance ?? '');
      if (metres === undefined || furthestMetres === null || metres <= furthestMetres) return null;
      furthestMetres = metres;
      return 'furthest';
    }
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
    const volume = kg * reps;
    let kind: NewRecord['kind'] | null = null;
    if (heaviestKg !== null && kg > heaviestKg + 1e-6) kind = 'heaviest';
    else if (e1rmKg !== null && e1rm !== null && e1rm > e1rmKg + 1e-6) kind = 'e1rm';
    else if (setVolumeKg !== null && volume > setVolumeKg + 1e-6) kind = 'volume';
    if (heaviestKg !== null) heaviestKg = Math.max(heaviestKg, kg);
    if (e1rmKg !== null && e1rm !== null) e1rmKg = Math.max(e1rmKg, e1rm);
    if (setVolumeKg !== null) setVolumeKg = Math.max(setVolumeKg, volume);
    return kind;
  });
}

/** The sets you ticked, as they'll be kept. Sets left unticked, or unreadable, aren't logged. */
export function draftToLogged(items: Array<{ exerciseId: string; sets: DraftSet[]; measure?: SetMeasure }>): LoggedExercise[] {
  return items
    .map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets.flatMap((set): LoggedSet[] => {
        if (!set.done) return [];
        const weight = parseWeight(set.weight);
        if (item.measure === 'time' || item.measure === 'distance') {
          // A time or distance, and any weight added or carried; reps 0. Without one it isn't logged.
          const seconds = parseTime(set.time ?? '');
          // A carry's distance, or one given beside a time (a rower's metres): optional there, and left out if it doesn't read.
          const typedDistance = (set.distance ?? '').trim();
          const metres = item.measure === 'distance' || typedDistance ? parseDistance(typedDistance) : undefined;
          if (weight === undefined || (item.measure === 'time' ? seconds === undefined : metres === undefined)) return [];
          return [{ weight, reps: 0, ...(seconds !== undefined ? { seconds } : {}), ...(metres !== undefined ? { metres } : {}), ...(set.kind ? { kind: set.kind } : {}) }];
        }
        const reps = parseReps(set.reps);
        if (weight === undefined || reps === undefined || reps === 0) return [];
        // A warm-up is meant to be easy: no RPE, even one given before it was made a warm-up.
        return [{ weight, reps, ...(set.kind ? { kind: set.kind } : {}), ...(set.rpe !== undefined && isRpe(set.rpe) && set.kind !== 'warmup' ? { rpe: set.rpe } : {}) }];
      }),
    }))
    .filter((item) => item.sets.length > 0);
}
