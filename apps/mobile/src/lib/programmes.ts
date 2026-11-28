/**
 * Training programmes: a goal and a number of days a week, planned over 6,
 * 8 or 12 weeks. Each week takes turns through the programme's days (the
 * next is the one after the last you did), every fourth week is an easier
 * one (half the sets, a little lighter) so you come back fresher, and the
 * weight goes up when every set reaches the top of its range.
 *
 * Built from well-known general plans, written out with GymGO's own
 * exercises (lib/templates.ts has the same kind): not advice for anyone in
 * particular. The screen says to start light.
 *
 * Where the rule for adding weight turns into exact numbers ("next: 62.5 kg
 * × 5"), that's GymGO Pro's "What to lift next", as in a workout. Everyone
 * gets the plan, the weeks, the easier weeks and the rule.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { TEMPLATES, type TemplateDay, type TemplateItem } from './templates';
import { INCREMENT, formatWeight, fromKg, nextTarget, toKg, type Target, type TrainingSession, type WeightUnit } from './training';

export type ProgrammeGoal = 'strength' | 'muscle' | 'fitness';
export type ProgrammeDays = 2 | 3 | 4;
export type ProgrammeWeeks = 6 | 8 | 12;

export const PROGRAMME_GOALS: Array<{ id: ProgrammeGoal; label: string; title: string; blurb: string }> = [
  { id: 'strength', label: 'Strength', title: 'Strength programme', blurb: 'Heavy sets of five on the big barbell lifts.' },
  { id: 'muscle', label: 'Build muscle', title: 'Muscle programme', blurb: 'More sets of 6 to 15, every muscle twice a week or so.' },
  { id: 'fitness', label: 'General fitness', title: 'Fitness programme', blurb: 'Whole-body sessions, done as supersets to keep moving.' },
];
export const PROGRAMME_DAYS: ProgrammeDays[] = [2, 3, 4];
export const PROGRAMME_WEEKS: ProgrammeWeeks[] = [6, 8, 12];

/** The programme you're on, kept on this device (lib/programmeStore.ts). */
export interface Programme {
  goal: ProgrammeGoal;
  days: ProgrammeDays;
  weeks: ProgrammeWeeks;
  /** The day it started, as YYYY-MM-DD on this device. */
  startedOn: string;
  /** Exercises you swapped: the plan's id → yours. */
  swaps: Record<string, string>;
}

const item = (exerciseId: string, sets: number, reps: string, restSeconds: number, group?: string): TemplateItem => ({
  exerciseId,
  sets,
  reps,
  restSeconds,
  ...(group ? { group } : {}),
});

const days = (id: string) => TEMPLATES.find((template) => template.id === id)!.days;

const UPPER_LOWER_STRENGTH: TemplateDay[] = [
  { name: 'Upper A', items: [item('bench-press', 5, '5', 180), item('bb-row', 5, '5', 180), item('db-shoulder', 3, '8', 90), item('pulldown', 3, '8–10', 90)] },
  { name: 'Lower A', items: [item('back-squat', 5, '5', 180), item('rdl', 3, '6–8', 150), item('split-squat', 3, '8', 90), item('plank', 3, '30–45 s', 45)] },
  { name: 'Upper B', items: [item('ohp', 5, '5', 180), item('pull-up', 4, '5–8', 150), item('close-grip', 3, '6–8', 120), item('cable-row', 3, '8–10', 90)] },
  { name: 'Lower B', items: [item('deadlift', 3, '5', 240), item('front-squat', 3, '5', 180), item('hip-thrust', 3, '8', 90), item('hanging-knee', 3, '10–12', 60)] },
];

const UPPER_LOWER_MUSCLE: TemplateDay[] = [
  {
    name: 'Upper A',
    items: [item('bench-press', 4, '6–8', 150), item('cable-row', 4, '8–10', 90), item('db-shoulder', 3, '8–10', 90), item('db-curl', 3, '10–12', 60, 'A'), item('pushdown', 3, '10–12', 60, 'A')],
  },
  {
    name: 'Lower A',
    items: [item('back-squat', 4, '6–8', 150), item('rdl', 3, '8–10', 120), item('leg-press', 3, '10–12', 90), item('calf-raise', 4, '12–15', 60)],
  },
  {
    name: 'Upper B',
    items: [item('incline-db', 4, '8–10', 90), item('pulldown', 4, '8–10', 90), item('lateral-raise', 3, '12–15', 60, 'A'), item('face-pull', 3, '12–15', 60, 'A'), item('hammer-curl', 3, '10–12', 60)],
  },
  {
    name: 'Lower B',
    items: [item('deadlift', 3, '5', 240), item('split-squat', 3, '10', 90), item('hip-thrust', 3, '10–12', 90), item('cable-crunch', 3, '12–15', 60)],
  },
];

const FITNESS: TemplateDay[] = [
  {
    name: 'Whole body A',
    items: [item('goblet-squat', 3, '10–12', 60, 'A'), item('push-up', 3, '8–15', 60, 'A'), item('rdl', 3, '10–12', 60, 'B'), item('cable-row', 3, '10–12', 60, 'B'), item('plank', 3, '30–45 s', 30)],
  },
  {
    name: 'Whole body B',
    items: [item('split-squat', 3, '10', 60, 'A'), item('db-shoulder', 3, '10–12', 60, 'A'), item('glute-bridge', 3, '12–15', 60, 'B'), item('pulldown', 3, '10–12', 60, 'B'), item('dead-bug', 3, '10', 30)],
  },
];

