import { usRecord } from './build';
import { GYM_ROWS, PLACE_ROWS, FETCHED } from './data';
import type { UsCityId } from './rows';

export { US_CITIES, usCity, type UsCity } from './cities';
export type { UsCityId } from './rows';

export const US_GYMS = GYM_ROWS.map(usRecord);

export interface UsPlace {
  name: string;
  city: UsCityId;
  position: { lat: number; lng: number };
}

/** Neighborhoods the search box understands, from OpenStreetMap place nodes. */
export const US_PLACES: UsPlace[] = PLACE_ROWS.map((row) => ({
  name: row.name,
  city: row.city,
  position: { lat: row.lat, lng: row.lng },
}));

export const US_FETCHED = FETCHED;

/** Required wherever these records are shown: the locations are ODbL data. */
export const US_ATTRIBUTION = 'US gym locations © OpenStreetMap contributors (ODbL)';
