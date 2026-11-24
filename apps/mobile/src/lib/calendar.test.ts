import { describe, expect, it } from 'vitest';
import { calendarMonth, calendarMonths, dayFromKey, dayKey, dayWords, sessionsByDay, shiftMonth, shortDay, yearSoFar } from './calendar';
import type { TrainingSession } from './training';

const NOW = new Date(2026, 10, 25, 9, 0); // Wednesday 25 November 2026, 9 am
const session = (id: string, started: Date, minutes = 45): TrainingSession => ({
  id,
  name: `Workout ${id}`,
  unit: 'kg',
  startedAt: started.toISOString(),
  finishedAt: new Date(started.getTime() + minutes * 60_000).toISOString(),
  workoutId: null,
  gymId: null,
  exercises: [{ exerciseId: 'bench-press', sets: [{ weight: 60, reps: 8 }] }],
});

describe('calendarMonth', () => {
  it('lays a month out Monday first, with the days you trained', () => {
    const byDay = sessionsByDay([session('a', new Date(2026, 10, 3, 18)), session('b', new Date(2026, 10, 3, 7)), session('c', new Date(2026, 10, 24, 6)), session('d', new Date(2026, 9, 31, 10))]);
    const month = calendarMonth(2026, 10, byDay, NOW);
    expect(month.label).toBe('November 2026');
    expect(month.key).toBe('2026-11');
    // 1 November 2026 is a Sunday, so the first row is 26 October to 1 November.
    expect(month.weeks[0]!.map((day) => day.day)).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(month.weeks[0]!.filter((day) => day.inMonth).length).toBe(1);
    expect(month.weeks.length).toBe(6);
    expect(month.weeks.every((week) => week.length === 7)).toBe(true);
    // Halloween's workout is October's, not shown in November's grid.
    expect(month.weeks[0]![5]!.sessions).toEqual([]);
    // Two on the 3rd, in the order you did them; one on the 24th.
    const third = month.weeks.flat().find((day) => day.key === '2026-11-03')!;
    expect(third.sessions.map((s) => s.id)).toEqual(['b', 'a']);
    expect(month.workouts).toBe(3);
    expect(month.days).toBe(2);
    const today = month.weeks.flat().find((day) => day.today)!;
    expect(today.key).toBe('2026-11-25');
    expect(today.future).toBe(false);
    expect(month.weeks.flat().find((day) => day.key === '2026-11-26')!.future).toBe(true);
  });

  it('keeps a late workout on the day it started', () => {
    const late = session('late', new Date(2026, 10, 20, 23, 30), 70);
    const byDay = sessionsByDay([late]);
    expect([...byDay.keys()]).toEqual(['2026-11-20']);
  });

  it('fits a February that starts on a Monday in four rows', () => {
    // February 2027 starts on a Monday and has 28 days.
    expect(calendarMonth(2027, 1, new Map(), NOW).weeks.length).toBe(4);
  });
});

describe('calendarMonths', () => {
  it('goes back from this month to your first workout', () => {
    const { months, more } = calendarMonths([session('a', new Date(2026, 7, 14, 9)), session('b', new Date(2026, 10, 2, 9))], NOW);
    expect(months.map((m) => m.label)).toEqual(['November 2026', 'October 2026', 'September 2026', 'August 2026']);
    expect(more).toBe(false);
  });

  it('stops at the limit and says there are earlier months', () => {
    const { months, more } = calendarMonths([session('a', new Date(2025, 0, 5, 9))], NOW, 6);
    expect(months.length).toBe(6);
    expect(months.at(-1)!.label).toBe('June 2026');
    expect(more).toBe(true);
  });

  it('shows just this month before your first workout', () => {
    const { months, more } = calendarMonths([], NOW);
    expect(months.map((m) => m.label)).toEqual(['November 2026']);
    expect(more).toBe(false);
  });
});

describe('days', () => {
  it('reads and writes day keys in the device’s time', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayFromKey('2026-01-05')!.getDate()).toBe(5);
    expect(dayFromKey('2026-02-30')).toBeNull();
    expect(dayFromKey('soon')).toBeNull();
    expect(dayWords(new Date(2026, 10, 24))).toBe('Tuesday 24 November');
    expect(shortDay(new Date(2026, 10, 23))).toBe('Mon 23 Nov');
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it('counts this year’s workouts and days', () => {
    const sessions = [session('a', new Date(2026, 0, 2, 9)), session('b', new Date(2026, 0, 2, 18)), session('c', new Date(2026, 5, 1, 9)), session('d', new Date(2025, 11, 31, 9))];
    expect(yearSoFar(sessions, NOW)).toEqual({ year: 2026, workouts: 3, days: 2 });
  });
});
