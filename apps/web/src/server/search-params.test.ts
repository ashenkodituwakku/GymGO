/**
 * URL round-tripping.
 *
 * The URL is the search state, so these tests are really about whether a
 * shared link, a bookmark and the browser's back button all reconstruct the
 * same search — and whether junk in a query string can produce a wrong
 * answer rather than a safe default.
 */

import { describe, expect, it } from 'vitest';
import { buildSearchParams, formatMinuteInput, parseSearchParams, todayInPilotArea } from './search-params';

const NOW = new Date('2026-09-22T09:00:00.000Z');

describe('parseSearchParams', () => {
  it('reconstructs the reference task from a URL', () => {
    const parsed = parseSearchParams(
      {
        q: 'Surry Hills',
        budget: '30',
        date: '2026-09-23',
        time: '19:00',
        eq: ['squat_rack', 'cable_station', 'dumbbells'],
        db: '40',
        r: '3',
      },
      NOW,
    );

    expect(parsed.placeName).toBe('Surry Hills');
    expect(parsed.query.budgetMinor).toBe(3000);
    expect(parsed.query.visitMinuteOfDay).toBe(19 * 60);
    expect(parsed.query.radiusKm).toBe(3);
    expect(parsed.query.requiredEquipment).toEqual([
      { equipmentTypeId: 'squat_rack', minMaxWeightKg: null },
      { equipmentTypeId: 'cable_station', minMaxWeightKg: null },
      { equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 },
    ]);
  });

  it('accepts a comma-joined equipment list as well as repeated parameters', () => {
    const repeated = parseSearchParams({ eq: ['squat_rack', 'bench'] }, NOW);
    const joined = parseSearchParams({ eq: 'squat_rack,bench' }, NOW);
    expect(joined.query.requiredEquipment).toEqual(repeated.query.requiredEquipment);
  });

  it('defaults the visit date to today in the pilot time zone', () => {
    const parsed = parseSearchParams({}, NOW);
    expect(parsed.query.visitDate).toBe(todayInPilotArea(NOW));
    // 09:00 UTC is already the 22nd in Sydney, not the 21st.
    expect(parsed.query.visitDate).toBe('2026-09-22');
  });

  it('ignores unknown equipment and amenity ids rather than failing', () => {
    const parsed = parseSearchParams({ eq: ['squat_rack', 'trampoline'], am: ['showers', 'helipad'] }, NOW);
    expect(parsed.query.requiredEquipment.map((item) => item.equipmentTypeId)).toEqual(['squat_rack']);
    expect(parsed.query.requiredAmenities).toEqual(['showers']);
  });

  it('falls back to defaults for malformed values instead of guessing', () => {
    const parsed = parseSearchParams(
      { date: '2026-02-30', time: '25:99', budget: 'free', r: '-4', sort: 'sponsored' },
      NOW,
    );
    expect(parsed.query.visitDate).toBe('2026-09-22');
    expect(parsed.query.visitMinuteOfDay).toBe(19 * 60);
    // "free" must not become a budget of zero.
    expect(parsed.query.budgetMinor).toBeNull();
    expect(parsed.query.radiusKm).toBe(5);
    expect(parsed.query.sort).toBe('best_match');
  });

  it('flags a place outside the pilot area rather than silently recentring', () => {
    const parsed = parseSearchParams({ q: 'Perth' }, NOW);
    expect(parsed.outOfArea).toBe(true);
    expect(parsed.placeName).toBeNull();
  });

  it('matches a postcode as well as a suburb name', () => {
    expect(parseSearchParams({ q: '2042' }, NOW).placeName).toBe('Newtown');
  });

  it('reads a bounding box and rejects a nonsensical one', () => {
    const good = parseSearchParams({ bbox: '-33.85,-33.90,151.25,151.15' }, NOW);
    expect(good.query.bbox).toEqual({ north: -33.85, south: -33.9, east: 151.25, west: 151.15 });

    // North below south is not a box.
    expect(parseSearchParams({ bbox: '-33.95,-33.80,151.25,151.15' }, NOW).query.bbox).toBeNull();
    expect(parseSearchParams({ bbox: 'everywhere' }, NOW).query.bbox).toBeNull();
  });

  it('only treats a location as the device’s when it was explicitly asked for', () => {
    const asked = parseSearchParams({ near: 'me', lat: '-33.884', lng: '151.211' }, NOW);
    expect(asked.usedDeviceLocation).toBe(true);

    const notAsked = parseSearchParams({ lat: '-33.884', lng: '151.211' }, NOW);
    expect(notAsked.usedDeviceLocation).toBe(false);
    expect(notAsked.query.centre).toEqual({ lat: -33.884, lng: 151.211 });
  });

  it('caps a comparison at three gyms', () => {
    const parsed = parseSearchParams({ cmp: 'a,b,c,d,e' }, NOW);
    expect(parsed.compareIds).toEqual(['a', 'b', 'c']);
  });

  it('treats an unstated residency as unknown, not as a no', () => {
    expect(parseSearchParams({}, NOW).query.profile.isLocalResident).toBe('unknown');
    expect(parseSearchParams({ resident: 'maybe' }, NOW).query.profile.isLocalResident).toBe('unknown');
    expect(parseSearchParams({ resident: 'yes' }, NOW).query.profile.isLocalResident).toBe('yes');
  });
});

describe('buildSearchParams', () => {
  it('replaces one parameter and leaves the rest alone', () => {
    const result = buildSearchParams({ q: 'Surry Hills', budget: '30', eq: ['squat_rack'] }, { budget: '40' });
    const params = new URLSearchParams(result);
    expect(params.get('q')).toBe('Surry Hills');
    expect(params.get('budget')).toBe('40');
    expect(params.getAll('eq')).toEqual(['squat_rack']);
  });

  it('removes a parameter when the override is null', () => {
    const result = buildSearchParams({ q: 'Glebe', bbox: '1,2,3,4' }, { bbox: null });
    expect(new URLSearchParams(result).has('bbox')).toBe(false);
  });

  it('round-trips a full search through build and parse unchanged', () => {
    const original = {
      q: 'Newtown',
      budget: '25',
      date: '2026-10-05',
      time: '06:30',
      eq: ['squat_rack', 'dumbbells'],
      db: '32',
      am: ['showers'],
      sort: 'visit_cost',
      r: '2',
    };
    const rebuilt = Object.fromEntries(new URLSearchParams(buildSearchParams(original, {})));
    const params = new URLSearchParams(buildSearchParams(original, {}));

    const parsed = parseSearchParams({ ...rebuilt, eq: params.getAll('eq'), am: params.getAll('am') }, NOW);
    expect(parsed.query.budgetMinor).toBe(2500);
    expect(parsed.query.visitDate).toBe('2026-10-05');
    expect(formatMinuteInput(parsed.query.visitMinuteOfDay)).toBe('06:30');
    expect(parsed.query.sort).toBe('visit_cost');
    expect(parsed.query.requiredEquipment).toHaveLength(2);
    expect(parsed.query.requiredAmenities).toEqual(['showers']);
  });
});
