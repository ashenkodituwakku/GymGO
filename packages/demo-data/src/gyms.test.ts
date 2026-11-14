/**
 * The demo dataset, checked against the rules it exists to exercise.
 *
 * If one of these fails, either a fixture has drifted or a rule has changed
 * in a way that stops the product distinguishing the cases it is built for.
 */

import { describe, expect, it } from 'vitest';
import {
  assessOffer,
  defaultQuery,
  evaluateVisitorAccess,
  matchEquipment,
  search,
  selectSingleVisitOffer,
  zonedTimeToInstant,
  type GymRecord,
} from '@gymgo/domain';
import { DEMO_GYMS } from './gyms';
import { DEMO_EPOCH } from './builders';

const ASOF = DEMO_EPOCH;
/** Tuesday 23 September 2026, 7pm Sydney. */
const VISIT_DATE = '2026-09-23';
const SEVEN_PM = zonedTimeToInstant(VISIT_DATE, 19 * 60, 'Australia/Sydney');

function gym(id: string): GymRecord {
  const found = DEMO_GYMS.find((record) => record.location.id === id);
  if (!found) throw new Error(`No demo gym with id ${id}`);
  return found;
}

const REFERENCE_QUERY = defaultQuery({
  centre: { lat: -33.8846, lng: 151.2113 },
  radiusKm: 5,
  budgetMinor: 3000,
  visitDate: VISIT_DATE,
  visitMinuteOfDay: 19 * 60,
  requiredEquipment: [
    { equipmentTypeId: 'squat_rack' },
    { equipmentTypeId: 'cable_station' },
    { equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 },
  ],
});

