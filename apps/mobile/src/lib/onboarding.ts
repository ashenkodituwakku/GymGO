/**
 * The welcome tour's questions (components/WelcomeSetup.tsx): a word on how
 * many days a week you picked, and which days they might fall on.
 *
 * No React Native here, so it is unit-tested in Node.
 */

/** A word on each number of days a week. */
export function daysLine(days: number): string {
  if (days <= 2) return 'A gentle start: easy to keep to.';
  if (days <= 4) return 'A good, steady routine, with rest days between.';
  if (days <= 6) return 'Most days: keep a rest day or two in there.';
  return 'Every day: make some of them easy ones.';
}

/**
 * Which days of the week, Monday first, that many days might fall on, as
 * people usually lay them out: 2 is Monday and Thursday, 3 Monday,
 * Wednesday and Friday, 4 Monday, Tuesday, Thursday and Friday, 5 the
 * weekdays, 6 all but Sunday.
 */
const PATTERNS: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

export function spreadDays(days: number): boolean[] {
  const on = PATTERNS[Math.max(0, Math.min(7, Math.round(days)))] ?? [];
  return Array.from({ length: 7 }, (_, index) => on.includes(index));
}
