/**
 * Turn raw OpenStreetMap answers into src/data.ts for GymGO's map-only
 * world cities. A city with no file yet is left out (and so out of the
 * app), so the cities can be fetched a few at a time.
 *
 * Input: one JSON file per city (from scripts/fetch.ts), each the saved answer to
 *
 *     [bbox: the circle's bounding box]
 *     nwr["leisure"="fitness_centre"]["name"]; out center tags;
 *     node["place"~"^(suburb|neighbourhood|quarter)$"]["name"]; out;
 *
 * from the Overpass API, with the time it was fetched.
 *
 * What counts as a gym is decided in packages/osm, shared with the other
 * city packs and the server's "Search this area". Then the 40 nearest the
 * city centre. Names are kept as mapped, in the local language: it's what's
 * on the door and on the street signs.
 *
 * Usage: pnpm --filter @gymgo/world-data generate <dir with city json files>
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { WORLD_CITIES } from '../src/cities';
import type { GymRow, PlaceRow, WorldCityId } from '../src/rows';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.ts');
const PER_CITY = 40;
const PLACES_PER_CITY = 14;
/** Fewer than this and the city stays out of the app. */
const MIN_PER_CITY = 5;

interface CityFile {
  fetchedAt: string;
  gyms: OsmElement[];
  places: OsmElement[];
}

function main(src: string) {
  const fetched: Array<[WorldCityId, string]> = [];
  const gymsOut: GymRow[] = [];
  const placesOut: PlaceRow[] = [];
  const ids = new Set<string>();
  const stats: string[] = [];
  let parsed = 0;
  let unparsed = 0;

  for (const city of WORLD_CITIES) {
    const file = join(src, `${city.id}.json`);
    if (!existsSync(file)) {
      stats.push(`${city.id.padEnd(16)} not fetched yet`);
      continue;
    }
    const data = JSON.parse(readFileSync(file, 'utf8')) as CityFile;
    const centre: [number, number] = [city.centre.lat, city.centre.lng];
    const seen = new Set<string>();
    const rows: Array<{ d: number } & Candidate> = [];
    for (const el of data.gyms) {
      const found = candidate(el);
      if (!found) continue;
      // The box's corners are outside the city's circle.
      if (km(centre, found.pos) > city.radiusKm) continue;
      const key = `${found.name.toLowerCase()}|${round(found.pos[0], 4)}|${round(found.pos[1], 4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ d: km(centre, found.pos), ...found });
    }
    rows.sort((a, b) => a.d - b.d);
    const kept = rows.slice(0, PER_CITY);
    // A city the map has (almost) no gyms for isn't worth offering.
    if (kept.length < MIN_PER_CITY) {
      stats.push(`${city.id.padEnd(16)} only ${kept.length} gyms: left out`);
      continue;
    }
    fetched.push([city.id, data.fetchedAt]);
    stats.push(`${city.id.padEnd(16)} ${String(data.gyms.length).padStart(4)} mapped, ${String(rows.length).padStart(4)} kept after filters, ${String(kept.length).padStart(3)} used`);

    for (const { el, name, tags, pos } of kept) {
      const street = tags['addr:street'] ?? '';
      const branch = branchOf(tags);
      const base = slug([name, branch ?? (street || null), city.id].filter(Boolean).join('-'));
      const id = ids.has(base) ? `${base}-${el.type[0]}${el.id}` : base;
      ids.add(id);
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
        line1: line1Of(tags, city.country),
        suburb: tags['addr:suburb'] || tags['addr:district'] || tags['addr:city'] || city.name,
        state: '',
        postcode: (tags['addr:postcode'] ?? '').trim().slice(0, 12),
        lat: round(pos[0], 6),
        lng: round(pos[1], 6),
        type: trainingType(name, tags),
        ...contactOf(tags),
        ...extras,
      });
    }

    // Districts for the search box, nearest the centre first: every
    // place=suburb, and smaller quarters only when they're notable (they
    // have a Wikidata entry). Local names, as on the street signs.
    const names = new Set<string>();
    const cands: Array<{ d: number; name: string; pos: [number, number] }> = [];
    for (const el of data.places) {
      const tags = el.tags ?? {};
      const pos = position(el);
      if (!pos || (tags.place !== 'suburb' && !('wikidata' in tags))) continue;
      if (km(centre, pos) > city.radiusKm) continue;
      const name = tags.name!;
      const known = [city.name, ...city.aliases].map((item) => item.toLowerCase());
      if (names.has(name.toLowerCase()) || known.includes(name.toLowerCase())) continue;
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
    "import type { GymRow, PlaceRow, WorldCityId } from './rows';",
    '',
    "/** When each city's data was fetched from the Overpass API: only the cities fetched. */",
    'export const FETCHED: Partial<Record<WorldCityId, string>> = {',
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
  console.log('gyms', gymsOut.length, 'districts', placesOut.length, 'hours parsed', parsed, 'unparsed', unparsed);
}

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: generate.ts <dir with city json files>');
  process.exit(1);
}
main(dir);
