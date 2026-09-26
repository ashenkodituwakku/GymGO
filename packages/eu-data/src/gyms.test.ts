import { defaultQuery, haversineKm, search, type GymRecord } from '@gymgo/domain';
import { describe, expect, it } from 'vitest';
import { EU_CITIES, EU_GYMS, EU_PLACES, euCity } from './index';
import { GYM_ROWS } from './data';

const allFacts = (record: GymRecord) => [
  record.location.provenance,
  record.prerequisites.provenance,
  ...record.schedules.map((item) => item.provenance),
  ...record.offers.map((item) => item.provenance),
  ...record.equipment.map((item) => item.provenance),
  ...record.amenities.map((item) => item.provenance),
];

describe('European gyms from OpenStreetMap', () => {
  it('covers fifteen cities with real gyms, none of them demo data', () => {
    expect(EU_CITIES).toHaveLength(15);
    expect(EU_GYMS.length).toBeGreaterThanOrEqual(400);
    for (const city of EU_CITIES) expect(GYM_ROWS.filter((row) => row.city === city.id).length).toBeGreaterThanOrEqual(10);
    for (const record of EU_GYMS) expect(record.location.isDemoData).toBe(false);
  });

  it('has unique ids ending in their city', () => {
    const ids = EU_GYMS.map((record) => record.location.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of GYM_ROWS) expect(row.id.endsWith(row.city) || row.id.includes(`${row.city}-`)).toBe(true);
  });

  it('labels everything as community-reported from OpenStreetMap, with a link and a date', () => {
    for (const record of EU_GYMS) {
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
    for (const record of EU_GYMS) {
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

  it('puts every gym inside its city’s circle, in its own country and on its own clock', () => {
    for (const row of GYM_ROWS) {
      const city = euCity(row.city);
      expect(haversineKm(city.centre, { lat: row.lat, lng: row.lng })).toBeLessThanOrEqual(city.radiusKm + 0.01);
      const record = EU_GYMS.find((item) => item.location.id === row.id)!;
      expect(record.location.timezone).toBe(city.timezone);
      expect(record.location.address.countryCode).toBe(city.country);
      for (const item of record.schedules) expect(item.timezone).toBe(city.timezone);
    }
    expect(euCity('london').country).toBe('GB');
    expect(euCity('munich').timezone).toBe('Europe/Berlin');
  });

  it('writes street numbers the local way: after the street in Berlin, before it in London', () => {
    const berlin = GYM_ROWS.filter((row) => row.city === 'berlin' && /\d/.test(row.line1));
    const london = GYM_ROWS.filter((row) => row.city === 'london' && /\d/.test(row.line1));
    expect(berlin.some((row) => /\D \d+\w*$/.test(row.line1))).toBe(true);
    expect(london.some((row) => /^\d/.test(row.line1))).toBe(true);
  });

  it('keeps mapped opening hours sane', () => {
    for (const record of EU_GYMS) {
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

  it('leaves out what isn’t a public gym (the English-named ones, at least)', () => {
    const banned = /yoga|pilates|barre|hotel|apartment|university|college/i;
    for (const record of EU_GYMS) expect(record.location.name).not.toMatch(banned);
  });

  it('has districts to search in every city', () => {
    for (const city of EU_CITIES) expect(EU_PLACES.filter((place) => place.city === city.id).length).toBeGreaterThanOrEqual(3);
  });

  it('runs through the real search honestly: nothing is a sure thing without guest hours or a price', () => {
    const paris = euCity('paris');
    const outcome = search({
      records: EU_GYMS,
      reviewsByGymId: {},
      query: defaultQuery({
        centre: paris.centre,
        radiusKm: 4,
        budgetMinor: null,
        visitDate: '2026-09-24',
        visitMinuteOfDay: 18 * 60,
        timezone: paris.timezone,
        requiredEquipment: [],
      }),
      asOf: new Date('2026-09-24T12:00:00Z'),
    });
    expect(outcome.results.length).toBeGreaterThan(5);
    expect(outcome.results.filter((result) => result.tier === 'confirmed')).toEqual([]);
  });
});
