/**
 * Collection sets: collect every gym in a suburb, or ten in a city.
 *
 * - A suburb set is every gym GymGO lists in that suburb (open or not known
 *   to be closed; a closed one counts only if you collected it before it
 *   closed). It shows once you've collected one of them, and needs from two
 *   to fifteen gyms to be a set (more, and the "suburb" is a whole city
 *   whose gyms the map gave no district).
 * - A city set is ten gyms in one city, or every gym GymGO lists there if
 *   it has fewer (at least two).
 *
 * "Lists" means the gyms this device knows: the bundled cities, the country
 * pack and areas you've searched. Each set says how many it counts, so a
 * total that grows as GymGO learns more gyms reads as what it is.
 *
 * Finishing a set earns its reward card: the day it was finished, from the
 * day you first collected its last gym. Nothing is stored for it; it's read
 * from your collection, so it's the same on every device.
 */

import type { GymRecord } from '@gymgo/domain';
import { cityFor, type CollectedGym, type Collection } from './collection';

export const CITY_SET_SIZE = 10;
/** A suburb or city with fewer gyms than this isn't a set. */
export const SMALLEST_SET = 2;
/**
 * A "suburb" with more gyms than this is really a whole city (the map gave
 * its gyms no district): it counts as a city set only.
 */
export const BIGGEST_SUBURB_SET = 15;

export type SetKind = 'suburb' | 'city';

export interface GymSet {
  key: string;
  kind: SetKind;
  name: string;
  countryCode: string;
  /** Gyms the set needs. */
  total: number;
  /** Gyms of it you've collected (up to `total`). */
  have: number;
  /** For a suburb, the gyms still to collect, nearest-named first; empty for a city. */
  missing: Array<{ id: string; name: string }>;
  complete: boolean;
  /** The local day the set was finished, when it's complete. */
  completedOn: string | null;
}

const norm = (value: string) => value.trim().toLowerCase();
const suburbKey = (countryCode: string, suburb: string) => `suburb:${countryCode}:${norm(suburb)}`;
const cityKey = (countryCode: string, city: string) => `city:${countryCode}:${norm(city)}`;
const firstDay = (entry: CollectedGym) => entry.days[0] ?? entry.firstAt.slice(0, 10);

/** Gyms that belong in a set: real, and not known to have closed. */
const counts = (record: GymRecord) =>
  !record.location.isDemoData && record.location.operatingStatus !== 'permanently_closed' && norm(record.location.address.suburb) !== '';

/**
 * Every set you've started: those still going, closest to finished first
 * (suburbs before cities on a tie), then finished ones. `listed` is the gyms this device knows (data.listed).
 */
export function collectionSets(collection: Collection, listed: GymRecord[]): GymSet[] {
  if (Object.keys(collection).length === 0) return [];
  // A collected gym's suburb as GymGO lists it now, where it does (a card keeps
  // the place as it was when collected, which an update may have corrected).
  const byId = new Map(listed.map((record) => [record.location.id, record]));
  const collected = Object.values(collection).map((entry) => {
    const record = byId.get(entry.id);
    return record && norm(record.location.address.suburb) !== '' ? { ...entry, suburb: record.location.address.suburb } : entry;
  });
  const startedSuburbs = new Set(collected.map((entry) => suburbKey(entry.countryCode, entry.suburb)));
  const startedCities = new Set(collected.map((entry) => cityKey(entry.countryCode, entry.city)));

  // The listed gyms in each started suburb, and a count for each started city.
  const suburbGyms = new Map<string, Map<string, string>>();
  const cityTotals = new Map<string, number>();
  for (const record of listed) {
    if (!counts(record)) continue;
    const { address, id, name } = record.location;
    const key = suburbKey(address.countryCode, address.suburb);
    if (startedSuburbs.has(key)) {
      const gyms = suburbGyms.get(key) ?? new Map<string, string>();
      gyms.set(id, name);
      suburbGyms.set(key, gyms);
    }
    if (startedCities.size) {
      const city = cityKey(address.countryCode, cityFor(record.location.position, address.countryCode, address.suburb));
      if (startedCities.has(city)) cityTotals.set(city, (cityTotals.get(city) ?? 0) + 1);
    }
  }

  const sets: GymSet[] = [];

  // Suburbs: every listed gym there, plus any you collected that the list lacks.
  const bySuburb = new Map<string, CollectedGym[]>();
  for (const entry of collected) {
    const key = suburbKey(entry.countryCode, entry.suburb);
    bySuburb.set(key, [...(bySuburb.get(key) ?? []), entry]);
  }
  for (const [key, mine] of bySuburb) {
    const gyms = new Map(suburbGyms.get(key) ?? []);
    for (const entry of mine) gyms.set(entry.id, entry.name);
    if (gyms.size < SMALLEST_SET || gyms.size > BIGGEST_SUBURB_SET) continue;
    const missing = [...gyms].filter(([id]) => !collection[id]).map(([id, name]) => ({ id, name }));
    const complete = missing.length === 0;
    sets.push({
      key,
      kind: 'suburb',
      name: mine[0]!.suburb,
      countryCode: mine[0]!.countryCode,
      total: gyms.size,
      have: gyms.size - missing.length,
      missing: missing.sort((a, b) => a.name.localeCompare(b.name)),
      complete,
      completedOn: complete ? mine.map(firstDay).sort()[mine.length - 1]! : null,
    });
  }

  // Cities: ten gyms, or every one GymGO lists there if fewer.
  const byCity = new Map<string, CollectedGym[]>();
  for (const entry of collected) {
    const key = cityKey(entry.countryCode, entry.city);
    byCity.set(key, [...(byCity.get(key) ?? []), entry]);
  }
  for (const [key, mine] of byCity) {
    const known = Math.max(cityTotals.get(key) ?? 0, mine.length);
    const total = Math.min(CITY_SET_SIZE, known);
    if (total < SMALLEST_SET) continue;
    const have = Math.min(mine.length, total);
    const complete = have >= total;
    // Finished the day the set's last needed gym was first collected.
    const days = mine.map(firstDay).sort();
    sets.push({
      key,
      kind: 'city',
      name: mine[0]!.city,
      countryCode: mine[0]!.countryCode,
      total,
      have,
      missing: [],
      complete,
      completedOn: complete ? days[total - 1]! : null,
    });
  }

  const progress = (set: GymSet) => set.have / set.total;
  return sets.sort(
    (a, b) =>
      Number(a.complete) - Number(b.complete) ||
      progress(b) - progress(a) ||
      (a.kind === b.kind ? 0 : a.kind === 'suburb' ? -1 : 1) ||
      a.name.localeCompare(b.name),
  );
}

/** Sets that `after` finishes and `before` hadn't: what a check-in just completed. */
export function setsFinished(before: Collection, after: Collection, listed: GymRecord[]): GymSet[] {
  const done = new Set(collectionSets(before, listed).filter((set) => set.complete).map((set) => set.key));
  return collectionSets(after, listed).filter((set) => set.complete && !done.has(set.key));
}

/** How many suburb and city sets are finished, for badges. */
export function setsDone(sets: GymSet[]): { suburbs: number; cities: number } {
  return {
    suburbs: sets.filter((set) => set.complete && set.kind === 'suburb').length,
    cities: sets.filter((set) => set.complete && set.kind === 'city').length,
  };
}
