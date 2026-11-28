/**
 * What the search box suggests as you type: gyms, suburbs, towns and cities,
 * in one list, best first. No React Native here, so it is unit-tested in Node.
 *
 * Each suggestion is scored twice and the two added up:
 *  - how well its name matches what was typed: the whole name, the start of
 *    it, the start of one of its words (every word typed, for "fit first"),
 *    or, from three letters, anywhere in it;
 *  - how near it is to where you're looking: a gym or suburb close by beats
 *    one across the country, and your own country's cities beat other
 *    countries'.
 *
 * So "k" near Sydney is Kensington and Kirribilli and the gyms there, not
 * Kansas City; "fit" is the Fitness First down the road before Fitzroy in
 * another city; and "Kansas" still finds Kansas City. One letter lists only
 * what's near you or a city in your own country.
 *
 * Suburbs and towns come from GymGO's own lists and, once your country's
 * gyms are kept on the device, from every suburb and town with a gym in it
 * (PackTown): nothing typed leaves the device until you ask to look a place
 * up.
 */

import { haversineKm, type GymRecord, type LatLng } from '@gymgo/domain';
import type { PackTown } from './countryPack';
import { CITIES, citiesInState, cityPlace, searchablePlaces, uncarriedWorldCities, type AppPlace, type WorldCity } from './places';

export type Suggestion =
  | { kind: 'place'; place: AppPlace; score: number; match: number; km: number }
  | { kind: 'world'; city: WorldCity; score: number; match: number; km: number }
  | { kind: 'town'; town: PackTown; score: number; match: number; km: number }
  | { kind: 'gym'; record: GymRecord; score: number; match: number; km: number };

/** How well a name matches. */
export const MATCH = { exact: 100, start: 60, word: 40, inside: 15 } as const;

// Accents and punctuation don't count: "zurich" finds Zürich, "kings" King's Gym.
const fold = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** How well any of these names matches what was typed (already folded); 0 for not at all. */
export function matchScore(needle: string, names: readonly string[]): number {
  const typed = needle.split(' ');
  let best = 0;
  for (const raw of names) {
    const name = fold(raw);
    if (!name) continue;
    if (name === needle) return MATCH.exact;
    if (name.startsWith(needle)) best = Math.max(best, MATCH.start);
    else {
      const words = name.split(' ');
      if (typed.every((part) => words.some((word) => word.startsWith(part)))) best = Math.max(best, MATCH.word);
      else if (needle.length >= 3 && name.includes(needle)) best = Math.max(best, MATCH.inside);
    }
  }
  return best;
}

/** A gym, by how far it is from where you're looking. */
function gymNearness(km: number): number {
  if (km <= 5) return 40;
  if (km <= 15) return 34;
  if (km <= 40) return 26;
  if (km <= 150) return 12;
  return 0;
}

/** A suburb or town: close by, then anywhere in your country, then abroad. */
function placeNearness(km: number, home: boolean): number {
  if (km <= 15) return 30;
  if (km <= 40) return 26;
  if (km <= 150) return 16;
  return home ? 12 : 0;
}

/** Enough to list from one letter: near you, or a city in your own country. */
const ONE_LETTER_NEARNESS = 16;
/** Enough to list letters found inside a name ("ata" in Kolkata): in your own country, or near. */
const INSIDE_NEARNESS = 12;

export interface SuggestOptions {
  /** Where you're looking: the middle of the search. */
  centre: LatLng;
  /** Your country (ISO code), or the search's when you haven't chosen one. */
  home: string | null;
  /** Gyms that can be suggested by name. */
  records: readonly GymRecord[];
  /** Suburbs and towns with gyms, from your country's gyms kept on the device. */
  towns?: readonly PackTown[];
  limit?: number;
}

