/**
 * Builders for real records.
 *
 * Unlike the demo builders, nothing here has a default that claims anything.
 * Every fact needs an explicit source: a URL we read and when we read it. A
 * field with no source stays `unknown`, and the product shows it that way.
 */

import type {
  AccessAudience,
  AccessSchedule,
  EntryPrerequisites,
  EquipmentObservation,
  EvidenceSource,
  GymLocation,
  GymRecord,
  OpeningWindow,
  Provenance,
  VisitOffer,
} from '@gymgo/domain';

export const MELBOURNE = 'Australia/Melbourne';

/** When each source was read, from the fetch logs. */
export const CHECKED = {
  /** Overpass API; the data's own timestamp was 2026-09-23T08:13:51Z. */
  openStreetMap: '2026-09-23T08:15:00.000Z',
  /** Operator websites, read between 08:16 and 08:18 UTC. */
  websites: '2026-09-23T08:17:00.000Z',
} as const;

export interface Cite {
  /** Where the fact was read: a page URL, or an OpenStreetMap element URL. */
  url: string;
  /** What the reader is told, e.g. "Gym's website: membership page". */
  label: string;
  kind: 'website' | 'osm';
}

export const website = (url: string, label = "Gym's website"): Cite => ({ url, label, kind: 'website' });
export const osm = (element: string): Cite => ({
  url: `https://www.openstreetmap.org/${element}`,
  label: 'OpenStreetMap',
  kind: 'osm',
});

function evidence(cite: Cite, index: number): EvidenceSource {
  const at = cite.kind === 'osm' ? CHECKED.openStreetMap : CHECKED.websites;
  return {
    id: `ev-${cite.kind}-${index}-${cite.url.replace(/[^a-z0-9]+/gi, '-').slice(-40)}`,
    sourceType: cite.kind === 'osm' ? 'licensed_dataset' : 'operator_website',
    evidenceRef: cite.url,
    label: cite.label,
    observedAt: at,
    checkedAt: at,
    reviewerId: null,
  };
}

/**
 * Provenance for a fact.
 *
 * A gym publishing it on its own site is the gym saying so, which the product
 * labels "from the gym". OpenStreetMap is volunteer-mapped, so it is labelled
 * as community-reported rather than checked.
 */
export function cited(...cites: Cite[]): Provenance {
  const onlyOsm = cites.every((cite) => cite.kind === 'osm');
  return {
    status: onlyOsm ? 'community_reported' : 'owner_confirmed',
    sources: cites.map(evidence),
    conflictNote: null,
  };
}

export const notEstablished = (): Provenance => ({ status: 'unknown', sources: [], conflictNote: null });

export const hm = (h: number, m = 0) => h * 60 + m;
export const MON_THU = [1, 2, 3, 4];
export const MON_FRI = [1, 2, 3, 4, 5];
export const WEEKEND = [6, 0];
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export function on(days: number[], open: number, close: number): OpeningWindow[] {
  return days.map((day) => ({ day, openMinute: open, closeMinute: close }));
}

export function schedule(
  gymId: string,
  audience: AccessAudience,
  spec: { windows?: OpeningWindow[]; alwaysOpen?: boolean; source: Cite | Cite[] },
): AccessSchedule {
  const sources = Array.isArray(spec.source) ? spec.source : [spec.source];
  return {
    id: `${gymId}-${audience}`,
    gymId,
    audience,
    timezone: MELBOURNE,
    windows: spec.windows ?? [],
    exceptions: [],
    alwaysOpen: spec.alwaysOpen ?? false,
    provenance: cited(...sources),
  };
}

export function equipment(gymId: string, ids: string[], source: Cite): EquipmentObservation[] {
  return ids.map((equipmentTypeId) => ({
    id: `${gymId}-${equipmentTypeId}`,
    gymId,
    equipmentTypeId,
    presence: 'yes',
    count: null,
    maxWeightKg: null,
    brand: null,
    model: null,
    condition: 'unknown',
    conditionObservedAt: null,
    provenance: cited(source),
  }));
}

