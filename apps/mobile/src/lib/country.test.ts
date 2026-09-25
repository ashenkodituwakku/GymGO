import { describe, expect, it } from 'vitest';
import { COUNTRIES, builtInCountries, canSearchIn, countryByCode, countryFromLocales, countryInSentence, countryName, flagOf, openingPlace, searchCountries } from './country';

describe('choosing your country', () => {
  it('lists every country once, with a name, and nearly all with a capital and its clock', () => {
    expect(COUNTRIES.length).toBe(198);
    expect(new Set(COUNTRIES.map((country) => country.code)).size).toBe(198);
    expect(COUNTRIES.filter((country) => country.capital && country.timezone).length).toBeGreaterThanOrEqual(197);
    expect(countryName('NL')).toBe('Netherlands');
    expect(countryByCode('JP')).toMatchObject({ capital: 'Tokyo', timezone: 'Asia/Tokyo' });
  });

  it('finds a country by name, everyday alias, or code, accents or not', () => {
    expect(searchCountries('united')[0]?.code).toMatch(/^(AE|GB|US)$/);
    expect(searchCountries('uk')[0]?.code).toBe('GB');
    expect(searchCountries('england')[0]?.code).toBe('GB');
    expect(searchCountries('usa')[0]?.code).toBe('US');
    expect(searchCountries('holland')[0]?.code).toBe('NL');
    expect(searchCountries('turkiye')[0]?.code).toBe('TR');
    expect(searchCountries('zealand')[0]?.code).toBe('NZ');
    expect(searchCountries('qqq')).toEqual([]);
  });

  it('suggests the device’s own region', () => {
    expect(countryFromLocales(['en-AU'])).toBe('AU');
    expect(countryFromLocales(['fr', 'de-CH'])).toBe('CH');
    expect(countryFromLocales(['zh-Hans-CN'])).toBe('CN');
    expect(countryFromLocales(['en'])).toBeNull();
  });

  it('opens on a built-in city where there is one, else the capital, on its clock', () => {
    expect(builtInCountries().slice(0, 3)).toEqual(['AU', 'US', 'GB']);
    expect(openingPlace('AU')).toMatchObject({ placeName: 'Melbourne CBD', countryCode: 'AU', timezone: 'Australia/Melbourne' });
    expect(openingPlace('GB')).toMatchObject({ placeName: 'London', countryCode: 'GB', timezone: 'Europe/London' });
    expect(openingPlace('JP')).toMatchObject({ placeName: 'Tokyo', countryCode: 'JP', timezone: 'Asia/Tokyo' });
    expect(openingPlace('EH')).toBeNull();
  });

  it('lets Free search your own country, and Pro every country', () => {
    expect(canSearchIn('AU', 'AU', false)).toBe(true);
    expect(canSearchIn('FR', 'AU', false)).toBe(false);
    expect(canSearchIn('FR', 'AU', true)).toBe(true);
    // Before a country is chosen, nothing is shut.
    expect(canSearchIn('FR', null, false)).toBe(true);
  });

  it('names a country the way a sentence needs', () => {
    expect(countryInSentence('GB')).toBe('the United Kingdom');
    expect(countryInSentence('BS')).toBe('the Bahamas');
    expect(countryInSentence('FR')).toBe('France');
  });

  it('draws a flag from the code', () => {
    expect(flagOf('AU')).toBe('🇦🇺');
  });
});
