/**
 * Records for the gyms in GymGO's map-only Australian cities, from the
 * generated rows. What map-only means is set out in packages/osm.
 */

import type { GymRecord } from '@gymgo/domain';
import { mapOnlyRecord } from '@gymgo/osm';
import { auCity } from './cities';
import { FETCHED } from './data';
import type { GymRow } from './rows';

export function auRecord(row: GymRow): GymRecord {
  const { city, suburb, ...gym } = row;
  return mapOnlyRecord({ ...gym, locality: suburb }, { countryCode: 'AU', timezone: auCity(city).timezone, fetchedAt: FETCHED[city] });
}
