/**
 * A mapped gym → a map-only GymGO record.
 *
 * Map-only means: a name, a position, and whatever else the map holds
 * (address, phone, website, opening hours). All of it is volunteer-mapped,
 * so every fact is labelled community-reported, and a gym is never called
 * open for business on the map's word alone. There are no prices, no
 * equipment and no guest hours, because the map doesn't have them; the
 * product shows those as unknown and says to call.
 */

import type { AccessSchedule, AmenityObservation, EvidenceSource, GymRecord, OpeningWindow, Provenance, TrainingType } from '@gymgo/domain';
import type { MappedAmenities, MappedHours } from './rules';

export interface MapOnlyGym {
  id: string;
  /** The OpenStreetMap element, e.g. "node/1383939144". */
  osm: string;
  name: string;
  brand?: string;
  /** The brand's Wikidata item. */
  brandWikidata?: string;
  branch?: string;
  /** Street address; empty when the map doesn't have one. */
  line1: string;
  /** Suburb, or a US city or neighbourhood. */
  locality: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
  type: TrainingType;
  phone?: string;
  website?: string;
  email?: string;
  activities?: string[];
  amenities?: MappedAmenities;
  hours?: MappedHours;
}

export interface Whereabouts {
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  timezone: string;
  /** When the map was read. */
  fetchedAt: string;
}

export function mapOnlyRecord(gym: MapOnlyGym, where: Whereabouts): GymRecord {
  const evidence: EvidenceSource = {
    id: `ev-osm-${gym.osm.replace('/', '-')}`,
    sourceType: 'licensed_dataset',
    evidenceRef: `https://www.openstreetmap.org/${gym.osm}`,
    label: 'OpenStreetMap',
    observedAt: where.fetchedAt,
    checkedAt: where.fetchedAt,
    reviewerId: null,
  };
  const fromMap = (): Provenance => ({ status: 'community_reported', sources: [evidence], conflictNote: null });

  // Mapped opening hours are when the doors are open, so they're member hours.
  const schedules: AccessSchedule[] = [];
  if (gym.hours) {
    const always = gym.hours === 'always';
    const windows: OpeningWindow[] =
      gym.hours === 'always'
        ? [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, openMinute: 0, closeMinute: 1440 }))
        : gym.hours.map(([day, openMinute, closeMinute]) => ({ day, openMinute, closeMinute }));
    schedules.push({
      id: `${gym.id}-member`,
      gymId: gym.id,
      audience: 'member',
      timezone: where.timezone,
      windows,
      exceptions: [],
      alwaysOpen: always,
      provenance: fromMap(),
    });
  }

  // Pool, sauna, showers, step-free entrance: only where the map says yes or no.
  const amenities: AmenityObservation[] = Object.entries(gym.amenities ?? {}).map(([amenityId, present]) => ({
    id: `${gym.id}-${amenityId}`,
    gymId: gym.id,
    amenityId: amenityId as AmenityObservation['amenityId'],
    present,
    note: null,
    provenance: fromMap(),
  }));

  return {
    location: {
      id: gym.id,
      slug: gym.id,
      name: gym.name,
      branch: gym.branch ?? null,
      brand: gym.brand ?? null,
      address: {
        line1: gym.line1,
        line2: null,
        suburb: gym.locality,
        state: gym.state,
        postcode: gym.postcode,
        countryCode: where.countryCode,
      },
      position: { lat: gym.lat, lng: gym.lng },
      timezone: where.timezone,
      trainingTypes: [gym.type],
      operatingStatus: 'unknown',
      operatingStatusNote: 'On the map, but we have not confirmed with the operator that this branch is trading.',
      phone: gym.phone ?? null,
      website: gym.website ?? null,
      email: gym.email ?? null,
      activities: gym.activities ?? [],
      // We hold no photographs we have permission to show.
      photos: [],
      isDemoData: false,
      externalRefs: { openStreetMap: gym.osm, ...(gym.brandWikidata ? { wikidataBrand: gym.brandWikidata } : {}) },
      provenance: fromMap(),
    },
    equipment: [],
    amenities,
    offers: [],
    schedules,
    prerequisites: {
      gymId: gym.id,
      advanceBookingRequired: 'unknown',
      bookingLeadTimeHours: null,
      inductionRequired: 'unknown',
      inductionAvailableDuringStaffedHoursOnly: 'unknown',
      photoIdRequired: 'unknown',
      minAgeYears: null,
      residencyRule: 'unknown',
      memberAccompanimentRequired: 'unknown',
      notes: [],
      provenance: { status: 'unknown', sources: [], conflictNote: null },
    },
  };
}
