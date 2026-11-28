/**
 * The weather on Home and the map: what the GymGO server hands the app,
 * read from MET Norway's forecast (api.met.no, Locationforecast 2.0, free
 * for any use with credit: "Weather data from MET Norway", CC BY 4.0), and
 * what its symbols mean.
 *
 * Asked for by map square, never by position: the app sends the block of
 * map squares around you that it already asks gyms for (about 30 km
 * across, the same for everyone in it), and the forecast is for the middle
 * of your own square. So it's the weather of your area, said as such.
 *
 * Every value is MET Norway's forecast for that hour, with the time the
 * forecast was made; none of it is a measurement, and nothing is filled in
 * where MET Norway gave nothing.
 */

/** What the weather is doing, as the app draws and says it. */
export type WeatherKind = 'clear' | 'fair' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'heavyRain' | 'sleet' | 'snow' | 'thunder';

export interface WeatherHour {
  /** The start of the hour, ISO. */
  at: string;
  /** Air temperature, °C, as MET Norway forecasts it. */
  tempC: number;
  /** MET Norway's symbol for the hour ("partlycloudy_day"), or null where it gave none. */
  symbol: string | null;
}

export interface Weather {
  /** Where the forecast is for: the middle of your map square, to two decimals. */
  area: { lat: number; lng: number };
  /** When MET Norway made this forecast, ISO. */
  updatedAt: string;
  /** The hour now, then the next hours (up to 12). */
  hours: WeatherHour[];
  /** Who it's from, to say beside it. */
  source: { name: 'MET Norway'; url: 'https://api.met.no'; licence: 'CC BY 4.0' };
}

export const WEATHER_SOURCE: Weather['source'] = { name: 'MET Norway', url: 'https://api.met.no', licence: 'CC BY 4.0' };
export const WEATHER_CREDIT = 'Weather data from MET Norway';
/** How many hours the server keeps and the app may show. */
export const WEATHER_HOURS = 12;

const KINDS: Array<[RegExp, WeatherKind]> = [
  [/thunder/, 'thunder'],
  [/sleet/, 'sleet'],
  [/snow/, 'snow'],
  [/^heavyrain/, 'heavyRain'],
  [/^lightrain/, 'drizzle'],
  [/rain/, 'rain'],
  [/^fog/, 'fog'],
  [/^cloudy/, 'cloudy'],
  [/^partlycloudy/, 'partly'],
  [/^fair/, 'fair'],
  [/^clearsky/, 'clear'],
];

/** What a MET Norway symbol means ("lightrainshowers_day" → drizzle), and whether it's for the night; null for one it doesn't know. */
export function weatherKind(symbol: string | null | undefined): { kind: WeatherKind; night: boolean } | null {
  if (!symbol) return null;
  const code = symbol.toLowerCase();
  const found = KINDS.find(([pattern]) => pattern.test(code));
  if (!found) return null;
  return { kind: found[1], night: code.endsWith('_night') || code.endsWith('_polartwilight') };
}

const WORDS: Record<WeatherKind, string> = {
  clear: 'Clear',
  fair: 'Mostly clear',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Light rain',
  rain: 'Rain',
  heavyRain: 'Heavy rain',
  sleet: 'Sleet',
  snow: 'Snow',
  thunder: 'Thunderstorms',
};

/** The words for a symbol ("Partly cloudy"), "Sunny" for a clear day; null for none it knows. */
export function weatherWords(symbol: string | null | undefined): string | null {
  const read = weatherKind(symbol);
  if (!read) return null;
  if (read.kind === 'clear' && !read.night) return 'Sunny';
  return WORDS[read.kind];
}

export type TempUnit = 'C' | 'F';

/** °F in the United States (and its territories GymGO knows), °C everywhere else. */
export function tempUnitFor(countryCode: string | null | undefined): TempUnit {
  return ['US', 'PR', 'GU', 'VI', 'AS', 'MP', 'LR', 'FM', 'MH', 'PW', 'BS', 'BZ', 'KY'].includes((countryCode ?? '').toUpperCase()) ? 'F' : 'C';
}

/** A temperature as the app shows it: "18°", rounded, in °C or °F (-0 shown as 0). */
export function tempLabel(celsius: number, unit: TempUnit): string {
  const value = Math.round(unit === 'F' ? (celsius * 9) / 5 + 32 : celsius);
  return `${value === 0 ? 0 : value}°`;
}

/** The middle of the map square at the south-west corner of a block of three by three (the gym lookup's block): where the forecast is for. */
export function weatherPoint(south: number, west: number): { lat: number; lng: number } {
  return { lat: Math.round((south + 0.15) * 100) / 100, lng: Math.round((west + 0.15) * 100) / 100 };
}

/** The hours from now on: the one under way first, past ones dropped; empty when the forecast is all in the past. */
export function hoursFrom(weather: Pick<Weather, 'hours'>, now: Date): WeatherHour[] {
  const hourAgo = now.getTime() - 60 * 60_000;
  return weather.hours.filter((hour) => Date.parse(hour.at) > hourAgo);
}

/**
 * MET Norway's Locationforecast 2.0 "compact" answer, read: the next
 * hours that have a temperature, each with the next hour's symbol (or the
 * next six hours', where MET Norway only gives that). Null when it isn't
 * one, or has no hours.
 */
export function fromMetForecast(json: unknown, area: { lat: number; lng: number }): Weather | null {
  if (!json || typeof json !== 'object') return null;
  const properties = (json as { properties?: unknown }).properties;
  if (!properties || typeof properties !== 'object') return null;
  const meta = (properties as { meta?: { updated_at?: unknown } }).meta;
  const series = (properties as { timeseries?: unknown }).timeseries;
  if (!Array.isArray(series) || typeof meta?.updated_at !== 'string' || Number.isNaN(Date.parse(meta.updated_at))) return null;
  const hours: WeatherHour[] = [];
  for (const entry of series) {
    if (hours.length >= WEATHER_HOURS + 1) break;
    const at = (entry as { time?: unknown })?.time;
    const data = (entry as { data?: Record<string, unknown> })?.data;
    const temp = (data?.instant as { details?: { air_temperature?: unknown } } | undefined)?.details?.air_temperature;
    if (typeof at !== 'string' || Number.isNaN(Date.parse(at)) || typeof temp !== 'number' || !Number.isFinite(temp)) continue;
    const next = (data?.next_1_hours ?? data?.next_6_hours) as { summary?: { symbol_code?: unknown } } | undefined;
    const symbol = typeof next?.summary?.symbol_code === 'string' ? next.summary.symbol_code : null;
    hours.push({ at: new Date(at).toISOString(), tempC: Math.round(temp * 10) / 10, symbol });
  }
  if (hours.length === 0) return null;
  return { area, updatedAt: new Date(meta.updated_at).toISOString(), hours, source: WEATHER_SOURCE };
}
