/**
 * Core domain types for the Gym Information Map.
 *
 * Three deliberate rules run through this file:
 *
 * 1. "Unknown" is a first-class value, never a silent `false` or `0`.
 *    `Tri` separates yes / no / unknown. A missing price is not a free gym.
 * 2. Evidence state (stale, conflicting) is separate from the value itself.
 *    A gym can have a confirmed squat rack whose check is nine months old.
 * 3. Every material fact carries provenance: who said so, from what evidence,
 *    when it was observed and when it was last checked.
 */

/** Tri-state truth value. `unknown` never satisfies a strict requirement. */
export type Tri = 'yes' | 'no' | 'unknown';

/** ISO-8601 date-time string in UTC, e.g. `2026-09-22T04:00:00.000Z`. */
export type IsoDateTime = string;

/** ISO-8601 calendar date, e.g. `2026-09-22`. Local to the gym's time zone. */
export type IsoDate = string;

/** IANA time zone identifier, e.g. `Australia/Sydney`. */
export type TimeZone = string;

/** ISO-4217 currency code. The pilot is AUD-only but nothing here assumes it. */
export type CurrencyCode = string;

/**
 * How a fact reached us. This is the *route*, not a quality score:
 * an owner submission is not automatically better or worse than a visit.
 */
export type SourceType =
  | 'owner_submission'
  | 'operator_website'
  | 'independent_check'
  | 'community_report'
  | 'licensed_dataset';

/**
 * The label a reader sees next to a fact.
 *
 * `conflicting` means two sources disagree and nobody has resolved it. We keep
 * both and say so rather than silently picking one, because picking wrong
 * sends someone to a gym they cannot enter.
 */
export type FactStatus =
  | 'owner_confirmed'
  | 'independently_checked'
  | 'community_reported'
  | 'unknown'
  | 'conflicting';

/** A single piece of evidence behind a fact. */
export interface EvidenceSource {
  id: string;
  sourceType: SourceType;
  /** URL, receipt id, photo id, or internal note reference. Never a secret. */
  evidenceRef: string | null;
  /** Human-readable description shown to users, e.g. "Club price list page". */
  label: string;
  /** When the fact was true / observed in the world. */
  observedAt: IsoDateTime;
  /**
   * When someone last actively confirmed it still holds.
   *
   * Only real evidence advances this. A scheduled recheck job that finds
   * nothing new must NOT touch it — see `docs/DATA-MODEL.md`.
   */
  checkedAt: IsoDateTime;
  /** Reviewer/contributor id, if any. Never an email address. */
  reviewerId: string | null;
}

/** Every material fact is wrapped in this envelope. */
export interface Provenance {
  status: FactStatus;
  sources: EvidenceSource[];
  /** Set when sources disagree. Holds a short description of the disagreement. */
  conflictNote?: string | null;
}

/** Which recheck clock applies to a fact. */
export type FreshnessClass = 'visitor_price_access' | 'equipment' | 'amenity';

/**
 * Configurable pilot recheck targets, in days.
 *
 * These are product assumptions to be tested, not guarantees and not
 * universal expiry rules.
 */
export interface FreshnessPolicy {
  visitorPriceAccessDays: number;
  equipmentDays: number;
  amenityDays: number;
}

