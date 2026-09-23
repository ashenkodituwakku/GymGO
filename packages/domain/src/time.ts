/**
 * Time-zone aware schedule evaluation.
 *
 * Uses the platform `Intl` time-zone database rather than a fixed UTC offset,
 * so daylight-saving transitions (Sydney moves on the first Sunday in October)
 * are handled by the runtime instead of by us guessing.
 *
 * Overnight windows are expressed by letting `closeMinute` run past 1440:
 * Friday 20:00 to Saturday 02:00 is `{ day: 5, openMinute: 1200, closeMinute: 1560 }`.
 */

import type {
  AccessSchedule,
  IsoDate,
  OpeningWindow,
  ScheduleException,
  TimeZone,
} from './types';

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const partsFormatterCache = new Map<TimeZone, Intl.DateTimeFormat>();

function partsFormatter(timezone: TimeZone): Intl.DateTimeFormat {
  const cached = partsFormatterCache.get(timezone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  partsFormatterCache.set(timezone, formatter);
  return formatter;
}

/** Break an instant into local wall-clock components for a time zone. */
export function localParts(instant: Date, timezone: TimeZone): LocalParts {
  const parts = partsFormatter(timezone).formatToParts(instant);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') lookup[part.type] = part.value;
  }
  // `hour: '2-digit'` with hour12:false yields "24" at midnight in some engines.
  const hour = Number(lookup.hour ?? '0') % 24;
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour,
    minute: Number(lookup.minute ?? '0'),
    second: Number(lookup.second ?? '0'),
    weekday: WEEKDAY_INDEX[lookup.weekday ?? 'Sun'] ?? 0,
  };
}

