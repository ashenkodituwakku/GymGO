/**
 * The Welcome back screen's words and figures (app/welcome-back.tsx), from
 * your log and collection: who you are, when you last trained, your week
 * against your goal, your weeks in a row, your last workout and the gyms
 * you've collected. Said kindly: a long gap isn't scolded.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { durationLabel, sessionsThisWeek, setCount, weekStreak, type TrainingSession } from './training';

export interface Recap {
  /** "Welcome back, Sam" (or just "Welcome back" without a name). */
  greeting: string;
  /** When you last trained, or that you haven't yet. */
  line: string;
  week: { done: number; goal: number | null };
  /** Weeks in a row you've trained. */
  streak: number;
  last: { id: string; name: string; when: string; detail: string } | null;
  gyms: number;
}

const DAY = 24 * 60 * 60_000;

/** Whole calendar days from one moment to another, in the device's time. */
function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((end - start) / DAY);
}

/** "today", "yesterday", "3 days ago", "2 weeks ago". */
export function agoWords(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks < 9 ? `${weeks} weeks ago` : 'a while ago';
}

export function recapOf({ name, sessions, weeklyGoal, gyms, now = new Date() }: { name: string | null; sessions: readonly TrainingSession[]; weeklyGoal: number | null; gyms: number; now?: Date }): Recap {
  const first = name?.trim().split(/\s+/)[0] ?? '';
  const greeting = first ? `Welcome back, ${first}` : 'Welcome back';
  const latest = [...sessions].sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : a.finishedAt > b.finishedAt ? -1 : 0))[0] ?? null;
  let line: string;
  if (!latest) line = 'Start your first workout today.';
  else {
    const days = daysBetween(new Date(latest.finishedAt), now);
    line =
      days <= 0
        ? 'You’ve already trained today.'
        : days === 1
          ? 'You last trained yesterday.'
          : days < 14
            ? `Your last workout was ${days} days ago.`
            : 'It’s been a while. Start with something light.';
  }
  const list = sessions as TrainingSession[];
  return {
    greeting,
    line,
    week: { done: sessionsThisWeek(list, now), goal: weeklyGoal },
    streak: weekStreak(list, now),
    last: latest
      ? {
          id: latest.id,
          name: latest.name,
          when: agoWords(daysBetween(new Date(latest.finishedAt), now)),
          detail: `${durationLabel(Date.parse(latest.finishedAt) - Date.parse(latest.startedAt))} · ${setCount(latest)} ${setCount(latest) === 1 ? 'set' : 'sets'}`,
        }
      : null,
    gyms,
  };
}
