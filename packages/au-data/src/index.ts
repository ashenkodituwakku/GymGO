import { auRecord } from './build';
import { FETCHED, GYM_ROWS, PLACE_ROWS } from './data';
import type { AuCityId } from './rows';

export { AU_CITIES, auCity, type AuCity } from './cities';
export type { AuCityId } from './rows';

export const AU_GYMS = GYM_ROWS.map(auRecord);

export interface AuPlace {
  name: string;
  city: AuCityId;
  position: { lat: number; lng: number };
}

/** Suburbs the search box understands, from OpenStreetMap place nodes. */
export const AU_PLACES: AuPlace[] = PLACE_ROWS.map((row) => ({
  name: row.name,
  city: row.city,
  position: { lat: row.lat, lng: row.lng },
}));

export const AU_FETCHED = FETCHED;

/** Required wherever these records are shown: the locations are ODbL data. */
export const AU_ATTRIBUTION = 'Australian gym locations outside Melbourne © OpenStreetMap contributors (ODbL)';
