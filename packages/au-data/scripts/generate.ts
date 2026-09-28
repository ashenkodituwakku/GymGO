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
 * (and the same for amenity=gym, and sports centres whose sport is fitness or
 * lifting), from the Overpass API, with the time it was fetched.
 *
 * What counts as a gym is decided in packages/osm, shared with
 * packages/usa-data and the server's "Search this area". Every one that
 * passes is kept: the city's whole area, not just its centre. A gym an
 * operator lists on its own website (src/operators.ts) is left out here, as
 * that record is better sourced; so is a "Crunch Fitness" in Victoria where
 * Revo Fitness now is, as Revo took over every Crunch there.
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
import { MELBOURNE_PLACES } from '@gymgo/melbourne-data';
import { AU_CITIES, MELBOURNE_MAP_AREA } from '../src/cities';
import { OPERATOR_GYMS_RAW } from '../src/operators';
import type { AuCityId, GymRow, PlaceRow } from '../src/rows';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.ts');
/** Enough for any city's whole area; a safety cap, not a choice of which to show. */
const PER_CITY = 2000;
const PLACES_PER_CITY = 400;
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

// Gyms from operators' own websites (src/operators.ts). The map's copy of one
// is left out: a gym there within 150 metres sharing a word of its name, or
// any Revo or Crunch within 300 metres of a Revo (Revo took over Crunch's
// Victorian gyms, so the map's Crunch there is out of date).
const OPERATORS = OPERATOR_GYMS_RAW.map((gym) => ({ name: gym.name, pos: [gym.lat, gym.lng] as [number, number], brand: gym.brand ?? '' }));
function listedByOperator(name: string, pos: [number, number], state: string): boolean {
  return OPERATORS.some((gym) => {
    const d = km(pos, gym.pos);
    if (gym.brand === 'Revo Fitness' && d <= 0.3 && (/\brevo\b/i.test(name) || (state === 'VIC' && /\bcrunch\b/i.test(name)))) return true;
    if (d > 0.15) return false;
    const a = words(name);
    const b = words(gym.name);
    return [...a].some((word) => b.has(word));
  });
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
  let superseded = 0;

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
      if (listedByOperator(found.name, found.pos, stateOf(found.tags, city.state))) {
        superseded += 1;
        continue;
      }
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
    // inner ones come with postcodes from packages/melbourne-data; the rest
    // of its area comes from here, like every city's. Australian suburbs
    // are official names, so every place=suburb counts; smaller
    // neighbourhoods only when they're notable (they have a Wikidata entry).
    const names = new Set<string>(city.id === 'melbourne' ? MELBOURNE_PLACES.map((place) => place.name.toLowerCase()) : []);
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
    // In chunks: one array literal of over a thousand rows is more than TypeScript will check.
    ...chunked('GYMS', 'GymRow', gymsOut),
    ...chunked('PLACES', 'PlaceRow', placesOut),
  ];
  writeFileSync(OUT, lines.join('\n'));
  for (const line of stats) console.log(line);
  console.log('gyms', gymsOut.length, 'suburbs', placesOut.length, 'hours parsed', parsed, 'unparsed', unparsed, 'left to operator records', superseded);
}

const CHUNK = 100;

/** `const NAME_0: Type[] = [...]` for each hundred rows, then `export const NAME_ROWS` joining them. */
function chunked(name: string, type: string, rows: object[]): string[] {
  const lines: string[] = [];
  const names: string[] = [];
  for (let at = 0; at < rows.length; at += CHUNK) {
    const part = `${name}_${at / CHUNK}`;
    names.push(part);
    lines.push('// prettier-ignore', `const ${part}: ${type}[] = [`, ...rows.slice(at, at + CHUNK).map((row) => `  ${pyJson(row)},`), '];', '');
  }
  lines.push(`export const ${name === 'GYMS' ? 'GYM' : 'PLACE'}_ROWS: ${type}[] = [${names.map((part) => `...${part}`).join(', ')}];`, '');
  return lines;
}

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: generate.ts <dir with city json files>');
  process.exit(1);
}
main(dir);
