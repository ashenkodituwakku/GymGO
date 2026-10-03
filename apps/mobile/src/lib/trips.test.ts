import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } }));

import { daysToPlan, nights, parseTrips, tripDatesLabel, tripToShow, tripWhen, upcomingTrips, type Trip } from './trips';

const trip = (id: string, from: string, to: string): Trip => ({
  id,
  placeName: id,
  centre: { lat: -33.87, lng: 151.21 },
  timezone: 'Australia/Sydney',
  countryCode: 'AU',
  from,
  to,
});
const TODAY = '2026-10-01';

describe('trips', () => {
  it('keeps the ones not over yet, soonest first, and shows one under way or within a month', () => {
    const past = trip('past', '2026-09-20', '2026-09-25');
    const soon = trip('soon', '2026-10-08', '2026-10-11');
    const now = trip('now', '2026-09-29', '2026-10-03');
    const later = trip('later', '2026-12-20', '2026-12-28');
    expect(upcomingTrips([later, past, soon, now], TODAY).map((item) => item.id)).toEqual(['now', 'soon', 'later']);
    expect(tripToShow([later, soon], TODAY)?.id).toBe('soon');
    expect(tripToShow([later], TODAY)).toBeNull();
    expect(tripToShow([past], TODAY)).toBeNull();
  });

  it('plans from today once a trip is under way', () => {
    expect(daysToPlan(trip('now', '2026-09-29', '2026-10-03'), TODAY)).toEqual({ from: TODAY, to: '2026-10-03' });
    expect(daysToPlan(trip('soon', '2026-10-08', '2026-10-11'), TODAY)).toEqual({ from: '2026-10-08', to: '2026-10-11' });
  });

  it('says when, in words', () => {
    expect(tripDatesLabel({ from: '2026-09-24', to: '2026-09-27' })).toBe('Thu 24 – Sun 27 Sept');
    expect(tripDatesLabel({ from: '2026-09-30', to: '2026-10-02' })).toBe('Wed 30 Sept – Fri 2 Oct');
    expect(tripDatesLabel({ from: '2026-10-03', to: '2026-10-03' })).toBe('Sat 3 Oct');
    expect(tripWhen({ from: '2026-10-02', to: '2026-10-04' }, TODAY)).toBe('Tomorrow');
    expect(tripWhen({ from: '2026-10-06', to: '2026-10-09' }, TODAY)).toBe('In 5 days');
    expect(tripWhen({ from: '2026-09-29', to: '2026-10-03' }, TODAY)).toBe('Under way');
    expect(tripWhen({ from: '2026-09-29', to: TODAY }, TODAY)).toBe('Last day');
    expect(nights({ from: '2026-09-30', to: '2026-10-02' })).toBe(2);
  });

  it('reads back only well-formed trips', () => {
    const good = trip('good', '2026-10-08', '2026-10-11');
    expect(parseTrips(JSON.stringify([good, { id: 'bad' }, null]))).toEqual([good]);
    expect(parseTrips('not json')).toEqual([]);
    expect(parseTrips(null)).toEqual([]);
  });
});
