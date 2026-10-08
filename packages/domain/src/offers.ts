/**
 * Which price actually applies to *this* person, for *this* visit.
 *
 * The cheapest number on a price list is often the wrong one: it may buy the
 * pool and not the gym floor, or be a residents-only trial, or be a week pass
 * dressed up as a daily rate. Each of those is a separate check here.
 */

import {
  budgetVerdict,
  computeCost,
  isOfferExpired,
  isOfferNotYetAvailable,
  type BudgetVerdict,
  type CostBreakdown,
} from './money';
import { assessFreshness, type FreshnessInfo } from './freshness';
import type { AccessReason } from './access';
import {
  DEFAULT_FRESHNESS_POLICY,
  type FreshnessPolicy,
  type IsoDate,
  type Tri,
  type VisitOffer,
  type VisitProductType,
} from './types';

/** What we know about the person asking. Everything defaults to unknown. */
export interface VisitorProfile {
  isLocalResident: Tri;
  isExistingMember: Tri;
  hasVisitedBefore: Tri;
  isAccompaniedByMember: Tri;
}

export const UNKNOWN_VISITOR: VisitorProfile = {
  isLocalResident: 'unknown',
  isExistingMember: 'unknown',
  hasVisitedBefore: 'unknown',
  isAccompaniedByMember: 'unknown',
};

/** Products that buy one visit. A week pass is deliberately not in this list. */
const SINGLE_VISIT_PRODUCTS: VisitProductType[] = ['casual_gym_visit', 'day_pass', 'trial'];

/** Products that buy access over several days, priced and labelled separately. */
const MULTI_VISIT_PRODUCTS: VisitProductType[] = ['multi_day_pass', 'week_pass'];

export function isSingleVisitProduct(offer: VisitOffer): boolean {
  return SINGLE_VISIT_PRODUCTS.includes(offer.productType);
}

export function isMultiVisitProduct(offer: VisitOffer): boolean {
  return MULTI_VISIT_PRODUCTS.includes(offer.productType);
}

export function productTypeLabel(productType: VisitProductType): string {
  switch (productType) {
    case 'casual_gym_visit':
      return 'Casual visit';
    case 'day_pass':
      return 'Day pass';
    case 'multi_day_pass':
      return 'Multi-day pass';
    case 'week_pass':
      return 'Week pass';
    case 'pool_only':
      return 'Pool admission only';
    case 'class_only':
      return 'Class entry only';
    case 'trial':
      return 'Trial';
    case 'membership':
      return 'Membership';
  }
}

export type OfferVerdict = 'eligible' | 'needs_confirmation' | 'not_eligible';

export interface OfferAssessment {
  offer: VisitOffer;
  verdict: OfferVerdict;
  reasons: AccessReason[];
  cost: CostBreakdown;
  freshness: FreshnessInfo;
  budget: BudgetVerdict;
}

function restrictionCheck(
  restriction: Tri,
  actual: Tri,
  codes: { blocked: string; unknown: string },
  messages: { blocked: string; unknown: string },
): AccessReason | null {
  if (restriction !== 'yes') return null;
  if (actual === 'yes') return null;
  if (actual === 'no') {
    return { code: codes.blocked, severity: 'blocking', message: messages.blocked };
  }
  return { code: codes.unknown, severity: 'confirm', message: messages.unknown };
}

/**
 * Assess one offer against one person on one date.
 *
 * `budgetMinor` compares against total non-refundable visit cost only.
 * Refundable deposits never count towards it, but are surfaced by the caller
 * as cash needed on the day.
 */