describe('the demo dataset', () => {
  it('has at least fifteen gyms, all flagged as demo data', () => {
    expect(DEMO_GYMS.length).toBeGreaterThanOrEqual(15);
    expect(DEMO_GYMS.every((record) => record.location.isDemoData)).toBe(true);
  });

  it('uses unique ids and slugs', () => {
    const ids = DEMO_GYMS.map((record) => record.location.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('supplies no photographs, since none of these venues exist', () => {
    expect(DEMO_GYMS.every((record) => record.location.photos.length === 0)).toBe(true);
  });

  it('carries no external provider identifiers', () => {
    // Our ids are our own, so a provider's terms can be honoured or a
    // provider dropped without the dataset depending on it.
    expect(DEMO_GYMS.every((record) => Object.keys(record.location.externalRefs).length === 0)).toBe(true);
  });
});

describe('edge cases the product is built for', () => {
  it('includes a gym that matches the reference task outright', () => {
    const outcome = search({
      records: DEMO_GYMS,
      reviewsByGymId: {},
      query: REFERENCE_QUERY,
      asOf: ASOF,
    });
    expect(outcome.counts.confirmed).toBeGreaterThan(0);
    expect(outcome.results[0]?.record.location.id).toBe('ironbark-strength-surry-hills');
  });

  it('includes a cheap admission that does not buy the gym floor', () => {
    const aquatic = gym('waterloo-aquatic-fitness');
    const pool = aquatic.offers.find((offer) => offer.productType === 'pool_only');
    expect(pool?.baseAmountMinor).toBeLessThan(1000);

    const selection = selectSingleVisitOffer(aquatic.offers, {
      visitLocalDate: VISIT_DATE,
      asOf: ASOF,
    });
    // The cheapest thing on the price list is not what a visitor would buy.
    expect(selection.confirmed?.offer.productType).toBe('casual_gym_visit');
    expect(selection.confirmed?.cost.totalNonRefundableMinor).toBe(2450);
  });

  it('includes a residents-only trial that stays unconfirmed for an unknown visitor', () => {
    const trial = gym('halfmoon-fitness-redfern').offers.find(
      (offer) => offer.productType === 'trial',
    );
    expect(trial).toBeDefined();
    expect(assessOffer(trial!, { visitLocalDate: VISIT_DATE, asOf: ASOF }).verdict).toBe(
      'needs_confirmation',
    );
  });

  it('includes a mandatory fee whose amount is unknown, so no total is confirmed', () => {
    const selection = selectSingleVisitOffer(gym('tallow-street-gym-chippendale').offers, {
      visitLocalDate: VISIT_DATE,
      budgetMinor: 3000,
      asOf: ASOF,
    });
    expect(selection.confirmed).toBeNull();
    expect(selection.unconfirmed?.cost.known).toBe(false);
  });

  it('includes a refundable deposit shown apart from the visit cost', () => {
    const selection = selectSingleVisitOffer(gym('quarry-lane-barbell-alexandria').offers, {
      visitLocalDate: VISIT_DATE,
      budgetMinor: 3000,
      asOf: ASOF,
    });
    const cost = selection.confirmed?.cost;
    expect(cost?.totalNonRefundableMinor).toBe(2500);
    expect(cost?.cashNeededTodayMinor).toBe(4500);
    expect(selection.confirmed?.budget).toBe('fits');
  });

  it('includes an expired offer that cannot be bought', () => {
    const winter = gym('marrow-and-co-darlinghurst').offers.find((offer) =>
      offer.id.endsWith('-winter'),
    );
    expect(assessOffer(winter!, { visitLocalDate: VISIT_DATE, asOf: ASOF }).verdict).toBe(
      'not_eligible',
    );
  });

  it('includes a 24-hour member gym that does not admit a visitor at 7pm', () => {
    const keystone = gym('keystone-fitness-ultimo');
    expect(keystone.schedules.find((s) => s.audience === 'member')?.alwaysOpen).toBe(true);
    expect(evaluateVisitorAccess(keystone, SEVEN_PM, { asOf: ASOF }).verdict).toBe('not_admitted');
  });

  it('includes a gym with unknown visitor hours despite 24-hour member access', () => {
    const result = evaluateVisitorAccess(gym('saltwater-strength-pyrmont'), SEVEN_PM, { asOf: ASOF });
    expect(result.verdict).toBe('needs_confirmation');
    expect(result.reasons.map((reason) => reason.code)).toContain('visitor_hours_unknown');
  });

  it('includes equipment present without a recorded count', () => {
    const observation = gym('copperfield-gym-camperdown').equipment.find(
      (item) => item.equipmentTypeId === 'squat_rack',
    );
    expect(observation?.presence).toBe('yes');
    expect(observation?.count).toBeNull();
  });

  it('includes dumbbells whose maximum is unrecorded, so 40 kg cannot be confirmed', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 }],
      gym('copperfield-gym-camperdown').equipment,
      { asOf: ASOF },
    );
    expect(result.matches[0]?.state).toBe('unknown');
  });

  it('includes conflicting reports that are surfaced rather than resolved', () => {
    const vellum = gym('vellum-strength-newtown');
    expect(vellum.offers[0]?.provenance.status).toBe('conflicting');
    const cable = vellum.equipment.find((item) => item.equipmentTypeId === 'cable_station');
    expect(cable?.provenance.status).toBe('conflicting');
    expect(cable?.provenance.sources).toHaveLength(2);
  });

  it('includes a temporarily closed gym', () => {
    const brickworks = gym('brickworks-gym-alexandria');
    expect(brickworks.location.operatingStatus).toBe('temporarily_closed');
    expect(evaluateVisitorAccess(brickworks, SEVEN_PM, { asOf: ASOF }).verdict).toBe('not_admitted');
  });

  it('includes a gym selling only a week pass, so it has no single-visit price', () => {
    const selection = selectSingleVisitOffer(gym('paddington-hill-fitness').offers, {
      visitLocalDate: VISIT_DATE,
      asOf: ASOF,
    });
    expect(selection.all).toHaveLength(0);
  });

  it('includes an overnight visitor window', () => {
    const nightshift = gym('nightshift-gym-haymarket');
    const visitor = nightshift.schedules.find((schedule) => schedule.audience === 'visitor');
    expect(visitor?.windows.some((window) => window.closeMinute > 1440)).toBe(true);

    // Saturday 26 September, 1am: inside Friday's window.
    const oneAm = zonedTimeToInstant('2026-09-26', 60, 'Australia/Sydney');
    expect(evaluateVisitorAccess(nightshift, oneAm, { asOf: ASOF }).verdict).toBe('admits_visitor');
  });

  it('includes a confirmed accessible bathroom with an unconfirmed entrance', () => {
    const greenway = gym('greenway-community-gym-glebe');
    const bathroom = greenway.amenities.find((item) => item.amenityId === 'accessible_bathroom');
    const entrance = greenway.amenities.find((item) => item.amenityId === 'step_free_entrance');
    expect(bathroom?.present).toBe('yes');
    // Neither is inferred from the other.
    expect(entrance?.present).toBe('unknown');
  });

  it('includes stale equipment data that does not count as confirmed', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'squat_rack' }],
      gym('oakline-fitness-zetland').equipment,
      { asOf: ASOF },
    );
    expect(result.matches[0]?.state).toBe('stale');
    expect(result.allConfirmed).toBe(false);
  });

  it('includes a visitor price that only a member’s guest can buy', () => {
    const guest = gym('harbourgate-strength-potts-point').offers.find((offer) =>
      offer.id.endsWith('-guest'),
    );
    expect(guest?.eligibility.memberGuestOnly).toBe('yes');
    expect(assessOffer(guest!, { visitLocalDate: VISIT_DATE, asOf: ASOF }).verdict).toBe(
      'needs_confirmation',
    );
  });

  it('includes a membership whose upfront cost cannot be totalled', () => {
    const membership = gym('harbourgate-strength-potts-point').offers.find(
      (offer) => offer.productType === 'membership',
    );
    expect(membership?.membershipTerms?.accessCardFeeMinor).toBeNull();
  });

  it('spreads results across all three tiers for the reference query', () => {
    const outcome = search({
      records: DEMO_GYMS,
      reviewsByGymId: {},
      query: REFERENCE_QUERY,
      asOf: ASOF,
    });
    expect(outcome.counts.confirmed).toBeGreaterThan(0);
    expect(outcome.counts.needs_confirmation).toBeGreaterThan(0);
    expect(outcome.counts.ruled_out).toBeGreaterThan(0);
  });
});
