/**
 * Turning domain results into what a screen shows. No React Native here, so
 * it is unit-tested with the copy.
 */

import { formatMoney, type OfferSelection } from '@gymgo/domain';

export interface PriceLine {
  headline: string;
  caption: string;
  confirmed: boolean;
}

/**
 * The price on a row. What we actually hold, never a guess: an unknown fee is
 * "Ask", not a lower number; a price over budget is still shown, as the price.
 */
export function priceLine(offers: OfferSelection): PriceLine {
  const chosen = offers.bestAvailable;
  if (!chosen) return { headline: '—', caption: 'no day pass', confirmed: false };

  const total = chosen.cost.totalNonRefundableMinor;
  if (!chosen.cost.known || total === null) {
    return { headline: 'Ask', caption: 'fees unclear', confirmed: false };
  }

  const headline = total === 0 ? 'Free' : formatMoney(total, chosen.cost.currency);
  if (offers.confirmed) return { headline, caption: 'per visit', confirmed: true };
  if (offers.overBudget) return { headline, caption: 'over budget', confirmed: false };
  if (offers.unconfirmed) return { headline, caption: 'to confirm', confirmed: false };
  return { headline, caption: 'not for you', confirmed: false };
}

/** "Plus a A$20 deposit — A$45 on the day." or null when there is none. */
export function depositLine(offers: OfferSelection): string | null {
  const cost = offers.bestAvailable?.cost;
  if (!cost || cost.depositsMinor === 0) return null;
  if (cost.depositsMinor === null) return 'Plus a refundable deposit of an unconfirmed amount.';
  const deposit = formatMoney(cost.depositsMinor, cost.currency);
  if (cost.cashNeededTodayMinor === null) return `Plus a ${deposit} refundable deposit.`;
  return `Plus a ${deposit} refundable deposit — ${formatMoney(cost.cashNeededTodayMinor, cost.currency)} on the day.`;
}