export function assessOffer(
  offer: VisitOffer,
  options: {
    profile?: VisitorProfile;
    visitLocalDate: IsoDate;
    budgetMinor?: number | null;
    asOf?: Date;
    policy?: FreshnessPolicy;
  },
): OfferAssessment {
  const profile = options.profile ?? UNKNOWN_VISITOR;
  const asOf = options.asOf ?? new Date();
  const policy = options.policy ?? DEFAULT_FRESHNESS_POLICY;
  const reasons: AccessReason[] = [];

  if (isOfferExpired(offer, options.visitLocalDate)) {
    reasons.push({
      code: 'offer_expired',
      severity: 'blocking',
      message: `This offer ended on ${offer.availableUntil}.`,
    });
  }
  if (isOfferNotYetAvailable(offer, options.visitLocalDate)) {
    reasons.push({
      code: 'offer_not_started',
      severity: 'blocking',
      message: `This offer starts on ${offer.availableFrom}.`,
    });
  }

  // Does it buy the gym floor at all?
  if (offer.grantsGymFloorAccess === 'no') {
    reasons.push({
      code: 'no_gym_floor_access',
      severity: 'blocking',
      message: `${productTypeLabel(offer.productType)} does not include access to the gym floor.`,
    });
  } else if (offer.grantsGymFloorAccess === 'unknown') {
    reasons.push({
      code: 'gym_floor_access_unknown',
      severity: 'confirm',
      message: 'We have not confirmed that this price includes the gym floor.',
    });
  }

  const eligibility = offer.eligibility;

  const membership = restrictionCheck(
    eligibility.membershipRequired,
    profile.isExistingMember,
    { blocked: 'membership_required', unknown: 'membership_required_unknown' },
    {
      blocked: 'This price is only available to existing members.',
      unknown: 'This price is only available to existing members. Tell us if you are one.',
    },
  );
  if (membership) reasons.push(membership);

  const guest = restrictionCheck(
    eligibility.memberGuestOnly,
    profile.isAccompaniedByMember,
    { blocked: 'member_guest_only', unknown: 'member_guest_only_unknown' },
    {
      blocked: 'This price applies only to guests signed in by a member.',
      unknown: 'This price applies only to guests signed in by a member.',
    },
  );
  if (guest) reasons.push(guest);

  const residency = restrictionCheck(
    eligibility.localResidentOnly,
    profile.isLocalResident,
    { blocked: 'local_resident_only', unknown: 'local_resident_only_unknown' },
    {
      blocked: 'This offer is limited to people who live or work locally.',
      unknown:
        'This offer is limited to people who live or work locally. Confirm you qualify before relying on it.',
    },
  );
  if (residency) reasons.push(residency);

  if (eligibility.firstTimeVisitorOnly === 'yes') {
    if (profile.hasVisitedBefore === 'yes') {
      reasons.push({
        code: 'first_time_only',
        severity: 'blocking',
        message: 'This offer is for first-time visitors only.',
      });
    } else if (profile.hasVisitedBefore === 'unknown') {
      reasons.push({
        code: 'first_time_only_unknown',
        severity: 'confirm',
        message: 'This offer is for first-time visitors only.',
      });
    }
  }

  if (eligibility.photoIdRequired === 'yes') {
    reasons.push({ code: 'offer_photo_id', severity: 'info', message: 'Photo identification required to buy.' });
  }
  if (eligibility.minAgeYears !== null) {
    reasons.push({
      code: 'offer_min_age',
      severity: 'info',
      message: `Minimum age ${eligibility.minAgeYears}.`,
    });
  }
  for (const note of eligibility.notes) {
    reasons.push({ code: 'offer_note', severity: 'info', message: note });
  }

  const cost = computeCost(offer);
  if (!cost.known) {
    reasons.push({
      code: 'total_not_confirmed',
      severity: 'confirm',
      message: `Total not confirmed. ${cost.unknownReasons.join(' ')}`.trim(),
    });
  }

  const freshness = assessFreshness(offer.provenance, 'visitor_price_access', asOf, policy);
  if (freshness.state === 'stale') {
    reasons.push({
      code: 'price_stale',
      severity: 'confirm',
      message: `This price was last checked ${freshness.ageDays} days ago, past our ${freshness.targetDays}-day target.`,
    });
  } else if (freshness.state === 'unknown') {
    reasons.push({
      code: 'price_unchecked',
      severity: 'confirm',
      message: 'This price has no recorded check date.',
    });
  }

  if (offer.provenance.status === 'conflicting') {
    reasons.push({
      code: 'price_conflicting',
      severity: 'confirm',
      message: offer.provenance.conflictNote ?? 'Sources disagree about this price.',
    });
  }

  const budget = budgetVerdict(cost, options.budgetMinor ?? null);
  if (budget === 'over') {
    reasons.push({
      code: 'over_budget',
      severity: 'blocking',
      message: 'Costs more than your stated budget.',
    });
  }

  let verdict: OfferVerdict = 'eligible';
  if (reasons.some((reason) => reason.severity === 'blocking')) verdict = 'not_eligible';
  else if (reasons.some((reason) => reason.severity === 'confirm')) verdict = 'needs_confirmation';

  return { offer, verdict, reasons, cost, freshness, budget };
}

