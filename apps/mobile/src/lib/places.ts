/**
 * Where the search box can take you.
 *
 * Inner Melbourne is real: real gyms, each fact sourced. The Sydney suburbs
 * lead to the invented demo gyms, kept so every edge case can still be tried,
 * and always labelled as demo.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { haversineKm, type LatLng } from '@gymgo/domain';
import { PILOT_CENTRE, PILOT_PLACES, PILOT_TIMEZONE } from '@gymgo/demo-data';
import { MELBOURNE, MELBOURNE_CENTRE, MELBOURNE_PLACES } from '@gymgo/melbourne-data';

export type CityId = 'melbourne' | 'sydney';

export interface City {
  id: CityId;
  name: string;
  timezone: string;
  centre: LatLng;
  /** Every gym here is invented. */
  demo: boolean;
}

export const CITIES: Record<CityId, City> = {
  melbourne: { id: 'melbourne', name: 'Melbourne', timezone: MELBOURNE, centre: MELBOURNE_CENTRE, demo: false },
  sydney: { id: 'sydney', name: 'Sydney demo', timezone: PILOT_TIMEZONE, centre: PILOT_CENTRE, demo: true },
};

export interface AppPlace {
  name: string;
  postcode: string;
  position: LatLng;
  city: CityId;
}

export const PLACES: AppPlace[] = [
  ...MELBOURNE_PLACES.map((place) => ({ ...place, city: 'melbourne' as const })),
  ...PILOT_PLACES.map((place) => ({ ...place, city: 'sydney' as const })),
];

export const DEFAULT_PLACE: AppPlace = PLACES[0]!;

/** Beyond this from a city's centre, "near you" would list nothing useful. */
export const CITY_REACH_KM = 15;

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function geocodePlace(query: string | null): { place: AppPlace | null; outOfArea: boolean } {
  if (!query || !query.trim()) return { place: null, outOfArea: false };
  const needle = normalise(query);
  const exact = PLACES.find((place) => normalise(place.name) === needle || place.postcode === needle);
  if (exact) return { place: exact, outOfArea: false };
  const partial = PLACES.find((place) => normalise(place.name).startsWith(needle));
  if (partial) return { place: partial, outOfArea: false };
  return { place: null, outOfArea: true };
}

export function suggestPlaces(query: string, limit = 6): AppPlace[] {
  const needle = normalise(query);
  if (!needle) return [];
  return PLACES.filter((place) => normalise(place.name).includes(needle) || place.postcode.startsWith(needle)).slice(0, limit);
}

/** The city a point belongs to, if it is within reach of one. */
export function cityNear(point: LatLng): City | null {
  for (const city of Object.values(CITIES)) {
    if (haversineKm(point, city.centre) <= CITY_REACH_KM) return city;
  }
  return null;
}
