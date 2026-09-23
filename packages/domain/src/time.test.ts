/**
 * Time zones, daylight saving and overnight windows.
 *
 * Sydney moves to daylight saving on the first Sunday in October at 2am local,
 * and back on the first Sunday in April. Both transitions are exercised here
 * because a one-hour error is exactly the size that sends someone to a locked
 * door.
 */

import { describe, expect, it } from 'vitest';
import {
  formatMinuteOfDay,
  isOpenAt,
  isValidIsoDate,
  localDate,
  localMinuteOfDay,
  parseTimeOfDay,
  summariseWeek,
  zonedTimeToInstant,
} from './time';
import { everyDayWindows, schedule, weekdayWindows } from './testing';

const SYDNEY = 'Australia/Sydney';

describe('zonedTimeToInstant', () => {
  it('converts a Sydney wall time to the right instant outside daylight saving', () => {
    // 22 September 2026 is AEST (UTC+10).
    const instant = zonedTimeToInstant('2026-09-22', 19 * 60, SYDNEY);
    expect(instant.toISOString()).toBe('2026-09-22T09:00:00.000Z');
  });

  it('converts a Sydney wall time to the right instant during daylight saving', () => {
    // 22 December 2026 is AEDT (UTC+11).
    const instant = zonedTimeToInstant('2026-12-22', 19 * 60, SYDNEY);
    expect(instant.toISOString()).toBe('2026-12-22T08:00:00.000Z');
  });

  it('round-trips a wall time back to the same local components', () => {
    const instant = zonedTimeToInstant('2026-10-04', 14 * 60 + 30, SYDNEY);
    expect(localDate(instant, SYDNEY)).toBe('2026-10-04');
    expect(localMinuteOfDay(instant, SYDNEY)).toBe(14 * 60 + 30);
  });

  it('handles the hour that does not exist on the spring-forward morning', () => {
    // 2:30am on 4 October 2026 is skipped in Sydney. We must still return a
    // real instant rather than NaN, and it must not silently become the
    // previous day.
    const instant = zonedTimeToInstant('2026-10-04', 2 * 60 + 30, SYDNEY);
    expect(Number.isNaN(instant.getTime())).toBe(false);
    expect(localDate(instant, SYDNEY)).toBe('2026-10-04');
  });

  it('keeps midnight on the correct calendar day', () => {
    const instant = zonedTimeToInstant('2026-09-23', 0, SYDNEY);
    expect(localDate(instant, SYDNEY)).toBe('2026-09-23');
    expect(localMinuteOfDay(instant, SYDNEY)).toBe(0);
  });
});