export interface OfferSelection {
  /** Cheapest offer that is eligible with no outstanding questions. */
  confirmed: OfferAssessment | null;
  /** Cheapest offer that could work but has unresolved conditions. */
  unconfirmed: OfferAssessment | null;
  /**
   * The best single-visit price we can describe, whatever its verdict.
   *
   * A gym that only sells a A$32 visit when the budget is A$30 has a recorded
   * price; saying "no price recorded" there would be false. This is what the
   * card shows, together with the reason it does not qualify.
   */
  bestAvailable: OfferAssessment | null;
  /**
   * Cheapest offer whose *only* blocker is the stated budget.
   *
   * Kept separate so "above your budget" is only ever said about an offer
   * that really was otherwise usable — never about an expired one.
   */
  overBudget: OfferAssessment | null;
  /** Everything assessed, for the detail page. */
  all: OfferAssessment[];
}

function cheaper(a: OfferAssessment, b: OfferAssessment): OfferAssessment {
  const aTotal = a.cost.totalNonRefundableMinor;
  const bTotal = b.cost.totalNonRefundableMinor;
  if (aTotal === null) return b;
  if (bTotal === null) return a;
  if (aTotal !== bTotal) return aTotal < bTotal ? a : b;
  // Stable tie-break so ranking does not wobble between identical prices.
  return a.offer.id <= b.offer.id ? a : b;
}

/**
 * Pick the single-visit price to show.
 *
 * Only single-visit products are considered. If a gym sells nothing but a week
 * pass, the answer is "no single-visit price confirmed" and the week pass is
 * shown under its own heading rather than divided into a daily rate.
 */
export function selectSingleVisitOffer(
  offers: VisitOffer[],
  options: {
    profile?: VisitorProfile;
    visitLocalDate: IsoDate;
    budgetMinor?: number | null;
    asOf?: Date;
    policy?: FreshnessPolicy;
  },
): OfferSelection {
  const assessments = offers
    .filter(isSingleVisitProduct)
    .map((offer) => assessOffer(offer, options));

  let confirmed: OfferAssessment | null = null;
  let unconfirmed: OfferAssessment | null = null;
  let overBudget: OfferAssessment | null = null;
  let otherIneligible: OfferAssessment | null = null;

  for (const assessment of assessments) {
    if (assessment.verdict === 'eligible') {
      confirmed = confirmed === null ? assessment : cheaper(confirmed, assessment);
      continue;
    }
    if (assessment.verdict === 'needs_confirmation') {
      unconfirmed = unconfirmed === null ? assessment : cheaper(unconfirmed, assessment);
      continue;
    }

    const blockers = assessment.reasons.filter((reason) => reason.severity === 'blocking');
    if (blockers.length > 0 && blockers.every((reason) => reason.code === 'over_budget')) {
      overBudget = overBudget === null ? assessment : cheaper(overBudget, assessment);
    } else {
      otherIneligible =
        otherIneligible === null ? assessment : cheaper(otherIneligible, assessment);
    }
  }

  return {
    confirmed,
    unconfirmed,
    bestAvailable: confirmed ?? unconfirmed ?? overBudget ?? otherIneligible,
    overBudget,
    all: assessments,
  };
}

/** Assess every offer on a record, for the detail page's full price table. */
export function assessAllOffers(
  offers: VisitOffer[],
  options: {
    profile?: VisitorProfile;
    visitLocalDate: IsoDate;
    asOf?: Date;
    policy?: FreshnessPolicy;
  },
): OfferAssessment[] {
  // Budget is deliberately not applied here: the detail page shows every
  // product with its real price, including ones above the search budget.
  return offers.map((offer) => assessOffer(offer, { ...options, budgetMinor: null }));
}
