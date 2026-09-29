import { defaultQuery, haversineKm, search, type GymRecord } from '@gymgo/domain';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { describe, expect, it } from 'vitest';
import { AU_CITIES, AU_GYMS, AU_PLACES, auCity } from './index';
import { GYM_ROWS } from './data';
import { OPERATOR_GYMS, OPERATOR_GYMS_RAW } from './operators';

// The map's own records; the operator-listed ones are tested below.
const operatorIds = new Set(OPERATOR_GYMS.map((record) => record.location.id));
const MAP_GYMS = AU_GYMS.filter((record) => !operatorIds.has(record.location.id));

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
    // Each city's whole area, not just the 40 gyms nearest its centre.
    expect(MAP_GYMS.length).toBeGreaterThanOrEqual(1000);
    for (const city of AU_CITIES) expect(GYM_ROWS.filter((row) => row.city === city.id).length).toBeGreaterThanOrEqual(20);
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
    for (const record of MAP_GYMS) {
      for (const provenance of allFacts(record)) {
        if (provenance.status === 'unknown') {
          expect(provenance.sources).toEqual([]);
          continue;
        }
        expect(provenance.status).toBe('community_reported');
        for (const source of provenance.sources) {
          // Besides the map: a website GymGO found for a gym the map lists without one.
          if (source.sourceType === 'independent_check') {
            expect(source.evidenceRef).toBe(record.location.website);
            continue;
          }
          expect(source.evidenceRef).toMatch(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/);
          expect(Number.isNaN(Date.parse(source.checkedAt))).toBe(false);
        }
      }
    }
  });

  it('invents nothing: no prices, no equipment, no photos, no guest or staffed hours', () => {
    for (const record of MAP_GYMS) {
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

  it('adds Melbourne’s other mapped gyms, never a copy of a researched one', () => {
    const extras = GYM_ROWS.filter((row) => row.city === 'melbourne');
    expect(extras.length).toBeGreaterThanOrEqual(20);
    for (const row of extras) expect(row.state).toBe('VIC');
    // Melbourne's researched gyms carry their map element; none reappears here.
    const researched = MELBOURNE_GYMS.map((record) => record.location.externalRefs.openStreetMap);
    expect(researched.length).toBeGreaterThanOrEqual(20);
    for (const row of extras) expect(researched).not.toContain(row.osm);
    // And Melbourne isn't listed as one of this package's cities.
    expect(AU_CITIES.map((city) => city.id)).not.toContain('melbourne');
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

describe('Australian gyms from operators’ own websites', () => {
  const revo = OPERATOR_GYMS.filter((record) => record.location.brand === 'Revo Fitness');

  it('has every open Revo Fitness branch the chain lists, and none still to open', () => {
    expect(revo.length).toBeGreaterThanOrEqual(70);
    const ids = new Set(revo.map((record) => record.location.id));
    for (const open of ['revo-fitness-chadstone', 'revo-fitness-richmond', 'revo-fitness-pitt-st', 'revo-fitness-castle-hill', 'revo-fitness-northbridge']) {
      expect(ids.has(open)).toBe(true);
    }
    // Listed on the site with an open date still to come (Knox: 1 December 2026).
    expect(ids.has('revo-fitness-knox')).toBe(false);
    expect(ids.has('revo-fitness-busselton')).toBe(false);
  });

  it('has T1 Fitness in Burwood East', () => {
    const t1 = OPERATOR_GYMS.find((record) => record.location.id === 't1-fitness-burwood-east')!;
    expect(t1.location.address).toMatchObject({ suburb: 'Burwood East', state: 'VIC', postcode: '3151' });
    expect(haversineKm(t1.location.position, { lat: -37.8535, lng: 145.1625 })).toBeLessThan(0.2);
    // Its site doesn't publish hours, so there are none.
    expect(t1.schedules).toEqual([]);
  });

  it('cites the operator’s own page for every fact, and is open because the operator lists it', () => {
    for (const record of OPERATOR_GYMS) {
      expect(record.location.operatingStatus).toBe('open');
      expect(record.location.provenance.status).toBe('owner_confirmed');
      const [first] = record.location.provenance.sources;
      expect(first!.sourceType).toBe('operator_website');
      expect(first!.evidenceRef).toMatch(/^https:\/\/(revofitness\.com\.au\/gyms\/[a-z0-9-]+\/|t1fitness\.com\.au\/contact-us\/)$/);
      for (const item of record.schedules) {
        expect(item.audience).toBe('member');
        expect(item.provenance.sources[0]!.sourceType).toBe('operator_website');
      }
      // Nothing the operators don't publish.
      expect(record.offers).toEqual([]);
      expect(record.equipment).toEqual([]);
      expect(record.location.photos).toEqual([]);
    }
  });

  it('gives each an Australian address, on its state’s clock, inside Australia', () => {
    const clocks: Record<string, string> = { WA: 'Australia/Perth', SA: 'Australia/Adelaide', VIC: 'Australia/Melbourne', NSW: 'Australia/Sydney' };
    for (const record of OPERATOR_GYMS) {
      const { address, position, timezone } = record.location;
      expect(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']).toContain(address.state);
      expect(address.postcode).toMatch(/^\d{4}$/);
      expect(address.line1.length).toBeGreaterThan(3);
      expect(timezone).toBe(clocks[address.state]);
      expect(position.lat).toBeLessThan(-10);
      expect(position.lat).toBeGreaterThan(-44);
      expect(position.lng).toBeGreaterThan(112);
      expect(position.lng).toBeLessThan(154);
    }
  });

  it('leaves out the map’s copy of an operator’s gym, and any Crunch in Victoria now run by Revo', () => {
    // Revo's own list is complete: no map pin for a Revo it doesn't list, nor a Victorian Crunch.
    for (const row of GYM_ROWS) {
      expect(row.name).not.toMatch(/^revo( fitness)?\b/i);
      if (row.state === 'VIC') expect(row.name).not.toMatch(/^crunch( fitness)?\b/i);
    }
    for (const gym of OPERATOR_GYMS_RAW) {
      for (const row of GYM_ROWS) {
        const km = haversineKm({ lat: gym.lat, lng: gym.lng }, { lat: row.lat, lng: row.lng });
        if (gym.brand === 'Revo Fitness' && km <= 0.3) expect(row.name).not.toMatch(/\brevo\b/i);
        if (gym.brand === 'Revo Fitness' && km <= 0.3 && row.state === 'VIC') expect(row.name).not.toMatch(/\bcrunch\b/i);
      }
    }
    const ids = AU_GYMS.map((record) => record.location.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('websites found for map gyms that list none', () => {
  it('gives each its website, cited as found by GymGO, and only to gyms the map gave none', () => {
    const found = AU_GYMS.filter((record) => record.location.provenance.sources.some((source) => source.sourceType === 'independent_check'));
    expect(found.length).toBeGreaterThanOrEqual(20);
    for (const record of found) {
      // A few small gyms only have a plain http site; a branch of a small chain has its own page.
      expect(record.location.website).toMatch(/^https?:\/\/[a-z0-9.-]+\/\S*$/);
      const row = GYM_ROWS.find((item) => item.id === record.location.id)!;
      expect(row.website).toBeUndefined();
    }
    const summerHill = AU_GYMS.find((record) => record.location.id === 'summer-hill-gym-hardie-avenue-sydney')!;
    expect(summerHill.location.website).toBe('https://summerhillgym.com.au/');
  });
});
