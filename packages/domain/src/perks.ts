/**
 * GymGO's other paid things, beside a Pro subscription (plans.ts):
 *
 * - Gift Pro: a one-off payment for a year of Pro, as a code to give anyone,
 *   who redeems it in the app.
 * - Duo: a Pro subscription for two, the subscriber and one more person they
 *   add, at its own price.
 * - Partner day passes: a visit to a gym GymGO has an agreement with, paid
 *   through GymGO with a booking fee shown before paying. No pass exists
 *   until the owner makes such an agreement and adds it; GymGO never lists
 *   a deal a gym hasn't agreed to.
 *
 * The prices here are the planned ones, what the Stripe setup script
 * creates; Stripe's own prices are what's charged and shown.
 */

import { FRIEND_CODE_ALPHABET } from './social';
import type { BillingCurrency, ProPrice } from './plans';

/** Duo: one subscription, two people. */
export const DUO_PRICES: ProPrice[] = [
  { lookupKey: 'gymgo_duo_month_aud', interval: 'month', currency: 'aud', amountMinor: 599 },
  { lookupKey: 'gymgo_duo_year_aud', interval: 'year', currency: 'aud', amountMinor: 4499 },
  { lookupKey: 'gymgo_duo_month_usd', interval: 'month', currency: 'usd', amountMinor: 449 },
  { lookupKey: 'gymgo_duo_year_usd', interval: 'year', currency: 'usd', amountMinor: 2999 },
];

export const DUO_PRODUCT = { name: 'GymGO Pro Duo', description: 'GymGO Pro for you and one more person you choose.' } as const;

export const isDuoLookupKey = (key: string | null | undefined): boolean => DUO_PRICES.some((price) => price.lookupKey === key);

/** Gift Pro: a year of Pro, paid once. */
export interface GiftPrice {
  lookupKey: string;
  currency: BillingCurrency;
  amountMinor: number;
}

export const GIFT_PRICES: GiftPrice[] = [
  { lookupKey: 'gymgo_pro_gift_year_aud', currency: 'aud', amountMinor: 2999 },
  { lookupKey: 'gymgo_pro_gift_year_usd', currency: 'usd', amountMinor: 1999 },
];

export const GIFT_PRODUCT = { name: 'GymGO Pro, a year as a gift', description: 'A code for a year of GymGO Pro, to give to anyone.' } as const;

/** How long a gift's Pro lasts once redeemed. */
export const GIFT_DAYS = 365;

/** A gift code: twelve unmistakable characters ("K7QM-2XPH-9RTA"). */
export const GIFT_CODE_LENGTH = 12;

export function makeGiftCode(random: () => number): string {
  let code = '';
  for (let at = 0; at < GIFT_CODE_LENGTH; at++) code += FRIEND_CODE_ALPHABET[Math.floor(random() * FRIEND_CODE_ALPHABET.length)];
  return code;
}

export const formatGiftCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;

/** As stored, or null when it can't be a gift code (case, spaces and dashes don't matter). */
export function normaliseGiftCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== GIFT_CODE_LENGTH) return null;
  return [...code].every((letter) => FRIEND_CODE_ALPHABET.includes(letter)) ? code : null;
}

/**
 * Where a redeemed year of Pro runs: from now, or straight after any gifted
 * Pro still running, so two gifts make two years.
 */
export function giftPeriod(now: Date, runningUntil: string | null): { startsAt: string; endsAt: string } {
  const start = runningUntil && Date.parse(runningUntil) > now.getTime() ? new Date(runningUntil) : now;
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + GIFT_DAYS * 86_400_000).toISOString() };
}

/** A partner day pass: what a visitor pays, and GymGO's booking fee, both shown before paying. */
export interface PassPrice {
  priceMinor: number;
  feeMinor: number;
  currency: BillingCurrency;
}

export const passTotal = (pass: PassPrice) => pass.priceMinor + pass.feeMinor;
