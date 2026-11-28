import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
vi.mock('./notifications', () => ({ notifications: () => null, mayNotify: vi.fn() }));

const { DEFAULT_REMINDERS, parseReminders, remindersLine, sortDays, weeklyTriggers } = await import('./reminders');

describe('training reminders', () => {
  it('reads what was kept, and falls back to the default for nothing or damage', () => {
    expect(parseReminders(null)).toEqual(DEFAULT_REMINDERS);
    expect(parseReminders('not json')).toEqual(DEFAULT_REMINDERS);
    expect(parseReminders(JSON.stringify({ on: true, days: [5, 1, 1, 9, 3], minute: 390 }))).toEqual({ on: true, days: [1, 3, 5], minute: 390 });
    // On with no days is off; a time outside the day is the default's.
    expect(parseReminders(JSON.stringify({ on: true, days: [], minute: 2000 }))).toEqual({ on: false, days: [], minute: DEFAULT_REMINDERS.minute });
  });

  it('puts the week in GymGO’s order, Monday first', () => {
    expect(sortDays([0, 6, 2, 1])).toEqual([1, 2, 6, 0]);
  });

  it('makes one weekly notification a day, in the phone’s count (Sunday 1)', () => {
    expect(weeklyTriggers({ on: true, days: [0, 1], minute: 18 * 60 + 30 })).toEqual([
      { weekday: 2, hour: 18, minute: 30 },
      { weekday: 1, hour: 18, minute: 30 },
    ]);
    expect(weeklyTriggers({ on: false, days: [1, 3], minute: 360 })).toEqual([]);
  });

  it('says when, briefly', () => {
    expect(remindersLine({ days: [5, 1, 3], minute: 18 * 60 })).toBe('Mon, Wed and Fri at 6 pm');
    expect(remindersLine({ days: [0, 1, 2, 3, 4, 5, 6], minute: 7 * 60 })).toBe('Every day at 7 am');
    expect(remindersLine({ days: [1, 2, 3, 4, 5], minute: 6 * 60 + 30 })).toBe('Weekdays at 6:30 am');
    expect(remindersLine({ days: [6, 0], minute: 9 * 60 })).toBe('Weekends at 9 am');
    expect(remindersLine({ days: [2], minute: 12 * 60 })).toBe('Tue at 12 pm');
  });
});
