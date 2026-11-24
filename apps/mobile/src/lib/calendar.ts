/**
 * The workout calendar (app/calendar.tsx): your months as grids, Monday
 * first, each day you trained marked, from this month back to your first
 * workout. A workout belongs to the day it started, in the device's time,
 * so a late session that runs past midnight stays on the day you began it.
 *
 * Also the small month grid that picks a workout's day (app/session-edit.tsx).
 *
 * No React Native here, so it is unit-tested in Node.
 */

import type { TrainingSession } from './training';

export interface CalendarDay {
  /** 2026-11-24, in the device's time. */
  key: string;
  date: number;
  day: number;
  /** Outside this month: drawn as an empty space. */
  inMonth: boolean;
  today: boolean;
  /** After today: can't have a workout yet. */
  future: boolean;
  sessions: TrainingSession[];
}

export interface CalendarMonth {
  /** 2026-11. */
  key: string;
  year: number;
  /** 0 to 11. */
  month: number;
  /** "November 2026". */
  label: string;
  /** Monday to Sunday, 4 to 6 rows. */
  weeks: CalendarDay[][];
  workouts: number;
  days: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (value: number) => String(value).padStart(2, '0');

/** A day's key in the device's time: "2026-11-24". */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day a key names, at midnight in the device's time. */
export function dayFromKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dayKey(date) === key ? date : null;
}

/** Your workouts by the day they started, each day's in the order you did them. */
export function sessionsByDay(sessions: readonly TrainingSession[]): Map<string, TrainingSession[]> {
  const byDay = new Map<string, TrainingSession[]>();
  for (const session of sessions) {
    const key = dayKey(new Date(session.startedAt));
    const list = byDay.get(key);
    if (list) list.push(session);
    else byDay.set(key, [session]);
  }
  for (const list of byDay.values()) list.sort((a, b) => (a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0));
  return byDay;
}

export function monthLabelOf(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** "Tuesday 24 November", said when a day is chosen or read out. */
export function dayWords(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Mon 23 Nov": a day, short, the Australian way round. */
export function shortDay(date: Date): string {
  return `${WEEKDAYS[date.getDay()]!.slice(0, 3)} ${date.getDate()} ${MONTHS[date.getMonth()]!.slice(0, 3)}`;
}

/** One month as a grid, Monday first, with what you did on each day. */
export function calendarMonth(year: number, month: number, byDay: ReadonlyMap<string, TrainingSession[]>, now: Date = new Date()): CalendarMonth {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const cursor = new Date(year, month, 1 - lead);
  const todayKey = dayKey(now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weeks: CalendarDay[][] = [];
  let workouts = 0;
  let days = 0;
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      const key = dayKey(cursor);
      const inMonth = cursor.getMonth() === month;
      const sessions = inMonth ? (byDay.get(key) ?? []) : [];
      if (sessions.length) {
        workouts += sessions.length;
        days += 1;
      }
      week.push({ key, date: cursor.getTime(), day: cursor.getDate(), inMonth, today: key === todayKey, future: cursor.getTime() > todayStart, sessions });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month);
  return { key: `${year}-${pad(month + 1)}`, year, month, label: monthLabelOf(year, month), weeks, workouts, days };
}

/** The month before or after. */
export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const date = new Date(year, month + by, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * Your months, this one first and going back, as far as your first workout
 * (this month alone when there are none yet), at most `limit` of them.
 * `more` says whether earlier months were left out.
 */
export function calendarMonths(sessions: readonly TrainingSession[], now: Date = new Date(), limit = 6): { months: CalendarMonth[]; more: boolean } {
  const byDay = sessionsByDay(sessions);
  const earliest = sessions.reduce<string | null>((low, session) => (low === null || session.startedAt < low ? session.startedAt : low), null);
  const firstDate = earliest ? new Date(earliest) : now;
  const span = Math.max(0, (now.getFullYear() - firstDate.getFullYear()) * 12 + now.getMonth() - firstDate.getMonth());
  const count = Math.min(span + 1, Math.max(1, limit));
  const months: CalendarMonth[] = [];
  for (let back = 0; back < count; back += 1) {
    const { year, month } = shiftMonth(now.getFullYear(), now.getMonth(), -back);
    months.push(calendarMonth(year, month, byDay, now));
  }
  return { months, more: span + 1 > count };
}

/** This year so far: workouts, and days you trained. */
export function yearSoFar(sessions: readonly TrainingSession[], now: Date = new Date()): { year: number; workouts: number; days: number } {
  const year = now.getFullYear();
  const mine = sessions.filter((session) => new Date(session.startedAt).getFullYear() === year);
  return { year, workouts: mine.length, days: new Set(mine.map((session) => dayKey(new Date(session.startedAt)))).size };
}
