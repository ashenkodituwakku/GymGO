import { describe, expect, it } from 'vitest';
import { AU_GYMS } from '@gymgo/au-data';
import { THIS_AREA, boxAround, boxDrift, reachFor, tilesAround, inArea, initialFilters, moveTo, nameForArea, nearLabel, nextVisitAt, nowIn, runSearch } from './query';

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

describe('Search this area', () => {
  const hobart = { north: -42.87, south: -42.9, east: 147.35, west: 147.3 };
  const filters = initialFilters(new Date('2026-09-23T23:30:00Z'));

  it('limits the results to the box, whatever the radius', () => {
    const area = inArea(filters, hobart, 'Hobart', 'Australia/Hobart');
    const outcome = runSearch(area, { records: AU_GYMS });
    expect(outcome.results.length).toBeGreaterThan(0);
    for (const result of outcome.results) {
      const { lat, lng } = result.record.location.position;
      expect(lat <= hobart.north && lat >= hobart.south && lng <= hobart.east && lng >= hobart.west).toBe(true);
    }
    expect(area.centre).toEqual({ lat: -42.885, lng: 147.325 });
  });

  it('is cleared by picking a place', () => {
    const area = inArea(filters, hobart, 'Hobart', 'Australia/Hobart');
    expect(moveTo(area, { centre: { lat: -37.8, lng: 144.96 }, placeName: 'Melbourne', timezone: 'Australia/Melbourne' }).bbox).toBeNull();
  });

  it('names the area after the gym nearest the middle, or says "this area"', () => {
    expect(nameForArea(AU_GYMS, hobart)).toBe('Hobart');
    expect(nameForArea(AU_GYMS, { north: -10, south: -10.1, east: 130.1, west: 130 })).toBe(THIS_AREA);
    expect(nearLabel(THIS_AREA)).toBe('In this area');
    expect(nearLabel('your location')).toBe('Near you');
    expect(nearLabel('Fitzroy')).toBe('Near Fitzroy');
  });

  it('measures how far the map has moved from the searched box', () => {
    expect(boxDrift(hobart, hobart)).toBe(0);
    const panned = { ...hobart, north: hobart.north + 0.015, south: hobart.south + 0.015 };
    expect(boxDrift(hobart, panned)).toBeCloseTo(0.5);
    const zoomedOut = { north: -42.855, south: -42.915, east: 147.375, west: 147.275 };
    expect(boxDrift(hobart, zoomedOut)).toBeCloseTo(1);
  });
});

describe('boxAround', () => {
  it('is as wide on the ground as it is tall', () => {
    const box = boxAround({ lat: -60, lng: 150 }, 0.1);
    expect(box.north - box.south).toBeCloseTo(0.1);
    // At 60° south a degree of longitude is half as long, so the box is twice as many degrees wide.
    expect(box.east - box.west).toBeCloseTo(0.2);
    expect((box.east + box.west) / 2).toBeCloseTo(150);
  });
});

describe('tilesAround', () => {
  it('asks for whole tiles around you, the same box anywhere in your tile', () => {
    const a = tilesAround({ lat: -36.7571, lng: 144.2794 });
    const b = tilesAround({ lat: -36.7012, lng: 144.2001 });
    expect(a).toEqual(b);
    expect(a).toEqual({ south: -36.9, north: -36.6, west: 144.1, east: 144.4 });
    // You're inside it, with a whole tile to spare on every side.
    expect(a.south < -36.8 && a.north > -36.7 && a.west < 144.2 && a.east > 144.3).toBe(true);
  });
});

describe('reachFor', () => {
  it('keeps 5 km when something is that close, widens to 10 km only to reach something', () => {
    expect(reachFor([1.2, 7, 30])).toEqual({ radiusKm: 5, count: 1 });
    expect(reachFor([6.5, 9.9, 30])).toEqual({ radiusKm: 10, count: 2 });
    expect(reachFor([14, 30])).toEqual({ radiusKm: 5, count: 0 });
    expect(reachFor([])).toEqual({ radiusKm: 5, count: 0 });
  });
});
