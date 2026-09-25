/**
 * Turn raw OpenStreetMap answers into src/data.ts for GymGO's map-only
 * Australian cities.
 *
 * Input: one JSON file per city (from scripts/fetch.py), each the saved answer to
 *
 *     nwr["leisure"="fitness_centre"]["name"](around:R,lat,lng); out center tags;
 *     node["place"~"^(suburb|neighbourhood|quarter)$"]["name"](around:R,lat,lng); out;
 *
 * from the Overpass API, with the time it was fetched.
 *
 * What counts as a gym is decided in packages/osm, shared with
 * packages/usa-data and the server's "Search this area". Then the 40
 * nearest the city centre.
 *
 * Usage: pnpm --filter @gymgo/au-data generate <dir with city json files>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import {
  branchOf,
  brandOf,
  candidate,
  contactOf,
  extrasOf,
  km,
  line1Of,
  osmRef,
  position,
  pyJson,
  round,
  slug,
  trainingType,
  type Candidate,
  type OsmElement,
} from '@gymgo/osm';
import { AU_CITIES, MELBOURNE_MAP_AREA } from '../src/cities';
import type { AuCityId, GymRow, PlaceRow } from '../src/rows';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.ts');
const PER_CITY = 40;
const PLACES_PER_CITY = 14;
const STATES = new Set(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']);
const STATE_NAMES: Record<string, string> = {
  QUEENSLAND: 'QLD',
  'WESTERN AUSTRALIA': 'WA',
  'SOUTH AUSTRALIA': 'SA',
  TASMANIA: 'TAS',
  'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
  'NEW SOUTH WALES': 'NSW',
  VICTORIA: 'VIC',
  'NORTHERN TERRITORY': 'NT',
};

// Melbourne first, as the data has always been ordered.
const CITIES = [MELBOURNE_MAP_AREA, ...AU_CITIES];

/** The state from the address when it's a real Australian one ("Queensland" → QLD). */
export function stateOf(tags: Record<string, string>, fallback: string): string {
  let raw = (tags['addr:state'] ?? '').trim().toUpperCase();
  raw = STATE_NAMES[raw] ?? raw;
  return STATES.has(raw) ? raw : fallback;
}

// Melbourne's researched gyms live in packages/melbourne-data. The map's
// copies of them are left out here, by map element or, failing that, by a
// gym of the same name within 100 metres.
const RESEARCHED = MELBOURNE_GYMS.map((record) => ({
  name: record.location.name,
  pos: [record.location.position.lat, record.location.position.lng] as [number, number],
  osm: record.location.externalRefs.openStreetMap!,
}));

const IGNORED_WORDS = new Set(['the', 'gym', 'fitness', 'health', 'club', 'clubs']);
const words = (text: string) =>
  new Set([...text.toLowerCase().replaceAll('’', "'").replaceAll("'", '').matchAll(/[a-z0-9]+/g)].map((m) => m[0]).filter((w) => !IGNORED_WORDS.has(w)));

function sameGym(name: string, pos: [number, number], other: (typeof RESEARCHED)[number]): boolean {
  if (km(pos, other.pos) > 0.1) return false;
  const a = words(name);
  const b = words(other.name);
  return [...a].some((word) => b.has(word)) || a.size === 0 || b.size === 0;
}

interface CityFile {
  fetchedAt: string;
  gyms: OsmElement[];
  places: OsmElement[];
}

