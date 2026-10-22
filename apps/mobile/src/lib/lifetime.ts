/**
 * Your lifetime in numbers (GymGO Pro): every workout you've logged added
 * up, your favourites, and what all that weight compares to. Worked out on
 * the device from your own log and nothing else.
 *
 * The comparisons are for fun and say what they assume: each thing's
 * weight is a round, typical figure ("a family car, taking one as 1,500
 * kg"), never a claim about any particular one.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { bestWeekStreak, recordsEver } from './insights';
import { setCount, volumeKg, type TrainingSession } from './training';

/** A workout longer than this was most likely left running: it counts as this long. */
const LONGEST_MINUTES = 240;

export interface Lifetime {
  /** When the first workout was. */
  since: string;
  workouts: number;
  minutes: number;
  sets: number;
  reps: number;
  volumeKg: number;
  records: number;
  longestStreakWeeks: number;
  /** The exercise in the most workouts. */
  favourite: { exerciseId: string; workouts: number } | null;
  /** The weekday you train most (0 is Monday), when one stands out. */
  busiestDay: { weekday: number; workouts: number } | null;
  /** When you mostly start: before 9 am, after 5 pm, or neither most of the time. */
  timeOfDay: 'early' | 'evening' | 'anytime';
  /** The workout that moved the most weight. */
  biggest: { name: string; volumeKg: number; finishedAt: string } | null;
}

export function lifetimeStats(sessions: TrainingSession[]): Lifetime | null {
  if (sessions.length === 0) return null;
  const sorted = [...sessions].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  let minutes = 0;
  let sets = 0;
  let reps = 0;
  let total = 0;
  let biggest: Lifetime['biggest'] = null;
  const byExercise = new Map<string, number>();
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  let early = 0;
  let evening = 0;
  for (const session of sorted) {
    const length = (Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 60_000;
    minutes += Math.min(LONGEST_MINUTES, Math.max(0, Number.isFinite(length) ? length : 0));
    sets += setCount(session);
    for (const logged of session.exercises) {
      for (const set of logged.sets) if (set.reps > 0) reps += set.reps;
      if (logged.sets.some((set) => set.reps > 0)) byExercise.set(logged.exerciseId, (byExercise.get(logged.exerciseId) ?? 0) + 1);
    }
    const volume = volumeKg(session);
    total += volume;
    if (volume > 0 && (!biggest || volume > biggest.volumeKg)) biggest = { name: session.name, volumeKg: volume, finishedAt: session.finishedAt };
    const started = new Date(session.startedAt);
    byWeekday[(started.getDay() + 6) % 7]! += 1;
    const hour = started.getHours();
    if (hour < 9) early += 1;
    else if (hour >= 17) evening += 1;
  }
  const favourite = [...byExercise].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const top = Math.max(...byWeekday);
  // A busiest day only when one stands out: a tie says nothing.
  const busiest = byWeekday.filter((count) => count === top).length === 1 && top > 1 ? byWeekday.indexOf(top) : -1;
  return {
    since: sorted[0]!.finishedAt,
    workouts: sorted.length,
    minutes: Math.round(minutes),
    sets,
    reps,
    volumeKg: Math.round(total),
    records: recordsEver(sorted),
    longestStreakWeeks: bestWeekStreak(sorted),
    favourite: favourite ? { exerciseId: favourite[0], workouts: favourite[1] } : null,
    busiestDay: busiest >= 0 ? { weekday: busiest, workouts: top } : null,
    timeOfDay: early * 2 > sorted.length ? 'early' : evening * 2 > sorted.length ? 'evening' : 'anytime',
    biggest,
  };
}

/** Round, typical weights for the comparisons; each says what it takes one to weigh. */
export const HEAVY_THINGS: Array<{ one: string; many: string; kg: number }> = [
  { one: 'grand piano', many: 'grand pianos', kg: 400 },
  { one: 'family car', many: 'family cars', kg: 1_500 },
  { one: 'elephant', many: 'elephants', kg: 5_000 },
  { one: 'double-decker bus', many: 'double-decker buses', kg: 12_000 },
  { one: 'blue whale', many: 'blue whales', kg: 130_000 },
];

/**
 * What a total weight is about as heavy as: the biggest thing it reaches,
 * and how many ("3.2 family cars"); nothing under one grand piano.
 */
export function heavyAs(totalKg: number): { count: number; words: string; thing: (typeof HEAVY_THINGS)[number] } | null {
  const thing = [...HEAVY_THINGS].reverse().find((item) => totalKg >= item.kg);
  if (!thing) return null;
  const exact = totalKg / thing.kg;
  const count = exact < 10 ? Math.round(exact * 10) / 10 : Math.round(exact);
  return { count, words: `${count.toLocaleString('en')} ${count === 1 ? thing.one : thing.many}`, thing };
}

export const WEEKDAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
