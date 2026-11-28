/**
 * Your last weeks in a bar chart, as a training app's profile draws them:
 * a bar a week (Monday to Sunday, this device's time), for how long you
 * trained, how much you lifted, or how many reps you did.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { toKg, workingSets, type TrainingSession } from './training';

export type WeeklyMetric = 'duration' | 'volume' | 'reps';

export interface WeekBar {
  /** The Monday it starts, at midnight here. */
  start: Date;
  /** Minutes, kilograms or reps. */
  value: number;
  workouts: number;
}

function mondayOf(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const back = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - back);
  return day;
}

function amount(session: TrainingSession, metric: WeeklyMetric): number {
  if (metric === 'duration') return Math.max(0, Math.round((Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 60_000));
  let sum = 0;
  for (const logged of session.exercises) {
    for (const set of workingSets(logged.sets)) {
      if (metric === 'reps') sum += set.reps;
      else if (set.weight) sum += toKg(set.weight, session.unit) * set.reps;
    }
  }
  return sum;
}

/** The last `weeks` weeks, oldest first, this week last. */
export function weeklyTotals(sessions: readonly TrainingSession[], metric: WeeklyMetric, now: Date = new Date(), weeks = 12): WeekBar[] {
  const thisWeek = mondayOf(now);
  const bars: WeekBar[] = Array.from({ length: weeks }, (_, at) => {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - (weeks - 1 - at) * 7);
    return { start, value: 0, workouts: 0 };
  });
  const first = bars[0]!.start.getTime();
  for (const session of sessions) {
    const at = new Date(session.finishedAt);
    if (at.getTime() < first || at.getTime() > now.getTime() + 60_000) continue;
    const monday = mondayOf(at).getTime();
    const bar = bars.find((item) => item.start.getTime() === monday);
    if (!bar) continue;
    bar.value += amount(session, metric);
    bar.workouts += 1;
  }
  return bars;
}

/** "3 h 20 min", "12,400 kg", "640 reps": a week's total in words. */
export function weekTotalLabel(value: number, metric: WeeklyMetric, unitLabel = 'kg'): string {
  if (metric === 'duration') {
    const minutes = Math.round(value);
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  }
  return `${Math.round(value).toLocaleString('en')} ${metric === 'reps' ? 'reps' : unitLabel}`;
}
