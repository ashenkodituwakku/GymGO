/**
 * The same gym, reached twice: once in the data GymGO carries, and again as
 * the map's own copy (an area search, the country's offline gyms, or what a
 * phone kept from an earlier search, perhaps from before that city was
 * carried). Counted as one: the same map element, or the same name within
 * 100 metres.
 */

import type { GymRecord } from '@gymgo/domain';
import { km } from './rules';

const IGNORED_WORDS = new Set(['the', 'gym', 'fitness', 'health', 'club', 'clubs']);
const words = (text: string) =>
  new Set([...text.toLowerCase().replaceAll('’', "'").replaceAll("'", '').matchAll(/[a-z0-9]+/g)].map((m) => m[0]).filter((w) => !IGNORED_WORDS.has(w)));

/** A gym we already hold under another element: the same name within 100 metres. */
export function sameGym(name: string, pos: [number, number], record: GymRecord): boolean {
  if (km(pos, [record.location.position.lat, record.location.position.lng]) > 0.1) return false;
  const a = words(name);
  const b = words(record.location.name);
  return [...a].some((word) => b.has(word)) || a.size === 0 || b.size === 0;
}

/** Roughly a kilometre each way: a gym's twin is always in its own cell or the next. */
const cellOf = (lat: number, lng: number) => `${Math.floor(lat * 100)}:${Math.floor(lng * 100)}`;

/** `extra` less any gym that's already in `known` under another id (demo gyms aside). */
export function withoutKnown(extra: readonly GymRecord[], known: readonly GymRecord[]): GymRecord[] {
  const real = known.filter((record) => !record.location.isDemoData);
  const ids = new Set(real.map((record) => record.location.id));
  const refs = new Set(real.map((record) => record.location.externalRefs.openStreetMap).filter(Boolean));
  const cells = new Map<string, GymRecord[]>();
  for (const record of real) {
    const key = cellOf(record.location.position.lat, record.location.position.lng);
    const list = cells.get(key);
    if (list) list.push(record);
    else cells.set(key, [record]);
  }
  return extra.filter((record) => {
    const { id, name, position, externalRefs } = record.location;
    if (ids.has(id)) return false;
    if (externalRefs.openStreetMap && refs.has(externalRefs.openStreetMap)) return false;
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) {
        const near = cells.get(cellOf(position.lat + dy / 100, position.lng + dx / 100)) ?? [];
        if (near.some((other) => sameGym(name, [position.lat, position.lng], other))) return false;
      }
    }
    return true;
  });
}
