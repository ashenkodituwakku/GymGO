/**
 * Turning domain results into what a screen shows. No React Native here, so
 * it is unit-tested with the copy.
 */

import { formatMoney, type GymRecord, type OfferSelection, type PostalAddress } from '@gymgo/domain';
import { moneyLabel } from './places';

export interface PriceLine {
  headline: string;
  caption: string;
  confirmed: boolean;
}

/**
 * The price on a row. What we actually hold, never a guess: an unknown fee is
 * "Ask", not a lower number; a price over budget is still shown, as the price.
 * When the gym publishes no price at all but members have said what they
 * paid, their typical figure shows instead, marked as theirs ("~A$22",
 * "members say"), never as the gym's.
 */
export function priceLine(offers: OfferSelection, members?: { typicalMinor: number; country: string } | null): PriceLine {
  const chosen = offers.bestAvailable;
  if (!chosen) {
    if (members) return { headline: `~${moneyLabel(Math.round(members.typicalMinor / 100) * 100, members.country)}`, caption: 'members say', confirmed: false };
    return { headline: '—', caption: 'price unknown', confirmed: false };
  }

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

/**
 * A street address set out the way post is addressed there: "New York, NY
 * 10018" in the US and Canada, "Fitzroy VIC 3065" in Australia, "London SW1A
 * 1AA" in Britain, "10115 Berlin" in most of Europe. Parts the map doesn't
 * give are left out, never filled in.
 */
export function addressLines(address: PostalAddress): string[] {
  const { line1, line2, suburb, state, postcode, countryCode } = address;
  const join = (parts: string[], between = ' ') => parts.filter(Boolean).join(between);
  let place: string;
  switch (countryCode) {
    case 'US':
    case 'CA':
      place = join([join([suburb, state], ', '), postcode]);
      break;
    case 'AU':
    case 'NZ':
      place = join([suburb, state, postcode]);
      break;
    case 'GB':
    case 'IE':
      place = join([suburb, postcode]);
      break;
    default:
      place = join([postcode, suburb]);
  }
  return [line1, line2 ?? '', place].filter(Boolean);
}

/** Name and street address: enough for Google to find the right listing. */
function googleQuery(record: GymRecord): string {
  const { name, address } = record.location;
  return [name, address.line1, address.suburb, address.state].filter(Boolean).join(', ');
}

/**
 * What someone typed as a price, in hundredths: "24.50", "$24.50", "A$25",
 * "¥1,500", "SEK 250" or "24,50" → 2450, 2450, 2500, 150000, 25000, 2450;
 * anything else → null. A comma before three digits groups thousands; before
 * one or two, it's the decimal point, as much of the world writes it. Whether
 * the amount is plausible is the currency's range's call, not this.
 */
export function parseAmount(text: string): number | null {
  if (text.includes('-')) return null;
  // A symbol or code in front ("¥", "A$", "SEK "), or a short one after ("kr", "zł").
  const clean = text.trim().replace(/^[^\d\s]{1,4}\s?/, '').replace(/\s?[^\d\s.,]{1,3}$/, '');
  let number: string;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(clean)) number = clean.replace(/,/g, '');
  else if (/^\d+,\d{1,2}$/.test(clean)) number = clean.replace(',', '.');
  else if (/^\d{1,9}(\.\d{1,2})?$/.test(clean)) number = clean;
  else return null;
  return Math.round(Number(number) * 100);
}

/** Roughly when something happened; exact dates aren't worth the typing. */
export const WHEN_CHOICES = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last week', days: 7 },
  { label: 'Last month', days: 30 },
  { label: 'A few months ago', days: 90 },
] as const;

/** The local calendar day `days` ago, as "2026-09-24": the day as the member thinks of it. */
export function localDateDaysAgo(days: number, now: Date = new Date()): string {
  const date = new Date(now.getTime() - days * 86_400_000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
