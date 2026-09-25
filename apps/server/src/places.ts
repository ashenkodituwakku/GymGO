/**
 * Finding a town or suburb anywhere in Australia or the US, by name.
 *
 * The app knows the suburbs of its bundled cities by heart. For anywhere
 * else ("Bendigo", "Boise"), it asks here when someone presses Enter, and
 * this asks Photon (photon.komoot.io), a free geocoder built on
 * OpenStreetMap. The app then flies there and searches the area for gyms.
 *
 * Photon is free and asks only for fair use, so: one request at a time, at
 * most one a second, only on submit (never as someone types), answers kept
 * for a month, and a per-address limit on new questions. Only towns,
 * suburbs and localities come back, and only in the two countries GymGO
 * covers.
 */

import type { Db } from './db';

type Fetch = typeof fetch;

export const DEFAULT_GEOCODER = 'https://photon.komoot.io/api/';
const USER_AGENT = 'GymGO/0.1 (gym finder; https://github.com/ashenkodituwakku/GymGO)';
const FRESH_DAYS = 30;
const MAX_RESULTS = 5;

export interface FoundPlace {
  name: string;
  /** "Victoria, Australia", "Texas, United States". */
  region: string;
  lat: number;
  lng: number;
  countryCode: 'AU' | 'US';
  /** A city or town, or a suburb or neighbourhood (sets how far the map zooms). */
  kind: 'city' | 'suburb';
}

export class PlaceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The question as it's kept: case, spacing and punctuation don't make a new one. */
export function normaliseQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Photon's features → places GymGO can search: towns and suburbs in AU and the US, best first. */
export function readPhoton(data: unknown): FoundPlace[] {
  const features = (data as { features?: unknown[] } | null)?.features;
  if (!Array.isArray(features)) return [];
  const out: FoundPlace[] = [];
  const seen = new Set<string>();
  for (const feature of features as Array<Record<string, any>>) {
    const p = feature?.properties ?? {};
    const [lng, lat] = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];
    const country = p.countrycode === 'AU' || p.countrycode === 'US' ? (p.countrycode as 'AU' | 'US') : null;
    if (!country || typeof p.name !== 'string' || typeof lat !== 'number' || typeof lng !== 'number') continue;
    const kind = p.type === 'city' ? 'city' : p.type === 'district' || p.type === 'locality' ? 'suburb' : null;
    if (!kind) continue;
    const region = [p.state, country === 'AU' ? 'Australia' : 'United States'].filter((part) => typeof part === 'string' && part).join(', ');
    const key = `${p.name.toLowerCase()}|${region}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: p.name, region, lat, lng, countryCode: country, kind });
    if (out.length >= MAX_RESULTS) break;
  }
  return out;
}

export class PlaceSearch {
  private queue: Promise<unknown> = Promise.resolve();
  private last = 0;

  constructor(
    private readonly db: Db,
    private readonly options: { endpoint?: string; fetchImpl?: Fetch; now?: () => Date } = {},
  ) {
    db.exec(`create table if not exists place_lookups (
      query text primary key,
      answer_json text not null,
      fetched_at text not null
    )`);
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  /** A kept answer for this question, if it's fresh. */
  cached(query: string): FoundPlace[] | undefined {
    const row = this.db.prepare('select answer_json, fetched_at from place_lookups where query = ?').get(normaliseQuery(query)) as
      | { answer_json: string; fetched_at: string }
      | undefined;
    if (!row) return undefined;
    if (this.now().getTime() - Date.parse(row.fetched_at) > FRESH_DAYS * 86_400_000) return undefined;
    return JSON.parse(row.answer_json) as FoundPlace[];
  }

  async search(query: string): Promise<FoundPlace[]> {
    const text = query.trim();
    if (text.length < 2 || text.length > 80) throw new PlaceError(400, 'Type a place name of 2 to 80 characters.');
    const kept = this.cached(text);
    if (kept) return kept;
    // One at a time, and at least a second apart, as Photon asks.
    const run = this.queue.then(async () => {
      const wait = this.last + 1000 - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      this.last = Date.now();
      return this.ask(text);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async ask(text: string): Promise<FoundPlace[]> {
    const url = new URL(this.options.endpoint ?? DEFAULT_GEOCODER);
    url.searchParams.set('q', text);
    url.searchParams.set('limit', '15');
    url.searchParams.set('lang', 'en');
    for (const layer of ['city', 'district', 'locality']) url.searchParams.append('layer', layer);
    let response: Response;
    try {
      response = await (this.options.fetchImpl ?? fetch)(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new PlaceError(502, 'The place finder didn’t answer. Try again in a moment.');
    }
    if (!response.ok) throw new PlaceError(response.status === 429 ? 503 : 502, 'The place finder is busy. Try again in a moment.');
    const places = readPhoton(await response.json().catch(() => null));
    this.db
      .prepare(
        'insert into place_lookups (query, answer_json, fetched_at) values (?, ?, ?) on conflict(query) do update set answer_json = excluded.answer_json, fetched_at = excluded.fetched_at',
      )
      .run(normaliseQuery(text), JSON.stringify(places), this.now().toISOString());
    return places;
  }
}
