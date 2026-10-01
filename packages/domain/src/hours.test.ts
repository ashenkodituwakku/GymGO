import { describe, expect, it } from 'vitest';
import { hoursMeet, hoursSchedule } from './hours';
import { search, defaultQuery } from './search';
import { everyDayWindows, record, schedule, unknownProvenance, location } from './testing';

// 24 September 2026 is a Thursday.
const THURSDAY = '2026-09-24';

describe('open late and 24 hours', () => {
  it('reads the visitors’ hours first, then members’, then staffed', () => {
    const gym = record({
      schedules: [schedule('member', { windows: everyDayWindows(5 * 60, 23 * 60) }), schedule('visitor', { windows: everyDayWindows(6 * 60, 20 * 60) })],
    });
    expect(hoursSchedule(gym)?.audience).toBe('visitor');
    expect(hoursMeet(gym, 'late', THURSDAY)).toBe('no');
    const membersOnly = record({ schedules: [schedule('member', { windows: everyDayWindows(5 * 60, 23 * 60) })] });
    expect(hoursMeet(membersOnly, 'late', THURSDAY)).toBe('yes');
  });

  it('counts a gym open past midnight as open late, and 24 hours only when it never closes that day', () => {
    const overnight = record({ schedules: [schedule('visitor', { windows: everyDayWindows(16 * 60, 26 * 60) })] });
    expect(hoursMeet(overnight, 'late', THURSDAY)).toBe('yes');
    expect(hoursMeet(overnight, 'allDay', THURSDAY)).toBe('no');
    const always = record({ schedules: [schedule('member', { alwaysOpen: true })] });
    expect(hoursMeet(always, 'allDay', THURSDAY)).toBe('yes');
    expect(hoursMeet(always, 'late', THURSDAY)).toBe('yes');
    const roundTheClock = record({ schedules: [schedule('member', { windows: everyDayWindows(0, 1440) })] });
    expect(hoursMeet(roundTheClock, 'allDay', THURSDAY)).toBe('yes');
  });

  it('keeps unknown unknown, and a closed day closed', () => {
    expect(hoursMeet(record({ schedules: [] }), 'late', THURSDAY)).toBe('unknown');
    expect(hoursMeet(record({ schedules: [schedule('visitor', { windows: everyDayWindows(0, 1440), provenance: unknownProvenance() })] }), 'late', THURSDAY)).toBe('unknown');
    const holiday = record({
      schedules: [schedule('member', { alwaysOpen: true, exceptions: [{ date: THURSDAY, closed: true, openMinute: null, closeMinute: null, note: 'Closed' }] })],
    });
    expect(hoursMeet(holiday, 'allDay', THURSDAY)).toBe('no');
  });

  it('narrows a search to the gyms whose hours say yes', () => {
    const late = record({ location: location({ id: 'late' }), schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 23 * 60) })] });
    const early = record({ location: location({ id: 'early' }), schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 20 * 60) })] });
    const unknown = record({ location: location({ id: 'unknown' }), schedules: [] });
    const outcome = search({ records: [late, early, unknown], reviewsByGymId: {}, query: defaultQuery({ visitDate: THURSDAY, hours: 'late' }) });
    expect(outcome.results.map((result) => result.record.location.id)).toEqual(['late']);
    const all = search({ records: [late, early, unknown], reviewsByGymId: {}, query: defaultQuery({ visitDate: THURSDAY }) });
    expect(all.results).toHaveLength(3);
  });

  it('offers to drop the filter when it leaves nothing confirmed, and never drops it itself', () => {
    const early = record({ location: location({ id: 'early' }), schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 20 * 60) })] });
    const query = defaultQuery({ visitDate: THURSDAY, visitMinuteOfDay: 10 * 60, hours: 'late' });
    const outcome = search({ records: [early], reviewsByGymId: {}, query });
    expect(outcome.results).toHaveLength(0);
    const without = search({ records: [early], reviewsByGymId: {}, query: { ...query, hours: null } });
    const drop = outcome.relaxations.find((item) => item.kind === 'drop_hours');
    expect(drop?.patch).toEqual({ hours: null });
    expect(drop?.label).toBe('Drop "Open late"');
    expect(drop?.confirmedCount).toBe(without.counts.confirmed);
  });
});
