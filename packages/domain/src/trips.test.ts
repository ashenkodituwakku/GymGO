import { describe, expect, it } from 'vitest';
import { tripDates, tripShortlist, TRIP_DAYS_CHECKED } from './trips';
import { everyDayWindows, location, record, schedule } from './testing';

const centre = { lat: -33.8846, lng: 151.2113 };
const at = (id: string, km: number, overrides: Parameters<typeof record>[0] = {}) =>
  record({ location: location({ id, position: { lat: centre.lat + km / 111.2, lng: centre.lng } }), ...overrides });
// Thursday 24 to Sunday 27 September 2026.
const trip = { from: '2026-09-24', to: '2026-09-27', asOf: new Date('2026-09-20T00:00:00Z') };

describe('travel mode', () => {
  it('runs from the first day to the last, a fortnight at most', () => {
    expect(tripDates('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(tripDates('2026-09-24', '2026-09-24')).toEqual(['2026-09-24']);
    expect(tripDates('2026-09-24', '2026-09-23')).toEqual([]);
    expect(tripDates('2026-01-01', '2026-03-01')).toHaveLength(TRIP_DAYS_CHECKED);
  });

  it('lists the gyms that let visitors in, the most days first, then the nearest', () => {
    const everyDay = at('every-day', 4, { schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 21 * 60) })] });
    // Weekdays only: Thursday and Friday of the trip.
    const weekdays = at('weekdays', 1, {
      schedules: [schedule('visitor', { windows: [1, 2, 3, 4, 5].map((day) => ({ day, openMinute: 6 * 60, closeMinute: 21 * 60 })) })],
    });
    // Evenings only, nearer: still counts each day, at 6 pm.
    const evenings = at('evenings', 2, { schedules: [schedule('visitor', { windows: everyDayWindows(17 * 60, 20 * 60) })] });
    // No hours published: a maybe every day, listed after every yes.
    const maybe = at('no-hours', 0.5, { schedules: [] });
    const far = at('far', 30, { schedules: [schedule('visitor', { windows: everyDayWindows(0, 1440) })] });

    const picks = tripShortlist({ records: [everyDay, weekdays, evenings, maybe, far], centre, ...trip });
    expect(picks.map((pick) => [pick.record.location.id, pick.admitted])).toEqual([
      ['evenings', 4],
      ['every-day', 4],
      ['weekdays', 2],
      ['no-hours', 0],
    ]);
    expect(picks[3]!.maybe).toBe(4);
    expect(picks[0]!.days.map((day) => day.minute)).toEqual([18 * 60, 18 * 60, 18 * 60, 18 * 60]);
    expect(picks[1]!.days[0]).toEqual({ date: '2026-09-24', verdict: 'admits_visitor', minute: 7 * 60 });
    expect(picks[2]!.days.map((day) => day.verdict)).toEqual(['admits_visitor', 'admits_visitor', 'not_admitted', 'not_admitted']);
  });
});
