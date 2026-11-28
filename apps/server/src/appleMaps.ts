/**
 * Gyms' Apple Maps listings, looked up through SerpApi
 * (https://serpapi.com/apple-maps-api, engine `apple_maps`), so a gym GymGO
 * has no phone, website or opening hours for gets them from its listing,
 * cited as "Apple Maps listing, via SerpApi" with the day it was looked up
 * (packages/domain/src/appleMaps.ts says what's taken and how). Nothing on
 * screen changes: the facts arrive in the gym records the app already
 * shows, with their source.
 *
 * Off unless the owner of this computer sets SERPAPI_API_KEY (their own
 * SerpApi account). GymGO never ships one, and the key never leaves this
 * server or appears in a log. Every lookup is one SerpApi search, which
 * counts against the owner's plan, so:
 *  - only gyms missing a phone, website or hours are looked up, each at most
 *    once in 90 days (a gym with no listing too);
 *  - at most SERPAPI_DAILY_LIMIT searches a day (8 unless set; 0 stops them);
 *  - what's found is kept here, and only that is served after.
 *
 * Lookups happen in the background after an area search (a few at a time),
 * and in bulk with `pnpm --filter @gymgo/server apple-maps`.
 */

import { appleGaps, haversineKm, listingOf, readAppleResults, withAppleListing, type AppleListing, type GymRecord } from '@gymgo/domain';
import type { Db } from './db';
import { sameName } from './google';

const SEARCH = 'https://serpapi.com/search.json';
/** Look a gym up again after this long (its listing may have changed, or appeared). */
export const RECHECK_DAYS = 90;
/** How far a listing may be from where GymGO has the gym and still be it. */
const NEAR_KM = 0.25;
export const DEFAULT_DAILY_LIMIT = 8;

export interface AppleMapsOptions {
  /** SERPAPI_API_KEY; null leaves it all off. */
  key: string | null;
  /** Searches a day at most. */
  perDay?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: (line: string) => void;
}

type Outcome = 'matched' | 'none' | 'failed' | 'limit' | 'off';

/**
 * The listing of these that's this gym: one near where GymGO has it (250 m)
 * whose name shares a word with the gym's or brand's, the nearest first.
 */
export function matchListing(record: GymRecord, results: ReturnType<typeof readAppleResults>): AppleListing | null {
  const { location } = record;
  const places = [location.address.suburb].filter(Boolean);
  const near = results
    .map((result) => ({ result, km: haversineKm(location.position, { lat: result.lat, lng: result.lng }) }))
    .filter(({ result, km }) => km <= NEAR_KM && (sameName(location.name, result.title, places) || (location.brand !== null && sameName(location.brand, result.title, places))))
    .sort((a, b) => a.km - b.km);
  return near[0] ? listingOf(near[0].result) : null;
}

export class AppleMaps {
  private readonly key: string | null;
  private readonly perDay: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly log: (line: string) => void;
  private cache: Map<string, AppleListing> | null = null;
  /** Gyms being looked up now, so two area searches don't spend two searches on one gym. */
  private readonly busy = new Set<string>();

  constructor(
    private readonly db: Db,
    options: AppleMapsOptions,
  ) {
    this.key = options.key?.trim() || null;
    this.perDay = Math.max(0, Math.floor(options.perDay ?? DEFAULT_DAILY_LIMIT));
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.log = options.log ?? ((line) => console.warn(line));
    db.exec(`create table if not exists apple_listings (
      gym_id text primary key,
      matched integer not null,
      listing_json text,
      looked_up_at text not null
    )`);
  }

  configured(): boolean {
    return this.key !== null && this.perDay > 0;
  }

  /** Every listing kept, by gym. */
  private listings(): Map<string, AppleListing> {
    if (!this.cache) {
      const rows = this.db.prepare('select gym_id, listing_json from apple_listings where matched = 1').all() as Array<{ gym_id: string; listing_json: string }>;
      this.cache = new Map(rows.map((row) => [row.gym_id, JSON.parse(row.listing_json) as AppleListing]));
    }
    return this.cache;
  }

