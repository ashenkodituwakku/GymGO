/**
 * The weather on Home and the map (GET /api/weather): MET Norway's
 * forecast (Locationforecast 2.0, "compact"), asked for the middle of a
 * map square, never anyone's position (packages/domain/src/weather.ts).
 *
 * MET Norway's terms (https://api.met.no/doc/TermsOfService): free for any
 * use, credited ("Weather data from MET Norway", CC BY 4.0); every request
 * says who's asking in its User-Agent, with a way to reach them; at most
 * four decimals of latitude and longitude; a forecast is kept until its
 * Expires and then asked for again with If-Modified-Since, so an unchanged
 * one costs MET Norway nothing; and no more than 20 requests a second.
 * Squares and this cache keep GymGO far below that: everyone in a square
 * shares one forecast, asked for about twice an hour at most.
 *
 * When MET Norway can't be reached, the last forecast for that square is
 * handed out for up to six hours, with the time it was made, which the app
 * shows; older than that, or none at all, says so.
 */

import { fromMetForecast, weatherPoint, type Weather } from '@gymgo/domain';

export const MET_ENDPOINT = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
/** However soon MET Norway says it may change, and however late, a forecast is kept between these. */
const KEEP_AT_LEAST = 10 * 60_000;
const KEEP_AT_MOST = 2 * 60 * 60_000;
/** An old forecast is better than none while MET Norway is away, up to this old. */
const STALE_FOR = 6 * 60 * 60_000;
/** Squares remembered at once: the busiest are kept. */
const MOST_SQUARES = 2000;
const TIMEOUT_MS = 8000;

export class WeatherError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

export interface WeatherOptions {
  /** Off: the route says so and nothing is asked of MET Norway (GYMGO_WEATHER=off). */
  on?: boolean;
  /** Who's asking, as MET Norway requires: the app, and a website or address that reaches whoever runs it. */
  userAgent: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: (line: string) => void;
}

interface Kept {
  weather: Weather;
  /** Until when it's fresh, and when it was fetched (ms). */
  freshUntil: number;
  fetchedAt: number;
  lastModified: string | null;
}

/** The block's south-west corner, read from the query: whole tenths of a degree only, as the app's tiles are. */
export function parseBlock(params: URLSearchParams): { south: number; west: number } {
  const read = (name: string, low: number, high: number) => {
    const raw = params.get(name);
    const value = raw === null || raw.trim() === '' ? Number.NaN : Number(raw);
    if (!Number.isFinite(value) || value < low || value > high || Math.abs(value * 10 - Math.round(value * 10)) > 1e-6) {
      throw new WeatherError(400, 'Ask for the weather of a map square: south and west, in tenths of a degree.', 'bad_square');
    }
    return Math.round(value * 10) / 10;
  };
  return { south: read('south', -90, 89.7), west: read('west', -180, 179.7) };
}

export class WeatherService {
  readonly on: boolean;
  private readonly kept = new Map<string, Kept>();
  private readonly asking = new Map<string, Promise<Weather>>();
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly endpoint: string;

  constructor(private readonly options: WeatherOptions) {
    this.on = options.on !== false;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.endpoint = options.endpoint ?? MET_ENDPOINT;
  }

  /** Whether answering this square would ask MET Norway (for the rate limit): not while a fresh one is kept. */
  needsFetch(south: number, west: number): boolean {
    const kept = this.kept.get(keyOf(south, west));
    return !kept || kept.freshUntil <= this.now().getTime();
  }

  /** The forecast for the middle of the block's own square. */
  async forBlock(south: number, west: number): Promise<Weather> {
    if (!this.on) throw new WeatherError(503, 'The weather is switched off on this GymGO server.', 'weather_off');
    const key = keyOf(south, west);
    const kept = this.kept.get(key);
    if (kept && kept.freshUntil > this.now().getTime()) return kept.weather;
    // Two people in the same square at once: one request.
    const already = this.asking.get(key);
    if (already) return already;
    const asking = this.fetchFor(key, weatherPoint(south, west), kept).finally(() => this.asking.delete(key));
    this.asking.set(key, asking);
    return asking;
  }

  private async fetchFor(key: string, point: { lat: number; lng: number }, kept: Kept | undefined): Promise<Weather> {
    const at = this.now().getTime();
    const url = `${this.endpoint}?lat=${point.lat.toFixed(2)}&lon=${point.lng.toFixed(2)}`;
    const headers: Record<string, string> = { 'user-agent': this.options.userAgent, accept: 'application/json' };
    if (kept?.lastModified) headers['if-modified-since'] = kept.lastModified;
    let response: Response;
    try {
      response = await this.fetchImpl(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      return this.fallBack(kept, at, 'MET Norway couldn’t be reached');
    }
    if (response.status === 304 && kept) {
      kept.freshUntil = freshUntil(response.headers.get('expires'), at);
      kept.fetchedAt = at;
      this.remember(key, kept);
      return kept.weather;
    }
    if (response.status !== 200 && response.status !== 203) {
      return this.fallBack(kept, at, `MET Norway answered ${response.status}`);
    }
    // 203: the product is to be retired; it still answers, so say so where the owner will see it.
    if (response.status === 203) this.options.log?.('[weather] MET Norway says Locationforecast 2.0 is deprecated: see https://api.met.no');
    let weather: Weather | null = null;
    try {
      weather = fromMetForecast(await response.json(), point);
    } catch {
      weather = null;
    }
    if (!weather) return this.fallBack(kept, at, 'MET Norway’s answer wasn’t a forecast');
    this.remember(key, { weather, freshUntil: freshUntil(response.headers.get('expires'), at), fetchedAt: at, lastModified: response.headers.get('last-modified') });
    return weather;
  }

  private fallBack(kept: Kept | undefined, at: number, why: string): Weather {
    this.options.log?.(`[weather] ${why}${kept ? '; handing out the last forecast' : ''}`);
    if (kept && at - kept.fetchedAt <= STALE_FOR) return kept.weather;
    throw new WeatherError(503, 'The weather isn’t available just now.', 'weather_unavailable');
  }

  private remember(key: string, kept: Kept): void {
    this.kept.delete(key);
    this.kept.set(key, kept);
    // The least recently asked-for go first.
    while (this.kept.size > MOST_SQUARES) this.kept.delete(this.kept.keys().next().value!);
  }
}

const keyOf = (south: number, west: number) => `${south.toFixed(1)},${west.toFixed(1)}`;

function freshUntil(expires: string | null, at: number): number {
  const said = expires ? Date.parse(expires) : Number.NaN;
  const until = Number.isNaN(said) ? at + 30 * 60_000 : said;
  return Math.min(Math.max(until, at + KEEP_AT_LEAST), at + KEEP_AT_MOST);
}

/** MET Norway's User-Agent: the app, then where to reach whoever runs this server. */
export function weatherUserAgent(publicUrl: string | null | undefined, contactEmail: string | null | undefined): string {
  const site = publicUrl ? new URL(publicUrl).origin : 'https://gymgo.site';
  return `GymGO/1.0 ${site}${contactEmail ? ` ${contactEmail}` : ''}`;
}
