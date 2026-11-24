/**
 * Can a visitor actually get in, at the time they asked about?
 *
 * The three schedules (member, staffed, visitor) are evaluated separately and
 * never substituted for one another. A 24-hour member door tells us nothing
 * about guest entry, so an unknown visitor schedule stays unknown.
 */

import { assessFreshness, type FreshnessInfo } from './freshness';
import { describeNextOpening, isOpenAt, type OpenCheck } from './time';
import {
  DEFAULT_FRESHNESS_POLICY,
  type AccessAudience,
  type AccessSchedule,
  type FreshnessPolicy,
  type GymRecord,
  type Tri,
} from './types';

export type AccessVerdict =
  | 'admits_visitor'
  | 'needs_confirmation'
  | 'not_admitted'
  | 'unknown';

export type ReasonSeverity =
  /** Rules the gym out for this request. */
  | 'blocking'
  /** Something the person must resolve before they can rely on the answer. */
  | 'confirm'
  /** Worth knowing, does not change the verdict. */
  | 'info';

export interface AccessReason {
  code: string;
  message: string;
  severity: ReasonSeverity;
}

export interface VisitorAccessResult {
  verdict: AccessVerdict;
  reasons: AccessReason[];
  visitorSchedule: AccessSchedule | null;
  memberSchedule: AccessSchedule | null;
  staffedSchedule: AccessSchedule | null;
  visitorOpen: OpenCheck | null;
  staffedOpen: OpenCheck | null;
  freshness: FreshnessInfo | null;
}

export function scheduleFor(
  record: GymRecord,
  audience: AccessAudience,
): AccessSchedule | null {
  return record.schedules.find((schedule) => schedule.audience === audience) ?? null;
}

function scheduleIsEstablished(schedule: AccessSchedule | null): schedule is AccessSchedule {
  if (schedule === null) return false;
  if (schedule.provenance.status === 'unknown') return false;
  return schedule.alwaysOpen || schedule.windows.length > 0 || schedule.exceptions.length > 0;
}

/**
 * Evaluate visitor admission for one instant.
 *
 * `asOf` is "now" and is used for freshness and booking lead time; `instant`
 * is the time the person wants to train.
 */
export function evaluateVisitorAccess(
  record: GymRecord,
  instant: Date,
  options: { asOf?: Date; policy?: FreshnessPolicy } = {},
): VisitorAccessResult {
  const asOf = options.asOf ?? new Date();
  const policy = options.policy ?? DEFAULT_FRESHNESS_POLICY;

  const visitorSchedule = scheduleFor(record, 'visitor');
  const memberSchedule = scheduleFor(record, 'member');
  const staffedSchedule = scheduleFor(record, 'staffed');

  const reasons: AccessReason[] = [];
  let visitorOpen: OpenCheck | null = null;
  let staffedOpen: OpenCheck | null = null;
  let freshness: FreshnessInfo | null = null;

  // --- Operating status -----------------------------------------------------
  const status = record.location.operatingStatus;
  if (status === 'temporarily_closed' || status === 'permanently_closed') {
    reasons.push({
      code: 'gym_closed',
      severity: 'blocking',
      message:
        record.location.operatingStatusNote ??
        (status === 'temporarily_closed'
          ? 'This gym is temporarily closed.'
          : 'This gym has permanently closed.'),
    });
  } else if (status === 'unknown') {
    reasons.push({
      code: 'operating_status_unknown',
      severity: 'confirm',
      // A specific doubt ("it may have closed: …") says so; otherwise the usual line.
      message: record.location.operatingStatusNote?.startsWith('It may have closed')
        ? record.location.operatingStatusNote
        : 'We haven’t confirmed this gym is still open.',
    });
  }

  // --- Visitor schedule -----------------------------------------------------
  if (!scheduleIsEstablished(visitorSchedule)) {
    const memberNote = scheduleIsEstablished(memberSchedule)
      ? memberSchedule.alwaysOpen
        ? ' Members have 24-hour access, but guest hours may differ.'
        : ' We only have member hours, and guest hours may differ.'
      : '';
    reasons.push({
      code: 'visitor_hours_unknown',
      severity: 'confirm',
      message: `Guest hours aren’t confirmed.${memberNote}`,
    });
  } else {
    freshness = assessFreshness(visitorSchedule.provenance, 'visitor_price_access', asOf, policy);
    visitorOpen = isOpenAt(visitorSchedule, instant);

    if (!visitorOpen.open) {
      const next = describeNextOpening(visitorSchedule, instant);
      const exceptionNote = visitorOpen.exceptionNote ? ` ${visitorOpen.exceptionNote}` : '';
      reasons.push({
        code: 'outside_visitor_hours',
        severity: 'blocking',
        message:
          `Guests aren’t allowed in at that time.${exceptionNote}` +
          (next ? ` Next guest entry: ${next}.` : ''),
      });
    } else if (visitorOpen.exceptionNote) {
      reasons.push({
        code: 'visitor_hours_exception',
        severity: 'info',
        message: visitorOpen.exceptionNote,
      });
    }

    if (freshness.state === 'stale') {
      reasons.push({
        code: 'visitor_hours_stale',
        severity: 'confirm',
        message: `Guest hours were last checked ${freshness.ageDays} days ago and may be out of date (we aim for every ${freshness.targetDays} days).`,
      });
    }
  }

  if (scheduleIsEstablished(staffedSchedule)) {
    staffedOpen = isOpenAt(staffedSchedule, instant);
  }

  // --- Entry prerequisites --------------------------------------------------
  reasons.push(...prerequisiteReasons(record, instant, asOf, staffedOpen));

  const verdict = verdictFrom(reasons, scheduleIsEstablished(visitorSchedule));
  return {
    verdict,
    reasons,
    visitorSchedule,
    memberSchedule,
    staffedSchedule,
    visitorOpen,
    staffedOpen,
    freshness,
  };
}