/** Local calendar date, e.g. `2026-09-22`. */
export function localDate(instant: Date, timezone: TimeZone): IsoDate {
  const parts = localParts(instant, timezone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** Minutes since local midnight. */
export function localMinuteOfDay(instant: Date, timezone: TimeZone): number {
  const parts = localParts(instant, timezone);
  return parts.hour * 60 + parts.minute;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function offsetMinutes(instant: Date, timezone: TimeZone): number {
  const parts = localParts(instant, timezone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return (asIfUtc - instant.getTime()) / 60_000;
}

/**
 * Turn a local wall-clock time into an instant.
 *
 * Two passes, because the offset we need depends on the answer: guess with the
 * offset at the naive timestamp, then correct if the guess landed on the other
 * side of a daylight-saving boundary.
 */
export function zonedTimeToInstant(
  date: IsoDate,
  minuteOfDay: number,
  timezone: TimeZone,
): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);

  const firstGuess = offsetMinutes(new Date(naive), timezone);
  let timestamp = naive - firstGuess * 60_000;
  const secondGuess = offsetMinutes(new Date(timestamp), timezone);
  if (secondGuess !== firstGuess) {
    timestamp = naive - secondGuess * 60_000;
  }
  return new Date(timestamp);
}

function shiftDate(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

function weekdayOf(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function exceptionFor(
  exceptions: ScheduleException[],
  date: IsoDate,
): ScheduleException | undefined {
  return exceptions.find((exception) => exception.date === date);
}

/** The windows that start on a given local date, after applying exceptions. */
function windowsStartingOn(schedule: AccessSchedule, date: IsoDate): OpeningWindow[] {
  const exception = exceptionFor(schedule.exceptions, date);
  const weekday = weekdayOf(date);

  if (exception) {
    if (exception.closed) return [];
    if (exception.openMinute !== null && exception.closeMinute !== null) {
      return [{ day: weekday, openMinute: exception.openMinute, closeMinute: exception.closeMinute }];
    }
  }

  if (schedule.alwaysOpen) {
    return [{ day: weekday, openMinute: 0, closeMinute: 1440 }];
  }

  return schedule.windows.filter((window) => window.day === weekday);
}

export interface OpenCheck {
  open: boolean;
  /** The window that covers the instant, when open. */
  window: OpeningWindow | null;
  /** Set when a dated exception decided the answer. */
  exceptionNote: string | null;
}

/**
 * Is this audience admitted at this instant?
 *
 * Checks windows that start on the local date *and* windows that started the
 * previous local date and run past midnight.
 */
export function isOpenAt(schedule: AccessSchedule, instant: Date): OpenCheck {
  const timezone = schedule.timezone;
  const today = localDate(instant, timezone);
  const minute = localMinuteOfDay(instant, timezone);
  const yesterday = shiftDate(today, -1);

  const todayException = exceptionFor(schedule.exceptions, today);

  const candidates: Array<{ date: IsoDate; minute: number }> = [
    { date: today, minute },
    { date: yesterday, minute: minute + 1440 },
  ];

  for (const candidate of candidates) {
    for (const window of windowsStartingOn(schedule, candidate.date)) {
      if (candidate.minute >= window.openMinute && candidate.minute < window.closeMinute) {
        const exception = exceptionFor(schedule.exceptions, candidate.date);
        return {
          open: true,
          window,
          exceptionNote: exception ? exception.note : null,
        };
      }
    }
  }

  return {
    open: false,
    window: null,
    exceptionNote: todayException ? todayException.note : null,
  };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatMinuteOfDay(minuteOfDay: number): string {
  const wrapped = minuteOfDay % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  const suffix = hour24 < 12 ? 'am' : 'pm';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minuteText = minute === 0 ? '' : `:${pad2(minute)}`;
  const nextDay = minuteOfDay >= 1440 ? ' (next day)' : '';
  return `${hour12}${minuteText}${suffix}${nextDay}`;
}

export function formatWindow(window: OpeningWindow): string {
  if (window.openMinute === 0 && window.closeMinute >= 1440) return 'Open 24 hours';
  return `${formatMinuteOfDay(window.openMinute)} – ${formatMinuteOfDay(window.closeMinute)}`;
}

/** Group a week of windows into readable lines, collapsing identical days. */
export function summariseWeek(schedule: AccessSchedule): string[] {
  if (schedule.provenance.status === 'unknown' && schedule.windows.length === 0 && !schedule.alwaysOpen) {
    return ['Not confirmed'];
  }
  if (schedule.alwaysOpen) return ['Every day, 24 hours'];
  if (schedule.windows.length === 0) return ['Not confirmed'];

  const byDay = new Map<number, string>();
  for (let day = 0; day < 7; day += 1) {
    const windows = schedule.windows
      .filter((window) => window.day === day)
      .sort((a, b) => a.openMinute - b.openMinute)
      .map(formatWindow);
    byDay.set(day, windows.length === 0 ? 'Closed' : windows.join(', '));
  }

  // Monday first, as Australian timetables are written.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const lines: string[] = [];
  let runStart = 0;
  for (let index = 1; index <= order.length; index += 1) {
    const current = index < order.length ? byDay.get(order[index]!) : null;
    const first = order[runStart]!;
    if (current !== byDay.get(first)) {
      const last = order[index - 1]!;
      const label = first === last ? DAY_LABELS[first] : `${DAY_LABELS[first]}–${DAY_LABELS[last]}`;
      lines.push(`${label}: ${byDay.get(first)}`);
      runStart = index;
    }
  }
  return lines;
}

/**
 * Describe when this audience is next admitted after `instant`.
 * Looks ahead seven days; returns null if nothing is scheduled.
 */
export function describeNextOpening(schedule: AccessSchedule, instant: Date): string | null {
  if (schedule.provenance.status === 'unknown') return null;
  const timezone = schedule.timezone;
  let cursorDate = localDate(instant, timezone);
  const nowMinute = localMinuteOfDay(instant, timezone);

  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const windows = windowsStartingOn(schedule, cursorDate).sort(
      (a, b) => a.openMinute - b.openMinute,
    );
    for (const window of windows) {
      if (dayOffset > 0 || window.openMinute > nowMinute) {
        const dayLabel =
          dayOffset === 0 ? 'today' : dayOffset === 1 ? 'tomorrow' : DAY_LABELS[weekdayOf(cursorDate)];
        return `${dayLabel} from ${formatMinuteOfDay(window.openMinute)}`;
      }
    }
    cursorDate = shiftDate(cursorDate, 1);
  }
  return null;
}

/** Parse `HH:MM` into minutes since midnight, or null if malformed. */
export function parseTimeOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** True for a well-formed `YYYY-MM-DD` that names a real calendar day. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}
