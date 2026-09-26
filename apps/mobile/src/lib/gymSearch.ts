/**
 * Finding a gym by its name, for the search box: "Equinox", "snap fit",
 * "doherty". No React Native here, so it is unit-tested in Node.
 *
 * A match is the name (or branch) starting with what was typed, or any word
 * in it starting with it; names that start with it come first, then the
 * nearest. Only whole-word starts, so "fit" finds "Fitness First" and "Snap
 * Fitness" but not "Outfit".
 */

import { haversineKm, type GymRecord, type LatLng } from '@gymgo/domain';

const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function suggestGyms(query: string, records: readonly GymRecord[], near: LatLng, limit = 4): GymRecord[] {
  const needle = normalise(query);
  if (needle.length < 2) return [];
  return records
    .map((record) => {
      const name = normalise(record.location.name);
      const full = normalise(`${record.location.name} ${record.location.branch ?? ''}`);
      const matches = full.startsWith(needle) || full.includes(` ${needle}`);
      return matches ? { record, starts: name.startsWith(needle), km: haversineKm(near, record.location.position) } : null;
    })
    .filter((hit): hit is { record: GymRecord; starts: boolean; km: number } => hit !== null)
    .sort((a, b) => Number(b.starts) - Number(a.starts) || a.km - b.km)
    .slice(0, limit)
    .map((hit) => hit.record);
}

/** How near a gym must be for Enter to open it outright. */
const OPEN_WITHIN_KM = 50;

/**
 * Whether pressing Enter opens this gym, the best name match, rather than
 * looking the words up as a place: only when it's near the map and the words
 * aren't the suburb or town of a gym GymGO has. "snap" means the Snap Fitness
 * down the road; "Bendigo", with "Bendigo Strength Co" loaded, means the
 * town. A gym further off is opened only if the place finder has no place by
 * exactly that name (see `placeForEnter`).
 */
export function enterOpensGym(query: string, gym: GymRecord, near: LatLng, records: readonly GymRecord[] = [gym]): boolean {
  const needle = normalise(query);
  if (records.some((record) => normalise(record.location.address.suburb) === needle)) return false;
  return haversineKm(near, gym.location.position) <= OPEN_WITHIN_KM;
}

/**
 * Which of the place finder's answers Enter goes to. With a gym by that name
 * to fall back on, only a place called exactly what was typed: "Austin" is
 * the city, but "Equinox" is the gym, not "Equinox Terrace" in Vermont.
 */
export function placeForEnter<Place extends { name: string }>(query: string, places: readonly Place[], orGym: boolean): Place | null {
  if (!orGym) return places[0] ?? null;
  return places.find((place) => normalise(place.name) === normalise(query)) ?? null;
}
