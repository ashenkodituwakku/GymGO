import { defaultQuery, haversineKm, isOpenAt, search, zonedTimeToInstant, type GymRecord } from '@gymgo/domain';
import { describe, expect, it } from 'vitest';
import { US_CITIES, US_GYMS, US_PLACES, usCity } from './index';
import { GYM_ROWS } from './data';

const allFacts = (record: GymRecord) => [
  record.location.provenance,
  record.prerequisites.provenance,
  ...record.schedules.map((item) => item.provenance),
  ...record.offers.map((item) => item.provenance),
  ...record.equipment.map((item) => item.provenance),
  ...record.amenities.map((item) => item.provenance),
];

describe('US gyms from OpenStreetMap', () => {
  it('covers 15 cities with hundreds of real gyms, none of them demo data', () => {
    expect(US_CITIES).toHaveLength(15);
    expect(US_GYMS.length).toBeGreaterThanOrEqual(400);
    for (const city of US_CITIES) expect(GYM_ROWS.filter((row) => row.city === city.id).length).toBeGreaterThanOrEqual(5);
    for (const record of US_GYMS) expect(record.location.isDemoData).toBe(false);
  });

  it('has unique ids that cannot clash with Melbourne’s', () => {
    const ids = US_GYMS.map((record) => record.location.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of GYM_ROWS) expect(row.id.endsWith(row.city) || row.id.includes(`${row.city}-`)).toBe(true);
  });

  it('labels everything as community-reported from OpenStreetMap, with a link and a date', () => {
    for (const record of US_GYMS) {
      for (const provenance of allFacts(record)) {
        if (provenance.status === 'unknown') {
          expect(provenance.sources).toEqual([]);
          continue;
        }
        expect(provenance.status).toBe('community_reported');
        for (const source of provenance.sources) {
          expect(source.evidenceRef).toMatch(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/);
          expect(Number.isNaN(Date.parse(source.checkedAt))).toBe(false);
        }
      }
    }
  });

  it('invents nothing: no prices, no equipment, no amenities, no photos, no guest or staffed hours', () => {
    for (const record of US_GYMS) {
      expect(record.offers).toEqual([]);
      expect(record.equipment).toEqual([]);
      expect(record.amenities).toEqual([]);
      expect(record.location.photos).toEqual([]);
      for (const item of record.schedules) expect(item.audience).toBe('member');
    }
  });

  it('never calls a gym open for business on the map’s word alone', () => {
    for (const record of US_GYMS) expect(record.location.operatingStatus).toBe('unknown');
  });

  it('puts every gym inside its city’s area, on that city’s clock', () => {
    for (const row of GYM_ROWS) {
      const city = usCity(row.city);
      expect(haversineKm(city.centre, { lat: row.lat, lng: row.lng })).toBeLessThanOrEqual(city.radiusKm + 0.5);
      const record = US_GYMS.find((item) => item.location.id === row.id)!;
      expect(record.location.timezone).toBe(city.timezone);
      expect(record.location.address.countryCode).toBe('US');
      for (const item of record.schedules) expect(item.timezone).toBe(city.timezone);
    }
  });

  it('keeps mapped opening hours sane', () => {
    for (const record of US_GYMS) {
      for (const item of record.schedules) {
        expect(item.windows.length).toBeGreaterThan(0);
        for (const window of item.windows) {
          expect(window.day).toBeGreaterThanOrEqual(0);
          expect(window.day).toBeLessThanOrEqual(6);
          expect(window.openMinute).toBeLessThan(window.closeMinute);
          expect(window.closeMinute).toBeLessThanOrEqual(2 * 1440);
        }
      }
    }
  });

  it('leaves out what isn’t a public gym', () => {
    const banned = /yoga|pilates|barre|soulcycle|hotel|marriott|apartment|university|college/i;
    for (const record of US_GYMS) expect(record.location.name).not.toMatch(banned);
  });

  it('has neighborhoods to search in every city', () => {
    for (const city of US_CITIES) expect(US_PLACES.filter((place) => place.city === city.id).length).toBeGreaterThanOrEqual(3);
  });

  it('reads a 24/7 gym as open to members at 3 am, New York time', () => {
    const always = US_GYMS.find((record) => record.location.timezone === 'America/New_York' && record.schedules[0]?.alwaysOpen);
    expect(always).toBeDefined();
    const member = always!.schedules[0]!;
    expect(isOpenAt(member, zonedTimeToInstant('2026-09-24', 3 * 60, 'America/New_York')).open).toBe(true);
  });

  it('runs through the real search honestly: nothing is a sure thing without guest hours or a price', () => {
    const nyc = usCity('new-york');
    const outcome = search({
      records: US_GYMS,
      reviewsByGymId: {},
      query: defaultQuery({
        centre: nyc.centre,
        radiusKm: 3,
        budgetMinor: 3000,
        visitDate: '2026-09-24',
        visitMinuteOfDay: 18 * 60,
        timezone: nyc.timezone,
        requiredEquipment: [],
      }),
      asOf: new Date('2026-09-24T12:00:00Z'),
    });
    expect(outcome.results.length).toBeGreaterThan(5);
    expect(outcome.results.filter((result) => result.tier === 'confirmed')).toEqual([]);
  });
});
