/**
 * A year of training in review (app/year-review.tsx), from your own log:
 * the year's totals, each month's workouts, the best month, the longest run
 * of weeks trained, the records broken, your favourite gym, the muscle and
 * exercises you trained most, and the biggest workout. A workout belongs to
 * the year it started in, as on the calendar. Warm-ups never count.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { monthLabelOf } from './calendar';
import { muscleSets, totalsOf, type MonthTotals } from './monthReport';
import { recordsBroken, volumeKg, workingSets, type TrainingSession } from './training';
import { MUSCLES, exerciseName } from './workout';

export interface YearReview {
  year: number;
  totals: MonthTotals;
  /** January to December: "2026-01", its name, and its workouts. */
  months: Array<{ key: string; label: string; workouts: number }>;
  bestMonth: { key: string; label: string; workouts: number } | null;
  /** The most weeks in a row (Monday to Sunday) with a workout, within the year. */
  longestRun: number;
  records: number;
  favouriteGym: { name: string; visits: number } | null;
  topMuscle: { label: string; sets: number } | null;
  /** The exercises with the most working sets, at most five. */
  topExercises: Array<{ exerciseId: string; name: string; sets: number }>;
  biggest: { id: string; name: string; date: string; volumeKg: number } | null;
}

const pad = (value: number) => String(value).padStart(2, '0');
const DAY = 86_400_000;

/** The Monday a moment's week starts on, at midnight in the device's time. */
function mondayOf(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7)).getTime();
}

export function yearReview(sessions: readonly TrainingSession[], year: number): YearReview {
  const ordered = [...sessions].sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : a.finishedAt > b.finishedAt ? 1 : 0));
  const these = ordered.filter((session) => new Date(session.startedAt).getFullYear() === year);

  const months = Array.from({ length: 12 }, (_, month) => ({
    key: `${year}-${pad(month + 1)}`,
    label: monthLabelOf(year, month).split(' ')[0]!,
    workouts: these.filter((session) => new Date(session.startedAt).getMonth() === month).length,
  }));
  const best = months.reduce<(typeof months)[number] | null>((top, month) => (month.workouts > 0 && (!top || month.workouts > top.workouts) ? month : top), null);

  // Weeks trained, as Mondays; a run is Mondays seven days apart.
  const weeks = [...new Set(these.map((session) => mondayOf(new Date(session.startedAt))))].sort((a, b) => a - b);
  let longestRun = 0;
  let run = 0;
  weeks.forEach((monday, at) => {
    // A week across a clock change is 7 days give or take an hour.
    run = at > 0 && Math.round((monday - weeks[at - 1]!) / DAY) === 7 ? run + 1 : 1;
    longestRun = Math.max(longestRun, run);
  });

  let records = 0;
  for (const session of these) records += recordsBroken(session, ordered.filter((other) => other.finishedAt < session.finishedAt)).length;

  const visits = new Map<string, number>();
  for (const session of these) if (session.gymName) visits.set(session.gymName, (visits.get(session.gymName) ?? 0) + 1);
  const gym = [...visits].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  const muscles = muscleSets(these);
  const muscle = MUSCLES.map((entry) => ({ label: entry.label, sets: muscles.get(entry.id) ?? 0 }))
    .filter((entry) => entry.sets > 0)
    .sort((a, b) => b.sets - a.sets || a.label.localeCompare(b.label))[0];

  const byExercise = new Map<string, number>();
  for (const session of these) for (const logged of session.exercises) byExercise.set(logged.exerciseId, (byExercise.get(logged.exerciseId) ?? 0) + workingSets(logged.sets).length);
  const topExercises = [...byExercise]
    .filter(([, sets]) => sets > 0)
    .sort((a, b) => b[1] - a[1] || exerciseName(a[0]).localeCompare(exerciseName(b[0])))
    .slice(0, 5)
    .map(([exerciseId, sets]) => ({ exerciseId, name: exerciseName(exerciseId), sets }));

  const biggest = these.reduce<YearReview['biggest']>((top, session) => {
    const volume = volumeKg(session);
    return volume > 0 && (!top || volume > top.volumeKg) ? { id: session.id, name: session.name, date: session.finishedAt, volumeKg: volume } : top;
  }, null);

  return {
    year,
    totals: totalsOf(these),
    months,
    bestMonth: best ? { ...best } : null,
    longestRun,
    records,
    favouriteGym: gym ? { name: gym[0], visits: gym[1] } : null,
    topMuscle: muscle ? { label: muscle.label, sets: Math.round(muscle.sets) } : null,
    topExercises,
    biggest,
  };
}

/** The year in a few lines, to share: totals only, never where or when you trained. */
export function yearShareText(review: YearReview, lifted: string): string {
  const { totals } = review;
  const lines = [
    `My ${review.year} in GymGO`,
    `${totals.workouts} ${totals.workouts === 1 ? 'workout' : 'workouts'} on ${totals.days} ${totals.days === 1 ? 'day' : 'days'}`,
    `${Math.round(totals.minutes / 60)} hours, ${totals.sets.toLocaleString('en')} sets, ${lifted} lifted`,
  ];
  if (review.longestRun > 1) lines.push(`${review.longestRun} weeks in a row at best`);
  if (review.records > 0) lines.push(`${review.records} ${review.records === 1 ? 'record' : 'records'} broken`);
  return lines.join('\n');
}
