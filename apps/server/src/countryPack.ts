/**
 * A whole country's gyms in one file, for the app to keep on the device.
 *
 * "Search this area" reads the map live, which can take a while on a busy
 * day. The app keeps its own country's gyms instead: one download (Australia
 * is well under a megabyte gzipped, the US a few), after which any area in
 * that country is answered on the phone at once, offline too.
 *
 * The server builds a country's pack from OpenStreetMap through the Overpass
 * API, one state or region at a time (a whole large country in one question
 * is too much for the free servers), with the same rules as everything else
 * (packages/osm). Gyms already bundled with the app are left out. A pack is
 * kept for a month; one is built at a time, a few new ones a day at most,
 * and the gyms in it are saved like area searches' (area_gyms), so a link,
 * a save or a review of one works like any other.
 */

import { gzipSync } from 'node:zlib';
import tzlookup from '@photostructure/tz-lookup';
import type { GymRecord } from '@gymgo/domain';
import { candidate, mapOnlyRecord, osmRef, type MapOnlyGym } from '@gymgo/osm';
import { AreaError, DEFAULT_OVERPASS, RECORD_RULES_CHANGED, askOverpass, mapOnlyInput, sameGym, splitElements } from './area';
import type { Db } from './db';

/** A gym as the pack holds it: a map-only record's fields, and its clock. */
export interface PackGym extends MapOnlyGym {
  tz: string;
}

export interface CountryPack {
  country: string;
  /** When the map was read. */
  builtAt: string;
  attribution: string;
  gyms: PackGym[];
}

export type PackStatus =
  | { state: 'ready'; builtAt: string; gyms: number; bytes: number; rebuilding: boolean }
  | { state: 'building'; done: number; total: number }
  | { state: 'failed'; message: string };

/** A pack is rebuilt after this long. */
const FRESH_DAYS = 30;
/** One region's question may take this long before the next server is tried. */
const PER_PART_MS = 180_000;
/** New or rebuilt packs per day, across everyone. */
const BUILDS_PER_DAY = 6;
/** A failed build is tried again after this long. */
const RETRY_MS = 60 * 60 * 1000;
const ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';
/** Named places, for a gym's suburb or town when the map gives it none. */
const PLACES = 'node["place"~"^(city|town|suburb|village)$"]["name"](area.a);out;';

export interface PackOptions {
  endpoints?: string[];
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Gyms bundled with the app; the pack leaves them out. */
  known: () => GymRecord[];
  log?: (line: string) => void;
  retryDelayMs?: number;
}

export class CountryPacks {
  private building: { country: string; done: number; total: number } | null = null;
  private queue: string[] = [];
  private failed = new Map<string, { message: string; at: number }>();
  private day = '';
  private buildsToday = 0;
  private readonly log: (line: string) => void;

  constructor(
    private readonly db: Db,
    private readonly options: PackOptions,
  ) {
    this.log = options.log ?? ((line) => console.warn(line));
    db.exec(`create table if not exists country_packs (
      country text primary key,
      built_at text not null,
      gyms integer not null,
      body blob not null
    )`);
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  private row(country: string) {
    return this.db.prepare('select built_at, gyms, body from country_packs where country = ?').get(country) as
      | { built_at: string; gyms: number; body: Uint8Array }
      | undefined;
  }

  private stale(builtAt: string) {
    const now = this.now();
    return now.getTime() - Date.parse(builtAt) > FRESH_DAYS * 86_400_000 || (builtAt < RECORD_RULES_CHANGED && now.toISOString() >= RECORD_RULES_CHANGED);
  }

  /** Where a country's pack is at; asking starts building one that's missing or old. */
  status(country: string): PackStatus {
    const row = this.row(country);
    if (!row || this.stale(row.built_at)) this.request(country);
    if (row) return { state: 'ready', builtAt: row.built_at, gyms: row.gyms, bytes: row.body.length, rebuilding: this.isQueued(country) };
    if (this.building?.country === country) return { state: 'building', done: this.building.done, total: this.building.total };
    const failed = this.failed.get(country);
    if (failed && !this.isQueued(country)) return { state: 'failed', message: failed.message };
    return { state: 'building', done: 0, total: 0 };
  }

  /** The pack, gzipped JSON, or null while there isn't one yet (asking starts building it). */
  pack(country: string): { gzipped: Buffer; builtAt: string } | null {
    const row = this.row(country);
    if (!row || this.stale(row.built_at)) this.request(country);
    return row ? { gzipped: Buffer.from(row.body), builtAt: row.built_at } : null;
  }

  private isQueued(country: string) {
    return this.building?.country === country || this.queue.includes(country);
  }

  private request(country: string) {
    if (this.isQueued(country)) return;
    const failed = this.failed.get(country);
    if (failed && this.now().getTime() - failed.at < RETRY_MS) return;
    const today = this.now().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.buildsToday = 0;
    }
    if (this.buildsToday >= BUILDS_PER_DAY) return;
    this.buildsToday += 1;
    this.queue.push(country);
    if (!this.building) void this.next();
  }

  private async next(): Promise<void> {
    const country = this.queue.shift();
    if (!country) return;
    this.building = { country, done: 0, total: 0 };
    try {
      await this.build(country);
      this.failed.delete(country);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed';
      this.failed.set(country, { message, at: this.now().getTime() });
      this.log(`[pack] ${country}: ${message}`);
    } finally {
      this.building = null;
    }
    return this.next();
  }

