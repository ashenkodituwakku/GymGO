/**
 * Money handling and visit-cost arithmetic.
 *
 * The rule that drives this file: an unknown charge is not a free charge.
 * If any mandatory component of a price is unestablished, the total is
 * "not confirmed" and must never satisfy a budget filter.
 */

import type {
  CurrencyCode,
  MandatoryCharge,
  Money,
  VisitOffer,
  IsoDate,
} from './types';

export const AUD: CurrencyCode = 'AUD';

/** Australian GST rate, used only to label tax-inclusive prices, never to invent one. */
export const GST_RATE = 0.1;

export function money(amountMinor: number, currency: CurrencyCode = AUD): Money {
  return { amountMinor, currency };
}

/**
 * Format minor units for display. Whole amounts drop the decimals so a price
 * list reads as "A$25" rather than "A$25.00".
 */
export function formatMoney(
  amountMinor: number | null,
  currency: CurrencyCode = AUD,
  options: { alwaysShowCents?: boolean } = {},
): string {
  if (amountMinor === null) return 'Not confirmed';
  const symbol = currency === 'AUD' ? 'A$' : '';
  const major = amountMinor / 100;
  const needsCents = options.alwaysShowCents || amountMinor % 100 !== 0;
  const body = needsCents ? major.toFixed(2) : String(Math.round(major));
  return symbol ? `${symbol}${body}` : `${body} ${currency}`;
}

/**
 * The outcome of adding up a price.
 *
 * `known: false` is a real answer, not an error. It means we can show the
 * parts we have and say plainly that the total is not confirmed.
 */
export interface CostBreakdown {
  currency: CurrencyCode;
  known: boolean;
  /** Everything you do not get back: base + tax + mandatory fees. */
  totalNonRefundableMinor: number | null;
  /** Refundable deposits, kept separate from visit cost by design. */
  depositsMinor: number | null;
  /** What you must actually hand over on the day: non-refundable + deposits. */
  cashNeededTodayMinor: number | null;
  /** Named components, for the detail view. */
  lines: CostLine[];
  /** Plain-language reasons the total could not be confirmed. */
  unknownReasons: string[];
}

export interface CostLine {
  label: string;
  amountMinor: number | null;
  kind: 'base' | 'tax' | 'mandatory_fee' | 'deposit';
}

function sumCharges(charges: MandatoryCharge[]): {
  totalMinor: number;
  unknownReasons: string[];
  lines: CostLine[];
} {
  let totalMinor = 0;
  const unknownReasons: string[] = [];
  const lines: CostLine[] = [];

  for (const charge of charges) {
    // A charge that definitely does not apply contributes nothing and is not
    // a source of uncertainty.
    if (charge.applies === 'no') continue;

    lines.push({ label: charge.label, amountMinor: charge.amountMinor, kind: 'mandatory_fee' });

    if (charge.applies === 'unknown') {
      unknownReasons.push(`We do not know whether ${charge.label.toLowerCase()} applies.`);
      continue;
    }
    if (charge.amountMinor === null) {
      unknownReasons.push(`${charge.label} applies but its amount is not confirmed.`);
      continue;
    }
    totalMinor += charge.amountMinor;
  }

  return { totalMinor, unknownReasons, lines };
}

/**
 * Add up one offer.
 *
 * A$25 visit + A$20 refundable deposit is a A$25 visit cost and A$45 needed
 * today. Both numbers are shown; only the first is compared against a budget.
 */
export function computeCost(offer: VisitOffer): CostBreakdown {
  const lines: CostLine[] = [];
  const unknownReasons: string[] = [];
  let nonRefundable = 0;
  let baseKnown = true;

  if (offer.baseAmountMinor === null) {
    baseKnown = false;
    unknownReasons.push('The headline price is not confirmed.');
    lines.push({ label: offer.label, amountMinor: null, kind: 'base' });
  } else {
    nonRefundable += offer.baseAmountMinor;
    lines.push({ label: offer.label, amountMinor: offer.baseAmountMinor, kind: 'base' });
  }

  if (!offer.taxIncluded) {
    if (offer.taxAmountMinor === null) {
      baseKnown = false;
      unknownReasons.push('The price excludes tax and the tax amount is not confirmed.');
      lines.push({ label: 'Tax', amountMinor: null, kind: 'tax' });
    } else {
      nonRefundable += offer.taxAmountMinor;
      lines.push({ label: 'Tax', amountMinor: offer.taxAmountMinor, kind: 'tax' });
    }
  }

  const charges = sumCharges(offer.mandatoryCharges);
  nonRefundable += charges.totalMinor;
  lines.push(...charges.lines);
  unknownReasons.push(...charges.unknownReasons);

  let depositsMinor: number | null = 0;
  for (const deposit of offer.refundableDeposits) {
    lines.push({ label: deposit.label, amountMinor: deposit.amountMinor, kind: 'deposit' });
    if (deposit.amountMinor === null) {
      depositsMinor = null;
    } else if (depositsMinor !== null) {
      depositsMinor += deposit.amountMinor;
    }
  }

  const known = baseKnown && charges.unknownReasons.length === 0;
  const totalNonRefundableMinor = known ? nonRefundable : null;
  const cashNeededTodayMinor =
    totalNonRefundableMinor !== null && depositsMinor !== null
      ? totalNonRefundableMinor + depositsMinor
      : null;

  return {
    currency: offer.currency,
    known,
    totalNonRefundableMinor,
    depositsMinor,
    cashNeededTodayMinor,
    lines,
    unknownReasons,
  };
}

