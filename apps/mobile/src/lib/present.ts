/**
 * Turning domain results into what a screen shows. No React Native here, so
 * it is unit-tested with the copy.
 */

import { formatMoney, type GymRecord, type OfferSelection } from '@gymgo/domain';

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
  if (!chosen) return { headline: '—', caption: 'price unknown', confirmed: false };

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

/**
 * A Google Maps search for the gym. Maps URLs need no key and cost nothing,
 * so this works even when the live Google details are switched off.
 */
export function googleMapsSearchUrl(record: GymRecord): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleQuery(record))}`;
}

/**
 * Google's own embeddable map, centred on the gym, with Google's card for it
 * (name, address, star rating, number of reviews, and a link to the full
 * listing). This is Google's public "Embed a map" feature: free, unlimited,
 * no key and no account. Google shows and credits its own content, so GymGO
 * copies and stores nothing.
 */
export function googleMapsEmbedUrl(record: GymRecord): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(googleQuery(record))}&z=16&hl=en&output=embed`;
}

/**
 * Google's Street View nearest the gym's map position, from the same free
 * public embed. It shows whichever panorama is closest, so it may face the
 * street rather than the door; people can drag to look around.
 */
export function googleStreetViewEmbedUrl(record: GymRecord): string {
  const { lat, lng } = record.location.position;
  return `https://maps.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&hl=en&output=svembed`;
}

/** Name and street address: enough for Google to find the right listing. */
function googleQuery(record: GymRecord): string {
  const { name, address } = record.location;
  return [name, address.line1, address.suburb, address.state].filter(Boolean).join(', ');
}
