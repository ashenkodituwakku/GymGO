/**
 * Moderation.
 *
 * Two things are kept deliberately separate here:
 *
 *  - Confirming *who someone is* (an ownership claim) is not the same as
 *    confirming *that a fact is true*. Approving a claim marks one person as
 *    the operator; it does not stamp "verified" on their price list.
 *  - Every decision writes an audit event with a public-safe reason. The
 *    evidence behind a claim stays in the private store.
 */

import {
  assertCan,
  grantOwnership,
  type Correction,
  type ModerationAction,
  type ModerationEvent,
  type OwnershipClaim,
  type Review,
  type User,
} from '@gymgo/domain';
import { mutateStore, newId, nowIso, readStore, type AppliedPatch, type StructuredChange } from './store';
import { ConflictError } from './contributions';

function recordEvent(
  store: { moderationEvents: ModerationEvent[] },
  event: Omit<ModerationEvent, 'id' | 'createdAt'>,
): void {
  store.moderationEvents.push({ ...event, id: newId('mod'), createdAt: nowIso() });
}

export interface ModerationQueue {
  reviews: Review[];
  corrections: Correction[];
  /** Only populated for callers allowed to decide claims. */
  claims: OwnershipClaim[];
  reports: Array<{ id: string; subjectType: string; subjectId: string; reason: string; createdAt: string }>;
  pendingOwnerReplies: Review[];
}

/**
 * The queue, filtered to what the caller may actually act on.
 *
 * Claims carry personal evidence, so a moderator sees none of them; that is an
 * admin view.
 */
export async function loadQueue(user: User): Promise<ModerationQueue> {
  assertCan(user, 'moderation.view_queue');
  const store = await readStore();
  const canSeeClaims = (() => {
    try {
      assertCan(user, 'claim.moderate');
      return true;
    } catch {
      return false;
    }
  })();

  return {
    reviews: store.reviews.filter((review) => review.status === 'pending'),
    corrections: store.corrections.filter((correction) => correction.status === 'pending'),
    claims: canSeeClaims ? store.claims.filter((claim) => claim.status === 'pending') : [],
    reports: store.contentReports
      .filter((report) => report.status === 'open')
      .map(({ id, subjectType, subjectId, reason, createdAt }) => ({
        id,
        subjectType,
        subjectId,
        reason,
        createdAt,
      })),
    pendingOwnerReplies: store.reviews.filter((review) => review.ownerReply?.status === 'pending'),
  };
}

export async function decideReview(
  user: User,
  reviewId: string,
  decision: 'approve' | 'reject',
  reason: string,
): Promise<void> {
  assertCan(user, 'review.moderate');

  await mutateStore((store) => {
    const review = store.reviews.find((candidate) => candidate.id === reviewId);
    if (!review) throw new ConflictError('That review no longer exists.');

    review.status = decision === 'approve' ? 'published' : 'rejected';
    review.moderationReason = reason;
    recordEvent(store, {
      actorId: user.id,
      action: decision === 'approve' ? 'review_published' : 'review_rejected',
      subjectType: 'review',
      subjectId: review.id,
      gymId: review.gymId,
      reason,
    });
  });
}

export async function removeReview(user: User, reviewId: string, reason: string): Promise<void> {
  // Note the permission: owners do not have it. A gym cannot delete a
  // legitimate negative review about itself.
  assertCan(user, 'review.remove');

  await mutateStore((store) => {
    const review = store.reviews.find((candidate) => candidate.id === reviewId);
    if (!review) throw new ConflictError('That review no longer exists.');
    review.status = 'removed';
    review.moderationReason = reason;
    recordEvent(store, {
      actorId: user.id,
      action: 'review_removed',
      subjectType: 'review',
      subjectId: review.id,
      gymId: review.gymId,
      reason,
    });
  });
}

export async function decideOwnerReply(
  user: User,
  reviewId: string,
  decision: 'approve' | 'reject',
  reason: string,
): Promise<void> {
  assertCan(user, 'review.moderate');
  await mutateStore((store) => {
    const review = store.reviews.find((candidate) => candidate.id === reviewId);
    if (!review?.ownerReply) throw new ConflictError('There is no pending reply on that review.');
    review.ownerReply.status = decision === 'approve' ? 'published' : 'rejected';
    recordEvent(store, {
      actorId: user.id,
      action: 'owner_reply_published',
      subjectType: 'review',
      subjectId: review.id,
      gymId: review.gymId,
      reason,
    });
  });
}

