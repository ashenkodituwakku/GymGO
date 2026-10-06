import { describe, expect, it } from 'vitest';
import { LIMITS, PRO_PRICES, TRIAL_DAYS, TRIAL_OFFER_DAYS, annualSaving, formatPlanPrice, isProStatus, proPrice, trialEndsAt, trialOffer } from './plans';

describe('plans', () => {
  it('gives Pro more of everything Free has', () => {
    expect(LIMITS.pro.savedGyms).toBeGreaterThan(LIMITS.free.savedGyms);
    expect(LIMITS.pro.compare).toBeGreaterThan(LIMITS.free.compare);
    expect(LIMITS.pro.savedWorkouts).toBeGreaterThan(LIMITS.free.savedWorkouts);
    expect(LIMITS.free.compare).toBeGreaterThanOrEqual(2);
  });

  it('prices one tier monthly and yearly, in A$ and US$, with a unique Stripe lookup key each', () => {
    for (const currency of ['aud', 'usd'] as const) {
      for (const interval of ['month', 'year'] as const) expect(proPrice(interval, currency)).not.toBeNull();
    }
    expect(new Set(PRO_PRICES.map((price) => price.lookupKey)).size).toBe(PRO_PRICES.length);
    expect(formatPlanPrice(proPrice('month', 'aud')!.amountMinor, 'aud')).toBe('A$3.99');
    expect(formatPlanPrice(proPrice('year', 'usd')!.amountMinor, 'usd')).toBe('$19.99');
  });

  it('makes a year cheaper than twelve months, and says by how much', () => {
    for (const currency of ['aud', 'usd'] as const) {
      const saving = annualSaving(proPrice('month', currency)!.amountMinor, proPrice('year', currency)!.amountMinor);
      expect(saving).toBeGreaterThan(20);
    }
    expect(annualSaving(399, 2999)).toBe(37);
    expect(annualSaving(100, 1200)).toBeNull();
  });

  it('counts paying and retrying subscriptions as Pro, and nothing else', () => {
    expect(isProStatus('active')).toBe(true);
    expect(isProStatus('trialing')).toBe(true);
    expect(isProStatus('past_due')).toBe(true);
    for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', null, undefined]) {
      expect(isProStatus(status)).toBe(false);
    }
  });
});

describe('the free trial', () => {
  const made = '2026-10-01T09:00:00.000Z';
  it('is 3 days of monthly Pro, offered in an account\'s first 30 days', () => {
    expect(TRIAL_DAYS).toBe(3);
    expect(TRIAL_OFFER_DAYS).toBe(30);
    expect(trialOffer({ createdAt: made, everSubscribed: false }, new Date('2026-10-01T09:00:00Z'))).toEqual({ days: 3, offerEndsAt: '2026-10-31T09:00:00.000Z' });
    expect(trialOffer({ createdAt: made, everSubscribed: false }, new Date('2026-10-31T08:59:59Z'))).not.toBeNull();
    expect(trialOffer({ createdAt: made, everSubscribed: false }, new Date('2026-10-31T09:00:00Z'))).toBeNull();
  });
  it('is offered once: not to an account that has ever subscribed, or trialled', () => {
    expect(trialOffer({ createdAt: made, everSubscribed: true }, new Date('2026-10-02T00:00:00Z'))).toBeNull();
  });
  it('is not offered when the account\'s age is unknown', () => {
    expect(trialOffer({ createdAt: 'not a date', everSubscribed: false }, new Date('2026-10-02T00:00:00Z'))).toBeNull();
  });
  it('ends, and is first charged, 3 days after it starts', () => {
    expect(trialEndsAt(new Date('2026-10-06T10:00:00Z')).toISOString()).toBe('2026-10-09T10:00:00.000Z');
  });
});
