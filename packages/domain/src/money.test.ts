/**
 * Price arithmetic. The recurring theme: an unknown charge is not a free one.
 */

import { describe, expect, it } from 'vitest';
import { budgetVerdict, computeCost, describeMembership, formatMoney } from './money';
import { offer } from './testing';

describe('computeCost', () => {
  it('keeps a refundable deposit out of visit cost but shows it in cash needed today', () => {
    const cost = computeCost(
      offer({
        baseAmountMinor: 2500,
        refundableDeposits: [{ label: 'Access band deposit', amountMinor: 2000, refundConditions: 'Returned on exit.' }],
      }),
    );

    // The scenario from the brief: A$25 visit + A$20 deposit fits a A$30 budget
    // but needs A$45 in hand.
    expect(cost.totalNonRefundableMinor).toBe(2500);
    expect(cost.depositsMinor).toBe(2000);
    expect(cost.cashNeededTodayMinor).toBe(4500);
    expect(budgetVerdict(cost, 3000)).toBe('fits');
  });

  it('adds mandatory non-refundable charges into the total', () => {
    const cost = computeCost(
      offer({
        baseAmountMinor: 2500,
        mandatoryCharges: [{ label: 'Access card fee', amountMinor: 500, applies: 'yes' }],
      }),
    );
    expect(cost.totalNonRefundableMinor).toBe(3000);
    expect(budgetVerdict(cost, 2900)).toBe('over');
  });

  it('refuses to confirm a total when a mandatory charge amount is unknown', () => {
    const cost = computeCost(
      offer({
        baseAmountMinor: 2500,
        mandatoryCharges: [{ label: 'Access card fee', amountMinor: null, applies: 'yes' }],
      }),
    );

    expect(cost.known).toBe(false);
    expect(cost.totalNonRefundableMinor).toBeNull();
    // Critically: not treated as A$25 and not allowed through a budget filter.
    expect(budgetVerdict(cost, 3000)).toBe('unconfirmed');
    expect(cost.unknownReasons[0]).toContain('Access card fee');
  });

  it('refuses to confirm a total when we do not know whether a charge applies', () => {
    const cost = computeCost(
      offer({
        baseAmountMinor: 2500,
        mandatoryCharges: [{ label: 'Towel hire', amountMinor: 300, applies: 'unknown' }],
      }),
    );
    expect(cost.known).toBe(false);
    expect(budgetVerdict(cost, 5000)).toBe('unconfirmed');
  });

  it('ignores a charge that is known not to apply', () => {
    const cost = computeCost(
      offer({
        baseAmountMinor: 2500,
        mandatoryCharges: [{ label: 'Towel hire', amountMinor: 300, applies: 'no' }],
      }),
    );
    expect(cost.known).toBe(true);
    expect(cost.totalNonRefundableMinor).toBe(2500);
  });

  it('refuses to confirm a total for a tax-exclusive price with no tax amount', () => {
    const cost = computeCost(offer({ baseAmountMinor: 2500, taxIncluded: false, taxAmountMinor: null }));
    expect(cost.known).toBe(false);
    expect(cost.unknownReasons.join(' ')).toContain('tax');
  });

  it('adds a known tax amount to a tax-exclusive price', () => {
    const cost = computeCost(offer({ baseAmountMinor: 2500, taxIncluded: false, taxAmountMinor: 250 }));
    expect(cost.totalNonRefundableMinor).toBe(2750);
  });

  it('never reports a missing headline price as zero', () => {
    const cost = computeCost(offer({ baseAmountMinor: null }));
    expect(cost.known).toBe(false);
    expect(cost.totalNonRefundableMinor).toBeNull();
    expect(budgetVerdict(cost, 0)).toBe('unconfirmed');
  });

  it('leaves cash-needed-today unconfirmed when a deposit amount is unknown', () => {
    const cost = computeCost(
      offer({
        baseAmountMinor: 2500,
        refundableDeposits: [{ label: 'Key deposit', amountMinor: null, refundConditions: null }],
      }),
    );
    expect(cost.totalNonRefundableMinor).toBe(2500);
    expect(cost.depositsMinor).toBeNull();
    expect(cost.cashNeededTodayMinor).toBeNull();
    // The visit cost is still confirmed, so a budget check can still pass.
    expect(budgetVerdict(cost, 3000)).toBe('fits');
  });
});

describe('formatMoney', () => {
  it('says "Not confirmed" rather than showing a zero', () => {
    expect(formatMoney(null)).toBe('Not confirmed');
  });

  it('drops decimals on whole amounts and keeps them otherwise', () => {
    expect(formatMoney(2500)).toBe('A$25');
    expect(formatMoney(2620)).toBe('A$26.20');
  });
});

describe('describeMembership', () => {
  it('shows the working behind any effective weekly figure', () => {
    const view = describeMembership(
      offer({
        productType: 'membership',
        baseAmountMinor: 6000,
        membershipTerms: {
          billingIntervalDays: 14,
          joiningFeeMinor: 4900,
          accessCardFeeMinor: 3000,
          minimumTermDays: 168,
          cancellationNoticeDays: 30,
          notes: [],
        },
      }),
    );

    expect(view?.effectiveWeeklyMinor).toBe(3000);
    expect(view?.effectiveWeeklyNote).toContain('÷ 14 days × 7');
    expect(view?.effectiveWeeklyNote).toContain('Excludes joining and card fees');
    expect(view?.upfrontMinor).toBe(7900);
    expect(view?.minimumTermLabel).toBe('168-day minimum term');
  });

  it('marks upfront cost unknown when a joining fee is unestablished', () => {
    const view = describeMembership(
      offer({
        productType: 'membership',
        baseAmountMinor: 6000,
        membershipTerms: {
          billingIntervalDays: 7,
          joiningFeeMinor: null,
          accessCardFeeMinor: 3000,
          minimumTermDays: null,
          cancellationNoticeDays: null,
          notes: [],
        },
      }),
    );
    expect(view?.upfrontUnknown).toBe(true);
    expect(view?.upfrontMinor).toBeNull();
    expect(view?.minimumTermLabel).toBe('Minimum term not confirmed');
  });

  it('returns nothing for a non-membership product', () => {
    expect(describeMembership(offer())).toBeNull();
  });
});