type OfferFields = Pick<VisitOffer, 'productType' | 'label' | 'baseAmountMinor'> &
  Partial<Omit<VisitOffer, 'id' | 'gymId' | 'provenance'>>;

export function offer(gymId: string, localId: string, fields: OfferFields, source: Cite): VisitOffer {
  return {
    currency: 'AUD',
    // Australian consumer prices must be advertised GST-inclusive.
    taxIncluded: true,
    taxAmountMinor: null,
    mandatoryCharges: [],
    refundableDeposits: [],
    grantsGymFloorAccess: 'yes',
    inclusions: ['Gym floor'],
    durationMinutes: null,
    validityDays: 1,
    eligibility: {
      localResidentOnly: 'unknown',
      memberGuestOnly: 'unknown',
      firstTimeVisitorOnly: 'unknown',
      membershipRequired: 'no',
      photoIdRequired: 'unknown',
      minAgeYears: null,
      notes: [],
    },
    purchaseMethod: 'unknown',
    availableFrom: null,
    availableUntil: null,
    membershipTerms: null,
    ...fields,
    id: `${gymId}-${localId}`,
    gymId,
    provenance: cited(source),
  };
}

export function prerequisites(
  gymId: string,
  spec: Partial<Omit<EntryPrerequisites, 'gymId' | 'provenance'>> & { source?: Cite } = {},
): EntryPrerequisites {
  const { source, ...fields } = spec;
  return {
    advanceBookingRequired: 'unknown',
    bookingLeadTimeHours: null,
    inductionRequired: 'unknown',
    inductionAvailableDuringStaffedHoursOnly: 'unknown',
    photoIdRequired: 'unknown',
    minAgeYears: null,
    residencyRule: 'unknown',
    memberAccompanimentRequired: 'unknown',
    notes: [],
    ...fields,
    gymId,
    provenance: source ? cited(source) : notEstablished(),
  };
}

export interface PlaceSpec {
  id: string;
  name: string;
  branch?: string;
  brand?: string;
  line1: string;
  suburb: string;
  postcode: string;
  lat: number;
  lng: number;
  /** The OpenStreetMap element the position came from, e.g. "node/2296860514". */
  osmElement: string;
  trainingTypes: GymLocation['trainingTypes'];
  phone?: string;
  website?: string;
  /**
   * `open` only when the operator's own site lists this branch today. A map
   * feature alone can outlive a closed gym, so those stay `unknown`.
   */
  listedByOperator?: Cite;
}

export function location(spec: PlaceSpec): GymLocation {
  const sources = [osm(spec.osmElement), ...(spec.listedByOperator ? [spec.listedByOperator] : [])];
  return {
    id: spec.id,
    slug: spec.id,
    name: spec.name,
    branch: spec.branch ?? null,
    brand: spec.brand ?? null,
    address: {
      line1: spec.line1,
      line2: null,
      suburb: spec.suburb,
      state: 'VIC',
      postcode: spec.postcode,
      countryCode: 'AU',
    },
    position: { lat: spec.lat, lng: spec.lng },
    timezone: MELBOURNE,
    trainingTypes: spec.trainingTypes,
    operatingStatus: spec.listedByOperator ? 'open' : 'unknown',
    operatingStatusNote: spec.listedByOperator
      ? null
      : 'On the map, but we have not confirmed with the operator that this branch is trading.',
    phone: spec.phone ?? null,
    website: spec.website ?? null,
    // We hold no photographs we have permission to show.
    photos: [],
    isDemoData: false,
    externalRefs: { openStreetMap: spec.osmElement },
    provenance: cited(...sources),
  };
}

export function record(
  loc: GymLocation,
  parts: Partial<Omit<GymRecord, 'location'>> = {},
): GymRecord {
  return {
    location: loc,
    equipment: parts.equipment ?? [],
    amenities: parts.amenities ?? [],
    offers: parts.offers ?? [],
    schedules: parts.schedules ?? [],
    prerequisites: parts.prerequisites ?? prerequisites(loc.id),
  };
}
