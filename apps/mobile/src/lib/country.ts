/**
 * The country you choose, and what GymGO Free and Pro cover.
 *
 * Free covers one country: the one you choose when the app first opens (and
 * can change in Profile). Pro covers every country, wherever you travel. A
 * gym page opened from a link or your saved list always opens, wherever the
 * gym is; what Pro adds is finding gyms abroad.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { COUNTRIES, type Country } from './countries';
import { CITY_LIST, cityPlace } from './places';
import { atPlace, type Whereabouts } from './query';

export { COUNTRIES, type Country };

export const countryByCode = (code: string | null | undefined): Country | null =>
  code ? (COUNTRIES.find((country) => country.code === code) ?? null) : null;

/** A country's name, or its code if it isn't in the list. */
export const countryName = (code: string): string => countryByCode(code)?.name ?? code;

/** Countries named with "the" in a sentence: "in the United Kingdom". */
const WITH_THE = new Set(['AE', 'CD', 'CF', 'CG', 'DO', 'GB', 'KM', 'MH', 'MV', 'NL', 'PH', 'SB', 'SC', 'US']);

/** A country's name as it reads mid-sentence: "the United Kingdom", "France", "the Bahamas". */
export function countryInSentence(code: string): string {
  const name = countryName(code);
  if (/^The /.test(name)) return `the ${name.slice(4)}`;
  return WITH_THE.has(code) ? `the ${name}` : name;
}

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Countries matching what was typed: an exact name, alias or code first
 * ("uk" is the United Kingdom, not Ukraine), then names starting with it,
 * then any word starting with it.
 */
export function searchCountries(query: string, list: readonly Country[] = COUNTRIES): Country[] {
  const needle = fold(query);
  if (!needle) return [...list];
  const names = (country: Country) => [country.name, ...(country.aliases ?? [])].map(fold);
  const exact = list.filter((country) => names(country).includes(needle) || fold(country.code) === needle);
  const starts = list.filter((country) => !exact.includes(country) && names(country).some((name) => name.startsWith(needle)));
  const seen = new Set([...exact, ...starts]);
  const words = list.filter((country) => !seen.has(country) && names(country).some((name) => name.split(' ').some((word) => word.startsWith(needle))));
  return [...exact, ...starts, ...words];
}

/** The country in a locale tag ("en-AU" → AU), if it's one GymGO lists. */
export function countryFromLocales(locales: readonly string[]): string | null {
  for (const locale of locales) {
    const region = /[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(locale)?.[1]?.toUpperCase();
    if (region && countryByCode(region)) return region;
  }
  return null;
}

/** The device's own region, as a suggestion for the country list. */
export function deviceCountry(): string | null {
  const locales: string[] = [];
  try {
    locales.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // No Intl: no suggestion.
  }
  const nav = (globalThis as { navigator?: { languages?: readonly string[] } }).navigator;
  if (nav?.languages) locales.push(...nav.languages);
  return countryFromLocales(locales);
}

/** Countries GymGO has built-in cities in, in the order it lists them. */
export function builtInCountries(): string[] {
  return [...new Set(CITY_LIST.filter((city) => !city.demo).map((city) => city.country))];
}

/**
 * Where the app opens in a country: its first built-in city (Melbourne,
 * New York, London…), else its capital. Null for the one country without a
 * capital on record (Western Sahara).
 */
export function openingPlace(code: string): Whereabouts | null {
  const city = CITY_LIST.find((item) => !item.demo && item.country === code);
  if (city) return atPlace(cityPlace(city));
  const country = countryByCode(code);
  if (!country || country.lat === null || country.lng === null || !country.timezone || !country.capital) return null;
  return { centre: { lat: country.lat, lng: country.lng }, placeName: country.capital, timezone: country.timezone, countryCode: code };
}

/**
 * Whether gyms in `countryCode` can be searched: always with Pro, always in
 * your own country, and anywhere until you've chosen one.
 */
export function canSearchIn(countryCode: string, home: string | null, pro: boolean): boolean {
  return pro || home === null || countryCode === home;
}

/** A country's flag, from its code (regional indicator letters). */
export const flagOf = (code: string): string => String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
