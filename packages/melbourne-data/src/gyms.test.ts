import { describe, expect, it } from 'vitest';
import { assessAllOffers, isOpenAt, search, defaultQuery, zonedTimeToInstant, type GymRecord } from '@gymgo/domain';
import { MELBOURNE_GYMS } from './gyms';
import { MELBOURNE, MELBOURNE_CENTRE } from './index';

const allFacts = (record: GymRecord) => [
  record.location.provenance,
  record.prerequisites.provenance,
  ...record.schedules.map((item) => item.provenance),
  ...record.offers.map((item) => item.provenance),
  ...record.equipment.map((item) => item.provenance),
  ...record.amenities.map((item) => item.provenance),
];

describe('real Melbourne records', () => {
  it('has a real set of gyms, none of them demo data', () => {
    expect(MELBOURNE_GYMS.length).toBeGreaterThanOrEqual(20);
    for (const record of MELBOURNE_GYMS) expect(record.location.isDemoData).toBe(false);
  });

  it('has unique ids', () => {
    const ids = MELBOURNE_GYMS.map((record) => record.location.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cites a public URL and a check time for every fact it claims', () => {
    for (const record of MELBOURNE_GYMS) {
      for (const provenance of allFacts(record)) {
        if (provenance.status === 'unknown') {
          expect(provenance.sources).toEqual([]);
          continue;
        }
        expect(provenance.sources.length).toBeGreaterThan(0);
        for (const source of provenance.sources) {
          expect(source.evidenceRef).toMatch(/^https:\/\//);
          expect(Number.isNaN(Date.parse(source.checkedAt))).toBe(false);
        }
      }
    }
  });

  it('credits OpenStreetMap for every position', () => {
    for (const record of MELBOURNE_GYMS) {
      const refs = record.location.provenance.sources.map((source) => source.evidenceRef);
      expect(refs.some((ref) => ref?.startsWith('https://www.openstreetmap.org/'))).toBe(true);
      expect(record.location.externalRefs.openStreetMap).toBeTruthy();
    }
  });

  it('puts every gym in inner Melbourne, in Victoria, on Melbourne time', () => {
    for (const record of MELBOURNE_GYMS) {
      const { lat, lng } = record.location.position;
      expect(lat).toBeGreaterThan(-37.9);
      expect(lat).toBeLessThan(-37.7);
      expect(lng).toBeGreaterThan(144.9);
      expect(lng).toBeLessThan(145.05);
      expect(record.location.address.state).toBe('VIC');
      expect(record.location.timezone).toBe(MELBOURNE);
      for (const item of record.schedules) expect(item.timezone).toBe(MELBOURNE);
    }
  });

  it('carries no photographs', () => {
    for (const record of MELBOURNE_GYMS) expect(record.location.photos).toEqual([]);
  });

  it('never claims guest hours it was not told about', () => {
    // Only Doherty's says casual passes are sold during all regular hours.
    const withVisitorHours = MELBOURNE_GYMS.filter((record) => record.schedules.some((item) => item.audience === 'visitor'));
    expect(withVisitorHours.map((record) => record.location.id).sort()).toEqual([
      'dohertys-gym-brunswick',
      'dohertys-gym-city',
    ]);
  });

  it('only calls a branch open when the operator lists it', () => {
    for (const record of MELBOURNE_GYMS) {
      const operatorSource = record.location.provenance.sources.some((source) => source.sourceType === 'operator_website');
      expect(record.location.operatingStatus).toBe(operatorSource ? 'open' : 'unknown');
    }
  });

  it('prices a casual visit at Doherty’s City at the published A$20, fresh today', () => {
    const city = MELBOURNE_GYMS.find((record) => record.location.id === 'dohertys-gym-city')!;
    const selection = assessAllOffers(city.offers, { visitLocalDate: '2026-09-23', asOf: new Date('2026-09-23T10:00:00Z') });
    const casual = selection.find((item) => item.offer.productType === 'casual_gym_visit');
    expect(casual?.cost.totalNonRefundableMinor).toBe(2000);
  });

  it('knows Doherty’s City admits a casual visitor at 7 pm but not at 1 am', () => {
    const city = MELBOURNE_GYMS.find((record) => record.location.id === 'dohertys-gym-city')!;
    const visitor = city.schedules.find((item) => item.audience === 'visitor')!;
    expect(isOpenAt(visitor, zonedTimeToInstant('2026-09-23', 19 * 60, MELBOURNE)).open).toBe(true);
    expect(isOpenAt(visitor, zonedTimeToInstant('2026-09-23', 60, MELBOURNE)).open).toBe(false);
  });

  it('runs through the real search honestly: a 7 pm visit under A$25 near the CBD', () => {
    const outcome = search({
      records: MELBOURNE_GYMS,
      reviewsByGymId: {},
      query: defaultQuery({
        centre: MELBOURNE_CENTRE,
        radiusKm: 5,
        budgetMinor: 2500,
        visitDate: '2026-09-23',
        visitMinuteOfDay: 19 * 60,
        timezone: MELBOURNE,
        requiredEquipment: [],
      }),
      asOf: new Date('2026-09-23T09:00:00Z'),
    });
    const city = outcome.results.find((result) => result.record.location.id === 'dohertys-gym-city')!;
    // Price, guest hours and booking are all published. The one thing the
    // gym doesn't say is whether a first visit needs an induction, and an
    // unconfirmed requirement is never treated as met. So: worth a call.
    expect(city.tier).toBe('needs_confirmation');
    expect(city.limitations.map((item) => item.code)).toEqual(['induction_unknown']);
    expect(city.access.verdict).not.toBe('not_admitted');
    // Nothing in this set is published fully enough to be a sure thing.
    expect(outcome.results.filter((result) => result.tier === 'confirmed')).toEqual([]);
  });
});