export function suggest(query: string, { centre, home, records, towns = [], limit = 7 }: SuggestOptions): Suggestion[] {
  const needle = fold(query);
  if (!needle) return [];
  const oneLetter = needle.length === 1;
  const hits: Suggestion[] = [];

  // GymGO's suburbs and neighbourhoods, and its cities (each a place under the city's own name).
  const stateCities = new Set(citiesInState(query).map((city) => city.id));
  for (const place of searchablePlaces()) {
    const city = CITIES[place.city];
    const isCity = place.name === city.name;
    const names = isCity ? [place.name, ...city.aliases] : [place.name];
    let match = matchScore(needle, names);
    if (place.postcode && /^\d+$/.test(needle) && place.postcode.startsWith(needle)) match = Math.max(match, needle === place.postcode ? MATCH.exact : MATCH.start);
    // A US state by name or code ("Texas", "tx") lists the cities GymGO has there.
    if (isCity && stateCities.has(city.id)) match = Math.max(match, MATCH.word);
    if (!match) continue;
    const km = haversineKm(centre, place.position);
    const inHome = city.country === home;
    // A whole city in your country is somewhere people go by name, wherever you are.
    const nearness = isCity ? Math.max(placeNearness(km, inHome), inHome ? 32 : 8) : placeNearness(km, inHome);
    hits.push({ kind: 'place', place: isCity ? cityPlace(city) : place, score: match + nearness, match, km });
  }

  // Every country's biggest cities that GymGO has no gyms built in for: two letters at least.
  if (!oneLetter) {
    const rank = new Map<string, number>();
    for (const city of uncarriedWorldCities()) {
      const match = matchScore(needle, [city.name]);
      // Biggest first within each country.
      const place = (rank.get(city.country) ?? 0) + 1;
      rank.set(city.country, place);
      if (!match) continue;
      const km = haversineKm(centre, city.centre);
      const bigness = Math.max(0, 5 - place);
      const nearness = Math.max(placeNearness(km, city.country === home), city.country === home ? 22 + bigness : 6 + bigness / 2);
      hits.push({ kind: 'world', city, score: match + nearness, match, km });
    }
  }

  // Every suburb and town with a gym in your country.
  for (const town of towns) {
    const match = matchScore(needle, [town.name]);
    if (!match) continue;
    const km = haversineKm(centre, town.position);
    hits.push({ kind: 'town', town, score: match + placeNearness(km, town.country === home), match, km });
  }

  // Gyms by name (and branch): "snap", "fitness first", "equinox".
  for (const record of records) {
    const { name, branch } = record.location;
    const match = matchScore(needle, branch ? [name, `${name} ${branch}`] : [name]);
    if (!match) continue;
    const km = haversineKm(centre, record.location.position);
    hits.push({ kind: 'gym', record, score: match + gymNearness(km), match, km });
  }

  const listed = hits
    .filter((hit) => (oneLetter ? hit.match >= MATCH.start && hit.score - hit.match >= ONE_LETTER_NEARNESS : hit.match > MATCH.inside || hit.score - hit.match >= INSIDE_NEARNESS))
    .sort((a, b) => b.score - a.score || a.km - b.km || title(a).length - title(b).length);

  // One row per place: a town with gyms that GymGO lists already, or a city twice, shows once.
  const kept: Suggestion[] = [];
  const seen = new Set<string>();
  for (const hit of listed) {
    if (hit.kind === 'gym') {
      if (seen.has(`gym:${hit.record.location.id}`)) continue;
      seen.add(`gym:${hit.record.location.id}`);
    } else if (kept.some((other) => other.kind !== 'gym' && fold(title(other)) === fold(title(hit)) && haversineKm(position(other), position(hit)) < 8)) {
      continue;
    }
    kept.push(hit);
    if (kept.length === limit) break;
  }
  return kept;
}

/** What a suggestion is called. */
export function title(hit: Suggestion): string {
  switch (hit.kind) {
    case 'place':
      return hit.place.name;
    case 'world':
      return hit.city.name;
    case 'town':
      return hit.town.name;
    case 'gym':
      return hit.record.location.branch ? `${hit.record.location.name} ${hit.record.location.branch}` : hit.record.location.name;
  }
}

function position(hit: Exclude<Suggestion, { kind: 'gym' }>): LatLng {
  switch (hit.kind) {
    case 'place':
      return hit.place.position;
    case 'world':
      return hit.city.centre;
    case 'town':
      return hit.town.position;
  }
}

/** A key for a list row. */
export function suggestionKey(hit: Suggestion): string {
  switch (hit.kind) {
    case 'place':
      return `place:${hit.place.city}:${hit.place.name}`;
    case 'world':
      return `world:${hit.city.country}:${hit.city.name}`;
    case 'town':
      return `town:${hit.town.country}:${hit.town.state}:${hit.town.name}`;
    case 'gym':
      return `gym:${hit.record.location.id}`;
  }
}

/**
 * What Enter goes to: the top suggestion, when it's more than a few letters
 * found inside a name. Otherwise nothing here, and the words are looked up as
 * a place anywhere in the world.
 */
export function suggestionForEnter(hits: readonly Suggestion[]): Suggestion | null {
  const top = hits[0];
  return top && top.match >= MATCH.word ? top : null;
}
