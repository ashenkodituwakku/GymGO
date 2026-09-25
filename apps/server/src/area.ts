/**
 * "Search this area": gyms from OpenStreetMap for wherever the map is showing.
 *
 * The bundled cities cover a circle round each centre. Anywhere else in the
 * world, the app can ask for the area on screen, and this reads the map live
 * through the Overpass API, filtered by exactly the rules the bundled cities
 * use (packages/osm), into map-only records.
 *
 * Being a good citizen of a free, volunteer-run service:
 *  - The world is cut into fixed tiles a tenth of a degree square (about
 *    11 km). A tile is fetched at most once a month; after that everyone
 *    gets the saved copy, so a busy area costs one request, not one per
 *    person.
 *  - One request at a time, a daily cap, and a per-address limit.
 *  - Requests carry a User-Agent that says who we are.
 *
 * The gyms are saved (area_gyms), so they can be saved, reviewed and
 * reported on like any other, and a link to one still works tomorrow.
 * Each gym's country comes from country-coder (the OpenStreetMap iD
 * editor's offline borders) and its time zone from tz-lookup, so hours and
 * "open at 6 pm" are in the gym's own clock anywhere. Australia's and the
 * US's addresses get their states worked out; elsewhere they're as mapped.
 */

import { iso1A2Code } from '@rapideditor/country-coder';
import tzlookup from '@photostructure/tz-lookup';
import type { GymRecord } from '@gymgo/domain';
import {
  branchOf,
  brandOf,
  candidate,
  contactOf,
  extrasOf,
  keep,
  km,
  line1Of,
  mapOnlyRecord,
  osmRef,
  position,
  slug,
  trainingType,
  type OsmElement,
} from '@gymgo/osm';
import type { Db } from './db';

type Fetch = typeof fetch;

export interface Box {
  south: number;
  west: number;
  north: number;
  east: number;
}

export class AreaError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

/**
 * The public Overpass servers, tried in turn: the main one first, then the
 * public instances listed on the OpenStreetMap wiki. Any one of them is
 * often slow or refusing a given network at a given moment.
 */
export const DEFAULT_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
/** How long to give one server before trying the next. */
const PER_SERVER_MS = 30_000;
const USER_AGENT = 'GymGO/0.1 (gym finder; https://github.com/ashenkodituwakku/GymGO)';

/** Tiles are a tenth of a degree on each side. */
const TILE = 10;
/** At most this many tiles per search: about 45 × 55 km at Melbourne's latitude. */
const MAX_TILES = 30;
/** A fetched tile is reused for this long. */
const FRESH_DAYS = 30;
/** The most gyms one answer holds, nearest the middle of the area first. */
const MAX_GYMS = 200;
/** Live map reads per day, across everyone. Overpass asks for under 10,000. */
const DAILY_LIVE = 500;

/** Australia's time zones and the state each one means (Sydney's is also Canberra's, so it's settled by postcode). */
const AU_ZONE_STATE: Record<string, string> = {
  'Australia/Melbourne': 'VIC', 'Australia/Brisbane': 'QLD', 'Australia/Lindeman': 'QLD', 'Australia/Adelaide': 'SA',
  'Australia/Perth': 'WA', 'Australia/Eucla': 'WA', 'Australia/Hobart': 'TAS', 'Australia/Darwin': 'NT',
  'Australia/Broken_Hill': 'NSW', 'Australia/Lord_Howe': 'NSW', 'Australia/Sydney': '',
};

