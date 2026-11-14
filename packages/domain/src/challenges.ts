/**
 * Monthly challenges with friends: "Train on 12 days in November". You join
 * a month with a target; the count is the days you logged a workout that
 * month, on your own calendar (several workouts on one day count once, so a
 * day can't be padded). Friends who joined the same month see each other's
 * count and target, nothing more (not which days, not what). Reaching the
 * target earns that month's card.
 *
 * Opt-in: nobody is in a challenge, or seen in one, until they join it.
 */

/** The targets offered, in training days. */
export const CHALLENGE_TARGETS = [8, 12, 16, 20] as const;
export type ChallengeTarget = (typeof CHALLENGE_TARGETS)[number];

export const isChallengeTarget = (value: unknown): value is ChallengeTarget => CHALLENGE_TARGETS.includes(value as ChallengeTarget);

/** "2026-11". */
export const isMonthKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Whether a time zone name is one this system knows ("Australia/Melbourne"). */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The local day ("2026-11-02") of a moment in a time zone. */
export function localDayIn(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The month ("2026-11") of a moment in a time zone. */
export const monthIn = (iso: string, timeZone: string) => localDayIn(iso, timeZone).slice(0, 7);

/** The month after ("2026-12" after "2026-11"). */
export function nextMonth(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return number === 12 ? `${year! + 1}-01` : `${year}-${String(number! + 1).padStart(2, '0')}`;
}

/** How many days of `month` had a workout, from the workouts' finish times. */
export function trainingDays(finishedAts: readonly string[], month: string, timeZone: string): number {
  const days = new Set<string>();
  for (const at of finishedAts) {
    const day = localDayIn(at, timeZone);
    if (day.startsWith(`${month}-`)) days.add(day);
  }
  return days.size;
}

/** "November 2026". */
export function monthLabel(month: string, locale?: string): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, number! - 1, 15)).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
