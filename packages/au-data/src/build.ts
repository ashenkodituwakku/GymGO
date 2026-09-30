/**
 * Records for the gyms in GymGO's map-only Australian cities, from the
 * generated rows. What map-only means is set out in packages/osm.
 */

import type { EvidenceSource, GymRecord } from '@gymgo/domain';
import { mapOnlyRecord } from '@gymgo/osm';
import { auCity } from './cities';
import { FETCHED } from './data';
import type { GymRow } from './rows';
import { FOUND_WEBSITES, WEBSITES_CHECKED } from './websites';
import { chainOffersFor } from './chainOffers';

export function auRecord(row: GymRow): GymRecord {
  const { city, suburb, ...gym } = row;
  const mapped = mapOnlyRecord({ ...gym, locality: suburb }, { countryCode: 'AU', timezone: auCity(city).timezone, fetchedAt: FETCHED[city] });
  // A chain that publishes one price table for all its clubs: its tiers here too.
  const record = { ...mapped, offers: [...mapped.offers, ...chainOffersFor(row.id, row)] };
  const found = row.website ? undefined : FOUND_WEBSITES[row.id];
  if (!found) return record;
  // A website GymGO found for a gym the map lists without one, cited as that.
  const evidence: EvidenceSource = {
    id: `ev-found-${row.id}`,
    sourceType: 'independent_check',
    evidenceRef: found,
    label: 'Website found by GymGO: its likely web address or a web search, checked by hand against the gym’s name and suburb',
    observedAt: WEBSITES_CHECKED,
    checkedAt: WEBSITES_CHECKED,
    reviewerId: null,
  };
  const { location } = record;
  return { ...record, location: { ...location, website: found, provenance: { ...location.provenance, sources: [...location.provenance.sources, evidence] } } };
}
