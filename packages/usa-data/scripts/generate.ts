/**
 * Turn raw OpenStreetMap answers into src/data.ts.
 *
 * Input: one JSON file per city (<city>.json, from scripts/fetch.py), each the saved answer to
 *
 *     nwr["leisure"="fitness_centre"]["name"]; out center tags;
 *     node["place"~"^(suburb|neighbourhood|quarter)$"]["name"]; out;
 *
 * for the city's circle (the first 15 cities) or its bounding box (the rest,
 * which the busy mirror answers more readily), from the Overpass API, with
 * the time it was fetched. Only what's inside the circle is kept, and a gym
 * two cities' circles share (Brooklyn and New York) is listed once, under
 * the first.
 *
 * What counts as a gym is decided in packages/osm, shared with
 * packages/au-data and the server's "Search this area". Then the 40
 * nearest the city centre.
 *
 * Usage: pnpm --filter @gymgo/usa-data generate <dir with city json files>
 */

import { readFileSync, writeFileSync } from 'node:fs';
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
import { US_CITIES } from '../src/cities';
import type { GymRow, PlaceRow, UsCityId } from '../src/rows';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.ts');
const PER_CITY = 40;
const PLACES_PER_CITY = 14;

/** What the search box calls each city, where it differs from the list's name. */
const PLACE_NAME: Partial<Record<UsCityId, string>> = { 'washington-dc': 'Washington' };

interface CityFile {
  fetchedAt: string;
  gyms: OsmElement[];
  places: OsmElement[];
}

function main(src: string) {
  const fetched: Array<[UsCityId, string]> = [];
  const gymsOut: GymRow[] = [];
  const placesOut: PlaceRow[] = [];
  const ids = new Set<string>();
  const stats: string[] = [];
  let parsed = 0;
  let unparsed = 0;

  const taken = new Set<string>();
  for (const city of US_CITIES) {
    const cityName = PLACE_NAME[city.id] ?? city.name;
    const data = JSON.parse(readFileSync(join(src, `${city.id}.json`), 'utf8')) as CityFile;
    fetched.push([city.id, data.fetchedAt]);
    const centre: [number, number] = [city.centre.lat, city.centre.lng];
    const seen = new Set<string>();
    const rows: Array<{ d: number } & Candidate> = [];
    for (const el of data.gyms) {
      const found = candidate(el);
      if (!found) continue;
      // Inside the circle (with the half-kilometre a large building's centre can stray), and not another city's.
      if (km(centre, found.pos) > city.radiusKm + 0.5 || taken.has(osmRef(el))) continue;
      const key = `${found.name.toLowerCase()}|${round(found.pos[0], 4)}|${round(found.pos[1], 4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ d: km(centre, found.pos), ...found });
    }
    rows.sort((a, b) => a.d - b.d);
    const kept = rows.slice(0, PER_CITY);
    stats.push(`${city.id.padEnd(15)} ${String(data.gyms.length).padStart(4)} mapped, ${String(rows.length).padStart(4)} kept after filters, ${String(kept.length).padStart(3)} used`);

    for (const { el, name, tags, pos } of kept) {
      taken.add(osmRef(el));
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
        line1: line1Of(tags),
        locality: tags['addr:city'] || cityName,
        state: (tags['addr:state'] || city.state).toUpperCase().slice(0, 2),
        zip: (tags['addr:postcode'] ?? '').slice(0, 5),
        lat: round(pos[0], 6),
        lng: round(pos[1], 6),
        type: trainingType(name, tags),
        ...contactOf(tags),
        ...extras,
      });
    }

    // Neighbourhoods for the search box: the notable ones (they have a
    // Wikidata entry), nearest the centre first. A city with fewer than
    // five of those (San Antonio has none) is topped up with the nearest
    // other mapped neighbourhoods.
    const pick = (notable: boolean, names: Set<string>) => {
      const found: Array<{ d: number; name: string; pos: [number, number] }> = [];
      for (const el of data.places) {
        const tags = el.tags ?? {};
        const pos = position(el);
        if (!pos || ('wikidata' in tags) !== notable || km(centre, pos) > city.radiusKm + 0.5) continue;
        const name = (tags['name:en'] || tags.name!).replace(/^\w+: /, ''); // "18b: The Arts District"
        // Heritage listings, not names people search for.
        if (/historic district|thematic/i.test(name)) continue;
        if (names.has(name.toLowerCase()) || name.toLowerCase() === cityName.toLowerCase()) continue;
        names.add(name.toLowerCase());
        found.push({ d: km(centre, pos), name, pos });
      }
      return found.sort((a, b) => a.d - b.d || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    };
    const names = new Set<string>();
    let cands = pick(true, names);
    if (cands.length < 5) cands = [...cands, ...pick(false, names).slice(0, 5 - cands.length)];
    for (const { name, pos } of cands.slice(0, PLACES_PER_CITY)) {
      placesOut.push({ city: city.id, name, lat: round(pos[0], 5), lng: round(pos[1], 5) });
    }
  }

  const lines = [
    '// Generated by scripts/generate.ts from OpenStreetMap data. Do not edit by hand.',
    '// © OpenStreetMap contributors, available under the Open Database License (ODbL).',
    '',
    "import type { GymRow, PlaceRow, UsCityId } from './rows';",
    '',
    "/** When each city's data was fetched from the Overpass API. */",
    'export const FETCHED: Record<UsCityId, string> = {',
    ...fetched.map(([city, at]) => `  '${city}': '${at}',`),
    '};',
    '',
    // One typed list per city, joined: a single list of a thousand rows is
    // more than TypeScript will check in one go ("union type too complex").
    ...US_CITIES.flatMap((city) => [
      '// prettier-ignore',
      `const ${constName(city.id)}: GymRow[] = [`,
      ...gymsOut.filter((row) => row.city === city.id).map((row) => `  ${pyJson(row)},`),
      '];',
      '',
    ]),
    `export const GYM_ROWS: GymRow[] = [${US_CITIES.map((city) => `...${constName(city.id)}`).join(', ')}];`,
    '',
    '// prettier-ignore',
    'export const PLACE_ROWS: PlaceRow[] = [',
    ...placesOut.map((row) => `  ${pyJson(row)},`),
    '];',
    '',
  ];
  writeFileSync(OUT, lines.join('\n'));
  for (const line of stats) console.log(line);
  console.log('gyms', gymsOut.length, 'places', placesOut.length, 'hours parsed', parsed, 'unparsed', unparsed);
}

/** "new-york" → NEW_YORK. */
const constName = (id: string) => id.toUpperCase().replace(/-/g, '_');

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: generate.ts <dir with city json files>');
  process.exit(1);
}
main(dir);
