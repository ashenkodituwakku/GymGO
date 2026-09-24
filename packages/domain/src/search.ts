/**
 * Search: filtering, tiering, ranking and relaxation suggestions.
 *
 * The central idea is that a result is never just "a match". It is one of
 * three things, and the difference is always visible:
 *
 *   confirmed          every stated requirement is met by fresh evidence
 *   needs_confirmation could work, but something is unknown, stale or conditional
 *   ruled_out          a stated requirement is contradicted by what we know
 *
 * Nothing moves from `needs_confirmation` into `confirmed` because a field was
 * blank. That is the whole point of the product.
 */

import { evaluateVisitorAccess, type AccessReason, type VisitorAccessResult } from './access';
import { matchAmenities, type AmenityMatchResult } from './amenities';
import { matchEquipment, type EquipmentMatchResult, type EquipmentRequirement } from './equipment';
import { formatMoney } from './money';
import {
  selectSingleVisitOffer,
  UNKNOWN_VISITOR,
  type OfferSelection,
  type VisitorProfile,
} from './offers';
import { summariseRatings } from './reviews';
import { haversineKm, isWithinBox, type BoundingBox } from './geo';
import { zonedTimeToInstant } from './time';
import {
  DEFAULT_FRESHNESS_POLICY,
  type AmenityId,
  type FreshnessPolicy,
  type GymRecord,
  type IsoDate,
  type LatLng,
  type RatingSummary,
  type Review,
  type TimeZone,
} from './types';

export type SortKey = 'best_match' | 'distance' | 'visit_cost' | 'rating';

export const SORT_DESCRIPTIONS: Record<SortKey, string> = {
  best_match:
    'Confirmed matches first, then results needing confirmation; within each, the fewest open questions, then straight-line distance.',
  distance: 'Confirmed matches first, then nearest by straight-line distance.',
  visit_cost:
    'Confirmed matches first, then lowest confirmed visit cost. Unconfirmed prices come last.',
  rating:
    'Confirmed matches first, then highest first-party rating. Gyms with no reviews come last.',
};

export interface SearchQuery {
  /** Free-text suburb or postcode, used by the caller's geocoder. */
  text: string | null;
  /** Centre for distance and radius. Null means "no geographic filter". */
  centre: LatLng | null;
  radiusKm: number;
  /** Set by "Search this area" after the map moves; overrides centre/radius. */
  bbox: BoundingBox | null;
  /** Total non-refundable visit cost ceiling, in minor units. Null = no budget. */
  budgetMinor: number | null;
  /** The visit the person is planning, in `timezone`. */
  visitDate: IsoDate;
  visitMinuteOfDay: number;
  timezone: TimeZone;
  requiredEquipment: EquipmentRequirement[];
  /** Nice-to-haves. Shown and scored, but never exclude a gym. */
  preferredEquipment: EquipmentRequirement[];
  requiredAmenities: AmenityId[];
  profile: VisitorProfile;
  sort: SortKey;
}

export function defaultQuery(overrides: Partial<SearchQuery> = {}): SearchQuery {
  return {
    text: null,
    centre: null,
    radiusKm: 5,
    bbox: null,
    budgetMinor: null,
    visitDate: '2026-09-22',
    visitMinuteOfDay: 19 * 60,
    timezone: 'Australia/Sydney',
    requiredEquipment: [],
    preferredEquipment: [],
    requiredAmenities: [],
    profile: UNKNOWN_VISITOR,
    sort: 'best_match',
    ...overrides,
  };
}

export type ResultTier = 'confirmed' | 'needs_confirmation' | 'ruled_out';

export interface GymSearchResult {
  record: GymRecord;
  /** Null when the query has no centre. */
  distanceKm: number | null;
  access: VisitorAccessResult;
  offers: OfferSelection;
  equipment: EquipmentMatchResult;
  preferred: EquipmentMatchResult;
  amenities: AmenityMatchResult;
  rating: RatingSummary;
  tier: ResultTier;
  /** Why this result is not confirmed, in plain language. */
  limitations: AccessReason[];
}

export interface SearchOutcome {
  results: GymSearchResult[];
  counts: Record<ResultTier, number>;
  /** Offered when nothing is confirmed. Never applied automatically. */
  relaxations: RelaxationSuggestion[];
  /** The sort rule actually used, for display. */
  sortDescription: string;
}

