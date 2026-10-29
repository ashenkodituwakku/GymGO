/**
 * Shared display formatting.
 *
 * These are presentation helpers only: nothing here decides eligibility or
 * changes a value. The rules live in @gymgo/domain.
 */

import {
  accessVerdictLabel,
  formatMoney,
  type AccessVerdict,
  type CostBreakdown,
  type OfferAssessment,
  type ResultTier,
} from '@gymgo/domain';

export const TIER_LABEL: Record<ResultTier, string> = {
  confirmed: 'Confirmed match',
  needs_confirmation: 'Needs confirmation',
  ruled_out: 'Does not match',
};

export const TIER_BADGE_CLASS: Record<ResultTier, string> = {
  confirmed: 'badge badge--confirmed',
  needs_confirmation: 'badge badge--unconfirmed',
  ruled_out: 'badge badge--ruled-out',
};

export const TIER_EXPLANATION: Record<ResultTier, string> = {
  confirmed: 'Everything you asked for is backed by evidence we have checked recently.',
  needs_confirmation:
    'These could work, but something is unknown, out of date, or conditional. Check before you travel.',
  ruled_out: 'Something you asked for is contradicted by what we know about these gyms.',
};

export function accessBadgeClass(verdict: AccessVerdict): string {
  switch (verdict) {
    case 'admits_visitor':
      return 'badge badge--confirmed';
    case 'needs_confirmation':
      return 'badge badge--unconfirmed';
    case 'not_admitted':
      return 'badge badge--ruled-out';
    case 'unknown':
      return 'badge badge--neutral';
  }
}

export { accessVerdictLabel };

/**
 * The price line on a card.
 *
 * Shows what we actually hold. A gym whose only visit costs more than the
 * stated budget has a price; saying "no price recorded" there would be false.
 */
export function priceSummary(offers: {
  confirmed: OfferAssessment | null;
  unconfirmed: OfferAssessment | null;
  bestAvailable: OfferAssessment | null;
  overBudget: OfferAssessment | null;
}): { headline: string; sublabel: string } {
  const chosen = offers.bestAvailable;
  if (chosen === null) {
    return { headline: 'No price recorded', sublabel: 'No single-visit price recorded' };
  }

  const headline = priceHeadline(chosen.cost);
  if (offers.confirmed) return { headline, sublabel: chosen.offer.label };
  if (offers.unconfirmed) return { headline, sublabel: `${chosen.offer.label} — unconfirmed` };
  if (offers.overBudget) return { headline, sublabel: `${chosen.offer.label} — over your budget` };

  const blocker = chosen.reasons.find((reason) => reason.severity === 'blocking');
  return { headline, sublabel: `${chosen.offer.label} — ${blocker?.message ?? 'not available to you'}` };
}

/** "A$25" or "Total not confirmed". Never "A$0" for an unknown price. */
export function priceHeadline(cost: CostBreakdown | null): string {
  if (cost === null) return 'No price recorded';
  if (!cost.known || cost.totalNonRefundableMinor === null) return 'Total not confirmed';
  if (cost.totalNonRefundableMinor === 0) return 'Free';
  return formatMoney(cost.totalNonRefundableMinor, cost.currency);
}

/** The second line under a price: deposits and the cash you need on the day. */
export function cashNeededNote(cost: CostBreakdown | null): string | null {
  if (cost === null) return null;
  if (cost.depositsMinor === null) {
    return 'Includes a refundable deposit of an amount we have not confirmed.';
  }
  if (cost.depositsMinor === 0) return null;
  const deposit = formatMoney(cost.depositsMinor, cost.currency);
  if (cost.cashNeededTodayMinor === null) return `Plus a ${deposit} refundable deposit.`;
  return `Plus a ${deposit} refundable deposit — ${formatMoney(cost.cashNeededTodayMinor, cost.currency)} needed on the day.`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase());
}