/**
 * Does this offer fit a budget?
 *
 * Returns `'fits'`, `'over'`, or `'unconfirmed'`. Only `'fits'` counts as a
 * confirmed match; `'unconfirmed'` is shown separately and never quietly
 * promoted into the confirmed results.
 */
export type BudgetVerdict = 'fits' | 'over' | 'unconfirmed';

export function budgetVerdict(cost: CostBreakdown, budgetMinor: number | null): BudgetVerdict {
  if (budgetMinor === null) return cost.known ? 'fits' : 'unconfirmed';
  if (!cost.known || cost.totalNonRefundableMinor === null) return 'unconfirmed';
  return cost.totalNonRefundableMinor <= budgetMinor ? 'fits' : 'over';
}

/** Has the offer lapsed as at the given local date? */
export function isOfferExpired(offer: VisitOffer, asOfLocalDate: IsoDate): boolean {
  if (offer.availableUntil === null) return false;
  return offer.availableUntil < asOfLocalDate;
}

/** Has the offer not started yet as at the given local date? */
export function isOfferNotYetAvailable(offer: VisitOffer, asOfLocalDate: IsoDate): boolean {
  if (offer.availableFrom === null) return false;
  return offer.availableFrom > asOfLocalDate;
}

/**
 * Membership products are shown with their real commitment, never flattened
 * into a per-week number without showing the working.
 */
export interface MembershipCostView {
  billingLabel: string;
  perIntervalMinor: number | null;
  upfrontMinor: number | null;
  upfrontUnknown: boolean;
  minimumTermLabel: string;
  cancellationLabel: string;
  /** The arithmetic behind any effective weekly figure, spelled out. */
  effectiveWeeklyNote: string | null;
  effectiveWeeklyMinor: number | null;
}

export function describeMembership(offer: VisitOffer): MembershipCostView | null {
  const terms = offer.membershipTerms;
  if (offer.productType !== 'membership' || terms === null) return null;

  const days = terms.billingIntervalDays;
  const billingLabel =
    days === 7 ? 'per week' : days === 14 ? 'per fortnight' : days === 28 ? 'per 4 weeks' : days >= 28 && days <= 31 ? 'per month' : `every ${days} days`;

  const upfrontParts = [terms.joiningFeeMinor, terms.accessCardFeeMinor];
  const upfrontUnknown = upfrontParts.some((part) => part === null);
  const upfrontMinor = upfrontUnknown
    ? null
    : upfrontParts.reduce<number>((sum, part) => sum + (part ?? 0), 0);

  let effectiveWeeklyMinor: number | null = null;
  let effectiveWeeklyNote: string | null = null;
  if (offer.baseAmountMinor !== null && days > 0) {
    effectiveWeeklyMinor = Math.round((offer.baseAmountMinor / days) * 7);
    effectiveWeeklyNote =
      `${formatMoney(offer.baseAmountMinor, offer.currency)} ÷ ${days} days × 7 ` +
      `= ${formatMoney(effectiveWeeklyMinor, offer.currency)} per week. ` +
      `Excludes joining and card fees, and assumes no price change during the term.`;
  }

  return {
    billingLabel,
    perIntervalMinor: offer.baseAmountMinor,
    upfrontMinor,
    upfrontUnknown,
    minimumTermLabel:
      terms.minimumTermDays === null
        ? 'Minimum term not confirmed'
        : terms.minimumTermDays === 0
          ? 'No minimum term'
          : `${terms.minimumTermDays}-day minimum term`,
    cancellationLabel:
      terms.cancellationNoticeDays === null
        ? 'Cancellation notice not confirmed'
        : `${terms.cancellationNoticeDays} days' cancellation notice`,
    effectiveWeeklyNote,
    effectiveWeeklyMinor,
  };
}
