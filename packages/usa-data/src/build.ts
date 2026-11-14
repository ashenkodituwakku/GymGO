/**
 * Records for the US gyms, from the generated rows. What map-only means is
 * set out in packages/osm.
 */

import type { GymRecord } from '@gymgo/domain';
import { mapOnlyRecord } from '@gymgo/osm';
import { usCity } from './cities';
import { FETCHED } from './data';
import type { GymRow } from './rows';

export function usRecord(row: GymRow): GymRecord {
  const { city, zip, ...gym } = row;
  return mapOnlyRecord({ ...gym, postcode: zip }, { countryCode: 'US', timezone: usCity(city).timezone, fetchedAt: FETCHED[city] });
}