function prerequisiteReasons(
  record: GymRecord,
  instant: Date,
  asOf: Date,
  staffedOpen: OpenCheck | null,
): AccessReason[] {
  const prerequisites = record.prerequisites;
  const reasons: AccessReason[] = [];

  // Advance booking
  if (prerequisites.advanceBookingRequired === 'yes') {
    const lead = prerequisites.bookingLeadTimeHours;
    const hoursAway = (instant.getTime() - asOf.getTime()) / 3_600_000;
    const tooLate = lead !== null && hoursAway < lead;
    reasons.push({
      code: 'booking_required',
      severity: 'confirm',
      message: tooLate
        ? `Booking is required, usually ${lead} hours ahead. Your visit is ${Math.max(0, Math.round(hoursAway))} hours away, so check with the gym first.`
        : lead === null
          ? 'Booking is required. How far ahead isn’t confirmed.'
          : `Booking is required at least ${lead} hours ahead.`,
    });
  } else if (prerequisites.advanceBookingRequired === 'unknown') {
    reasons.push({
      code: 'booking_unknown',
      severity: 'confirm',
      message: 'We haven’t confirmed whether you need to book.',
    });
  }

  // First-visit induction
  if (prerequisites.inductionRequired === 'yes') {
    const staffedOnly = prerequisites.inductionAvailableDuringStaffedHoursOnly === 'yes';
    const staffedClosed = staffedOnly && staffedOpen !== null && !staffedOpen.open;
    reasons.push({
      code: 'induction_required',
      severity: 'confirm',
      message: staffedClosed
        ? 'First-time visitors need an induction, which needs staff on reception. Reception isn’t staffed at that time.'
        : 'First-time visitors need an induction before training.',
    });
  } else if (prerequisites.inductionRequired === 'unknown') {
    reasons.push({
      code: 'induction_unknown',
      severity: 'confirm',
      message: 'We haven’t confirmed whether first-time visitors need an induction.',
    });
  }

  // Residency
  if (prerequisites.residencyRule === 'local_resident_only') {
    reasons.push({
      code: 'residency_restricted',
      severity: 'confirm',
      message: 'Guest entry is only for people who live or work locally.',
    });
  } else if (prerequisites.residencyRule === 'non_local_only') {
    reasons.push({
      code: 'residency_restricted_non_local',
      severity: 'confirm',
      message: 'Guest entry is only for people who don’t live locally.',
    });
  } else if (prerequisites.residencyRule === 'unknown') {
    reasons.push({
      code: 'residency_unknown',
      severity: 'info',
      message: 'We haven’t confirmed whether guest entry depends on where you live.',
    });
  }

  // Member accompaniment
  if (prerequisites.memberAccompanimentRequired === 'yes') {
    reasons.push({
      code: 'member_accompaniment_required',
      severity: 'confirm',
      message: 'A member needs to sign you in.',
    });
  } else if (prerequisites.memberAccompanimentRequired === 'unknown') {
    reasons.push({
      code: 'member_accompaniment_unknown',
      severity: 'info',
      message: 'We haven’t confirmed whether a member needs to sign you in.',
    });
  }

  // Identification and age are things the person can check for themselves.
  if (prerequisites.photoIdRequired === 'yes') {
    reasons.push({
      code: 'photo_id_required',
      severity: 'info',
      message: 'Bring photo ID.',
    });
  }
  if (prerequisites.minAgeYears !== null) {
    reasons.push({
      code: 'minimum_age',
      severity: 'info',
      message: `Minimum age ${prerequisites.minAgeYears}.`,
    });
  }
  for (const note of prerequisites.notes) {
    reasons.push({ code: 'prerequisite_note', severity: 'info', message: note });
  }

  return reasons;
}

function verdictFrom(reasons: AccessReason[], visitorScheduleKnown: boolean): AccessVerdict {
  if (reasons.some((reason) => reason.severity === 'blocking')) return 'not_admitted';
  if (reasons.some((reason) => reason.severity === 'confirm')) return 'needs_confirmation';
  if (!visitorScheduleKnown) return 'unknown';
  return 'admits_visitor';
}

/** Short label for the verdict, used on cards and in comparison. */
export function accessVerdictLabel(verdict: AccessVerdict): string {
  switch (verdict) {
    case 'admits_visitor':
      return 'Guests welcome';
    case 'needs_confirmation':
      return 'Check first';
    case 'not_admitted':
      return 'Closed to guests then';
    case 'unknown':
      return 'Unknown';
  }
}

/** Tri-state helper used across the eligibility rules. */
export function triSatisfies(required: Tri, actual: Tri): 'yes' | 'no' | 'unknown' {
  if (required !== 'yes') return 'yes';
  return actual;
}
