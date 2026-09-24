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