  /** A gym's kept listing, if it has one. */
  listing(gymId: string): AppleListing | null {
    return this.listings().get(gymId) ?? null;
  }

  /** The record with what its kept listing adds (nothing, without one). */
  readonly decorate = (record: GymRecord): GymRecord => {
    const listing = this.listing(record.location.id);
    return listing ? withAppleListing(record, listing) : record;
  };

  /** Searches made in the last day. */
  private usedToday(): number {
    const since = new Date(this.now().getTime() - 24 * 60 * 60_000).toISOString();
    return (this.db.prepare('select count(*) as n from apple_listings where looked_up_at > ?').get(since) as { n: number }).n;
  }

  /** Whether a gym lacks something a listing could give, and hasn't been looked up lately. */
  needs(record: GymRecord): boolean {
    if (record.location.isDemoData) return false;
    const gaps = appleGaps(record);
    if (!gaps.phone && !gaps.website && !gaps.hours) return false;
    const row = this.db.prepare('select looked_up_at from apple_listings where gym_id = ?').get(record.location.id) as { looked_up_at: string } | undefined;
    if (!row) return true;
    return this.now().getTime() - Date.parse(row.looked_up_at) > RECHECK_DAYS * 24 * 60 * 60_000;
  }

  /** One SerpApi search for this gym, and what it found kept. */
  async lookUp(record: GymRecord): Promise<Outcome> {
    if (!this.key) return 'off';
    if (this.usedToday() >= this.perDay) return 'limit';
    const id = record.location.id;
    if (this.busy.has(id)) return 'failed';
    this.busy.add(id);
    try {
      const params = new URLSearchParams({
        engine: 'apple_maps',
        query: record.location.name,
        center: `${record.location.position.lat.toFixed(6)},${record.location.position.lng.toFixed(6)}`,
        // About a kilometre across: the gym's own street, not the city's other branches.
        span: '0.01,0.01',
        sort: 'distance',
        api_key: this.key,
      });
      const at = this.now().toISOString();
      let data: unknown;
      try {
        const response = await this.fetchImpl(`${SEARCH}?${params.toString()}`, { signal: AbortSignal.timeout(20_000) });
        data = await response.json().catch(() => null);
        if (!response.ok) {
          // SerpApi's own words (a bad key, the plan used up), never the address asked, which holds the key.
          const said = (data as { error?: unknown } | null)?.error;
          this.log(`[apple-maps] SerpApi answered ${response.status}${typeof said === 'string' ? `: ${said.slice(0, 160)}` : ''}`);
          return 'failed';
        }
      } catch (error) {
        this.log(`[apple-maps] SerpApi didn't answer (${error instanceof Error ? error.name : 'error'})`);
        return 'failed';
      }
      const listing = matchListing(record, readAppleResults(data, at));
      this.db
        .prepare(
          `insert into apple_listings (gym_id, matched, listing_json, looked_up_at) values (?, ?, ?, ?)
           on conflict(gym_id) do update set matched = excluded.matched, listing_json = excluded.listing_json, looked_up_at = excluded.looked_up_at`,
        )
        .run(id, listing ? 1 : 0, listing ? JSON.stringify(listing) : null, at);
      if (listing) this.listings().set(id, listing);
      else this.listings().delete(id);
      return listing ? 'matched' : 'none';
    } finally {
      this.busy.delete(id);
    }
  }

  /** Look up to `max` of these gyms that need it, one after another, until the day's searches are used. */
  async enrich(records: readonly GymRecord[], max: number): Promise<Record<Outcome, number>> {
    const counts: Record<Outcome, number> = { matched: 0, none: 0, failed: 0, limit: 0, off: 0 };
    if (!this.configured()) {
      counts.off = 1;
      return counts;
    }
    for (const record of records.filter((each) => this.needs(each)).slice(0, max)) {
      const outcome = await this.lookUp(record);
      counts[outcome] += 1;
      if (outcome === 'limit') break;
    }
    return counts;
  }
}
