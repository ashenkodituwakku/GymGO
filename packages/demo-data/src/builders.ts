/**
 * Builders for the demo dataset.
 *
 * Everything defaults to `unknown`, so a fixture only claims what it states.
 * That keeps the demo data honest by construction: a gym that has not been
 * given a visitor schedule genuinely has an unknown one, and the product shows
 * it that way.
 */

import type {
  AccessAudience,
  AccessSchedule,
  AmenityId,
  AmenityObservation,
  EntryPrerequisites,
  EquipmentObservation,
  EvidenceSource,
  FactStatus,
  GymLocation,
  GymRecord,
  OpeningWindow,
  Provenance,
  SourceType,
  VisitOffer,
} from '@gymgo/domain';

export const SYDNEY = 'Australia/Sydney';

/**
 * The demo dataset's reference "now".
 *
 * Fixture check dates are expressed as offsets from this, so the freshness
 * labels stay meaningful no matter when the demo is run. Real records would
 * carry absolute dates.
 */
export const DEMO_EPOCH = new Date('2026-09-22T00:00:00.000Z');

export function daysBeforeEpoch(days: number): string {
  return new Date(DEMO_EPOCH.getTime() - days * 86_400_000).toISOString();
}

interface EvidenceSpec {
  /** How many days before the demo epoch this was last checked. */
  ageDays: number;
  sourceType?: SourceType;
  label?: string;
  ref?: string | null;
  reviewer?: string | null;
}

export function source(spec: EvidenceSpec, index = 0): EvidenceSource {
  const sourceType = spec.sourceType ?? 'independent_check';
  return {
    id: `ev-${sourceType}-${spec.ageDays}-${index}`,
    sourceType,
    evidenceRef: spec.ref ?? null,
    label: spec.label ?? defaultLabel(sourceType),
    observedAt: daysBeforeEpoch(spec.ageDays),
    checkedAt: daysBeforeEpoch(spec.ageDays),
    reviewerId: spec.reviewer ?? null,
  };
}

function defaultLabel(sourceType: SourceType): string {
  switch (sourceType) {
    case 'owner_submission':
      return 'Submitted by the gym';
    case 'operator_website':
      return "Operator's own website";
    case 'independent_check':
      return 'Checked in person by our team';
    case 'community_report':
      return 'Reported by a user';
    case 'licensed_dataset':
      return 'Licensed dataset';
  }
}

const STATUS_FOR_SOURCE: Record<SourceType, FactStatus> = {
  owner_submission: 'owner_confirmed',
  operator_website: 'owner_confirmed',
  independent_check: 'independently_checked',
  community_report: 'community_reported',
  licensed_dataset: 'independently_checked',
};

/** Provenance from one source. */
export function from(spec: EvidenceSpec): Provenance {
  const sourceType = spec.sourceType ?? 'independent_check';
  return {
    status: STATUS_FOR_SOURCE[sourceType],
    sources: [source(spec)],
    conflictNote: null,
  };
}

/** Provenance from two sources that disagree. Neither is silently preferred. */
export function conflicting(note: string, specs: [EvidenceSpec, EvidenceSpec]): Provenance {
  return {
    status: 'conflicting',
    sources: [source(specs[0], 0), source(specs[1], 1)],
    conflictNote: note,
  };
}

export function unknownFact(): Provenance {
  return { status: 'unknown', sources: [], conflictNote: null };
}

export function windowsOn(days: number[], openMinute: number, closeMinute: number): OpeningWindow[] {
  return days.map((day) => ({ day, openMinute, closeMinute }));
}

export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKEND = [0, 6];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const hours = (h: number, m = 0) => h * 60 + m;

interface ScheduleSpec {
  audience: AccessAudience;
  windows?: OpeningWindow[];
  alwaysOpen?: boolean;
  exceptions?: AccessSchedule['exceptions'];
  provenance?: Provenance;
}

export function makeSchedule(gymId: string, spec: ScheduleSpec): AccessSchedule {
  return {
    id: `${gymId}-${spec.audience}`,
    gymId,
    audience: spec.audience,
    timezone: SYDNEY,
    windows: spec.windows ?? [],
    exceptions: spec.exceptions ?? [],
    alwaysOpen: spec.alwaysOpen ?? false,
    provenance: spec.provenance ?? unknownFact(),
  };
}

