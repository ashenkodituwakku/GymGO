/**
 * The verified owner's update forms, in and out of the shapes the server
 * takes (domain owner.ts): times typed as "06:00", prices as "25" or
 * "12.50" in the gym country's money.
 *
 * No React Native imports here, so it is unit-tested in Node.
 */

import type { AccessSchedule, OpeningWindow } from '@gymgo/domain';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

/** "06:00" → 360; "24:00" → 1440; anything else → null. */
export function parseClock(text: string): number | null {
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}

const clock = (minute: number) => `${String(Math.floor((minute % 1440) / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/** A week's hours to start the form from: the visitor hours on the record, else 6 am to 9 pm every day. */
export function weekFrom(schedule: AccessSchedule | null): DayHours[] {
  return DAY_NAMES.map((_, day) => {
    const window = schedule?.windows.find((item) => item.day === day);
    if (schedule && schedule.windows.length > 0) return window ? { open: true, from: clock(window.openMinute), to: clock(window.closeMinute) } : { open: false, from: '06:00', to: '21:00' };
    return { open: true, from: '06:00', to: '21:00' };
  });
}

/** The form's week as windows, or the first day that doesn't make sense. A close before the open runs past midnight. */
export function windowsFrom(week: readonly DayHours[]): { windows: OpeningWindow[] } | { problem: string } {
  const windows: OpeningWindow[] = [];
  for (const [day, hours] of week.entries()) {
    if (!hours.open) continue;
    const open = parseClock(hours.from);
    const close = parseClock(hours.to);
    if (open === null || close === null || open >= 1440) return { problem: `${DAY_NAMES[day]}: write the times like 06:00 and 21:00.` };
    if (close === open) return { problem: `${DAY_NAMES[day]}: it can’t close when it opens.` };
    windows.push({ day, openMinute: open, closeMinute: close > open ? close : close + 1440 });
  }
  if (windows.length === 0) return { problem: 'Open at least one day, or say it’s open round the clock.' };
  return { windows };
}

/** "25", "12.50" or "1,500" as GymGO keeps prices (hundredths, in every currency: ¥1,500 is 150000), or null. */
export function parsePrice(text: string): number | null {
  const clean = text.trim().replace(/[^\d.,]/g, '');
  // "1,500" groups thousands; "24,50" is a decimal comma.
  const normal = /^\d{1,3}(,\d{3})+$/.test(clean) ? clean.replace(/,/g, '') : clean.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  return Math.round(Number(normal) * 100);
}
