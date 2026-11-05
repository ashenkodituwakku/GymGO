import { describe, expect, it } from 'vitest';
import { DUO_PRICES, GIFT_PRICES, formatGiftCode, giftPeriod, isDuoLookupKey, makeGiftCode, normaliseGiftCode, passTotal } from './perks';
import { PRO_PRICES } from './plans';

describe('gift Pro, Duo and day passes', () => {
  it('make gift codes that read back however they’re typed', () => {
    let n = 0;
    const code = makeGiftCode(() => (n++ * 0.071) % 1);
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{12}$/);
    expect(formatGiftCode('K7QM2XPH9RTA')).toBe('K7QM-2XPH-9RTA');
    expect(normaliseGiftCode('k7qm 2xph-9rta')).toBe('K7QM2XPH9RTA');
    expect(normaliseGiftCode('K7QM-2XPH')).toBeNull();
    expect(normaliseGiftCode('K7QM-2XPH-9RT0')).toBeNull();
  });

  it('run a redeemed year from now, or after a gift still running', () => {
    const now = new Date('2026-10-01T00:00:00.000Z');
    expect(giftPeriod(now, null)).toEqual({ startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2027-10-01T00:00:00.000Z' });
    expect(giftPeriod(now, '2027-03-01T00:00:00.000Z').startsAt).toBe('2027-03-01T00:00:00.000Z');
    expect(giftPeriod(now, '2026-01-01T00:00:00.000Z').startsAt).toBe(now.toISOString());
  });

  it('keep Duo and gift prices apart from Pro’s, a gift costing a year of Pro', () => {
    expect(isDuoLookupKey('gymgo_duo_year_aud')).toBe(true);
    expect(isDuoLookupKey('gymgo_pro_year_aud')).toBe(false);
    const keys = [...PRO_PRICES, ...DUO_PRICES, ...GIFT_PRICES].map((price) => price.lookupKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const gift of GIFT_PRICES) expect(gift.amountMinor).toBe(PRO_PRICES.find((price) => price.interval === 'year' && price.currency === gift.currency)!.amountMinor);
    expect(passTotal({ priceMinor: 1500, feeMinor: 150, currency: 'aud' })).toBe(1650);
  });
});
