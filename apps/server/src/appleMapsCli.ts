/**
 * Look gyms up on Apple Maps through SerpApi, in bulk (appleMaps.ts):
 *   pnpm --filter @gymgo/server apple-maps            (up to the day's limit)
 *   pnpm --filter @gymgo/server apple-maps -- 20      (at most 20 now)
 *
 * The gyms GymGO holds and the ones area searches and country packs have
 * kept, those missing a phone, website or hours first in line. Each lookup
 * is one search on the owner's SerpApi plan; SERPAPI_DAILY_LIMIT still holds.
 * Needs SERPAPI_API_KEY, which is never printed.
 */
import type { GymRecord } from '@gymgo/domain';
import { AppleMaps, DEFAULT_DAILY_LIMIT } from './appleMaps';
import { DB_PATH, SERPAPI_API_KEY, SERPAPI_DAILY_LIMIT } from './config';
import { allGyms, openDb } from './db';

const asked = Number(process.argv[2]);
const perDay = SERPAPI_DAILY_LIMIT ?? DEFAULT_DAILY_LIMIT;
if (!SERPAPI_API_KEY) {
  console.error('Set SERPAPI_API_KEY (your own key from serpapi.com) first; see README, "Gym details from Apple Maps".');
  process.exit(1);
}
const db = openDb(DB_PATH);
const apple = new AppleMaps(db, { key: SERPAPI_API_KEY, perDay, log: (line) => console.log(line) });
const kept = (db.prepare('select record_json from area_gyms').all() as Array<{ record_json: string }>).map((row) => JSON.parse(row.record_json) as GymRecord);
const records = [...allGyms(db), ...kept];
const waiting = records.filter((record) => apple.needs(record)).length;
const max = Number.isInteger(asked) && asked > 0 ? asked : perDay;
console.log(`${records.length} gyms; ${waiting} missing a phone, website or hours and not looked up in the last 90 days. Looking up at most ${max} (and ${perDay} a day).`);
const counts = await apple.enrich(records, max);
console.log(`Matched a listing: ${counts.matched}. No listing near enough by that name: ${counts.none}. Failed: ${counts.failed}.${counts.limit ? ' Stopped at the day’s limit.' : ''}`);
db.close();
