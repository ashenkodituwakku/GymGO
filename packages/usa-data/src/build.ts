/**
 * Records for the US gyms, from the generated rows.
 *
 * These are map-only: a name, a position, and whatever else the map holds
 * (address, phone, website, opening hours). All of it is volunteer-mapped,
 * so every fact is labelled community-reported, and a gym is never called
 * open for business on the map's word alone. There are no prices, no
 * equipment and no guest hours, because the map doesn't have them; the
 * product shows those as unknown and says to call.
 */

import type { AccessSchedule, AmenityObservation, EvidenceSource, GymRecord, OpeningWindow, Provenance } from '@gymgo/domain';
import { usCity } from './cities';
import { FETCHED } from './data';
import type { GymRow } from './rows';

function evidence(row: GymRow): EvidenceSource {
  const url = `https://www.openstreetmap.org/${row.osm}`;
  return {
    id: `ev-osm-${row.osm.replace('/', '-')}`,
    sourceType: 'licensed_dataset',
    evidenceRef: url,
    label: 'OpenStreetMap',
    observedAt: FETCHED[row.city],
    checkedAt: FETCHED[row.city],
    reviewerId: null,
  };
}

const fromMap = (row: GymRow): Provenance => ({
  status: 'community_reported',
  sources: [evidence(row)],
  conflictNote: null,
});

const unknown = (): Provenance => ({ status: 'unknown', sources: [], conflictNote: null });

/** Mapped opening hours are when the doors are open, so they're member hours. */
function memberHours(row: GymRow, timezone: string): AccessSchedule[] {
  const hours = row.hours;
  if (!hours) return [];
  const always = hours === 'always';
  const windows: OpeningWindow[] =
    hours === 'always'
      ? [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, openMinute: 0, closeMinute: 1440 }))
      : hours.map(([day, openMinute, closeMinute]) => ({ day, openMinute, closeMinute }));
  return [
    {
      id: `${row.id}-member`,
      gymId: row.id,
      audience: 'member',
      timezone,
      windows,
      exceptions: [],
      alwaysOpen: always,
      provenance: fromMap(row),
    },
  ];
}

/** Pool, sauna, showers, step-free entrance: only where the map says yes or no. */
function mappedAmenities(row: GymRow): AmenityObservation[] {
  return Object.entries(row.amenities ?? {}).map(([amenityId, present]) => ({
    id: `${row.id}-${amenityId}`,
    gymId: row.id,
    amenityId: amenityId as AmenityObservation['amenityId'],
    present,
    note: null,
    provenance: fromMap(row),
  }));
}

export function usRecord(row: GymRow): GymRecord {
  const city = usCity(row.city);
  return {
    location: {
      id: row.id,
      slug: row.id,
      name: row.name,
      branch: row.branch ?? null,
      brand: row.brand ?? null,
      address: {
        line1: row.line1,
        line2: null,
        suburb: row.locality,
        state: row.state,
        postcode: row.zip,
        countryCode: 'US',
      },
      position: { lat: row.lat, lng: row.lng },
      timezone: city.timezone,
      trainingTypes: [row.type],
      operatingStatus: 'unknown',
      operatingStatusNote: 'On the map, but we have not confirmed with the operator that this branch is trading.',
      phone: row.phone ?? null,
      website: row.website ?? null,
      email: row.email ?? null,
      activities: row.activities ?? [],
      // We hold no photographs we have permission to show.
      photos: [],
      isDemoData: false,
      externalRefs: { openStreetMap: row.osm, ...(row.brandWikidata ? { wikidataBrand: row.brandWikidata } : {}) },
      provenance: fromMap(row),
    },
    equipment: [],
    amenities: mappedAmenities(row),
    offers: [],
    schedules: memberHours(row, city.timezone),
    prerequisites: {
      gymId: row.id,
      advanceBookingRequired: 'unknown',
      bookingLeadTimeHours: null,
      inductionRequired: 'unknown',
      inductionAvailableDuringStaffedHoursOnly: 'unknown',
      photoIdRequired: 'unknown',
      minAgeYears: null,
      residencyRule: 'unknown',
      memberAccompanimentRequired: 'unknown',
      notes: [],
      provenance: unknown(),
    },
  };
}
