import { describe, expect, it } from 'vitest';
import { ADS_LIVE, OWNER_AD_UNITS, TEST_AD_UNITS, adUnitFor, type OwnerAdUnits } from './ads';

const none: OwnerAdUnits = { ios: {}, android: {} };
const owner: OwnerAdUnits = { ios: { home: 'ca-app-pub-1234567890123456/1111111111', results: 'not an id' }, android: { home: ' ca-app-pub-1234567890123456/2222222222 ' } };

describe('which ad unit a place asks for', () => {
  it('asks Google’s test units in a development build, whatever the owner has set', () => {
    expect(adUnitFor('home', 'ios', true, owner)).toBe(TEST_AD_UNITS.ios);
    expect(adUnitFor('results', 'android', true, none)).toBe(TEST_AD_UNITS.android);
    // Google's own sample units (its publisher id), native advanced like the owner's.
    expect(TEST_AD_UNITS.ios).toBe('ca-app-pub-3940256099942544/3986624511');
  });

  it('asks the owner’s units in a release once ads are live, and nothing without them or with one that isn’t a unit id', () => {
    expect(adUnitFor('home', 'ios', false, owner, true)).toBe('ca-app-pub-1234567890123456/1111111111');
    expect(adUnitFor('home', 'android', false, owner, true)).toBe('ca-app-pub-1234567890123456/2222222222');
    expect(adUnitFor('results', 'ios', false, owner, true)).toBeNull();
    expect(adUnitFor('home', 'ios', false, none, true)).toBeNull();
  });

  it('asks for no real ad in a release until ads are live, which waits for the legal pages', () => {
    expect(ADS_LIVE).toBe(false);
    expect(adUnitFor('home', 'ios', false, OWNER_AD_UNITS)).toBeNull();
    // The owner's iOS unit is kept, ready, and is a unit id.
    expect(OWNER_AD_UNITS.ios.home).toMatch(/^ca-app-pub-\d+\/\d+$/);
  });

  it('never asks on the website', () => {
    expect(adUnitFor('home', 'web', true, owner)).toBeNull();
  });
});
