import { euRecord } from './build';
import { FETCHED, GYM_ROWS, PLACE_ROWS } from './data';
import type { EuCityId } from './rows';

export { EU_CITIES, euCity, type EuCity } from './cities';
export type { EuCityId } from './rows';

export const EU_GYMS = GYM_ROWS.map(euRecord);

export interface EuPlace {
  name: string;
  city: EuCityId;
  position: { lat: number; lng: number };
}

/** Districts the search box understands, from OpenStreetMap place nodes. */
export const EU_PLACES: EuPlace[] = PLACE_ROWS.map((row) => ({
  name: row.name,
  city: row.city,
  position: { lat: row.lat, lng: row.lng },
}));

export const EU_FETCHED = FETCHED;

/** Required wherever these records are shown: the locations are ODbL data. */
export const EU_ATTRIBUTION = 'European gym locations © OpenStreetMap contributors (ODbL)';
