import { describe, expect, it } from 'vitest';
import { isChallengeTarget, isMonthKey, isTimeZone, localDayIn, monthIn, monthLabel, nextMonth, trainingDays } from './challenges';

describe('monthly challenges', () => {
  it('checks what it takes', () => {
    expect([8, 12, 16, 20].every(isChallengeTarget)).toBe(true);
    expect(isChallengeTarget(13)).toBe(false);
    expect(isMonthKey('2026-11')).toBe(true);
    expect(['2026-13', '2026-1', 'November', null].some(isMonthKey)).toBe(false);
    expect(isTimeZone('Australia/Melbourne')).toBe(true);
    expect(isTimeZone('Not/AZone')).toBe(false);
    expect(isTimeZone(3)).toBe(false);
  });

  it('counts days on your own calendar, each day once', () => {
    const tz = 'Australia/Melbourne';
    // 2 Nov 22:00 UTC is already 3 Nov in Melbourne; two workouts on 5 Nov count once.
    const finished = ['2026-11-02T22:00:00Z', '2026-11-04T23:00:00Z', '2026-11-05T02:00:00Z', '2026-10-31T12:00:00Z', '2026-12-01T01:00:00Z'];
    expect(localDayIn(finished[0]!, tz)).toBe('2026-11-03');
    expect(trainingDays(finished, '2026-11', tz)).toBe(2);
    // 31 Oct 12:00 UTC is 31 Oct 23:00 in Melbourne: October. 1 Dec 01:00 UTC is December there.
    expect(trainingDays(finished, '2026-10', tz)).toBe(1);
    expect(monthIn('2026-11-30T14:00:00Z', tz)).toBe('2026-12');
  });

  it('names months and steps to the next', () => {
    expect(nextMonth('2026-11')).toBe('2026-12');
    expect(nextMonth('2026-12')).toBe('2027-01');
    expect(monthLabel('2026-11', 'en-AU')).toBe('November 2026');
  });
});
