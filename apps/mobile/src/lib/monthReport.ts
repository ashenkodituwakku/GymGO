/**
 * A month of training, as a report (app/month.tsx): workouts, days trained,
 * time, working sets, weight lifted and reps, against the month before;
 * the records broken; the exercises you did most; your sets for each
 * muscle against the month before; and the biggest workout.
 *
 * Everything from your own log, by this device's calendar; warm-ups never
 * count. No React Native here, so it is unit-tested in Node.
 */

import { exerciseName, MUSCLES, type Muscle, exerciseById } from './workout';
import { recordsBroken, setCount, volumeKg, workingSets, type NewRecord, type TrainingSession } from './training';

/** "2026-10": the month a moment falls in, on this device's calendar. */
export function monthKeyOf(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** The month `by` months after (or, negative, before) `month`. */
export function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(year!, number! - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Every month with a workout in it, newest first. */
export function monthsWithTraining(sessions: readonly TrainingSession[]): string[] {
  return [...new Set(sessions.map((session) => monthKeyOf(session.finishedAt)))].sort().reverse();
}

/**
 * The month a report opens on: the last finished month you trained in
 * (October, on 3 November), or this month while it's the only one with a
 * workout. Null with nothing logged.
 */
export function reportMonth(sessions: readonly TrainingSession[], now: Date = new Date()): string | null {
  const thisMonth = monthKeyOf(now.toISOString());
  const months = monthsWithTraining(sessions);
  return months.find((month) => month < thisMonth) ?? months[0] ?? null;
}

export interface MonthTotals {
  workouts: number;
  /** Days with at least one workout. */
  days: number;
  minutes: number;
  /** Working sets: warm-ups aren't counted. */
  sets: number;
  volumeKg: number;
  reps: number;
}

export interface MonthReport {
  month: string;
  totals: MonthTotals;
  /** The month before, to compare with. */
  before: MonthTotals;
  /** Records broken this month, against everything before each workout, in order. */
  records: Array<NewRecord & { date: string }>;
  /** The exercises with the most working sets, at most five. */
  topExercises: Array<{ exerciseId: string; name: string; sets: number }>;
  /** Sets for each muscle (a half for a muscle it works second), this month and the month before; most first. */
  muscles: Array<{ muscle: Muscle; label: string; sets: number; before: number }>;
  /** The workout that lifted the most. */
  biggest: { id: string; name: string; date: string; volumeKg: number } | null;
}

const inMonth = (sessions: readonly TrainingSession[], month: string) => sessions.filter((session) => monthKeyOf(session.finishedAt) === month);

function totalsOf(sessions: readonly TrainingSession[]): MonthTotals {
  const days = new Set(sessions.map((session) => new Date(session.finishedAt).toDateString()));
  let reps = 0;
  for (const session of sessions) for (const logged of session.exercises) for (const set of workingSets(logged.sets)) reps += set.reps;
  return {
    workouts: sessions.length,
    days: days.size,
    minutes: Math.round(sessions.reduce((sum, session) => sum + Math.max(0, Date.parse(session.finishedAt) - Date.parse(session.startedAt)), 0) / 60_000),
    sets: sessions.reduce((sum, session) => sum + setCount(session), 0),
    volumeKg: sessions.reduce((sum, session) => sum + volumeKg(session), 0),
    reps,
  };
}


function muscleSets(sessions: readonly TrainingSession[]): Map<Muscle, number> {
  const counts = new Map<Muscle, number>();
  for (const session of sessions) {
    for (const logged of session.exercises) {
      const sets = workingSets(logged.sets).length;
      const exercise = exerciseById(logged.exerciseId);
      if (!sets || !exercise) continue;
      for (const muscle of exercise.primary) counts.set(muscle, (counts.get(muscle) ?? 0) + sets);
      for (const muscle of exercise.secondary) counts.set(muscle, (counts.get(muscle) ?? 0) + sets / 2);
    }
  }
  return counts;
}

export function monthReport(sessions: readonly TrainingSession[], month: string): MonthReport {
  const ordered = [...sessions].sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : a.finishedAt > b.finishedAt ? 1 : 0));
  const these = inMonth(ordered, month);
  const previous = inMonth(ordered, shiftMonth(month, -1));

  const records: MonthReport['records'] = [];
  for (const session of these) {
    const earlier = ordered.filter((other) => other.finishedAt < session.finishedAt);
    for (const record of recordsBroken(session, earlier)) records.push({ ...record, date: session.finishedAt });
  }

  const byExercise = new Map<string, number>();
  for (const session of these) for (const logged of session.exercises) byExercise.set(logged.exerciseId, (byExercise.get(logged.exerciseId) ?? 0) + workingSets(logged.sets).length);
  const topExercises = [...byExercise]
    .filter(([, sets]) => sets > 0)
    .sort((a, b) => b[1] - a[1] || exerciseName(a[0]).localeCompare(exerciseName(b[0])))
    .slice(0, 5)
    .map(([exerciseId, sets]) => ({ exerciseId, name: exerciseName(exerciseId), sets }));

  const now = muscleSets(these);
  const then = muscleSets(previous);
  const muscles = MUSCLES.map((entry) => ({ muscle: entry.id, label: entry.label, sets: now.get(entry.id) ?? 0, before: then.get(entry.id) ?? 0 }))
    .filter((entry) => entry.sets > 0 || entry.before > 0)
    .sort((a, b) => b.sets - a.sets || b.before - a.before || a.label.localeCompare(b.label));

  const biggest = these.reduce<MonthReport['biggest']>((best, session) => {
    const volume = volumeKg(session);
    return volume > 0 && (!best || volume > best.volumeKg) ? { id: session.id, name: session.name, date: session.finishedAt, volumeKg: volume } : best;
  }, null);

  return { month, totals: totalsOf(these), before: totalsOf(previous), records, topExercises, muscles, biggest };
}

/** "+3", "−1", "same": a total against the month before, rounded as it's shown. */
export function changeWord(now: number, before: number): string {
  const difference = Math.round(now) - Math.round(before);
  return difference === 0 ? 'same' : `${difference > 0 ? '+' : '−'}${Math.abs(difference).toLocaleString()}`;
}

/** "+1 h 5 min", "−40 min", "same": time against the month before, in whole minutes, as the Time tile shows it. */
export function timeChangeWord(nowMinutes: number, beforeMinutes: number): string {
  const difference = Math.round(nowMinutes) - Math.round(beforeMinutes);
  if (difference === 0) return 'same';
  const size = Math.abs(difference);
  const hours = Math.floor(size / 60);
  const minutes = size % 60;
  const words = hours === 0 ? `${minutes} min` : minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  return `${difference > 0 ? '+' : '−'}${words}`;
}

/**
 * The month in a few lines to send: totals only, never which days you
 * went, as Your week does.
 */
export function monthShareText(report: MonthReport, label: string, volume: string): string {
  const { totals } = report;
  const hours = Math.floor(totals.minutes / 60);
  const time = hours > 0 ? `${hours} h ${totals.minutes % 60} min` : `${totals.minutes} min`;
  const lines = [
    `${label} on GymGO`,
    `${totals.workouts} workout${totals.workouts === 1 ? '' : 's'} · ${time} · ${totals.sets} sets · ${volume} lifted`,
  ];
  if (report.records.length > 0) lines.push(`${report.records.length} personal record${report.records.length === 1 ? '' : 's'}`);
  if (report.topExercises[0]) lines.push(`Most done: ${report.topExercises[0].name}`);
  return lines.join('\n');
}
