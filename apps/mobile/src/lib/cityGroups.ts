/**
 * How Home lists the cities to browse: your own country's first, then the
 * United States and Australia on their own, and the rest by continent (by
 * their clock's zone). Each city is listed once, in the first group it fits,
 * so Honolulu is with the United States, not the Pacific. A group of several
 * countries keeps each country's cities together, the countries in the
 * order of their first city. A group is marked by its country's flag, or a
 * globe for a continent.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { countryName } from './country';
import type { City, WorldCity } from './places';

export type BrowseCity = City | WorldCity;

export interface CityGroup {
  label: string;
  /** The group's country, for its flag; or, for a continent, a globe emoji. */
  flag?: string;
  emoji?: string;
  cities: BrowseCity[];
}

const REGIONS: Array<{ label: string; flag?: string; emoji?: string; has: (city: BrowseCity) => boolean }> = [
  { label: 'United States', flag: 'US', has: (city) => city.country === 'US' },
  { label: 'Australia', flag: 'AU', has: (city) => city.country === 'AU' },
  { label: 'Europe', emoji: '🌍', has: (city) => city.timezone.startsWith('Europe/') },
  { label: 'The Americas', emoji: '🌎', has: (city) => city.timezone.startsWith('America/') },
  { label: 'Asia and the Middle East', emoji: '🌏', has: (city) => city.timezone.startsWith('Asia/') },
  { label: 'Africa', emoji: '🌍', has: (city) => city.timezone.startsWith('Africa/') },
  { label: 'New Zealand and the Pacific', emoji: '🌏', has: (city) => city.timezone.startsWith('Pacific/') },
];

/** The globes the continents use, each of which needs its picture (emoji.test.ts). */
export const GROUP_EMOJI = [...new Set(REGIONS.flatMap((region) => (region.emoji ? [region.emoji] : [])))];

/** Each country's cities together, the countries in the order of their first city. */
function byCountry(cities: BrowseCity[]): BrowseCity[] {
  return [...new Set(cities.map((city) => city.country))].flatMap((code) => cities.filter((city) => city.country === code));
}

/** The groups, from your country and its cities (if any) and the other cities GymGO carries. */
export function cityGroups(home: string | null, homeCities: BrowseCity[], others: BrowseCity[]): CityGroup[] {
  const groups: CityGroup[] = home && homeCities.length > 0 ? [{ label: countryName(home), flag: home, cities: homeCities }] : [];
  const placed = new Set<BrowseCity>();
  for (const region of REGIONS) {
    const cities = others.filter((city) => city.country !== home && !placed.has(city) && region.has(city));
    if (cities.length === 0) continue;
    for (const city of cities) placed.add(city);
    groups.push({ label: region.label, flag: region.flag, emoji: region.emoji, cities: byCountry(cities) });
  }
  return groups;
}
