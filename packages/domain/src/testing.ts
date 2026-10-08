/**
 * Test factories.
 *
 * Every factory defaults to *unknown*, not to a convenient truth. A test that
 * wants a confirmed fact has to say so, which keeps the tests honest about
 * what the product actually knows.
 */

import type {
  AccessAudience,
  AccessSchedule,
  AmenityId,
  AmenityObservation,
  EntryPrerequisites,
  EquipmentObservation,
  EvidenceSource,
  GymLocation,
  GymRecord,
  Provenance,
  Review,
  VisitOffer,
} from './types';

export const SYDNEY = 'Australia/Sydney';

/** A fixed "now" so freshness tests do not drift with the wall clock. */
export const NOW = new Date('2026-09-22T09:00:00.000Z');

export function daysAgo(days: number, from: Date = NOW): string {
  return new Date(from.getTime() - days * 86_400_000).toISOString();
}

export function evidence(overrides: Partial<EvidenceSource> = {}): EvidenceSource {
  return {
    id: 'ev-test',
    sourceType: 'independent_check',
    evidenceRef: null,
    label: 'Test evidence',
    observedAt: daysAgo(1),
    checkedAt: daysAgo(1),
    reviewerId: 'reviewer-1',
    ...overrides,
  };
}

export function checked(ageDays = 1, overrides: Partial<Provenance> = {}): Provenance {
  return {
    status: 'independently_checked',
    sources: [evidence({ checkedAt: daysAgo(ageDays), observedAt: daysAgo(ageDays) })],
    conflictNote: null,
    ...overrides,
  };
}

export function unknownProvenance(): Provenance {
  return { status: 'unknown', sources: [], conflictNote: null };
}

export function location(overrides: Partial<GymLocation> = {}): GymLocation {
  return {
    id: 'gym-test',
    slug: 'gym-test',
    name: 'Test Gym',
    branch: null,
    brand: null,
    address: {
      line1: '1 Test Street',
      line2: null,
      suburb: 'Surry Hills',
      state: 'NSW',
      postcode: '2010',
      countryCode: 'AU',
    },
    position: { lat: -33.8846, lng: 151.2113 },
    timezone: SYDNEY,
    trainingTypes: ['full_gym'],
    operatingStatus: 'open',
    operatingStatusNote: null,
    phone: null,
    website: null,
    photos: [],
    isDemoData: true,
    externalRefs: {},
    provenance: checked(),
    ...overrides,
  };
}

export function schedule(
  audience: AccessAudience,
  overrides: Partial<AccessSchedule> = {},
): AccessSchedule {
  return {
    id: `sched-${audience}`,
    gymId: 'gym-test',
    audience,
    timezone: SYDNEY,
    windows: [],
    exceptions: [],
    alwaysOpen: false,
    provenance: checked(),
    ...overrides,
  };
}

/** Same window every weekday, for readable schedule fixtures. */
export function weekdayWindows(openMinute: number, closeMinute: number) {
  return [1, 2, 3, 4, 5].map((day) => ({ day, openMinute, closeMinute }));
}

export function everyDayWindows(openMinute: number, closeMinute: number) {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, openMinute, closeMinute }));
}

export function prerequisites(overrides: Partial<EntryPrerequisites> = {}): EntryPrerequisites {
  return {
    gymId: 'gym-test',
    advanceBookingRequired: 'no',
    bookingLeadTimeHours: null,
    inductionRequired: 'no',
    inductionAvailableDuringStaffedHoursOnly: 'no',
    photoIdRequired: 'no',
    minAgeYears: null,
    residencyRule: 'none',
    memberAccompanimentRequired: 'no',
    notes: [],
    provenance: checked(),
    ...overrides,
  };
}

export function offer(overrides: Partial<VisitOffer> = {}): VisitOffer {
  return {
    id: 'offer-test',
    gymId: 'gym-test',
    productType: 'casual_gym_visit',
    label: 'Casual visit',
    currency: 'AUD',
    baseAmountMinor: 2500,
    taxIncluded: true,
    taxAmountMinor: null,
    mandatoryCharges: [],
    refundableDeposits: [],
    grantsGymFloorAccess: 'yes',
    inclusions: ['gym_floor'],
    durationMinutes: null,
    validityDays: 1,
    eligibility: {
      localResidentOnly: 'no',
      memberGuestOnly: 'no',
      firstTimeVisitorOnly: 'no',
      membershipRequired: 'no',
      photoIdRequired: 'no',
      minAgeYears: null,
      notes: [],
    },
    purchaseMethod: 'at_reception',
    availableFrom: null,
    availableUntil: null,
    membershipTerms: null,
    provenance: checked(),
    ...overrides,
  };
}

export function equipment(
  equipmentTypeId: string,
  overrides: Partial<EquipmentObservation> = {},
): EquipmentObservation {
  return {
    id: `eq-${equipmentTypeId}`,
    gymId: 'gym-test',
    equipmentTypeId,
    presence: 'yes',
    count: null,
    maxWeightKg: null,
    brand: null,
    model: null,
    condition: 'unknown',
    conditionObservedAt: null,
    provenance: checked(),
    ...overrides,
  };
}

export function amenity(
  amenityId: AmenityId,
  overrides: Partial<AmenityObservation> = {},
): AmenityObservation {
  return {
    id: `am-${amenityId}`,
    gymId: 'gym-test',
    amenityId,
    present: 'yes',
    note: null,
    provenance: checked(),
    ...overrides,
  };
}

export function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 'review-test',
    gymId: 'gym-test',
    authorId: 'user-1',
    authorDisplayName: 'Test User',
    overall: 4,
    equipment: null,
    cleanliness: null,
    atmosphere: null,
    value: null,
    body: 'A review body.',
    visitedOn: null,
    createdAt: daysAgo(5),
    status: 'published',
    moderationReason: null,
    verifiedVisit: false,
    ownerReply: null,
    ...overrides,
  };
}

export function record(overrides: Partial<GymRecord> = {}): GymRecord {
  return {
    location: location(),
    equipment: [],
    amenities: [],
    offers: [offer()],
    schedules: [],
    prerequisites: prerequisites(),
    ...overrides,
  };
}
