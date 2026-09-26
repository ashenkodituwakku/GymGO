/**
 * Where the search box can take you.
 *
 * Inner Melbourne is real: real gyms, each fact sourced. Seven more
 * Australian cities, Sydney among them, forty US cities and fifteen
 * European ones are real too, but map-only: gyms from OpenStreetMap, with no
 * prices and no guest hours until a gym publishes them.
 *
 * The invented demo gyms, kept so every edge case can still be tried, sit on
 * inner-Sydney streets too. So they only appear in demo mode, and demo mode
 * shows nothing real: the two never share a map or a search.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { haversineKm, priceLabel, reportCurrency, type LatLng } from '@gymgo/domain';
import { PILOT_CENTRE, PILOT_PLACES, PILOT_TIMEZONE } from '@gymgo/demo-data';
import { MELBOURNE, MELBOURNE_CENTRE, MELBOURNE_PLACES } from '@gymgo/melbourne-data';
import { AU_CITIES, AU_PLACES, type AuCityId } from '@gymgo/au-data';
import { US_CITIES, US_PLACES, type UsCityId } from '@gymgo/usa-data';
import { EU_CITIES, EU_PLACES, type EuCityId } from '@gymgo/eu-data';

export type CityId = 'melbourne' | 'sydney-demo' | AuCityId | UsCityId | EuCityId;

export interface City {
  id: CityId;
  name: string;
  /** "VIC", "NY"; in Europe, the country ("UK", "France"). */
  region: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  timezone: string;
  centre: LatLng;
  /** Beyond this from the centre, "near you" would list nothing useful. */
  reachKm: number;
  /** Other names people type: "NYC", "Philly". */
  aliases: string[];
  /** Every gym here is invented. */
  demo: boolean;
  /** Only positions and names from the map: no prices or guest hours yet. */
  mapOnly: boolean;
}

const AU = { country: 'AU' as const, aliases: [] as string[] };

export const CITIES: Record<CityId, City> = {
  melbourne: {
    ...AU,
    id: 'melbourne',
    name: 'Melbourne',
    region: 'VIC',
    timezone: MELBOURNE,
    centre: MELBOURNE_CENTRE,
    reachKm: 15,
    demo: false,
    mapOnly: false,
  },
  'sydney-demo': {
    ...AU,
    id: 'sydney-demo',
    name: 'Sydney demo',
    region: 'NSW',
    timezone: PILOT_TIMEZONE,
    centre: PILOT_CENTRE,
    reachKm: 15,
    demo: true,
    mapOnly: false,
  },
  ...(Object.fromEntries(
    AU_CITIES.map((city) => [
      city.id,
      {
        id: city.id,
        name: city.name,
        region: city.state,
        country: 'AU',
        timezone: city.timezone,
        centre: city.centre,
        reachKm: Math.max(15, city.radiusKm * 2.5),
        aliases: city.aliases,
        demo: false,
        mapOnly: true,
      } satisfies City,
    ]),
  ) as Record<Exclude<AuCityId, 'melbourne'>, City>),
  ...(Object.fromEntries(
    US_CITIES.map((city) => [
      city.id,
      {
        id: city.id,
        name: city.name,
        region: city.state,
        country: 'US',
        timezone: city.timezone,
        centre: city.centre,
        // Gyms were fetched within `radiusKm`; nearby suburbs still get them.
        reachKm: Math.max(15, city.radiusKm * 2.5),
        aliases: city.aliases,
        demo: false,
        mapOnly: true,
      } satisfies City,
    ]),
  ) as Record<UsCityId, City>),
  ...(Object.fromEntries(
    EU_CITIES.map((city) => [
      city.id,
      {
        id: city.id,
        name: city.name,
        region: city.countryName,
        country: city.country,
        timezone: city.timezone,
        centre: city.centre,
        reachKm: Math.max(15, city.radiusKm * 2.5),
        aliases: city.aliases,
        demo: false,
        mapOnly: true,
      } satisfies City,
    ]),
  ) as Record<EuCityId, City>),
};

/** Real cities first, Melbourne leading, then Australia's others; the demo last. */
export const CITY_LIST: City[] = [
  CITIES.melbourne,
  ...AU_CITIES.map((city) => CITIES[city.id]),
  ...US_CITIES.map((city) => CITIES[city.id]),
  ...EU_CITIES.map((city) => CITIES[city.id]),
  CITIES['sydney-demo'],
];

export interface AppPlace {
  name: string;
  /** Melbourne's and the demo's postcodes; empty for places from the map. */
  postcode: string;
  position: LatLng;
  city: CityId;
}

