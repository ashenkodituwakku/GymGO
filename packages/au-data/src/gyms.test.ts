import { defaultQuery, haversineKm, search, type GymRecord } from '@gymgo/domain';
import { describe, expect, it } from 'vitest';
import { AU_CITIES, AU_GYMS, AU_PLACES, auCity } from './index';
import { GYM_ROWS } from './data';

const allFacts = (record: GymRecord) => [
  record.location.provenance,
  record.prerequisites.provenance,
  ...record.schedules.map((item) => item.provenance),
  ...record.offers.map((item) => item.provenance),
  ...record.equipment.map((item) => item.provenance),
  ...record.amenities.map((item) => item.provenance),
];

describe('Australian gyms from OpenStreetMap', () => {
  it('covers seven cities with real gyms, none of them demo data', () => {
    expect(AU_CITIES.map((city) => city.id)).toEqual(['sydney', 'brisbane', 'perth', 'adelaide', 'canberra', 'gold-coast', 'hobart']);
    expect(AU_GYMS.length).toBeGreaterThanOrEqual(150);
    for (const city of AU_CITIES) expect(GYM_ROWS.filter((row) => row.city === city.id).length).toBeGreaterThanOrEqual(5);
    for (const record of AU_GYMS) expect(record.location.isDemoData).toBe(false);
  });

  it('has real Sydney gyms, in New South Wales', () => {
    const sydney = GYM_ROWS.filter((row) => row.city === 'sydney');
    expect(sydney.length).toBeGreaterThanOrEqual(20);
    for (const row of sydney) expect(row.state).toBe('NSW');
  });

  it('has unique ids ending in their city', () => {
    const ids = AU_GYMS.map((record) => record.location.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of GYM_ROWS) expect(row.id.endsWith(row.city) || row.id.includes(`${row.city}-`)).toBe(true);
  });

  it('labels everything as community-reported from OpenStreetMap, with a link and a date', () => {
    for (const record of AU_GYMS) {
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

  it('invents nothing: no prices, no equipment, no photos, no guest or staffed hours', () => {
    for (const record of AU_GYMS) {
      expect(record.offers).toEqual([]);
      expect(record.equipment).toEqual([]);
      for (const amenity of record.amenities) {
        expect(['yes', 'no']).toContain(amenity.present);
        expect(amenity.provenance.status).toBe('community_reported');
      }
      if (record.location.email) expect(record.location.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
      expect(record.location.photos).toEqual([]);
      for (const item of record.schedules) expect(item.audience).toBe('member');
      expect(record.location.operatingStatus).toBe('unknown');
    }
  });

  it('puts every gym inside its city’s area, on that city’s clock, with an Australian address', () => {
    for (const row of GYM_ROWS) {
      const city = auCity(row.city);
      expect(haversineKm(city.centre, { lat: row.lat, lng: row.lng })).toBeLessThanOrEqual(city.radiusKm + 0.5);
      const record = AU_GYMS.find((item) => item.location.id === row.id)!;
      expect(record.location.timezone).toBe(city.timezone);
      expect(record.location.address.countryCode).toBe('AU');
      expect(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']).toContain(record.location.address.state);
      expect(record.location.address.postcode).toMatch(/^(\d{4})?$/);
      for (const item of record.schedules) expect(item.timezone).toBe(city.timezone);
    }
  });

  it('keeps mapped opening hours sane', () => {
    for (const record of AU_GYMS) {
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
    const banned = /yoga|pilates|barre|hotel|apartment|university|college|defence|barracks/i;
    for (const record of AU_GYMS) expect(record.location.name).not.toMatch(banned);
  });

  it('has suburbs to search in every city', () => {
    for (const city of AU_CITIES) expect(AU_PLACES.filter((place) => place.city === city.id).length).toBeGreaterThanOrEqual(3);
  });

  it('runs through the real search honestly: nothing is a sure thing without guest hours or a price', () => {
    const brisbane = auCity('brisbane');
    const outcome = search({
      records: AU_GYMS,
      reviewsByGymId: {},
      query: defaultQuery({
        centre: brisbane.centre,
        radiusKm: 4,
        budgetMinor: 3000,
        visitDate: '2026-09-24',
        visitMinuteOfDay: 18 * 60,
        timezone: brisbane.timezone,
        requiredEquipment: [],
      }),
      asOf: new Date('2026-09-24T12:00:00Z'),
    });
    expect(outcome.results.length).toBeGreaterThan(5);
    expect(outcome.results.filter((result) => result.tier === 'confirmed')).toEqual([]);
  });
});