describe('isOpenAt', () => {
  it('reads an opening window in the gym time zone, not the server time zone', () => {
    const visitor = schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60) });
    // 09:00 UTC on 22 September 2026 is 19:00 in Sydney: inside the window.
    expect(isOpenAt(visitor, new Date('2026-09-22T09:00:00.000Z')).open).toBe(true);
    // 13:00 UTC is 23:00 in Sydney: outside it.
    expect(isOpenAt(visitor, new Date('2026-09-22T13:00:00.000Z')).open).toBe(false);
  });

  it('stays correct across the daylight-saving change', () => {
    const visitor = schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60) });
    // 20:00 UTC on 3 October 2026 is 06:00 Sunday 4 October AEST — open.
    expect(isOpenAt(visitor, new Date('2026-10-03T20:00:00.000Z')).open).toBe(true);
    // 20:00 UTC on 10 October 2026 is 07:00 Sunday AEDT — also open.
    expect(isOpenAt(visitor, new Date('2026-10-10T20:00:00.000Z')).open).toBe(true);
    // 18:00 UTC on 10 October is 05:00 AEDT — before opening.
    expect(isOpenAt(visitor, new Date('2026-10-10T18:00:00.000Z')).open).toBe(false);
  });

  it('covers an instant inside a window that started the previous day', () => {
    const visitor = schedule('visitor', {
      windows: [{ day: 5, openMinute: 20 * 60, closeMinute: 26 * 60 }],
    });
    // Saturday 26 September 2026, 1am Sydney.
    expect(isOpenAt(visitor, zonedTimeToInstant('2026-09-26', 60, SYDNEY)).open).toBe(true);
    // Friday 25 September, 9pm Sydney: the start of the same window.
    expect(isOpenAt(visitor, zonedTimeToInstant('2026-09-25', 21 * 60, SYDNEY)).open).toBe(true);
  });

  it('treats a closed exception as closed even when the weekly pattern says open', () => {
    const visitor = schedule('visitor', {
      windows: everyDayWindows(6 * 60, 22 * 60),
      exceptions: [
        { date: '2026-09-23', closed: true, openMinute: null, closeMinute: null, note: 'Public holiday.' },
      ],
    });
    const check = isOpenAt(visitor, zonedTimeToInstant('2026-09-23', 10 * 60, SYDNEY));
    expect(check.open).toBe(false);
    expect(check.exceptionNote).toBe('Public holiday.');
  });

  it('uses reduced hours from a dated exception', () => {
    const visitor = schedule('visitor', {
      windows: everyDayWindows(6 * 60, 22 * 60),
      exceptions: [
        { date: '2026-09-23', closed: false, openMinute: 9 * 60, closeMinute: 12 * 60, note: 'Reduced hours.' },
      ],
    });
    expect(isOpenAt(visitor, zonedTimeToInstant('2026-09-23', 10 * 60, SYDNEY)).open).toBe(true);
    expect(isOpenAt(visitor, zonedTimeToInstant('2026-09-23', 15 * 60, SYDNEY)).open).toBe(false);
  });

  it('treats alwaysOpen as open at any hour', () => {
    const member = schedule('member', { alwaysOpen: true });
    expect(isOpenAt(member, zonedTimeToInstant('2026-09-23', 3 * 60, SYDNEY)).open).toBe(true);
  });
});

describe('summariseWeek', () => {
  it('collapses identical consecutive days into a range', () => {
    const visitor = schedule('visitor', { windows: weekdayWindows(9 * 60, 17 * 60) });
    expect(summariseWeek(visitor)).toEqual(['Mon–Fri: 9am – 5pm', 'Sat–Sun: Closed']);
  });

  it('starts the week on Monday', () => {
    const visitor = schedule('visitor', {
      windows: [
        ...weekdayWindows(6 * 60, 21 * 60),
        { day: 6, openMinute: 8 * 60, closeMinute: 18 * 60 },
        { day: 0, openMinute: 9 * 60, closeMinute: 16 * 60 },
      ],
    });
    expect(summariseWeek(visitor)).toEqual(['Mon–Fri: 6am – 9pm', 'Sat: 8am – 6pm', 'Sun: 9am – 4pm']);
  });

  it('says "Not confirmed" rather than "Closed" for an unestablished schedule', () => {
    const visitor = schedule('visitor', {
      windows: [],
      provenance: { status: 'unknown', sources: [], conflictNote: null },
    });
    expect(summariseWeek(visitor)).toEqual(['Not confirmed']);
  });
});

describe('formatting and parsing', () => {
  it('formats minutes of the day readably, marking an overnight close', () => {
    expect(formatMinuteOfDay(0)).toBe('12am');
    expect(formatMinuteOfDay(9 * 60 + 30)).toBe('9:30am');
    expect(formatMinuteOfDay(19 * 60)).toBe('7pm');
    expect(formatMinuteOfDay(26 * 60)).toBe('2am (next day)');
  });

  it('parses a time of day and rejects nonsense', () => {
    expect(parseTimeOfDay('19:00')).toBe(1140);
    expect(parseTimeOfDay('7:05')).toBe(425);
    expect(parseTimeOfDay('25:00')).toBeNull();
    expect(parseTimeOfDay('noon')).toBeNull();
  });

  it('validates calendar dates', () => {
    expect(isValidIsoDate('2026-09-22')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('22/09/2026')).toBe(false);
  });
});
