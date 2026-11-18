import { describe, expect, it } from 'vitest';
import { TEST_AD_UNITS, adUnitFor, type OwnerAdUnits } from './ads';

const none: OwnerAdUnits = { ios: {}, android: {} };
const owner: OwnerAdUnits = { ios: { home: 'ca-app-pub-1234567890123456/1111111111', results: 'not an id' }, android: { home: ' ca-app-pub-1234567890123456/2222222222 ' } };

describe('which ad unit a place asks for', () => {
  it('asks Google’s test units in a development build, whatever the owner has set', () => {
    expect(adUnitFor('home', 'ios', true, owner)).toBe(TEST_AD_UNITS.ios);
    expect(adUnitFor('results', 'android', true, none)).toBe(TEST_AD_UNITS.android);
    expect(TEST_AD_UNITS.ios.startsWith('ca-app-pub-3940256099942544/')).toBe(true);
  });

  it('asks the owner’s units in a release, and nothing without them or with one that isn’t a unit id', () => {
    expect(adUnitFor('home', 'ios', false, owner)).toBe('ca-app-pub-1234567890123456/1111111111');
    expect(adUnitFor('home', 'android', false, owner)).toBe('ca-app-pub-1234567890123456/2222222222');
    expect(adUnitFor('results', 'ios', false, owner)).toBeNull();
    expect(adUnitFor('home', 'ios', false, none)).toBeNull();
  });

  it('never asks on the website', () => {
    expect(adUnitFor('home', 'web', true, owner)).toBeNull();
  });
});
