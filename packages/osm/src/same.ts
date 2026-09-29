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

/** A name with only its letters and digits, for telling the same name written two ways. */
const bare = (text: string) => text.toLowerCase().replaceAll('’', "'").replace(/[^a-z0-9]/g, '');

/**
 * One gym mapped twice (a point and a building outline, say, or an
 * operator's address and the map's): the same element, the same name within
 * 150 metres (400 when one is an operator's address), or one name the start
 * of the other within 150. Stricter than
 * `sameGym`, which lets any shared word do: two gyms in one building can
 * share a suburb's name.
 */
export function twins(a: GymRecord, b: GymRecord): boolean {
  const refA = a.location.externalRefs.openStreetMap;
  if (refA && refA === b.location.externalRefs.openStreetMap) return true;
  const d = km([a.location.position.lat, a.location.position.lng], [b.location.position.lat, b.location.position.lng]);
  if (d > 0.4) return false;
  const [x, y] = [bare(a.location.name), bare(b.location.name)];
  if (x.length < 3 || y.length < 3) return false;
  // Identical names 150 m apart are one gym; further apart they can be two
  // branches of a chain in a dense city, unless one is an operator's own
  // address (not a map element), which can sit a few hundred metres off.
  const operator = !refA || !b.location.externalRefs.openStreetMap;
  if (x === y) return d <= 0.15 || operator;
  return d <= 0.15 && (x.startsWith(y) || y.startsWith(x));
}

/** Of two twins, the one to keep: one with an id of its own rather than a map element's number on the end. */
const rank = (record: GymRecord) => (/-[nwr]\d+$/.test(record.location.id) ? 1 : 0);

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
        if (near.some((other) => sameGym(name, [position.lat, position.lng], other) || twins(record, other))) return false;
      }
    }
    return true;
  });
}

/** These gyms with each one mapped twice kept once (see `twins`); otherwise in the same order. */
export function withoutTwins(records: readonly GymRecord[]): GymRecord[] {
  const cells = new Map<string, GymRecord[]>();
  const dropped = new Set<GymRecord>();
  // Better-kept ones first, so a twin found later is the one that goes.
  const order = [...records].sort((a, b) => rank(a) - rank(b));
  for (const record of order) {
    if (record.location.isDemoData) continue;
    const { lat, lng } = record.location.position;
    let twin = false;
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) {
        if ((cells.get(cellOf(lat + dy / 100, lng + dx / 100)) ?? []).some((other) => twins(record, other))) twin = true;
      }
    }
    if (twin) {
      dropped.add(record);
      continue;
    }
    const key = cellOf(lat, lng);
    const list = cells.get(key);
    if (list) list.push(record);
    else cells.set(key, [record]);
  }
  return dropped.size === 0 ? [...records] : records.filter((record) => !dropped.has(record));
}