export async function decideCorrection(
  user: User,
  correctionId: string,
  decision: 'approve' | 'reject',
  reason: string,
): Promise<void> {
  assertCan(user, 'correction.moderate');

  await mutateStore((store) => {
    const correction = store.corrections.find((candidate) => candidate.id === correctionId);
    if (!correction) throw new ConflictError('That correction no longer exists.');

    correction.status = decision === 'approve' ? 'published' : 'rejected';
    correction.decidedBy = user.id;
    correction.decidedAt = nowIso();
    correction.decisionReason = reason;

    if (decision === 'approve') {
      const structured: StructuredChange | undefined = store.pendingStructured?.[correction.id];
      const patch: AppliedPatch = {
        id: newId('pat'),
        correctionId: correction.id,
        gymId: correction.gymId,
        targetKind: correction.targetKind,
        targetId: correction.targetId,
        // Without machine-readable values we do not guess at a structured
        // change; the correction is published beside the fact instead.
        change: structured ?? { kind: 'annotation', text: correction.proposedValue },
        appliedBy: user.id,
        appliedAt: nowIso(),
      };
      store.appliedPatches.push(patch);
    }

    delete store.pendingStructured?.[correction.id];

    recordEvent(store, {
      actorId: user.id,
      action: decision === 'approve' ? 'correction_approved' : 'correction_rejected',
      subjectType: 'correction',
      subjectId: correction.id,
      gymId: correction.gymId,
      reason,
    });
  });
}

export async function decideClaim(
  user: User,
  claimId: string,
  decision: 'approve' | 'reject',
  reason: string,
): Promise<void> {
  assertCan(user, 'claim.moderate');

  await mutateStore((store) => {
    const claim = store.claims.find((candidate) => candidate.id === claimId);
    if (!claim) throw new ConflictError('That claim no longer exists.');
    if (claim.userId === user.id) {
      // Nobody approves their own claim, whatever role they hold.
      throw new ConflictError('You cannot decide your own ownership claim.');
    }

    claim.status = decision === 'approve' ? 'published' : 'rejected';
    claim.decidedBy = user.id;
    claim.decidedAt = nowIso();
    claim.decisionReason = reason;

    if (decision === 'approve') {
      const index = store.users.findIndex((candidate) => candidate.id === claim.userId);
      if (index >= 0) {
        const existing = store.users[index];
        if (existing) {
          // Ownership of one branch only, and no moderation powers with it.
          store.users[index] = grantOwnership(existing, claim.gymId);
        }
      }
    }

    recordEvent(store, {
      actorId: user.id,
      action: decision === 'approve' ? 'claim_approved' : 'claim_rejected',
      subjectType: 'claim',
      subjectId: claim.id,
      gymId: claim.gymId,
      // The reason is public-safe. The evidence stays in privateEvidence.
      reason,
    });
  });
}

export async function blockUser(user: User, targetUserId: string, reason: string): Promise<void> {
  assertCan(user, 'user.block');
  await mutateStore((store) => {
    const target = store.users.find((candidate) => candidate.id === targetUserId);
    if (!target) throw new ConflictError('No such account.');
    target.blocked = true;
    recordEvent(store, {
      actorId: user.id,
      action: 'user_blocked',
      subjectType: 'user',
      subjectId: targetUserId,
      gymId: null,
      reason,
    });
  });
}

export async function dismissReport(user: User, reportId: string, reason: string): Promise<void> {
  assertCan(user, 'moderation.view_queue');
  await mutateStore((store) => {
    const report = store.contentReports.find((candidate) => candidate.id === reportId);
    if (!report) throw new ConflictError('No such report.');
    report.status = 'dismissed';
    recordEvent(store, {
      actorId: user.id,
      action: 'content_reported',
      subjectType: report.subjectType,
      subjectId: report.subjectId,
      gymId: null,
      reason,
    });
  });
}

/** The public audit trail for one gym. Reasons only, never evidence. */
export async function loadAuditTrail(gymId: string): Promise<ModerationEvent[]> {
  const store = await readStore();
  return store.moderationEvents
    .filter((event) => event.gymId === gymId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const MODERATION_ACTION_LABELS: Record<ModerationAction, string> = {
  correction_approved: 'Correction approved',
  correction_rejected: 'Correction rejected',
  review_published: 'Review published',
  review_rejected: 'Review rejected',
  review_removed: 'Review removed',
  owner_reply_published: 'Owner reply published',
  claim_approved: 'Ownership claim approved',
  claim_rejected: 'Ownership claim rejected',
  user_blocked: 'Account blocked',
  content_reported: 'Report handled',
  duplicate_merged: 'Duplicate records merged',
  record_marked_stale: 'Record marked for recheck',
};
