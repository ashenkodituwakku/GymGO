/**
 * Open late, and open round the clock: two questions people ask before
 * anything else when they train after work or on a night shift.
 *
 * Both are answered from the hours a gym publishes, for the day of the
 * visit, from the schedule a visitor goes by: the visitors' own hours when
 * the gym gives them, else its member hours, else its staffed hours. Unknown
 * stays unknown: a gym that publishes no hours is never counted as open late
 * or as 24 hours, and the filters keep only the gyms whose hours say yes.
 */

import { scheduleFor } from './access';
import { isOpenAt, zonedTimeToInstant } from './time';
import type { AccessSchedule, GymRecord, IsoDate } from './types';

export type HoursNeed = 'late' | 'allDay';

/** "Open late" means still open at 10 pm. */
export const LATE_MINUTE = 22 * 60;

export const HOURS_LABELS: Record<HoursNeed, string> = {
  late: 'Open late',
  allDay: '24 hours',
};

/** The hours a visitor goes by, when the gym has published any. */
export function hoursSchedule(record: GymRecord): AccessSchedule | null {
  for (const audience of ['visitor', 'member', 'staffed'] as const) {
    const schedule = scheduleFor(record, audience);
    if (schedule && schedule.provenance.status !== 'unknown' && (schedule.alwaysOpen || schedule.windows.length > 0)) return schedule;
  }
  return null;
}

/** Times through a day that a round-the-clock gym is open at, every one. */
const ALL_DAY_CHECKS = [30, 3 * 60, 6 * 60, 9 * 60, 12 * 60, 15 * 60, 18 * 60, 21 * 60, 23 * 60 + 30];

/**
 * Whether the gym's published hours meet the need on that day: yes, no, or
 * unknown when it publishes none.
 */
export function hoursMeet(record: GymRecord, need: HoursNeed, date: IsoDate): 'yes' | 'no' | 'unknown' {
  const schedule = hoursSchedule(record);
  if (!schedule) return 'unknown';
  const closedThatDay = schedule.exceptions.some((exception) => exception.date === date && exception.closed);
  if (schedule.alwaysOpen && !closedThatDay) return 'yes';
  const openAt = (minute: number) => isOpenAt(schedule, zonedTimeToInstant(date, minute, schedule.timezone)).open;
  if (need === 'late') return openAt(LATE_MINUTE) ? 'yes' : 'no';
  return ALL_DAY_CHECKS.every(openAt) ? 'yes' : 'no';
}
