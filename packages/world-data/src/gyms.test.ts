import { haversineKm, type GymRecord } from '@gymgo/domain';
import { isChainEvidence } from '@gymgo/osm';
import { describe, expect, it } from 'vitest';
import { WORLD_CITIES, WORLD_CITIES_BUILT, WORLD_GYMS, WORLD_PLACES, worldCity } from './index';
import { FETCHED, GYM_ROWS } from './data';

const allFacts = (record: GymRecord) => [
  record.location.provenance,
  record.prerequisites.provenance,
  ...record.schedules.map((item) => item.provenance),
  ...record.offers.map((item) => item.provenance),
  ...record.equipment.map((item) => item.provenance),
  ...record.amenities.map((item) => item.provenance),
];

describe('the world cities to fetch', () => {
  it('each has its own id, a real time zone, a centre on the globe and a sensible circle', () => {
    expect(new Set(WORLD_CITIES.map((city) => city.id)).size).toBe(WORLD_CITIES.length);
    for (const city of WORLD_CITIES) {
      expect(() => new Intl.DateTimeFormat('en', { timeZone: city.timezone })).not.toThrow();
      expect(Math.abs(city.centre.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(city.centre.lng)).toBeLessThanOrEqual(180);
      expect(city.radiusKm).toBeGreaterThanOrEqual(3);
      expect(city.radiusKm).toBeLessThanOrEqual(8);
      expect(city.country).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('only fetched cities reach the app', () => {
    expect(WORLD_CITIES_BUILT.map((city) => city.id).sort()).toEqual(Object.keys(FETCHED).sort());
    for (const row of GYM_ROWS) expect(FETCHED[row.city]).toBeDefined();
  });
});

describe('world gyms from OpenStreetMap (whatever has been fetched)', () => {
  it('has at least five real gyms in each city it offers, none of them demo data, with unique ids', () => {
    for (const city of WORLD_CITIES_BUILT) expect(GYM_ROWS.filter((row) => row.city === city.id).length).toBeGreaterThanOrEqual(5);
    for (const record of WORLD_GYMS) expect(record.location.isDemoData).toBe(false);
    const ids = WORLD_GYMS.map((record) => record.location.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels everything as community-reported from OpenStreetMap, with a link and a date', () => {
    for (const record of WORLD_GYMS) {
      for (const provenance of allFacts(record)) {
        if (provenance.status === 'unknown') {
          expect(provenance.sources).toEqual([]);
          continue;
        }
        if (provenance.sources.every(isChainEvidence)) continue;
        expect(provenance.status).toBe('community_reported');
        for (const source of provenance.sources) {
          expect(source.evidenceRef).toMatch(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/);
          expect(Number.isNaN(Date.parse(source.checkedAt))).toBe(false);
        }
      }
    }
  });

  it('invents nothing: no prices beyond a chain’s own, no equipment, no photos, no guest hours', () => {
    for (const record of WORLD_GYMS) {
      for (const offer of record.offers) expect(offer.provenance.sources.every(isChainEvidence)).toBe(true);
      expect(record.equipment).toEqual([]);
      expect(record.location.photos).toEqual([]);
      for (const item of record.schedules) expect(item.audience).toBe('member');
      expect(record.location.operatingStatus).toBe('unknown');
    }
  });

  it('puts every gym inside its city’s circle, in its own country and on its own clock', () => {
    for (const row of GYM_ROWS) {
      const city = worldCity(row.city);
      expect(haversineKm(city.centre, { lat: row.lat, lng: row.lng })).toBeLessThanOrEqual(city.radiusKm + 0.01);
      const record = WORLD_GYMS.find((item) => item.location.id === row.id)!;
      expect(record.location.timezone).toBe(city.timezone);
      expect(record.location.address.countryCode).toBe(city.country);
    }
    for (const place of WORLD_PLACES) expect(FETCHED[place.city]).toBeDefined();
  });
});
