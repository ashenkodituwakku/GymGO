/**
 * Fetch gyms and districts for GymGO's world cities from OpenStreetMap,
 * through the Overpass API, and save each city's raw answer with the time it
 * was fetched. The cities are src/cities.ts's; one already in <dir> is
 * skipped, so a run that stops can carry on.
 *
 *     pnpm --filter @gymgo/world-data fetch <dir>
 *     pnpm --filter @gymgo/world-data generate <dir>     then into src/data.ts
 *
 * Through curl, which follows the machine's proxy settings. Mirrors are
 * tried in turn, a few seconds apart, as Overpass's usage policy asks.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WORLD_CITIES } from '../src/cities';

// overpass-api.de and its lz4 instance reset connections from cloud
// networks (a Claude Code session's included, 20 Oct 2026), so the public
// mirrors are what usually answers there.
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const UA = 'GymGO/0.1 (gym finder; https://github.com/ashenkodituwakku/GymGO)';

const pause = (ms: number) => execFileSync('sleep', [String(ms / 1000)]);

function overpass(query: string): { elements: unknown[] } {
  for (let attempt = 0; attempt < 5; attempt++) {
    for (const mirror of MIRRORS) {
      try {
        const out = execFileSync('curl', ['-sS', '--max-time', '120', '-A', UA, '-H', 'Accept: application/json', '-X', 'POST', mirror, '--data-urlencode', `data=${query}`, '-w', '\n%{http_code}'], {
          encoding: 'utf8',
          maxBuffer: 256 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        const cut = out.lastIndexOf('\n');
        const [body, code] = [out.slice(0, cut), out.slice(cut + 1)];
        if (code === '200') return JSON.parse(body) as { elements: unknown[] };
        console.error(`  retry ${attempt + 1} ${new URL(mirror).host} ${code}`);
      } catch (error) {
        console.error(`  retry ${attempt + 1} ${new URL(mirror).host} ${String((error as Error).message).split('\n')[0]?.slice(0, 100)}`);
      }
      pause(3000);
    }
    pause(5000 + attempt * 5000);
  }
  throw new Error(`Overpass didn't answer: ${query.slice(0, 80)}`);
}

function main(out: string) {
  mkdirSync(out, { recursive: true });
  for (const city of WORLD_CITIES) {
    const path = join(out, `${city.id}.json`);
    if (existsSync(path)) {
      console.log(city.id, 'already fetched');
      continue;
    }
    // The circle's bounding box, which Overpass answers far quicker than
    // (around:); generate.ts keeps only what's inside the circle.
    const { lat, lng } = city.centre;
    const dLat = (city.radiusKm * 1000) / 111320;
    const dLng = (city.radiusKm * 1000) / (111320 * Math.cos((lat * Math.PI) / 180));
    const bbox = `[bbox:${(lat - dLat).toFixed(5)},${(lng - dLng).toFixed(5)},${(lat + dLat).toFixed(5)},${(lng + dLng).toFixed(5)}]`;
    const gyms = overpass(`[out:json][timeout:55]${bbox};nwr["leisure"="fitness_centre"]["name"];out center tags;`);
    pause(2000);
    const places = overpass(`[out:json][timeout:55]${bbox};node["place"~"^(suburb|neighbourhood|quarter)$"]["name"];out;`);
    const fetchedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    writeFileSync(path, JSON.stringify({ fetchedAt, gyms: gyms.elements, places: places.elements }));
    console.log(city.id, gyms.elements.length, 'gyms,', places.elements.length, 'districts');
    pause(2000);
  }
}

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: fetch.ts <dir to save each city in>');
  process.exit(1);
}
main(dir);