/** The days the programme takes turns through. */
export function programmeDays(goal: ProgrammeGoal, perWeek: ProgrammeDays): TemplateDay[] {
  if (goal === 'strength') return perWeek === 4 ? UPPER_LOWER_STRENGTH : days('five-by-five');
  if (goal === 'muscle') return perWeek === 4 ? UPPER_LOWER_MUSCLE : perWeek === 3 ? days('ppl') : days('full-body');
  return FITNESS;
}

export const programmeTitle = (goal: ProgrammeGoal) => PROGRAMME_GOALS.find((entry) => entry.id === goal)!.title;

/** What one of its workouts is called in your log: "Upper A · Strength programme". */
export const programmeDayName = (programme: Pick<Programme, 'goal'>, day: TemplateDay) => `${day.name} · ${programmeTitle(programme.goal)}`;

// --- Weeks -------------------------------------------------------------------

/** YYYY-MM-DD for a day on this device. */
export function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const fromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
};

/** The programme's week on `now` (1 the first), going past its length once it's over. */
export function weekOf(programme: Pick<Programme, 'startedOn'>, now: Date): number {
  const days = Math.round((fromKey(dayKey(now)).getTime() - fromKey(programme.startedOn).getTime()) / DAY_MS);
  return Math.max(1, Math.floor(days / 7) + 1);
}

/** Every fourth week is easier: weeks 4, 8 and 12. */
export const isEasierWeek = (week: number) => week % 4 === 0;

/** Its workouts in your log, from the day it started. */
export function programmeSessions(programme: Pick<Programme, 'goal' | 'startedOn'>, sessions: readonly TrainingSession[]): TrainingSession[] {
  const suffix = ` · ${programmeTitle(programme.goal)}`;
  const from = fromKey(programme.startedOn).getTime();
  return sessions.filter((session) => session.name.endsWith(suffix) && new Date(session.finishedAt).getTime() >= from);
}

/** The day to do next: the one after the last of its days you did since it started. */
export function nextProgrammeDay(programme: Programme, sessions: readonly TrainingSession[]): number {
  const plan = programmeDays(programme.goal, programme.days);
  const names = plan.map((day) => programmeDayName(programme, day));
  const last = [...programmeSessions(programme, sessions)].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).find((session) => names.includes(session.name));
  return last ? (names.indexOf(last.name) + 1) % plan.length : 0;
}

export interface ProgrammeProgress {
  week: number;
  weeks: ProgrammeWeeks;
  easier: boolean;
  /** Its workouts done this programme week, and how many the week has. */
  doneThisWeek: number;
  perWeek: ProgrammeDays;
  /** All its workouts so far. */
  doneInAll: number;
  finished: boolean;
}

export function programmeProgress(programme: Programme, sessions: readonly TrainingSession[], now: Date): ProgrammeProgress {
  const week = weekOf(programme, now);
  // Its own weeks only: a workout of the same name after they're over isn't part of it.
  const ends = fromKey(programme.startedOn).getTime() + programme.weeks * 7 * DAY_MS;
  const done = programmeSessions(programme, sessions).filter((session) => new Date(session.finishedAt).getTime() < ends);
  const weekStart = fromKey(programme.startedOn).getTime() + (Math.min(week, programme.weeks) - 1) * 7 * DAY_MS;
  return {
    week: Math.min(week, programme.weeks),
    weeks: programme.weeks,
    easier: week <= programme.weeks && isEasierWeek(week),
    doneThisWeek: done.filter((session) => {
      const at = new Date(session.finishedAt).getTime();
      return at >= weekStart && at < weekStart + 7 * DAY_MS;
    }).length,
    perWeek: programme.days,
    doneInAll: done.length,
    finished: week > programme.weeks,
  };
}

// --- A day's plan ------------------------------------------------------------

/** A day's exercises as you'll do them: your swaps put in, and half the sets in an easier week. */
export function dayPlan(programme: Programme, dayIndex: number, easier: boolean): TemplateItem[] {
  const day = programmeDays(programme.goal, programme.days)[dayIndex];
  if (!day) return [];
  return day.items.map((each) => ({
    ...each,
    exerciseId: programme.swaps[each.exerciseId] ?? each.exerciseId,
    sets: easier && each.sets > 1 ? Math.max(2, Math.ceil(each.sets / 2)) : each.sets,
  }));
}

/** How much lighter an easier week goes. */
export const EASIER_SHARE = 0.9;

/**
 * What to lift next for an exercise (Pro): the workout's own target from
 * last time (nextTarget), about 10% lighter in an easier week, to the
 * nearest plate step.
 */
export function programmeTarget(last: Parameters<typeof nextTarget>[0], reps: string, unit: WeightUnit, easier: boolean): Target | null {
  const target = nextTarget(last, reps, unit);
  if (!target || !easier || target.weight === null || !last) return target;
  // About 10% under what you last lifted (not under the next step up), to the nearest plate step.
  const top = Math.max(...last.sets.map((set) => (set.weight !== null && set.weight > 0 ? fromKg(toKg(set.weight, last.unit), unit) : 0)));
  const step = unit === 'kg' ? 2.5 : 5;
  const lighter = Math.max(step, Math.round((top * EASIER_SHARE) / step) * step);
  return { weight: lighter, reps: target.reps, why: `Easier week: about 10% under last time, at ${formatWeight(lighter, unit)}.` };
}

/** The rule, in words, for everyone. */
export function progressionRule(unit: WeightUnit): string {
  return `When every set reaches the top of its range, add ${formatWeight(INCREMENT[unit], unit)} next time. Every fourth week is easier: half the sets, about 10% lighter.`;
}
