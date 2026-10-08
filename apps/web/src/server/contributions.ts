/**
 * Contributions: reviews, corrections, ownership claims, reports and owner
 * replies.
 *
 * Everything written here starts as `pending`. Nothing a contributor submits
 * changes a public fact until a moderator approves it, which is what keeps a
 * pending change from silently overwriting a confirmed one.
 */

import {
  assertCan,
  type ContentReport,
  type Correction,
  type OwnershipClaim,
  type Review,
  type User,
} from '@gymgo/domain';
import type {
  ContentReportInput,
  CorrectionInput,
  OwnerReplyInput,
  OwnershipClaimInput,
  ReviewInput,
} from '@gymgo/domain';
import { mutateStore, newId, nowIso, readStore } from './store';

/** Bounds how fast one account can submit, so the queue cannot be flooded. */
const RATE_LIMITS = {
  reviewsPerDay: 5,
  correctionsPerDay: 20,
  claimsPerDay: 3,
} as const;

export class RateLimitError extends Error {
  readonly status = 429;
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ConflictError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

function withinLastDay(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 86_400_000;
}

export async function submitReview(user: User, input: ReviewInput): Promise<Review> {
  assertCan(user, 'review.create');

  const store = await readStore();
  const recent = store.reviews.filter(
    (review) => review.authorId === user.id && withinLastDay(review.createdAt),
  );
  if (recent.length >= RATE_LIMITS.reviewsPerDay) {
    throw new RateLimitError('You have reached the daily limit for review submissions.');
  }
  if (store.reviews.some((review) => review.authorId === user.id && review.gymId === input.gymId && review.status !== 'rejected')) {
    throw new ConflictError('You have already reviewed this gym.');
  }

  const review: Review = {
    id: newId('rev'),
    gymId: input.gymId,
    authorId: user.id,
    authorDisplayName: user.displayName,
    overall: input.overall,
    equipment: input.equipment,
    cleanliness: input.cleanliness,
    atmosphere: input.atmosphere,
    value: input.value,
    body: input.body,
    visitedOn: input.visitedOn,
    createdAt: nowIso(),
    // Held until a moderator looks at it. No auto-publishing.
    status: 'pending',
    moderationReason: null,
    // There is no visit-evidence mechanism in the pilot, so this is never set.
    // A self-declared visit date is not proof of one.
    verifiedVisit: false,
    ownerReply: null,
  };

  await mutateStore((current) => {
    current.reviews.push(review);
  });
  return review;
}

export async function submitCorrection(
  user: User,
  input: CorrectionInput,
  structured?: StructuredCorrection,
): Promise<Correction> {
  assertCan(user, 'correction.create');

  const store = await readStore();
  const recent = store.corrections.filter(
    (correction) => correction.submittedBy === user.id && withinLastDay(correction.submittedAt),
  );
  if (recent.length >= RATE_LIMITS.correctionsPerDay) {
    throw new RateLimitError('You have reached the daily limit for correction submissions.');
  }

  const correction: Correction = {
    id: newId('cor'),
    gymId: input.gymId,
    targetKind: input.targetKind,
    targetId: input.targetId,
    proposedValue: input.proposedValue,
    evidenceNote: input.evidenceNote,
    evidenceUrl: input.evidenceUrl,
    submittedBy: user.id,
    submittedAt: nowIso(),
    status: 'pending',
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
  };

  await mutateStore((current) => {
    current.corrections.push(correction);
    if (structured) current.pendingStructured = { ...(current.pendingStructured ?? {}), [correction.id]: structured };
  });
  return correction;
}

/**
 * The machine-readable part of a correction, where the person gave one.
 *
 * Free-text corrections can still be approved, but they become an annotation
 * shown beside the fact rather than a silent overwrite of it.
 */
export type StructuredCorrection =
  | { kind: 'offer_price'; offerId: string; baseAmountMinor: number }
  | { kind: 'equipment'; equipmentTypeId: string; presence: 'yes' | 'no'; maxWeightKg: number | null; count: number | null }
  | { kind: 'operating_status'; status: 'open' | 'temporarily_closed' | 'permanently_closed'; note: string };

export async function submitOwnershipClaim(
  user: User,
  input: OwnershipClaimInput,
): Promise<OwnershipClaim> {
  assertCan(user, 'claim.create');

  const store = await readStore();
  const recent = store.claims.filter(
    (claim) => claim.userId === user.id && withinLastDay(claim.submittedAt),
  );
  if (recent.length >= RATE_LIMITS.claimsPerDay) {
    throw new RateLimitError('You have reached the daily limit for ownership claims.');
  }
  if (store.claims.some((claim) => claim.userId === user.id && claim.gymId === input.gymId && claim.status === 'pending')) {
    throw new ConflictError('You already have a claim pending on this gym.');
  }

  const claimId = newId('clm');
  const claim: OwnershipClaim = {
    id: claimId,
    gymId: input.gymId,
    userId: user.id,
    claimantName: input.claimantName,
    claimantRole: input.claimantRole,
    evidenceType: input.evidenceType,
    // Stored on the claim for the admin view; the public API never returns it.
    evidenceRef: input.evidenceRef,
    submittedAt: nowIso(),
    // Submitting a claim grants nothing. Editing waits on approval.
    status: 'pending',
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
  };

  await mutateStore((current) => {
    current.claims.push(claim);
    current.privateEvidence.push({
      claimId,
      evidenceRef: input.evidenceRef,
      storedAt: nowIso(),
      retentionNote:
        'Kept only while the claim is open and for 90 days after a decision, then deleted with the claim.',
    });
  });
  return claim;
}

export async function submitOwnerReply(user: User, gymId: string, input: OwnerReplyInput): Promise<void> {
  assertCan(user, 'gym.reply_to_review', { gymId });

  await mutateStore((store) => {
    const review = store.reviews.find((candidate) => candidate.id === input.reviewId);
    if (!review) throw new ConflictError('That review no longer exists.');
    if (review.gymId !== gymId) {
      // An owner replying to a review on a different branch is exactly the
      // cross-tenant case the permission check exists to stop.
      throw new ConflictError('That review is not about this gym.');
    }
    review.ownerReply = {
      authorId: user.id,
      body: input.body,
      createdAt: nowIso(),
      status: 'pending',
    };
  });
}

export async function reportContent(user: User, input: ContentReportInput): Promise<ContentReport> {
  const report: ContentReport = {
    id: newId('rep'),
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    // Anonymous reports are accepted: requiring an account to report abuse
    // would leave the worst content up the longest.
    reportedBy: user.id,
    reason: input.reason,
    createdAt: nowIso(),
    status: 'open',
  };
  await mutateStore((store) => {
    store.contentReports.push(report);
  });
  return report;
}