  /** Build a country's pack now (tests call this directly). */
  async build(country: string): Promise<CountryPack> {
    if (!/^[A-Z]{2}$/.test(country)) throw new AreaError(400, 'Not a country code.');
    // The server that answered last is asked first next time.
    let preferred: string | null = null;
    const ask = async (query: string) => {
      const answer = await askOverpass(query, {
        endpoints: this.options.endpoints?.length ? this.options.endpoints : DEFAULT_OVERPASS,
        preferred,
        fetchImpl: this.options.fetchImpl ?? fetch,
        log: this.log,
        retryDelayMs: this.options.retryDelayMs ?? 5000,
        perServerMs: PER_PART_MS,
        tag: `pack ${country}`,
      });
      preferred = answer.endpoint;
      return answer;
    };

    // Its states or regions, when it has them; else the whole country at once.
    const listed = await ask(`[out:json][timeout:60];rel["ISO3166-2"~"^${country}-"]["admin_level"="4"]["boundary"="administrative"];out tags;`);
    const codes = [...new Set(listed.elements.map((el) => el.tags?.['ISO3166-2'] ?? '').filter((code) => /^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(code)))].sort();
    const parts = codes.length > 0 ? codes.map((code) => ({ area: `area["ISO3166-2"="${code}"]`, code })) : [{ area: `area["ISO3166-1"="${country}"]["admin_level"="2"]`, code: '' }];
    if (this.building) this.building.total = parts.length;
    // A gym the map gives no state keeps the one it was found in, where that
    // code is the postal one (NSW, not a number): Australia and the US.
    const postalStates = country === 'AU' || country === 'US';

    // Bundled gyms, by rough position, for leaving out their map copies quickly.
    const known = this.options.known().filter((record) => !record.location.isDemoData);
    const knownRefs = new Set(known.map((record) => record.location.externalRefs.openStreetMap).filter(Boolean));
    const cells = new Map<string, GymRecord[]>();
    const cellOf = (lat: number, lng: number) => `${Math.floor(lat * 100)}:${Math.floor(lng * 100)}`;
    for (const record of known) {
      const key = cellOf(record.location.position.lat, record.location.position.lng);
      cells.set(key, [...(cells.get(key) ?? []), record]);
    }
    const nearbyKnown = (lat: number, lng: number) => {
      const found: GymRecord[] = [];
      for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) found.push(...(cells.get(cellOf(lat + dy / 100, lng + dx / 100)) ?? []));
      return found;
    };

    const gyms = new Map<string, PackGym>();
    const builtAt = this.now().toISOString().replace(/\.\d{3}Z$/, 'Z');
    for (const part of parts) {
      // Gyms and places asked for separately: two light questions get through a
      // busy server where one heavy one times out.
      const answer = await ask(
        `[out:json][timeout:170];${part.area}->.a;(` +
          'nwr["leisure"="fitness_centre"]["name"](area.a);' +
          'nwr["amenity"="gym"]["name"](area.a);' +
          'nwr["leisure"="sports_centre"]["sport"~"fitness|weightlifting|crossfit"]["name"](area.a);' +
          ');out center tags;',
      );
      const named = await ask(`[out:json][timeout:170];${part.area}->.a;${PLACES}`);
      const partState = postalStates ? part.code.split('-')[1] ?? '' : '';
      const { gyms: elements } = splitElements(answer.elements);
      const { places } = splitElements(named.elements);
      for (const el of elements) {
        const found = candidate(el);
        if (!found) continue;
        const osm = osmRef(el);
        if (gyms.has(osm) || knownRefs.has(osm)) continue;
        const [lat, lng] = found.pos;
        if (nearbyKnown(lat, lng).some((record) => sameGym(found.name, found.pos, record))) continue;
        let tz: string;
        try {
          tz = tzlookup(lat, lng);
        } catch {
          continue;
        }
        if (tz.startsWith('Etc/')) continue;
        const gym = mapOnlyInput(found.name, found.tags, el, found.pos, { countryCode: country, timezone: tz }, places);
        gyms.set(osm, { ...gym, state: gym.state || partState, tz });
      }
      if (this.building) this.building.done += 1;
    }

    const pack: CountryPack = { country, builtAt, attribution: ATTRIBUTION, gyms: [...gyms.values()].sort((a, b) => a.id.localeCompare(b.id)) };
    const body = gzipSync(Buffer.from(JSON.stringify(pack)), { level: 9 });
    const upsert = this.db.prepare(
      `insert into area_gyms (id, osm, record_json, lat, lng, fetched_at) values (?, ?, ?, ?, ?, ?)
       on conflict(osm) do update set record_json = excluded.record_json, lat = excluded.lat, lng = excluded.lng, fetched_at = excluded.fetched_at`,
    );
    this.db.exec('begin');
    try {
      // Saved like an area search's gyms, so each one's own page, saves and reviews work.
      for (const { tz, ...gym } of pack.gyms) {
        const record = mapOnlyRecord(gym, { countryCode: country, timezone: tz, fetchedAt: builtAt });
        upsert.run(record.location.id, gym.osm, JSON.stringify(record), gym.lat, gym.lng, builtAt);
      }
      this.db
        .prepare(
          `insert into country_packs (country, built_at, gyms, body) values (?, ?, ?, ?)
           on conflict(country) do update set built_at = excluded.built_at, gyms = excluded.gyms, body = excluded.body`,
        )
        .run(country, builtAt, pack.gyms.length, body);
      this.db.exec('commit');
    } catch (error) {
      this.db.exec('rollback');
      throw error;
    }
    this.log(`[pack] ${country}: ${pack.gyms.length} gyms, ${Math.round(body.length / 1024)} KB gzipped`);
    return pack;
  }
}