export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  visitorPriceAccessDays: 30,
  equipmentDays: 90,
  amenityDays: 180,
};

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PostalAddress {
  line1: string;
  line2: string | null;
  suburb: string;
  state: string;
  postcode: string;
  countryCode: string;
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export type EquipmentCategory =
  | 'free_weights'
  | 'racks_and_platforms'
  | 'machines'
  | 'cardio'
  | 'functional';

export interface EquipmentType {
  id: string;
  label: string;
  category: EquipmentCategory;
  /** True for types where a maximum weight is the meaningful question. */
  usesMaxWeight: boolean;
  /** Short help text shown next to the filter chip. */
  hint: string;
}

export type EquipmentCondition = 'good' | 'worn' | 'out_of_service' | 'unknown';

/**
 * What we know about one equipment type at one branch.
 *
 * Presence, count, condition and real-time availability are four different
 * questions. This model keeps them apart; the UI must not merge them.
 */
export interface EquipmentObservation {
  id: string;
  gymId: string;
  equipmentTypeId: string;
  presence: Tri;
  /** Null means "present but nobody counted", which is not the same as zero. */
  count: number | null;
  /** Heaviest pair available, for dumbbells and similar. Null = not established. */
  maxWeightKg: number | null;
  /** Only populated when there is actual evidence (photo, model plate, spec sheet). */
  brand: string | null;
  model: string | null;
  /** Condition is tracked separately and ages faster than presence. */
  condition: EquipmentCondition;
  conditionObservedAt: IsoDateTime | null;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Amenities
// ---------------------------------------------------------------------------

export type AmenityId =
  | 'showers'
  | 'lockers'
  | 'parking'
  | 'sauna'
  | 'pool'
  | 'towel_service'
  | 'step_free_entrance'
  | 'accessible_bathroom'
  | 'accessible_change_room'
  | 'staffed_reception';

export interface AmenityObservation {
  id: string;
  gymId: string;
  amenityId: AmenityId;
  present: Tri;
  note: string | null;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Money and visit offers
// ---------------------------------------------------------------------------

/**
 * Money is always integer minor units plus a currency code.
 * `null` amount means "we do not know", which is never treated as zero.
 */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

/** A charge that is not refundable: booking fee, access-card fee, tax. */
export interface MandatoryCharge {
  label: string;
  /** Null means the charge is known to exist but its amount is not established. */
  amountMinor: number | null;
  /** True when we know this charge applies; false when it might not apply at all. */
  applies: Tri;
}

/** A charge you get back, e.g. an access-band deposit. Never part of visit cost. */
export interface RefundableDeposit {
  label: string;
  amountMinor: number | null;
  refundConditions: string | null;
}

/**
 * What the offer actually buys.
 *
 * `pool_only` exists because the Ian Thorpe Aquatic Centre case is real: the
 * cheapest admission on a price list may not include the gym floor at all.
 */
export type VisitProductType =
  | 'casual_gym_visit'
  | 'day_pass'
  | 'multi_day_pass'
  | 'week_pass'
  | 'pool_only'
  | 'class_only'
  | 'trial'
  | 'membership';

export type PurchaseMethod =
  | 'at_reception'
  | 'online'
  | 'operator_app'
  | 'phone'
  | 'third_party'
  | 'unknown';

/** Who is allowed to buy/use this offer. */
export interface OfferEligibility {
  /** Must live or work locally (typical of "free trial" offers). */
  localResidentOnly: Tri;
  /** Must be signed in as a guest of an existing member. */
  memberGuestOnly: Tri;
  /** Only available to people who have never visited before. */
  firstTimeVisitorOnly: Tri;
  /** Requires an existing membership at this or a sibling club. */
  membershipRequired: Tri;
  photoIdRequired: Tri;
  minAgeYears: number | null;
  /** Free-text conditions that do not fit the fields above. */
  notes: string[];
}

export interface MembershipTerms {
  billingIntervalDays: number;
  joiningFeeMinor: number | null;
  accessCardFeeMinor: number | null;
  minimumTermDays: number | null;
  cancellationNoticeDays: number | null;
  notes: string[];
}

export interface VisitOffer {
  id: string;
  gymId: string;
  productType: VisitProductType;
  /** Operator's own name for the product, e.g. "Casual visit". */
  label: string;
  currency: CurrencyCode;
  /** Headline price before mandatory extras. Null = not established. */
  baseAmountMinor: number | null;
  /** True when `baseAmountMinor` already includes applicable taxes (GST in AU). */
  taxIncluded: boolean;
  /** Only used when `taxIncluded` is false. Null with taxIncluded false = unknown. */
  taxAmountMinor: number | null;
  mandatoryCharges: MandatoryCharge[];
  refundableDeposits: RefundableDeposit[];
  /** Does this product actually let you train on the gym floor? */
  grantsGymFloorAccess: Tri;
  /** What is included, for display. Not used for access decisions. */
  inclusions: string[];
  /** How long the purchase is valid, in minutes. Null for open-ended. */
  durationMinutes: number | null;
  /** For multi-day/week products: how many calendar days it spans. */
  validityDays: number | null;
  eligibility: OfferEligibility;
  purchaseMethod: PurchaseMethod;
  /** Offer window. `availableUntil` in the past means the offer has expired. */
  availableFrom: IsoDate | null;
  availableUntil: IsoDate | null;
  /** Populated only for `membership` products. */
  membershipTerms: MembershipTerms | null;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Access schedules
// ---------------------------------------------------------------------------

/**
 * Who a schedule applies to.
 *
 * These are genuinely different and are the single most common source of a
 * wasted trip: a 24/7 member door does not mean a visitor can walk in at 7pm.
 */
export type AccessAudience = 'member' | 'staffed' | 'visitor';

/**
 * One opening window.
 *
 * `openMinute` / `closeMinute` are minutes from local midnight on `day`.
 * `closeMinute` may exceed 1440 to express an overnight window
 * (e.g. Friday 20:00 -> 02:00 Saturday is `openMinute: 1200, closeMinute: 1560`).
 */
export interface OpeningWindow {
  /** 0 = Sunday ... 6 = Saturday, in the gym's local time zone. */
  day: number;
  openMinute: number;
  closeMinute: number;
}

/** A dated override: public holiday closure, reduced hours, maintenance. */
export interface ScheduleException {
  date: IsoDate;
  closed: boolean;
  openMinute: number | null;
  closeMinute: number | null;
  note: string;
}

export interface AccessSchedule {
  id: string;
  gymId: string;
  audience: AccessAudience;
  timezone: TimeZone;
  /** Empty array with status `unknown` means "we have not established this". */
  windows: OpeningWindow[];
  exceptions: ScheduleException[];
  /** True when the audience has round-the-clock access on all listed days. */
  alwaysOpen: boolean;
  provenance: Provenance;
}

/** What a visitor must do before or on arrival. */
export interface EntryPrerequisites {
  gymId: string;
  advanceBookingRequired: Tri;
  bookingLeadTimeHours: number | null;
  inductionRequired: Tri;
  inductionAvailableDuringStaffedHoursOnly: Tri;
  photoIdRequired: Tri;
  minAgeYears: number | null;
  residencyRule: 'none' | 'local_resident_only' | 'non_local_only' | 'unknown';
  memberAccompanimentRequired: Tri;
  notes: string[];
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Gym
// ---------------------------------------------------------------------------

export type OperatingStatus = 'open' | 'temporarily_closed' | 'permanently_closed' | 'unknown';

export type TrainingType =
  | 'full_gym'
  | 'strength_focused'
  | 'functional'
  | 'aquatic_centre'
  | 'studio'
  | 'crossfit_box';

/** A photo we have the right to show. No photo is better than a fake one. */
export interface GymPhoto {
  id: string;
  url: string;
  alt: string;
  /** Who supplied it and under what permission. Required before display. */
  credit: string;
  licence: string;
}

export interface GymLocation {
  id: string;
  /** Stable URL slug. Independent of any external provider id. */
  slug: string;
  name: string;
  /** Branch name where an operator has several, e.g. "Surry Hills". */
  branch: string | null;
  brand: string | null;
  address: PostalAddress;
  position: LatLng;
  timezone: TimeZone;
  trainingTypes: TrainingType[];
  operatingStatus: OperatingStatus;
  operatingStatusNote: string | null;
  phone: string | null;
  website: string | null;
  /** A contact email, where a source lists one. */
  email?: string | null;
  /**
   * Sports and classes a source lists beyond the gym floor ("Yoga",
   * "Swimming"), with the same provenance as the location.
   */
  activities?: string[];
  /** Empty array renders as "No photo supplied", never a coloured placeholder. */
  photos: GymPhoto[];
  /**
   * Marks records that exist only to exercise the product locally.
   * Production ingestion refuses records with this flag set.
   */
  isDemoData: boolean;
  /**
   * External provider ids are kept in a side map, never used as our key,
   * so that provider terms can be honoured or a provider dropped entirely.
   */
  externalRefs: Record<string, string>;
  provenance: Provenance;
}

/** Everything about one branch, assembled for display and filtering. */
export interface GymRecord {
  location: GymLocation;
  equipment: EquipmentObservation[];
  amenities: AmenityObservation[];
  offers: VisitOffer[];
  schedules: AccessSchedule[];
  prerequisites: EntryPrerequisites;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export type ModerationStatus = 'pending' | 'published' | 'rejected' | 'removed';

export interface Review {
  id: string;
  gymId: string;
  authorId: string;
  authorDisplayName: string;
  /** 1-5. There is no zero: "no reviews" is absence, not a score of zero. */
  overall: number;
  equipment: number | null;
  cleanliness: number | null;
  atmosphere: number | null;
  value: number | null;
  body: string;
  visitedOn: IsoDate | null;
  createdAt: IsoDateTime;
  status: ModerationStatus;
  moderationReason: string | null;
  /**
   * Only ever true when a defined evidence mechanism has verified the visit.
   * A self-declared visit or a location ping is not enough. The pilot has no
   * such mechanism, so this is false everywhere.
   */
  verifiedVisit: boolean;
  ownerReply: OwnerReply | null;
}

export interface OwnerReply {
  authorId: string;
  body: string;
  createdAt: IsoDateTime;
  status: ModerationStatus;
}

/** Aggregate over published first-party reviews only. Never mixed with external ratings. */
export interface RatingSummary {
  /** Null when there are no published reviews. Never 0. */
  average: number | null;
  count: number;
}

// ---------------------------------------------------------------------------
// Contributions, ownership and moderation
// ---------------------------------------------------------------------------

export type CorrectionTargetKind =
  | 'offer_price'
  | 'offer_eligibility'
  | 'visitor_hours'
  | 'equipment'
  | 'amenity'
  | 'operating_status'
  | 'contact_details'
  | 'other';

export interface Correction {
  id: string;
  gymId: string;
  targetKind: CorrectionTargetKind;
  /** Which specific record, where applicable (offer id, equipment type id, ...). */
  targetId: string | null;
  /** What the contributor says it should say. Free text; reviewed by a human. */
  proposedValue: string;
  /** Contributor's evidence. Shown to moderators, not published verbatim. */
  evidenceNote: string;
  evidenceUrl: string | null;
  submittedBy: string;
  submittedAt: IsoDateTime;
  status: ModerationStatus;
  decidedBy: string | null;
  decidedAt: IsoDateTime | null;
  decisionReason: string | null;
}

export type OwnershipEvidenceType =
  | 'work_email_domain'
  | 'phone_callback'
  | 'business_document'
  | 'website_verification';

export interface OwnershipClaim {
  id: string;
  gymId: string;
  userId: string;
  claimantName: string;
  claimantRole: string;
  evidenceType: OwnershipEvidenceType;
  /**
   * Private. Never included in any public API response.
   * Retention and deletion rules live in docs/ARCHITECTURE.md.
   */
  evidenceRef: string;
  submittedAt: IsoDateTime;
  status: ModerationStatus;
  decidedBy: string | null;
  decidedAt: IsoDateTime | null;
  decisionReason: string | null;
}

export type ModerationAction =
  | 'correction_approved'
  | 'correction_rejected'
  | 'review_published'
  | 'review_rejected'
  | 'review_removed'
  | 'owner_reply_published'
  | 'claim_approved'
  | 'claim_rejected'
  | 'user_blocked'
  | 'content_reported'
  | 'duplicate_merged'
  | 'record_marked_stale';

export interface ModerationEvent {
  id: string;
  actorId: string;
  action: ModerationAction;
  subjectType: 'review' | 'correction' | 'claim' | 'user' | 'gym';
  subjectId: string;
  gymId: string | null;
  /** Public-safe reason. Sensitive evidence stays in the private store. */
  reason: string;
  createdAt: IsoDateTime;
}

export interface ContentReport {
  id: string;
  subjectType: 'review' | 'correction' | 'gym';
  subjectId: string;
  reportedBy: string;
  reason: string;
  createdAt: IsoDateTime;
  status: 'open' | 'actioned' | 'dismissed';
}

// ---------------------------------------------------------------------------
// Users and saved gyms
// ---------------------------------------------------------------------------

export type Role = 'anonymous' | 'member' | 'owner' | 'moderator' | 'admin';

export interface User {
  id: string;
  displayName: string;
  role: Role;
  /** Gym ids this user has an approved ownership claim for. */
  ownedGymIds: string[];
  blocked: boolean;
  createdAt: IsoDateTime;
}

/** Saved gyms live in the browser until the person chooses to create an account. */
export interface SavedGym {
  gymId: string;
  savedAt: IsoDateTime;
  note: string | null;
}

// ---------------------------------------------------------------------------
// Busyness
// ---------------------------------------------------------------------------

/**
 * Crowd reporting is modelled but deliberately not populated.
 *
 * Without an authorised live source, the product says
 * "Live crowd information unavailable" rather than animating a guess.
 */
export interface CrowdReport {
  id: string;
  gymId: string;
  reportedBy: string;
  /** Reporter's judgement, not a measurement. */
  level: 'quiet' | 'moderate' | 'busy' | 'very_busy';
  observedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  status: ModerationStatus;
}