const AU_STATES = new Set(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']);
const AU_STATE_NAMES: Record<string, string> = {
  QUEENSLAND: 'QLD', 'WESTERN AUSTRALIA': 'WA', 'SOUTH AUSTRALIA': 'SA', TASMANIA: 'TAS',
  'AUSTRALIAN CAPITAL TERRITORY': 'ACT', 'NEW SOUTH WALES': 'NSW', VICTORIA: 'VIC', 'NORTHERN TERRITORY': 'NT',
};

/** The Australian state a postcode belongs to (Australia Post's ranges). */
export function auStateForPostcode(postcode: string): string {
  if (!/^\d{4}$/.test(postcode)) return '';
  const n = Number(postcode);
  if ((n >= 200 && n <= 299) || (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return 'ACT';
  if (n >= 800 && n <= 999) return 'NT';
  if (n >= 1000 && n <= 2999) return 'NSW';
  if ((n >= 3000 && n <= 3999) || (n >= 8000 && n <= 8999)) return 'VIC';
  if ((n >= 4000 && n <= 4999) || (n >= 9000 && n <= 9999)) return 'QLD';
  if (n >= 5000 && n <= 5999) return 'SA';
  if (n >= 6000 && n <= 6999) return 'WA';
  if (n >= 7000 && n <= 7999) return 'TAS';
  return '';
}

export interface Whereabouts {
  /** ISO 3166-1 alpha-2: "AU", "US", "GB", "JP". Territories count as their country (Puerto Rico is US). */
  countryCode: string;
  /** IANA time zone: "Australia/Melbourne", "Europe/London". */
  timezone: string;
}

/**
 * Which country and time zone a point is in, or null out at sea. Borders
 * over water are rough, so a point just offshore can still get a country;
 * one whose clock would only be a sea zone ("Etc/GMT-10") gets null.
 */
export function whereIs(lat: number, lng: number): Whereabouts | null {
  const countryCode = iso1A2Code([lng, lat]);
  if (!countryCode) return null;
  let timezone: string;
  try {
    timezone = tzlookup(lat, lng);
  } catch {
    return null;
  }
  if (timezone.startsWith('Etc/')) return null;
  return { countryCode, timezone };
}

export function parseBox(params: URLSearchParams): Box {
  const read = (name: string) => {
    const value = Number(params.get(name));
    if (!params.has(name) || !Number.isFinite(value)) throw new AreaError(400, `Missing or bad "${name}".`);
    return value;
  };
  const box = { south: read('south'), west: read('west'), north: read('north'), east: read('east') };
  if (box.south < -90 || box.north > 90 || box.south >= box.north) throw new AreaError(400, 'South must be below north.');
  if (box.west < -180 || box.east > 180 || box.west >= box.east) throw new AreaError(400, 'West must be left of east.');
  return box;
}

function tilesOf(box: Box): Array<{ key: string; box: Box }> {
  const tiles: Array<{ key: string; box: Box }> = [];
  // A hair of slack, so 0.7 × 10 = 7.000000000000001 doesn't add a whole row of tiles.
  const [south, north] = [Math.floor(box.south * TILE + 1e-9), Math.ceil(box.north * TILE - 1e-9)];
  const [west, east] = [Math.floor(box.west * TILE + 1e-9), Math.ceil(box.east * TILE - 1e-9)];
  for (let y = south; y < Math.max(north, south + 1); y += 1) {
    for (let x = west; x < Math.max(east, west + 1); x += 1) {
      tiles.push({ key: `${y}:${x}`, box: { south: y / TILE, north: (y + 1) / TILE, west: x / TILE, east: (x + 1) / TILE } });
    }
  }
  return tiles;
}

const inBox = (box: Box, lat: number, lng: number) => lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east;

interface Place {
  name: string;
  pos: [number, number];
}

export interface AreaAnswer {
  gyms: GymRecord[];
  /** When the oldest part of this answer was read from the map. */
  fetchedAt: string | null;
  /** More gyms than one answer holds: the nearest the middle were kept. */
  truncated: boolean;
  /** The country and time zone of the middle of the area (or, if that's sea, of the gym nearest it). */
  where: Whereabouts | null;
}

export interface AreaOptions {
  /** Overpass servers to ask, in order (the first that answers wins). */
  endpoints?: string[];
  fetchImpl?: Fetch;
  now?: () => Date;
  /** Gyms already in the bundled data; the map's copies of them are left out. */
  known: () => GymRecord[];
  /** Where a server's failure is noted (the console by default). */
  log?: (line: string) => void;
}

export class AreaSearch {
  private readonly endpoints: string[];
  private readonly fetchImpl: Fetch;
  private readonly now: () => Date;
  private queue: Promise<unknown> = Promise.resolve();
  /** The Overpass server that answered last. */
  private preferred: string | null = null;
  private readonly log: (line: string) => void;
  private day = '';
  private liveToday = 0;

  constructor(
    private readonly db: Db,
    private readonly options: AreaOptions,
  ) {
    this.endpoints = options.endpoints?.length ? options.endpoints : DEFAULT_OVERPASS;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.log = options.log ?? ((line) => console.warn(line));
  }

  /** Whether answering this area needs a live map read (so the caller can rate-limit only those). */
  needsFetch(box: Box): boolean {
    return this.staleTiles(box).length > 0;
  }

  private staleTiles(box: Box) {
    const cutoff = new Date(this.now().getTime() - FRESH_DAYS * 86_400_000).toISOString();
    const fresh = this.db.prepare('select fetched_at from area_tiles where tile = ?');
    return tilesOf(box).filter((tile) => {
      const row = fresh.get(tile.key) as { fetched_at: string } | undefined;
      return !row || row.fetched_at < cutoff;
    });
  }

  async search(box: Box): Promise<AreaAnswer> {
    const tiles = tilesOf(box);
    if (tiles.length > MAX_TILES) throw new AreaError(400, 'That’s a big area. Zoom in a little and search again.', 'too_big');
    const middle: [number, number] = [(box.south + box.north) / 2, (box.west + box.east) / 2];

    if (this.staleTiles(box).length > 0) {
      // One read at a time, so a burst of searches never hammers the service,
      // and what's stale is worked out again when its turn comes: a search
      // queued behind another of the same area then reads nothing twice.
      const run = this.queue.then(() => {
        const stale = this.staleTiles(box);
        if (stale.length === 0) return;
        return this.fetchTiles(stale.map((tile) => tile.box), stale.map((tile) => tile.key));
      });
      this.queue = run.catch(() => undefined);
      await run;
    }

    const rows = this.db
      .prepare('select record_json, lat, lng, fetched_at from area_gyms where lat between ? and ? and lng between ? and ?')
      .all(box.south, box.north, box.west, box.east) as Array<{ record_json: string; lat: number; lng: number; fetched_at: string }>;
    // The name rules run again on what was kept, so a rule fixed since an
    // area was read (a kids' programme let through, say) applies at once.
    const current = rows
      .map((row) => ({ ...row, record: JSON.parse(row.record_json) as GymRecord }))
      .filter((row) => keep(row.record.location.name, {}));
    current.sort((a, b) => km(middle, [a.lat, a.lng]) - km(middle, [b.lat, b.lng]));
    const kept = current.slice(0, MAX_GYMS);
    const oldest = kept.reduce<string | null>((min, row) => (min === null || row.fetched_at < min ? row.fetched_at : min), null);
    // A coastal view's middle can be out at sea: then the nearest gym says where this is.
    const nearest = kept[0]?.record.location;
    const where =
      whereIs(...middle) ?? (nearest ? { countryCode: nearest.address.countryCode, timezone: nearest.timezone } : null);
    return { gyms: kept.map((row) => row.record), fetchedAt: oldest, truncated: current.length > MAX_GYMS, where };
  }

  private async fetchTiles(boxes: Box[], keys: string[]): Promise<void> {
    const today = this.now().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.liveToday = 0;
    }
    if (this.liveToday >= DAILY_LIVE) throw new AreaError(503, 'GymGO has read the map a lot today. Try again tomorrow.', 'busy');
    this.liveToday += 1;

    const box: Box = {
      south: Math.min(...boxes.map((item) => item.south)),
      west: Math.min(...boxes.map((item) => item.west)),
      north: Math.max(...boxes.map((item) => item.north)),
      east: Math.max(...boxes.map((item) => item.east)),
    };
    const bbox = `${box.south},${box.west},${box.north},${box.east}`;
    const query =
      `[out:json][timeout:40][bbox:${bbox}];` +
      'nwr["leisure"="fitness_centre"]["name"];out center tags;' +
      'node["place"~"^(city|town|suburb|village|neighbourhood|quarter|hamlet)$"]["name"];out;';

    // The first server that answers properly wins; a slow, busy or odd one
    // passes to the next. The one that answered last time is asked first, so
    // a server that's down (or refuses this network) costs one wait, not one
    // per search.
    let data: { elements: OsmElement[] } | null = null;
    let busy = false;
    const order = this.preferred ? [this.preferred, ...this.endpoints.filter((endpoint) => endpoint !== this.preferred)] : this.endpoints;
    for (const endpoint of order) {
      const host = new URL(endpoint).host;
      try {
        const response = await this.fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: new URLSearchParams({ data: query }).toString(),
          signal: AbortSignal.timeout(PER_SERVER_MS),
        });
        if (response.status === 429 || response.status === 504) busy = true;
        const body = (await response.json().catch(() => null)) as { elements?: OsmElement[]; remark?: string } | null;
        // A runtime error comes back as 200 with a remark and no data: not an answer.
        if (response.ok && body && Array.isArray(body.elements) && !/error/i.test(body.remark ?? '')) {
          data = { elements: body.elements };
          this.preferred = endpoint;
          break;
        }
        this.log(`[area] ${host} answered ${response.status}${body?.remark ? `: ${body.remark.slice(0, 120)}` : ''}; trying the next`);
      } catch (error) {
        // Timed out or unreachable: try the next.
        this.log(`[area] ${host} didn't answer (${error instanceof Error ? error.name : 'error'}); trying the next`);
      }
    }
    if (!data) {
      throw busy
        ? new AreaError(503, 'The map service is busy. Try again in a minute.', 'upstream')
        : new AreaError(502, 'The map service didn’t answer. Try again in a minute.', 'upstream');
    }

    const fetchedAt = this.now().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const places: Place[] = [];
    const gyms: OsmElement[] = [];
    for (const el of data.elements) {
      if (el.tags?.leisure === 'fitness_centre') gyms.push(el);
      else if (el.tags?.place && el.tags.name) {
        const pos = position(el);
        if (pos) places.push({ name: el.tags['name:en'] || el.tags.name, pos });
      }
    }

    const known = this.options.known().filter((record) => !record.location.isDemoData);
    const knownRefs = new Set(known.map((record) => record.location.externalRefs.openStreetMap).filter(Boolean));
    const records = new Map<string, { record: GymRecord; lat: number; lng: number; osm: string }>();
    for (const el of gyms) {
      const found = candidate(el);
      if (!found) continue;
      const osm = osmRef(el);
      if (knownRefs.has(osm)) continue;
      const [lat, lng] = found.pos;
      if (known.some((record) => sameGym(found.name, found.pos, record))) continue;
      const where = whereIs(lat, lng);
      if (!where) continue;
      const record = this.toRecord(found.name, found.tags, el, found.pos, where, places, fetchedAt);
      records.set(osm, { record, lat, lng, osm });
    }

    const upsert = this.db.prepare(
      `insert into area_gyms (id, osm, record_json, lat, lng, fetched_at) values (?, ?, ?, ?, ?, ?)
       on conflict(osm) do update set record_json = excluded.record_json, lat = excluded.lat, lng = excluded.lng, fetched_at = excluded.fetched_at`,
    );
    const inArea = this.db.prepare('select osm, lat, lng from area_gyms where lat between ? and ? and lng between ? and ?');
    const remove = this.db.prepare('delete from area_gyms where osm = ?');
    const mark = this.db.prepare(
      'insert into area_tiles (tile, fetched_at, gyms) values (?, ?, ?) on conflict(tile) do update set fetched_at = excluded.fetched_at, gyms = excluded.gyms',
    );
    this.db.exec('begin');
    try {
      for (const item of records.values()) upsert.run(item.record.location.id, item.osm, JSON.stringify(item.record), item.lat, item.lng, fetchedAt);
      // Gyms gone from the map since the last read go too. Saved gyms and
      // reviews that point at them stay, and simply stop matching.
      for (const tileBox of boxes) {
        const rows = inArea.all(tileBox.south, tileBox.north, tileBox.west, tileBox.east) as Array<{ osm: string; lat: number; lng: number }>;
        for (const row of rows) if (!records.has(row.osm) && inBox(tileBox, row.lat, row.lng)) remove.run(row.osm);
      }
      boxes.forEach((tileBox, index) => {
        const count = [...records.values()].filter((item) => inBox(tileBox, item.lat, item.lng)).length;
        mark.run(keys[index]!, fetchedAt, count);
      });
      this.db.exec('commit');
    } catch (error) {
      this.db.exec('rollback');
      throw error;
    }
  }

  private toRecord(
    name: string,
    tags: Record<string, string>,
    el: OsmElement,
    pos: [number, number],
    where: Whereabouts,
    places: Place[],
    fetchedAt: string,
  ): GymRecord {
    const nearest = places
      .map((place) => ({ place, d: km(pos, place.pos) }))
      .filter((item) => item.d <= 8)
      .sort((a, b) => a.d - b.d)[0]?.place.name;
    const locality = tags['addr:suburb'] || tags['addr:city'] || nearest || '';
    const rawPostcode = (tags['addr:postcode'] ?? '').trim();
    let state: string;
    let postcode: string;
    if (where.countryCode === 'AU') {
      postcode = /^\d{4}$/.test(rawPostcode) ? rawPostcode : '';
      let named = (tags['addr:state'] ?? '').trim().toUpperCase();
      named = AU_STATE_NAMES[named] ?? named;
      state = AU_STATES.has(named) ? named : auStateForPostcode(postcode) || AU_ZONE_STATE[where.timezone] || '';
    } else if (where.countryCode === 'US') {
      postcode = /^\d{5}/.test(rawPostcode) ? rawPostcode.slice(0, 5) : '';
      const named = (tags['addr:state'] ?? '').trim().toUpperCase();
      state = /^[A-Z]{2}$/.test(named) ? named : '';
    } else {
      // Elsewhere, as mapped: postcodes and regions take too many shapes to check.
      postcode = rawPostcode.slice(0, 12);
      state = (tags['addr:state'] || tags['addr:province'] || '').trim().slice(0, 40);
    }
    const branch = branchOf(tags);
    const { hoursUnreadable: _unreadable, ...extras } = extrasOf(tags);
    return mapOnlyRecord(
      {
        id: `${slug(name) || 'gym'}-${el.type[0]}${el.id}`,
        osm: osmRef(el),
        name,
        ...brandOf(tags),
        ...(branch ? { branch } : {}),
        line1: line1Of(tags, where.countryCode),
        locality,
        state,
        postcode,
        lat: Number(pos[0].toFixed(6)),
        lng: Number(pos[1].toFixed(6)),
        type: trainingType(name, tags),
        ...contactOf(tags),
        ...extras,
      },
      { ...where, fetchedAt },
    );
  }
}

const IGNORED_WORDS = new Set(['the', 'gym', 'fitness', 'health', 'club', 'clubs']);
const words = (text: string) =>
  new Set([...text.toLowerCase().replaceAll('’', "'").replaceAll("'", '').matchAll(/[a-z0-9]+/g)].map((m) => m[0]).filter((w) => !IGNORED_WORDS.has(w)));

/** A gym we already hold under another element: the same name within 100 metres. */
function sameGym(name: string, pos: [number, number], record: GymRecord): boolean {
  if (km(pos, [record.location.position.lat, record.location.position.lng]) > 0.1) return false;
  const a = words(name);
  const b = words(record.location.name);
  return [...a].some((word) => b.has(word)) || a.size === 0 || b.size === 0;
}