export interface SearchInput {
  records: GymRecord[];
  reviewsByGymId: Record<string, Review[]>;
  query: SearchQuery;
  asOf?: Date;
  policy?: FreshnessPolicy;
}

function dedupeReasons(reasons: AccessReason[]): AccessReason[] {
  const seen = new Set<string>();
  const out: AccessReason[] = [];
  for (const reason of reasons) {
    const key = `${reason.code}:${reason.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(reason);
  }
  return out;
}

/** Evaluate one gym against one query. Exported for the detail page. */
export function evaluateGym(
  record: GymRecord,
  query: SearchQuery,
  options: { reviews?: Review[]; asOf?: Date; policy?: FreshnessPolicy } = {},
): GymSearchResult {
  const asOf = options.asOf ?? new Date();
  const policy = options.policy ?? DEFAULT_FRESHNESS_POLICY;
  const reviews = options.reviews ?? [];

  const instant = zonedTimeToInstant(query.visitDate, query.visitMinuteOfDay, query.timezone);

  const access = evaluateVisitorAccess(record, instant, { asOf, policy });
  const offers = selectSingleVisitOffer(record.offers, {
    profile: query.profile,
    visitLocalDate: query.visitDate,
    budgetMinor: query.budgetMinor,
    asOf,
    policy,
  });
  const equipment = matchEquipment(query.requiredEquipment, record.equipment, { asOf, policy });
  const preferred = matchEquipment(query.preferredEquipment, record.equipment, { asOf, policy });
  const amenities = matchAmenities(query.requiredAmenities, record.amenities, { asOf, policy });
  const rating = summariseRatings(reviews);

  const distanceKm = query.centre ? haversineKm(query.centre, record.location.position) : null;

  // --- Tiering --------------------------------------------------------------
  // Only *stated* requirements affect the tier. If the person set no budget,
  // an unknown price is shown on the card but does not downgrade the result.
  const limitations: AccessReason[] = [];

  limitations.push(...access.reasons.filter((reason) => reason.severity !== 'info'));

  const budgetStated = query.budgetMinor !== null;
  const offersConsidered = record.offers.filter(
    (offer) => offer.productType === 'casual_gym_visit' || offer.productType === 'day_pass' || offer.productType === 'trial',
  );
  const priceRuledOut =
    budgetStated && offersConsidered.length > 0 && offers.confirmed === null && offers.unconfirmed === null;
  const priceUnresolved = budgetStated && offers.confirmed === null && !priceRuledOut;

  if (budgetStated) {
    if (priceRuledOut) {
      // Only say "above your budget" about an offer that was otherwise
      // usable. An expired or pool-only price is ruled out for its own
      // reason, which is the one worth showing.
      const overBudgetTotal = offers.overBudget?.cost.totalNonRefundableMinor ?? null;
      if (overBudgetTotal !== null) {
        limitations.push({
          code: 'over_budget',
          severity: 'blocking',
          message: `The cheapest single visit we have confirmed is ${formatMoney(overBudgetTotal)}, above your budget of ${formatMoney(query.budgetMinor)}.`,
        });
      } else {
        const blockers = (offers.bestAvailable?.reasons ?? []).filter(
          (reason) => reason.severity === 'blocking',
        );
        limitations.push(
          ...(blockers.length > 0
            ? blockers
            : [
                {
                  code: 'no_usable_price',
                  severity: 'blocking' as const,
                  message: 'No single-visit price here is one you could use.',
                },
              ]),
        );
      }
    } else if (offersConsidered.length === 0) {
      limitations.push({
        code: 'no_single_visit_price',
        severity: 'confirm',
        message: 'No single-visit price is recorded for this gym, so we cannot check it against your budget.',
      });
    } else if (priceUnresolved) {
      limitations.push(
        ...(offers.unconfirmed?.reasons.filter((reason) => reason.severity === 'confirm') ?? []),
      );
    }
  }

  if (query.requiredEquipment.length > 0) {
    for (const match of equipment.matches) {
      if (match.state === 'confirmed') continue;
      const severity = match.state === 'missing' || match.state === 'below_requirement' ? 'blocking' : 'confirm';
      limitations.push({
        code: `equipment_${match.state}`,
        severity,
        message: `${labelOf(match.requirement)}: ${match.detail}`,
      });
    }
  }

  if (query.requiredAmenities.length > 0) {
    for (const match of amenities.matches) {
      if (match.state === 'confirmed') continue;
      limitations.push({
        code: `amenity_${match.state}`,
        severity: match.state === 'missing' ? 'blocking' : 'confirm',
        message: `${match.amenityId.replace(/_/g, ' ')}: ${match.detail}`,
      });
    }
  }

  // Geographic exclusion is applied by the caller (it removes the record
  // entirely rather than showing it as ruled out).
  const deduped = dedupeReasons(limitations);
  const tier: ResultTier = deduped.some((reason) => reason.severity === 'blocking')
    ? 'ruled_out'
    : deduped.some((reason) => reason.severity === 'confirm')
      ? 'needs_confirmation'
      : 'confirmed';

  return {
    record,
    distanceKm,
    access,
    offers,
    equipment,
    preferred,
    amenities,
    rating,
    tier,
    limitations: deduped,
  };
}

function labelOf(requirement: EquipmentRequirement): string {
  return requirement.equipmentTypeId.replace(/_/g, ' ');
}

const TIER_ORDER: Record<ResultTier, number> = {
  confirmed: 0,
  needs_confirmation: 1,
  ruled_out: 2,
};

function compareResults(a: GymSearchResult, b: GymSearchResult, sort: SortKey): number {
  const tierDelta = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
  if (tierDelta !== 0) return tierDelta;

  switch (sort) {
    case 'visit_cost': {
      const aCost = a.offers.confirmed?.cost.totalNonRefundableMinor ?? null;
      const bCost = b.offers.confirmed?.cost.totalNonRefundableMinor ?? null;
      if (aCost !== bCost) {
        // Unknown prices sort last, never as zero.
        if (aCost === null) return 1;
        if (bCost === null) return -1;
        return aCost - bCost;
      }
      break;
    }
    case 'rating': {
      const aRating = a.rating.average;
      const bRating = b.rating.average;
      if (aRating !== bRating) {
        // "No reviews yet" sorts last, never as zero stars.
        if (aRating === null) return 1;
        if (bRating === null) return -1;
        return bRating - aRating;
      }
      break;
    }
    case 'best_match': {
      // Fewer things to call about is a better match: a gym that publishes
      // its guest hours and price beats one that publishes nothing.
      const open = (result: GymSearchResult) => result.limitations.filter((reason) => reason.severity !== 'info').length;
      const questionDelta = open(a) - open(b);
      if (questionDelta !== 0) return questionDelta;
      break;
    }
    case 'distance':
      break;
  }

  const aDistance = a.distanceKm;
  const bDistance = b.distanceKm;
  if (aDistance !== bDistance) {
    if (aDistance === null) return 1;
    if (bDistance === null) return -1;
    return aDistance - bDistance;
  }

  // Deterministic final tie-break so repeated searches do not reshuffle.
  return a.record.location.id.localeCompare(b.record.location.id);
}

function withinArea(record: GymRecord, query: SearchQuery): boolean {
  if (query.bbox) return isWithinBox(record.location.position, query.bbox);
  if (query.centre) return haversineKm(query.centre, record.location.position) <= query.radiusKm;
  return true;
}

export function search(input: SearchInput): SearchOutcome {
  const { records, reviewsByGymId, query } = input;
  const asOf = input.asOf ?? new Date();
  const policy = input.policy ?? DEFAULT_FRESHNESS_POLICY;

  const inArea = records.filter((record) => withinArea(record, query));

  const results = inArea
    .map((record) =>
      evaluateGym(record, query, {
        reviews: reviewsByGymId[record.location.id] ?? [],
        asOf,
        policy,
      }),
    )
    .sort((a, b) => compareResults(a, b, query.sort));

  const counts: Record<ResultTier, number> = {
    confirmed: 0,
    needs_confirmation: 0,
    ruled_out: 0,
  };
  for (const result of results) counts[result.tier] += 1;

  const relaxations =
    counts.confirmed === 0
      ? suggestRelaxations({ records: inArea, reviewsByGymId, query, asOf, policy })
      : [];

  return { results, counts, relaxations, sortDescription: SORT_DESCRIPTIONS[query.sort] };
}

// ---------------------------------------------------------------------------
// Relaxations
// ---------------------------------------------------------------------------

export interface RelaxationSuggestion {
  /** Machine-readable so the UI can apply it on an explicit click. */
  kind: 'drop_equipment' | 'drop_amenity' | 'raise_budget' | 'widen_radius' | 'change_time';
  label: string;
  /** How many confirmed results this change would produce. */
  confirmedCount: number;
  /** Patch to merge into the query. Applied only when the person chooses it. */
  patch: Partial<SearchQuery>;
}

function countConfirmed(input: SearchInput): number {
  let confirmed = 0;
  for (const record of input.records) {
    if (!withinArea(record, input.query)) continue;
    const result = evaluateGym(record, input.query, {
      reviews: input.reviewsByGymId[record.location.id] ?? [],
      asOf: input.asOf,
      policy: input.policy,
    });
    if (result.tier === 'confirmed') confirmed += 1;
  }
  return confirmed;
}

/**
 * Work out which single change would open up the most confirmed results.
 *
 * We never apply these. Silently dropping a filter is how a person ends up at
 * a gym without the rack they came for.
 */
export function suggestRelaxations(input: SearchInput): RelaxationSuggestion[] {
  const { query } = input;
  const candidates: Array<{ kind: RelaxationSuggestion['kind']; label: string; patch: Partial<SearchQuery> }> = [];

  for (const requirement of query.requiredEquipment) {
    candidates.push({
      kind: 'drop_equipment',
      label: `Drop "${labelOf(requirement)}"${requirement.minMaxWeightKg ? ` (${requirement.minMaxWeightKg} kg)` : ''}`,
      patch: {
        requiredEquipment: query.requiredEquipment.filter(
          (item) => item.equipmentTypeId !== requirement.equipmentTypeId,
        ),
      },
    });
  }

  for (const requirement of query.requiredEquipment) {
    if (requirement.minMaxWeightKg) {
      candidates.push({
        kind: 'drop_equipment',
        label: `Accept any dumbbell weight instead of ${requirement.minMaxWeightKg} kg`,
        patch: {
          requiredEquipment: query.requiredEquipment.map((item) =>
            item.equipmentTypeId === requirement.equipmentTypeId
              ? { equipmentTypeId: item.equipmentTypeId, minMaxWeightKg: null }
              : item,
          ),
        },
      });
    }
  }

  for (const amenityId of query.requiredAmenities) {
    candidates.push({
      kind: 'drop_amenity',
      label: `Drop "${amenityId.replace(/_/g, ' ')}"`,
      patch: { requiredAmenities: query.requiredAmenities.filter((item) => item !== amenityId) },
    });
  }

  if (query.budgetMinor !== null) {
    const raised = query.budgetMinor + 1000;
    candidates.push({
      kind: 'raise_budget',
      label: `Raise the budget to ${formatMoney(raised)}`,
      patch: { budgetMinor: raised },
    });
    candidates.push({
      kind: 'raise_budget',
      label: 'Remove the budget limit',
      patch: { budgetMinor: null },
    });
  }

  if (query.centre && !query.bbox) {
    candidates.push({
      kind: 'widen_radius',
      label: `Search ${query.radiusKm * 2} km instead of ${query.radiusKm} km`,
      patch: { radiusKm: query.radiusKm * 2 },
    });
  }

  // A different hour is often the real answer for a 7pm guest-entry problem.
  for (const minute of [11 * 60, 14 * 60]) {
    if (minute === query.visitMinuteOfDay) continue;
    const hour = Math.floor(minute / 60);
    candidates.push({
      kind: 'change_time',
      label: `Visit at ${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'} instead`,
      patch: { visitMinuteOfDay: minute },
    });
  }

  const scored = candidates
    .map((candidate) => ({
      ...candidate,
      confirmedCount: countConfirmed({ ...input, query: { ...query, ...candidate.patch } }),
    }))
    .filter((candidate) => candidate.confirmedCount > 0)
    .sort((a, b) => b.confirmedCount - a.confirmedCount || a.label.localeCompare(b.label));

  return scored.slice(0, 4);
}

/** The requirements that actually excluded results, for the empty state. */
export function explainNoMatches(outcome: SearchOutcome): string[] {
  const counts = new Map<string, number>();
  for (const result of outcome.results) {
    if (result.tier !== 'ruled_out') continue;
    for (const reason of result.limitations) {
      if (reason.severity !== 'blocking') continue;
      counts.set(reason.message, (counts.get(reason.message) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([message, count]) => `${message} (${count} ${count === 1 ? 'gym' : 'gyms'})`);
}