export const PLACES: AppPlace[] = [
  ...MELBOURNE_PLACES.map((place) => ({ ...place, city: 'melbourne' as const })),
  // Each other Australian city by name, then its suburbs.
  ...AU_CITIES.map((city) => ({ name: city.name, postcode: '', position: city.centre, city: city.id })),
  ...AU_PLACES.map((place) => ({ name: place.name, postcode: '', position: place.position, city: place.city })),
  // Each US city by name, then its neighborhoods.
  ...US_CITIES.map((city) => ({ name: city.name, postcode: '', position: city.centre, city: city.id })),
  ...US_PLACES.map((place) => ({ name: place.name, postcode: '', position: place.position, city: place.city })),
  // Each European city by name, then its districts (local names).
  ...EU_CITIES.map((city) => ({ name: city.name, postcode: '', position: city.centre, city: city.id })),
  ...EU_PLACES.map((place) => ({ name: place.name, postcode: '', position: place.position, city: place.city })),
  ...PILOT_PLACES.map((place) => ({ ...place, city: 'sydney-demo' as const })),
];

export const DEFAULT_PLACE: AppPlace = PLACES[0]!;

/** The place that stands for a whole city: its centre, under its name. */
export function cityPlace(city: City): AppPlace {
  if (city.id === 'melbourne') return DEFAULT_PLACE;
  if (city.id === 'sydney-demo') return PLACES.find((place) => place.city === 'sydney-demo')!;
  return PLACES.find((place) => place.city === city.id && place.name === city.name)!;
}

// --- Demo mode ----------------------------------------------------------------

let demoMode = false;

/**
 * Demo mode: only the invented demo city and its suburbs; otherwise only the
 * real ones. Set by the app from the Profile switch; everything below reads it.
 */
export function setDemoMode(on: boolean): void {
  demoMode = on;
}

export const isDemoMode = (): boolean => demoMode;

/** The cities you can search and browse right now. */
export const activeCities = (): City[] => CITY_LIST.filter((city) => city.demo === demoMode);

const activePlaces = (): AppPlace[] => PLACES.filter((place) => CITIES[place.city].demo === demoMode);

/** Where the app opens: Melbourne, or the demo's first suburb in demo mode. */
export const homePlace = (): AppPlace => (demoMode ? cityPlace(CITIES['sydney-demo']) : DEFAULT_PLACE);

// Accents don't count: "zurich" finds Zürich, "lavapies" Lavapiés.
const normalise = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.’']/g, '')
    .replace(/\s+/g, ' ');

/** "SoHo, New York" or "SoHo new york": a place name with its city after it. */
function withCity(needle: string): { name: string; city: City } | null {
  for (const city of activeCities()) {
    for (const cityName of [city.name, ...city.aliases]) {
      const tail = normalise(cityName);
      for (const joiner of [', ', ' ']) {
        if (needle.endsWith(joiner + tail)) return { name: needle.slice(0, -(joiner + tail).length).trim(), city };
      }
    }
  }
  return null;
}

/** Same name in two cities ("Midtown", "Chinatown"): the one in `prefer` wins. */
function preferring(matches: AppPlace[], prefer: CityId | undefined): AppPlace | undefined {
  return matches.find((place) => place.city === prefer) ?? matches[0];
}

export function geocodePlace(query: string | null, prefer?: CityId): { place: AppPlace | null; outOfArea: boolean } {
  if (!query || !query.trim()) return { place: null, outOfArea: false };
  const needle = normalise(query);

  const city = activeCities().find((item) => [item.name, ...item.aliases].some((name) => normalise(name) === needle));
  if (city) return { place: cityPlace(city), outOfArea: false };

  // A US state: its first built-in city ("Texas" is Houston).
  const inState = citiesInState(query)[0];
  if (inState && (needle.length === 2 || Object.values(US_STATES).some((name) => normalise(name) === needle))) {
    return { place: cityPlace(inState), outOfArea: false };
  }

  const scoped = withCity(needle);
  if (scoped) {
    const inCity = activePlaces().filter((place) => place.city === scoped.city.id);
    const hit = inCity.find((place) => normalise(place.name) === scoped.name) ?? inCity.find((place) => normalise(place.name).startsWith(scoped.name));
    if (hit) return { place: hit, outOfArea: false };
  }

  const exact = preferring(
    activePlaces().filter((place) => normalise(place.name) === needle || (place.postcode !== '' && place.postcode === needle)),
    prefer,
  );
  if (exact) return { place: exact, outOfArea: false };
  const partial = preferring(
    activePlaces().filter((place) => normalise(place.name).startsWith(needle)),
    prefer,
  );
  if (partial) return { place: partial, outOfArea: false };
  return { place: null, outOfArea: true };
}

/** US states and DC by postal code, so "Texas" or "TX" finds the cities GymGO has there. */
const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/**
 * The built-in US cities in a state typed by name or postal code ("Texas",
 * "tx"), in the order GymGO lists them. A few letters of a name are enough
 * ("calif"). Cities' own names come first elsewhere, so "New York" and
 * "Washington" stay the cities.
 */
