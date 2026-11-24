import { describe, expect, it } from 'vitest';
import { LIMITS, PRO_PRICES, TRIAL_DAYS, TRIAL_OFFER_DAYS, annualSaving, deviceWallet, formatPlanPrice, isProStatus, orList, proPrice, stripePageNames, trialEndsAt, trialOffer, walletButtonFor } from './plans';

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

describe('the ways to pay, in words', () => {
  it('names only what Stripe’s page really takes, and never PayPal’s own button', () => {
    expect(stripePageNames(null)).toEqual([]);
    expect(stripePageNames({ card: true, applePay: true, googlePay: true, link: false, paypal: 'direct' })).toEqual(['card', 'Apple Pay', 'Google Pay']);
    expect(stripePageNames({ card: true, applePay: false, googlePay: false, link: true, paypal: 'stripe' })).toEqual(['card', 'PayPal']);
  });

  it('joins them as a person would', () => {
    expect(orList([])).toBe('');
    expect(orList(['card'])).toBe('card');
    expect(orList(['card', 'Apple Pay'])).toBe('card or Apple Pay');
    expect(orList(['card', 'Apple Pay', 'Google Pay'])).toBe('card, Apple Pay or Google Pay');
  });
});

describe('which wallet button a device gets', () => {
  // User agents as the browsers send them (2026).
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1';
  const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15';
  const PIXEL = 'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36';
  const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';

  it('gives an iPhone, iPad or Mac Apple Pay', () => {
    expect(deviceWallet({ userAgent: IPHONE, platform: 'iPhone' })).toBe('applePay');
    // A Mac; and an iPad asking for desktop sites, which says the same.
    expect(deviceWallet({ userAgent: MAC_SAFARI, platform: 'MacIntel' })).toBe('applePay');
    // Chrome on a Mac says so in userAgentData.
    expect(deviceWallet({ userAgent: WINDOWS.replace('Windows NT 10.0; Win64; x64', 'Macintosh; Intel Mac OS X 10_15_7'), platform: 'MacIntel', uaPlatform: 'macOS' })).toBe('applePay');
  });

  it('gives Android, and everything else, Google Pay', () => {
    expect(deviceWallet({ userAgent: PIXEL, platform: 'Linux armv81', uaPlatform: 'Android' })).toBe('googlePay');
    expect(deviceWallet({ userAgent: PIXEL, platform: 'Linux armv81' })).toBe('googlePay');
    expect(deviceWallet({ userAgent: WINDOWS, platform: 'Win32', uaPlatform: 'Windows' })).toBe('googlePay');
    expect(deviceWallet({ userAgent: WINDOWS, platform: 'Win32' })).toBe('googlePay');
    expect(deviceWallet({})).toBe('googlePay');
  });

  it('believes userAgentData over an old platform string', () => {
    expect(deviceWallet({ userAgent: MAC_SAFARI, platform: 'MacIntel', uaPlatform: 'Windows' })).toBe('googlePay');
  });

  it('shows the device’s own wallet only when the server has it on', () => {
    const both = { publishableKey: 'pk_test_example', applePay: true, googlePay: true };
    expect(walletButtonFor(both, 'applePay')).toBe('applePay');
    expect(walletButtonFor({ ...both, applePay: false }, 'applePay')).toBeNull();
    expect(walletButtonFor({ ...both, googlePay: false }, 'googlePay')).toBeNull();
    expect(walletButtonFor(null, 'googlePay')).toBeNull();
  });
});
