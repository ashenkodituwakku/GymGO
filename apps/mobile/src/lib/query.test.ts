import { describe, expect, it } from 'vitest';
import { initialFilters, moveTo, nextVisitAt, nowIn } from './query';

describe('nextVisitAt', () => {
  // 9:30 am in Melbourne on 24 September 2026 (AEST, UTC+10).
  const morning = new Date('2026-09-23T23:30:00Z');

  it('picks today when the time is still ahead', () => {
    expect(nowIn('Australia/Melbourne', morning)).toEqual({ date: '2026-09-24', minute: 9 * 60 + 30 });
    expect(nextVisitAt(18 * 60, 'Australia/Melbourne', morning)).toEqual({ date: '2026-09-24', minute: 18 * 60 });
  });

  it('rolls to tomorrow when the time has passed, never to the past', () => {
    expect(nextVisitAt(6 * 60, 'Australia/Melbourne', morning)).toEqual({ date: '2026-09-25', minute: 6 * 60 });
    expect(nextVisitAt(9 * 60 + 30, 'Australia/Melbourne', morning)).toEqual({ date: '2026-09-25', minute: 9 * 60 + 30 });
  });
});

describe('moveTo', () => {
  // 9:30 am Thursday in Melbourne is 7:30 pm Wednesday in New York.
  const morning = new Date('2026-09-23T23:30:00Z');

  it('keeps the visit as it is within the same time zone', () => {
    const filters = { ...initialFilters(morning), visitMinuteOfDay: 18 * 60, visitDate: '2026-09-24' };
    const moved = moveTo(filters, { centre: { lat: -37.8, lng: 144.98 }, placeName: 'Fitzroy', timezone: 'Australia/Melbourne' }, morning);
    expect(moved.visitDate).toBe('2026-09-24');
    expect(moved.visitMinuteOfDay).toBe(18 * 60);
  });

  it('puts the same time of day on the new city’s clock, never in its past', () => {
    const filters = { ...initialFilters(morning), visitMinuteOfDay: 18 * 60, visitDate: '2026-09-24' };
    const ny = moveTo(filters, { centre: { lat: 40.75, lng: -73.98 }, placeName: 'New York', timezone: 'America/New_York' }, morning);
    // 6 pm has passed in New York (it's 7:30 pm Wednesday), so Thursday 6 pm.
    expect(ny.timezone).toBe('America/New_York');
    expect(ny.visitDate).toBe('2026-09-24');
    expect(ny.visitMinuteOfDay).toBe(18 * 60);
    const early = moveTo({ ...filters, visitMinuteOfDay: 21 * 60 }, { centre: { lat: 40.75, lng: -73.98 }, placeName: 'New York', timezone: 'America/New_York' }, morning);
    expect(early.visitDate).toBe('2026-09-23');
  });
});