function main(src: string) {
  const fetched: Array<[AuCityId, string]> = [];
  const gymsOut: GymRow[] = [];
  const placesOut: PlaceRow[] = [];
  const ids = new Set<string>();
  const stats: string[] = [];
  let parsed = 0;
  let unparsed = 0;

  for (const city of CITIES) {
    const data = JSON.parse(readFileSync(join(src, `${city.id}.json`), 'utf8')) as CityFile;
    fetched.push([city.id, data.fetchedAt]);
    const centre: [number, number] = [city.centre.lat, city.centre.lng];
    const seen = new Set<string>();
    const rows: Array<{ d: number } & Candidate> = [];
    for (const el of data.gyms) {
      const found = candidate(el);
      if (!found) continue;
      if (city.id === 'melbourne' && RESEARCHED.some((gym) => gym.osm === osmRef(el) || sameGym(found.name, found.pos, gym))) continue;
      const key = `${found.name.toLowerCase()}|${round(found.pos[0], 4)}|${round(found.pos[1], 4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ d: km(centre, found.pos), ...found });
    }
    rows.sort((a, b) => a.d - b.d);
    const kept = rows.slice(0, PER_CITY);
    stats.push(`${city.id.padEnd(12)} ${String(data.gyms.length).padStart(4)} mapped, ${String(rows.length).padStart(4)} kept after filters, ${String(kept.length).padStart(3)} used`);

    for (const { el, name, tags, pos } of kept) {
      const street = tags['addr:street'] ?? '';
      const branch = branchOf(tags);
      const base = slug([name, branch ?? (street || null), city.id].filter(Boolean).join('-'));
      const id = ids.has(base) ? `${base}-${el.type[0]}${el.id}` : base;
      ids.add(id);
      const postcode = (tags['addr:postcode'] ?? '').trim();
      const { hoursUnreadable, ...extras } = extrasOf(tags);
      if (tags.opening_hours) {
        if (hoursUnreadable) unparsed += 1;
        else parsed += 1;
      }
      gymsOut.push({
        city: city.id,
        id,
        osm: osmRef(el),
        name,
        ...brandOf(tags),
        ...(branch ? { branch } : {}),
        line1: line1Of(tags),
        suburb: tags['addr:suburb'] || tags['addr:city'] || city.name,
        state: stateOf(tags, city.state),
        postcode: /^\d{4}$/.test(postcode) ? postcode : '',
        lat: round(pos[0], 6),
        lng: round(pos[1], 6),
        type: trainingType(name, tags),
        ...contactOf(tags),
        ...extras,
      });
    }

    // Suburbs for the search box, nearest the centre first. Melbourne's
    // come with postcodes from packages/melbourne-data instead. Australian
    // suburbs are official names, so every place=suburb counts; smaller
    // neighbourhoods only when they're notable (they have a Wikidata entry).
    if (city.id === 'melbourne') continue;
    const names = new Set<string>();
    const cands: Array<{ d: number; name: string; pos: [number, number] }> = [];
    for (const el of data.places) {
      const tags = el.tags ?? {};
      const pos = position(el);
      if (!pos || (tags.place !== 'suburb' && !('wikidata' in tags))) continue;
      const name = tags['name:en'] || tags.name!;
      if (names.has(name.toLowerCase()) || name.toLowerCase() === city.name.toLowerCase()) continue;
      names.add(name.toLowerCase());
      cands.push({ d: km(centre, pos), name, pos });
    }
    cands.sort((a, b) => a.d - b.d || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const { name, pos } of cands.slice(0, PLACES_PER_CITY)) {
      placesOut.push({ city: city.id, name, lat: round(pos[0], 5), lng: round(pos[1], 5) });
    }
  }

  const lines = [
    '// Generated by scripts/generate.ts from OpenStreetMap data. Do not edit by hand.',
    '// © OpenStreetMap contributors, available under the Open Database License (ODbL).',
    '',
    "import type { AuCityId, GymRow, PlaceRow } from './rows';",
    '',
    "/** When each city's data was fetched from the Overpass API. */",
    'export const FETCHED: Record<AuCityId, string> = {',
    ...fetched.map(([city, at]) => `  '${city}': '${at}',`),
    '};',
    '',
    '// prettier-ignore',
    'export const GYM_ROWS: GymRow[] = [',
    ...gymsOut.map((row) => `  ${pyJson(row)},`),
    '];',
    '',
    '// prettier-ignore',
    'export const PLACE_ROWS: PlaceRow[] = [',
    ...placesOut.map((row) => `  ${pyJson(row)},`),
    '];',
    '',
  ];
  writeFileSync(OUT, lines.join('\n'));
  for (const line of stats) console.log(line);
  console.log('gyms', gymsOut.length, 'suburbs', placesOut.length, 'hours parsed', parsed, 'unparsed', unparsed);
}

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: generate.ts <dir with city json files>');
  process.exit(1);
}
main(dir);