export function citiesInState(query: string): City[] {
  const needle = normalise(query);
  if (needle.length < 2) return [];
  const codes = Object.keys(US_STATES).filter(
    (code) => code.toLowerCase() === needle || (needle.length >= 3 && normalise(US_STATES[code]!).startsWith(needle)),
  );
  return activeCities().filter((city) => city.country === 'US' && codes.includes(city.region));
}

export function suggestPlaces(query: string, limit = 6, prefer?: CityId): AppPlace[] {
  const needle = normalise(query);
  if (!needle) return [];
  const cities = [
    ...activeCities().filter((city) => [city.name, ...city.aliases].some((name) => normalise(name).startsWith(needle))),
    ...citiesInState(query),
  ].map(cityPlace);
  const places = activePlaces().filter(
    (place) => normalise(place.name).includes(needle) || (place.postcode !== '' && place.postcode.startsWith(needle)),
  )
    // Starts-with before contains; your current city first.
    .sort(
      (a, b) =>
        Number(!normalise(a.name).startsWith(needle)) - Number(!normalise(b.name).startsWith(needle)) ||
        Number(a.city !== prefer) - Number(b.city !== prefer),
    );
  const seen = new Set<AppPlace>();
  return [...cities, ...places].filter((place) => (seen.has(place) ? false : (seen.add(place), true))).slice(0, limit);
}

/** Where a place is, for a second line in suggestions: "New York", "VIC". */
export function placeContext(place: AppPlace): string {
  const city = CITIES[place.city];
  if (place.name === city.name) return city.country === 'US' ? `${city.region}, USA` : city.region;
  // In Europe the region is the country: "Shoreditch · London, UK".
  if (city.country === 'US' || city.mapOnly) return `${city.name}, ${city.region}`;
  return place.postcode ? `${city.region} ${place.postcode}` : city.region;
}

/** The nearest city GymGO covers, and how far away it is. */
export function nearestCity(point: LatLng, cities: City[] = activeCities()): { city: City; km: number } {
  let best = { city: cities[0]!, km: Infinity };
  for (const city of cities) {
    const km = haversineKm(point, city.centre);
    if (km < best.km) best = { city, km };
  }
  return best;
}

/** The city a point belongs to, if it is within reach of one. */
export function cityNear(point: LatLng): City | null {
  const { city, km } = nearestCity(point);
  return km <= city.reachKm ? city : null;
}

/** The city a search centre is in, or the nearest one. */
export const cityAt = (point: LatLng): City => cityNear(point) ?? nearestCity(point).city;

// --- Units and money ----------------------------------------------------------

export const KM_PER_MILE = 1.609344;

/**
 * Countries whose road signs are in miles: the US and the UK, and the
 * territories and islands that follow them (from country-coder's
 * roadSpeedUnit). Everywhere else is kilometres.
 */
const MILES = new Set([
  'US', 'GB', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM', 'IM', 'JE', 'GG', 'FK', 'SH', 'AI', 'KY', 'MS', 'TC', 'VG',
  'AG', 'BS', 'BZ', 'DM', 'GD', 'KN', 'LC', 'VC', 'FM', 'MH', 'PW',
]);

export const usesMiles = (country: string) => MILES.has(country);

/**
 * Where GymGO keeps visit prices (members' reports, budgets): A$, US$, €, £
 * and CHF, where a visit costs about the same number. Elsewhere prices are
 * simply unknown.
 */
export const tracksPrices = (country: string) => reportCurrency(country) !== null;

/** "350 m", "2.4 km"; in the US and UK, "0.2 mi", "1.5 mi". Straight-line distance. */
export function distanceLabel(km: number, country: string): string {
  // Joined by a non-breaking space: "0.1" never ends a line with "mi" on the next.
  if (usesMiles(country)) {
    const miles = km / KM_PER_MILE;
    return miles < 10 ? `${miles.toFixed(1)}\u00a0mi` : `${Math.round(miles).toLocaleString('en-US')}\u00a0mi`;
  }
  if (km < 1) return `${Math.round(km * 1000)}\u00a0m`;
  // Tenths only where they mean something: "2.4 km", but "38 km", "2,156 km".
  return km < 10 ? `${km.toFixed(1)}\u00a0km` : `${Math.round(km).toLocaleString('en-AU')}\u00a0km`;
}

/** Search radius choices, in the local unit, stored as kilometres. */
export function radiusChoices(country: string): Array<{ km: number; label: string }> {
  if (usesMiles(country)) return [1, 2, 3, 5, 10].map((miles) => ({ km: miles * KM_PER_MILE, label: `${miles} mi` }));
  return [2, 5, 10, 20].map((km) => ({ km, label: `${km} km` }));
}

/** "A$25" in Australia, "$25" in the US, "€25", "£25", "CHF 25" (only where prices are kept: see tracksPrices). */
export function moneyLabel(minor: number, country: string): string {
  const currency = reportCurrency(country);
  if (currency) return priceLabel(minor, currency);
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
