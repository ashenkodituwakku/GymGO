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

/** A website as the same site however it's written: no scheme, "www.", query or trailing slash. */
const site = (url: string | null | undefined) =>
  url ? url.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '') || null : null;

/**
 * A gym's name and website as `twins` compares them, worked out once: a list
 * compares each gym with every neighbour, and redoing these at each
 * comparison slowed the app's opening (records are never changed in place).
 */
const compared = new WeakMap<GymRecord, { name: string; web: string | null }>();
function comparedOf(record: GymRecord): { name: string; web: string | null } {
  let found = compared.get(record);
  if (!found) {
    found = { name: bare(record.location.name), web: site(record.location.website) };
    compared.set(record, found);
  }
  return found;
}

/** Degrees of latitude in just over half a kilometre: further apart than any twins. */
const LAT_HALF_KM = 0.0045;

/**
 * One gym mapped twice (a point and a building outline, say, or an
 * operator's address and the map's): the same element, the same name within
 * 150 metres (400 when one is an operator's address), one name the start
 * of the other within 150, or the same website within 50 (one gym under
 * two names: "North Melbourne Boxing and fitness centre" and "North
 * Melbourne boxing club", a few doors apart). Stricter than
 * `sameGym`, which lets any shared word do: two gyms in one building can
 * share a suburb's name.
 */
export function twins(a: GymRecord, b: GymRecord): boolean {
  const refA = a.location.externalRefs.openStreetMap;
  if (refA && refA === b.location.externalRefs.openStreetMap) return true;
  // Over half a kilometre apart north to south whatever the longitude, without the trigonometry.
  if (Math.abs(a.location.position.lat - b.location.position.lat) > LAT_HALF_KM) return false;
  const d = km([a.location.position.lat, a.location.position.lng], [b.location.position.lat, b.location.position.lng]);
  if (d > 0.4) return false;
  const [ta, tb] = [comparedOf(a), comparedOf(b)];
  if (ta.web && d <= 0.05 && ta.web === tb.web) return true;
  const [x, y] = [ta.name, tb.name];
  if (x.length < 3 || y.length < 3) return false;
  // Identical names 150 m apart are one gym; further apart they can be two
  // branches of a chain in a dense city, unless one is an operator's own
  // address (not a map element), which can sit a few hundred metres off.
  const operator = !refA || !b.location.externalRefs.openStreetMap;
  if (x === y) return d <= 0.15 || operator;
  return d <= 0.15 && (x.startsWith(y) || y.startsWith(x));
}

/** Of two twins, the one to keep (0): one with an id of its own rather than a map element's number on the end (1). */
const rank = (record: GymRecord) => (/-[nwr]\d+$/.test(record.location.id) ? 1 : 0);

/**
 * Roughly a kilometre each way: a gym's twin is always in its own cell or
 * the next. Cells are numbered (a number, not a string: thousands are made),
 * and the next one is the next number: stepping 0.01° and rounding again
 * could land in the same cell (-37.81 + 0.01 does), so a neighbour went
 * unchecked.
 */
const cellIndex = (degrees: number) => Math.floor(degrees * 100);
const cellKey = (row: number, column: number) => row * 100_000 + column;
const cellOf = (lat: number, lng: number) => cellKey(cellIndex(lat), cellIndex(lng));

/** `extra` less any gym that's already in `known` under another id (demo gyms aside). */
export function withoutKnown(extra: readonly GymRecord[], known: readonly GymRecord[]): GymRecord[] {
  const real = known.filter((record) => !record.location.isDemoData);
  const ids = new Set(real.map((record) => record.location.id));
  const refs = new Set(real.map((record) => record.location.externalRefs.openStreetMap).filter(Boolean));
  const cells = new Map<number, GymRecord[]>();
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
    const [row, column] = [cellIndex(position.lat), cellIndex(position.lng)];
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) {
        const near = cells.get(cellKey(row + dy, column + dx)) ?? [];
        if (near.some((other) => sameGym(name, [position.lat, position.lng], other) || twins(record, other))) return false;
      }
    }
    return true;
  });
}

/** These gyms with each one mapped twice kept once (see `twins`); otherwise in the same order. */
export function withoutTwins(records: readonly GymRecord[]): GymRecord[] {
  const cells = new Map<number, GymRecord[]>();
  const dropped = new Set<GymRecord>();
  // Better-kept ones first, so a twin found later is the one that goes: each
  // in its order otherwise, as a sort by rank would leave them, but ranked
  // once each rather than at every comparison.
  const [first, later]: [GymRecord[], GymRecord[]] = [[], []];
  for (const record of records) (rank(record) === 0 ? first : later).push(record);
  for (const record of first.concat(later)) {
    if (record.location.isDemoData) continue;
    const { lat, lng } = record.location.position;
    const [row, column] = [cellIndex(lat), cellIndex(lng)];
    let twin = false;
    for (let dy = -1; dy <= 1 && !twin; dy++) {
      for (let dx = -1; dx <= 1 && !twin; dx++) {
        const near = cells.get(cellKey(row + dy, column + dx));
        if (near) twin = near.some((other) => twins(record, other));
      }
    }
    if (twin) {
      dropped.add(record);
      continue;
    }
    const key = cellKey(row, column);
    const list = cells.get(key);
    if (list) list.push(record);
    else cells.set(key, [record]);
  }
  return dropped.size === 0 ? [...records] : records.filter((record) => !dropped.has(record));
}
