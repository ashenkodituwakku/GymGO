/**
 * Records for the gyms in GymGO's map-only European cities, from the
 * generated rows. What map-only means is set out in packages/osm.
 */

import type { GymRecord } from '@gymgo/domain';
import { mapOnlyRecord } from '@gymgo/osm';
import { euCity } from './cities';
import { FETCHED } from './data';
import type { GymRow } from './rows';

export function euRecord(row: GymRow): GymRecord {
  const { city, suburb, ...gym } = row;
  const where = euCity(city);
  return mapOnlyRecord({ ...gym, locality: suburb }, { countryCode: where.country, timezone: where.timezone, fetchedAt: FETCHED[city] });
}
