/**
 * What your training log adds up to over time: the weeks you trained, the
 * milestones you've passed, and how your sets split across your muscles.
 *
 * Everything here is counted from your own sessions and nothing else: no
 * estimate from other people, no score that isn't a plain count. No React
 * Native here, so it is unit-tested in Node.
 */

import { recordsBroken, setCount, type TrainingSession } from './training';
import { EXERCISES, MUSCLES, type Muscle } from './workout';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight of the day `date` falls on. */
function dayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Monday of the week `date` falls in, at local midnight. */
function mondayOf(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

// --- Your weeks ------------------------------------------------------------------

export interface CalendarDay {
  /** Local midnight, as a timestamp. */
  date: number;
  /** Sessions that finished that day. */
  sessions: number;
  /** After today: drawn empty, never as a day you missed. */
  future: boolean;
}

export interface CalendarWeek {
  /** Monday, local midnight. */
  start: number;
  /** Monday first. */
  days: CalendarDay[];
  sessions: number;
}

/**
 * The last `weeks` weeks, oldest first, ending with this one: each day with
 * how many sessions finished on it. A session belongs to the day it
 * finished, as it does for the streak and the history.
 */
export function trainingCalendar(sessions: TrainingSession[], weeks = 12, now: Date = new Date()): CalendarWeek[] {
  const perDay = new Map<number, number>();
  for (const session of sessions) {
    const key = dayStart(new Date(session.finishedAt));
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const today = dayStart(now);
  const thisMonday = mondayOf(now);
  const out: CalendarWeek[] = [];
  for (let back = weeks - 1; back >= 0; back -= 1) {
    const monday = new Date(thisMonday);
    monday.setDate(monday.getDate() - back * 7);
    const days: CalendarDay[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(monday);
      day.setDate(day.getDate() + offset);
      const date = day.getTime();
      days.push({ date, sessions: perDay.get(date) ?? 0, future: date > today });
    }
    out.push({ start: monday.getTime(), days, sessions: days.reduce((sum, day) => sum + day.sessions, 0) });
  }
  return out;
}

/** The goals you can pick: sessions a week. */
export const WEEKLY_GOALS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Weeks in a row, ending with the latest, in which you met `goal`; this week counts once it's met. */
export function goalStreak(sessions: TrainingSession[], goal: number, now: Date = new Date()): number {
  const perWeek = new Map<number, number>();
  for (const session of sessions) {
    const key = mondayOf(new Date(session.finishedAt)).getTime();
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
  }
  const cursor = mondayOf(now);
  if ((perWeek.get(cursor.getTime()) ?? 0) < goal) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while ((perWeek.get(cursor.getTime()) ?? 0) >= goal) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** The most weeks in a row you've ever trained at least once. */
export function bestWeekStreak(sessions: TrainingSession[]): number {
  const weeks = [...new Set(sessions.map((session) => mondayOf(new Date(session.finishedAt)).getTime()))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const week of weeks) {
    // Weeks a clock change apart are 7 days give or take an hour.
    run = previous !== null && Math.abs(week - previous - 7 * DAY_MS) < 2 * 60 * 60 * 1000 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = week;
  }
  return best;
}

// --- Milestones --------------------------------------------------------------------

/** Records you've broken over the whole log, counted the way the finish screen counts them. */
export function recordsEver(sessions: TrainingSession[]): number {
  const ordered = [...sessions].sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : a.finishedAt > b.finishedAt ? 1 : 0));
  let count = 0;
  for (let index = 1; index < ordered.length; index += 1) count += recordsBroken(ordered[index]!, ordered.slice(0, index)).length;
  return count;
}

export type MilestoneKind = 'workouts' | 'streak' | 'records' | 'sets';

export interface MilestoneLadder {
  kind: MilestoneKind;
  title: string;
  /** How many you have: workouts logged, best weeks in a row, records broken, sets logged. */
  have: number;
  /** Every step on the ladder, lowest first. */
  steps: number[];
  /** The steps you've passed. */
  reached: number[];
  /** The next one up, or null once you're past the top. */
  next: number | null;
  /** How the count reads: "12 workouts", "Longest run: 3 weeks". */
  label: string;
}

const LADDERS: Array<{ kind: MilestoneKind; title: string; steps: number[]; unit: [string, string] }> = [
  { kind: 'workouts', title: 'Workouts', steps: [1, 10, 25, 50, 100, 250], unit: ['workout', 'workouts'] },
  { kind: 'streak', title: 'Weeks in a row', steps: [2, 4, 8, 12, 26, 52], unit: ['week', 'weeks'] },
  { kind: 'records', title: 'Records broken', steps: [1, 10, 25, 50, 100], unit: ['record broken', 'records broken'] },
  { kind: 'sets', title: 'Sets logged', steps: [100, 500, 1000, 2500, 5000], unit: ['set logged', 'sets logged'] },
];

/** Your milestones: for each kind, the steps you've passed and how far to the next. */
export function milestones(sessions: TrainingSession[]): MilestoneLadder[] {
  const have: Record<MilestoneKind, number> = {
    workouts: sessions.length,
    streak: bestWeekStreak(sessions),
    records: recordsEver(sessions),
    sets: sessions.reduce((sum, session) => sum + setCount(session), 0),
  };
  return LADDERS.map(({ kind, title, steps, unit }) => {
    const count = have[kind];
    return {
      kind,
      title,
      have: count,
      steps,
      reached: steps.filter((step) => count >= step),
      next: steps.find((step) => count < step) ?? null,
      label: `${kind === 'streak' ? 'Longest run: ' : ''}${count.toLocaleString('en')} ${count === 1 ? unit[0] : unit[1]}`,
    };
  });
}

// --- Muscle balance ------------------------------------------------------------------

export interface MuscleSets {
  muscle: Muscle;
  label: string;
  /** Sets that worked it: one for each set where it's a main muscle, a half where it helps. */
  sets: number;
}

export interface MuscleBalance {
  muscles: MuscleSets[];
  /** Sets of exercises GymGO doesn't know the muscles of (named by you), left out rather than guessed. */
  unknownSets: number;
  /** Sessions in the window. */
  sessions: number;
  days: number;
}

/**
 * How your sets over the last `days` days split across your muscles, from
 * the muscles each exercise works in GymGO's own list. A muscle that an
 * exercise works second counts half a set, the usual way of counting it.
 */
export function muscleBalance(sessions: TrainingSession[], days = 28, now: Date = new Date()): MuscleBalance {
  const since = dayStart(now) - (days - 1) * DAY_MS;
  const counts = new Map<Muscle, number>();
  let unknownSets = 0;
  let inWindow = 0;
  for (const session of sessions) {
    if (Date.parse(session.finishedAt) < since) continue;
    inWindow += 1;
    for (const logged of session.exercises) {
      const sets = logged.sets.filter((set) => set.reps > 0).length;
      if (sets === 0) continue;
      const exercise = EXERCISES.find((item) => item.id === logged.exerciseId);
      if (!exercise) {
        unknownSets += sets;
        continue;
      }
      for (const muscle of exercise.primary) counts.set(muscle, (counts.get(muscle) ?? 0) + sets);
      for (const muscle of exercise.secondary) counts.set(muscle, (counts.get(muscle) ?? 0) + sets / 2);
    }
  }
  const muscles = MUSCLES.map(({ id, label }) => ({ muscle: id, label, sets: counts.get(id) ?? 0 })).sort(
    (a, b) => b.sets - a.sets || MUSCLES.findIndex((item) => item.id === a.muscle) - MUSCLES.findIndex((item) => item.id === b.muscle),
  );
  return { muscles, unknownSets, sessions: inWindow, days };
}
