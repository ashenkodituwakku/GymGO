/**
 * Offer eligibility: the price that applies to *this* person.
 */

import { describe, expect, it } from 'vitest';
import { assessOffer, selectSingleVisitOffer, UNKNOWN_VISITOR } from './offers';
import { NOW, checked, offer } from './testing';

const VISIT_DATE = '2026-09-23';
const base = { visitLocalDate: VISIT_DATE, asOf: NOW };

describe('offer eligibility', () => {
  it('rules out a pool-only admission as a way onto the gym floor', () => {
    // The Ian Thorpe Aquatic Centre case: the cheapest admission on the price
    // list buys the pool, not the weights room.
    const poolOnly = offer({
      id: 'pool',
      productType: 'pool_only',
      label: 'Adult aquatic admission',
      baseAmountMinor: 920,
      grantsGymFloorAccess: 'no',
    });

    const assessment = assessOffer(poolOnly, base);
    expect(assessment.verdict).toBe('not_eligible');
    expect(assessment.reasons.map((r) => r.code)).toContain('no_gym_floor_access');
  });

  it('never picks a week pass as the single-visit price', () => {
    const weekPass = offer({
      id: 'week',
      productType: 'week_pass',
      label: '7-day pass',
      baseAmountMinor: 4900,
      validityDays: 7,
    });
    const casual = offer({ id: 'casual', baseAmountMinor: 2600 });

    const selection = selectSingleVisitOffer([weekPass, casual], base);

    expect(selection.confirmed?.offer.id).toBe('casual');
    // The week pass is not assessed as a single-visit option at all.
    expect(selection.all.map((a) => a.offer.id)).toEqual(['casual']);
  });

  it('reports no single-visit price when a gym only sells a week pass', () => {
    const weekPass = offer({ id: 'week', productType: 'week_pass', baseAmountMinor: 4900 });
    const selection = selectSingleVisitOffer([weekPass], base);

    expect(selection.confirmed).toBeNull();
    expect(selection.unconfirmed).toBeNull();
    expect(selection.all).toHaveLength(0);
  });

  it('will not confirm a residents-only trial for someone whose residency is unknown', () => {
    const trial = offer({
      productType: 'trial',
      label: '3-day free trial',
      baseAmountMinor: 0,
      eligibility: {
        ...offer().eligibility,
        localResidentOnly: 'yes',
        firstTimeVisitorOnly: 'yes',
        photoIdRequired: 'yes',
      },
    });

    const assessment = assessOffer(trial, base);
    expect(assessment.verdict).toBe('needs_confirmation');
    const codes = assessment.reasons.map((r) => r.code);
    expect(codes).toContain('local_resident_only_unknown');
    expect(codes).toContain('first_time_only_unknown');
  });

  it('rules out a residents-only trial for someone who is not a local resident', () => {
    const trial = offer({
      productType: 'trial',
      baseAmountMinor: 0,
      eligibility: { ...offer().eligibility, localResidentOnly: 'yes' },
    });

    const assessment = assessOffer(trial, {
      ...base,
      profile: { ...UNKNOWN_VISITOR, isLocalResident: 'no' },
    });
    expect(assessment.verdict).toBe('not_eligible');
  });

  it('accepts a residents-only trial once the person says they qualify', () => {
    const trial = offer({
      productType: 'trial',
      baseAmountMinor: 0,
      eligibility: { ...offer().eligibility, localResidentOnly: 'yes' },
    });

    const assessment = assessOffer(trial, {
      ...base,
      profile: { ...UNKNOWN_VISITOR, isLocalResident: 'yes' },
    });
    expect(assessment.verdict).toBe('eligible');
  });

  it('rules out an expired offer', () => {
    const expired = offer({ availableUntil: '2026-08-31' });
    const assessment = assessOffer(expired, base);
    expect(assessment.verdict).toBe('not_eligible');
    expect(assessment.reasons.map((r) => r.code)).toContain('offer_expired');
  });

  it('rules out an offer that has not started yet', () => {
    const future = offer({ availableFrom: '2026-12-01' });
    expect(assessOffer(future, base).verdict).toBe('not_eligible');
  });

  it('needs confirmation when the total cannot be computed', () => {
    const unclear = offer({
      mandatoryCharges: [{ label: 'Access card fee', amountMinor: null, applies: 'yes' }],
    });
    const assessment = assessOffer(unclear, base);
    expect(assessment.verdict).toBe('needs_confirmation');
    expect(assessment.budget).toBe('unconfirmed');
  });

  it('does not let an unconfirmed total satisfy a budget filter', () => {
    const unclear = offer({
      baseAmountMinor: 2000,
      mandatoryCharges: [{ label: 'Booking fee', amountMinor: null, applies: 'yes' }],
    });
    const selection = selectSingleVisitOffer([unclear], { ...base, budgetMinor: 3000 });

    expect(selection.confirmed).toBeNull();
    expect(selection.unconfirmed?.offer.id).toBe(unclear.id);
  });

  it('needs confirmation for a stale price', () => {
    const stale = offer({ provenance: checked(95) });
    const assessment = assessOffer(stale, base);
    expect(assessment.verdict).toBe('needs_confirmation');
    expect(assessment.reasons.map((r) => r.code)).toContain('price_stale');
  });

  it('surfaces a conflict between sources rather than picking one', () => {
    const conflicted = offer({
      provenance: {
        ...checked(2),
        status: 'conflicting',
        conflictNote: 'The support page says A$15 and the club page says A$25.',
      },
    });
    const assessment = assessOffer(conflicted, base);
    expect(assessment.verdict).toBe('needs_confirmation');
    expect(assessment.reasons.find((r) => r.code === 'price_conflicting')?.message).toContain('A$15');
  });

  it('picks the cheapest eligible single-visit offer deterministically', () => {
    const a = offer({ id: 'b-offer', baseAmountMinor: 2000 });
    const b = offer({ id: 'a-offer', baseAmountMinor: 2000 });
    const c = offer({ id: 'c-offer', baseAmountMinor: 3000 });

    expect(selectSingleVisitOffer([a, b, c], base).confirmed?.offer.id).toBe('a-offer');
    expect(selectSingleVisitOffer([c, b, a], base).confirmed?.offer.id).toBe('a-offer');
  });

  it('keeps a recorded-but-too-expensive price visible instead of reporting no price', () => {
    const pricey = offer({ id: 'casual', baseAmountMinor: 3200 });
    const selection = selectSingleVisitOffer([pricey], { ...base, budgetMinor: 3000 });

    expect(selection.confirmed).toBeNull();
    expect(selection.overBudget?.offer.id).toBe('casual');
    // The card needs something true to show: there *is* a price here.
    expect(selection.bestAvailable?.cost.totalNonRefundableMinor).toBe(3200);
  });

  it('does not treat an expired cheap offer as the over-budget one', () => {
    const expiredCheap = offer({ id: 'winter', productType: 'day_pass', baseAmountMinor: 1800, availableUntil: '2026-08-31' });
    const currentPricey = offer({ id: 'casual', baseAmountMinor: 3200 });

    const selection = selectSingleVisitOffer([expiredCheap, currentPricey], {
      ...base,
      budgetMinor: 3000,
    });

    // A$18 was never available for this visit, so it is not the reason the
    // gym is too expensive.
    expect(selection.overBudget?.offer.id).toBe('casual');
    expect(selection.overBudget?.cost.totalNonRefundableMinor).toBe(3200);
  });

  it('classifies an offer blocked for a non-budget reason separately', () => {
    const guestOnly = offer({
      id: 'guest',
      baseAmountMinor: 1500,
      eligibility: { ...offer().eligibility, memberGuestOnly: 'yes' },
    });
    const selection = selectSingleVisitOffer([guestOnly], {
      ...base,
      budgetMinor: 3000,
      profile: { ...UNKNOWN_VISITOR, isAccompaniedByMember: 'no' },
    });

    expect(selection.overBudget).toBeNull();
    expect(selection.bestAvailable?.offer.id).toBe('guest');
  });

  it('rules out a member-guest-only price for an unaccompanied visitor', () => {
    const guestOnly = offer({
      eligibility: { ...offer().eligibility, memberGuestOnly: 'yes' },
    });
    expect(
      assessOffer(guestOnly, {
        ...base,
        profile: { ...UNKNOWN_VISITOR, isAccompaniedByMember: 'no' },
      }).verdict,
    ).toBe('not_eligible');
  });
});
