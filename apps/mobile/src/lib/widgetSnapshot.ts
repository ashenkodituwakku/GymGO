/**
 * What GymGO's home-screen widgets show, worked out from what the app
 * already knows: the next workout (a training programme's next day, else a
 * template's), weeks in a row, this week's workouts against your goal, and
 * this month's challenge. One small object, so a widget (which can't run the
 * app's code) only has to draw it.
 *
 * The widgets themselves aren't in the app yet: on iPhone they need an App
 * Group to share this with the app, which Apple gives only to paid
 * developer accounts (README, "Home-screen widgets"). This is the part that
 * runs and is tested now.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { dayPlan, nextProgrammeDay, programmeDays, programmeProgress, programmeTitle, type Programme } from './programmes';
import { upNext } from './templates';
import { sessionsThisWeek, streakOf, type TrainingSession } from './training';
import { exerciseName } from './workout';

export interface WidgetSnapshot {
  /** The workout up next, or null when you're not on a programme or template. */
  next: { title: string; plan: string; exercises: string } | null;
  weeksInARow: number;
  thisWeek: { done: number; goal: number | null };
  challenge: { days: number; target: number; finished: boolean } | null;
  /** When it was worked out (ISO), for "as of". */
  at: string;
}

export function widgetSnapshot(input: {
  sessions: TrainingSession[];
  programme: Programme | null;
  weeklyGoal: number | null;
  challenge: { days: number; target: number; finished: boolean } | null;
  streakFreezes?: boolean;
  now?: Date;
}): WidgetSnapshot {
  const now = input.now ?? new Date();
  let next: WidgetSnapshot['next'] = null;
  const progress = input.programme ? programmeProgress(input.programme, input.sessions, now) : null;
  if (input.programme && progress && !progress.finished) {
    const index = nextProgrammeDay(input.programme, input.sessions);
    const day = programmeDays(input.programme.goal, input.programme.days)[index]!;
    next = {
      title: day.name,
      plan: `Week ${progress.week} of ${progress.weeks}${progress.easier ? ', easier' : ''} · ${programmeTitle(input.programme.goal)}`,
      exercises: dayPlan(input.programme, index, progress.easier)
        .map((item) => exerciseName(item.exerciseId))
        .join(', '),
    };
  } else {
    const plan = upNext(input.sessions);
    const day = plan ? plan.template.days[plan.day] : null;
    if (plan && day) next = { title: day.name, plan: plan.template.name, exercises: day.items.map((item) => exerciseName(item.exerciseId)).join(', ') };
  }
  return {
    next,
    weeksInARow: streakOf(input.sessions, now, input.streakFreezes ?? false).weeks,
    thisWeek: { done: sessionsThisWeek(input.sessions, now), goal: input.weeklyGoal },
    challenge: input.challenge,
    at: now.toISOString(),
  };
}

/** The small widget's line: "Upper A next · 3 weeks in a row". */
export function widgetLine(snapshot: WidgetSnapshot): string {
  const streak = snapshot.weeksInARow === 1 ? '1 week in a row' : `${snapshot.weeksInARow} weeks in a row`;
  return snapshot.next ? `${snapshot.next.title} next · ${streak}` : streak;
}