interface EquipmentSpec {
  presence?: EquipmentObservation['presence'];
  count?: number | null;
  maxWeightKg?: number | null;
  brand?: string | null;
  model?: string | null;
  condition?: EquipmentObservation['condition'];
  conditionAgeDays?: number | null;
  provenance?: Provenance;
}

export function makeEquipment(
  gymId: string,
  equipmentTypeId: string,
  spec: EquipmentSpec = {},
): EquipmentObservation {
  return {
    id: `${gymId}-${equipmentTypeId}`,
    gymId,
    equipmentTypeId,
    presence: spec.presence ?? 'yes',
    count: spec.count ?? null,
    maxWeightKg: spec.maxWeightKg ?? null,
    brand: spec.brand ?? null,
    model: spec.model ?? null,
    condition: spec.condition ?? 'unknown',
    conditionObservedAt:
      spec.conditionAgeDays === undefined || spec.conditionAgeDays === null
        ? null
        : daysBeforeEpoch(spec.conditionAgeDays),
    provenance: spec.provenance ?? from({ ageDays: 20 }),
  };
}

export function makeAmenity(
  gymId: string,
  amenityId: AmenityId,
  present: AmenityObservation['present'] = 'yes',
  note: string | null = null,
  provenance: Provenance = from({ ageDays: 30 }),
): AmenityObservation {
  return { id: `${gymId}-${amenityId}`, gymId, amenityId, present, note, provenance };
}

type OfferSpec = Partial<Omit<VisitOffer, 'id' | 'gymId'>> & { id: string };

export function makeOffer(gymId: string, spec: OfferSpec): VisitOffer {
  const { id: localId, ...rest } = spec;
  return {
    productType: 'casual_gym_visit',
    label: 'Casual visit',
    currency: 'AUD',
    baseAmountMinor: null,
    taxIncluded: true,
    taxAmountMinor: null,
    mandatoryCharges: [],
    refundableDeposits: [],
    grantsGymFloorAccess: 'yes',
    inclusions: ['Gym floor'],
    durationMinutes: null,
    validityDays: 1,
    eligibility: {
      localResidentOnly: 'no',
      memberGuestOnly: 'no',
      firstTimeVisitorOnly: 'no',
      membershipRequired: 'no',
      photoIdRequired: 'unknown',
      minAgeYears: null,
      notes: [],
    },
    purchaseMethod: 'unknown',
    availableFrom: null,
    availableUntil: null,
    membershipTerms: null,
    provenance: from({ ageDays: 14 }),
    ...rest,
    id: `${gymId}-${localId}`,
    gymId,
  };
}

export function makePrerequisites(
  gymId: string,
  spec: Partial<EntryPrerequisites> = {},
): EntryPrerequisites {
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
    provenance: unknownFact(),
    ...spec,
    gymId,
  };
}

interface LocationSpec {
  id: string;
  name: string;
  branch?: string | null;
  brand?: string | null;
  line1: string;
  suburb: string;
  postcode: string;
  lat: number;
  lng: number;
  trainingTypes?: GymLocation['trainingTypes'];
  operatingStatus?: GymLocation['operatingStatus'];
  operatingStatusNote?: string | null;
  phone?: string | null;
  website?: string | null;
  provenance?: Provenance;
}

export function makeLocation(spec: LocationSpec): GymLocation {
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
      state: 'NSW',
      postcode: spec.postcode,
      countryCode: 'AU',
    },
    position: { lat: spec.lat, lng: spec.lng },
    timezone: SYDNEY,
    trainingTypes: spec.trainingTypes ?? ['full_gym'],
    operatingStatus: spec.operatingStatus ?? 'open',
    operatingStatusNote: spec.operatingStatusNote ?? null,
    phone: spec.phone ?? null,
    website: spec.website ?? null,
    // No photos anywhere in the demo dataset. These are invented venues, so
    // there is no real photograph of them and we will not generate one.
    photos: [],
    isDemoData: true,
    externalRefs: {},
    provenance: spec.provenance ?? from({ ageDays: 25 }),
  };
}

export function makeRecord(
  location: GymLocation,
  parts: Omit<Partial<GymRecord>, 'location'>,
): GymRecord {
  return {
    location,
    equipment: parts.equipment ?? [],
    amenities: parts.amenities ?? [],
    offers: parts.offers ?? [],
    schedules: parts.schedules ?? [],
    prerequisites: parts.prerequisites ?? makePrerequisites(location.id),
  };
}
