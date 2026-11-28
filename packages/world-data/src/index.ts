import { worldRecord } from './build';
import { WORLD_CITIES } from './cities';
import { FETCHED, GYM_ROWS, PLACE_ROWS } from './data';
import type { WorldCityId } from './rows';

export { WORLD_CITIES, worldCity, type WorldCity } from './cities';
export type { WorldCityId } from './rows';

/** The cities whose gyms have been fetched: only these reach the app. */
export const WORLD_CITIES_BUILT = WORLD_CITIES.filter((city) => FETCHED[city.id] !== undefined);

export const WORLD_GYMS = GYM_ROWS.map(worldRecord);

export interface WorldPlace {
  name: string;
  city: WorldCityId;
  position: { lat: number; lng: number };
}

/** Districts the search box understands, from OpenStreetMap place nodes. */
export const WORLD_PLACES: WorldPlace[] = PLACE_ROWS.map((row) => ({
  name: row.name,
  city: row.city,
  position: { lat: row.lat, lng: row.lng },
}));

export const WORLD_FETCHED = FETCHED;

/** Required wherever these records are shown: the locations are ODbL data. */
export const WORLD_ATTRIBUTION = 'Gym locations in cities around the world © OpenStreetMap contributors (ODbL)';
