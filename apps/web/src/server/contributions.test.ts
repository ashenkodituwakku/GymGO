/**
 * Contribution and moderation rules, against the real store.
 *
 * These use a temporary data directory and exercise the same service
 * functions the API routes call, so the authorisation checks under test are
 * the ones that actually run in production paths.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ANONYMOUS, type User } from '@gymgo/domain';
import { mutateStore, readStore, resetStoreCache } from './store';
import { reportContent, submitCorrection, submitOwnerReply, submitOwnershipClaim, submitReview } from './contributions';
import { blockUser, decideClaim, decideCorrection, decideReview, loadQueue, removeReview } from './moderation';

let directory: string;

const member: User = {
  id: 'u-member',
  displayName: 'Member',
  role: 'member',
  ownedGymIds: [],
  blocked: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const moderator: User = { ...member, id: 'u-mod', displayName: 'Mod', role: 'moderator' };
const admin: User = { ...member, id: 'u-admin', displayName: 'Admin', role: 'admin' };
const ownerOfA: User = {
  ...member,
  id: 'u-owner',
  displayName: 'Owner',
  role: 'owner',
  ownedGymIds: ['gym-a'],
};

const review = (gymId = 'gym-a') => ({
  gymId,
  overall: 4,
  equipment: null,
  cleanliness: null,
  atmosphere: null,
  value: null,
  body: 'A perfectly ordinary review body.',
  visitedOn: null,
});

const correction = (gymId = 'gym-a') => ({
  gymId,
  targetKind: 'offer_price' as const,
  targetId: 'gym-a-casual',
  proposedValue: 'It is A$24 now.',
  evidenceNote: 'Paid it last week.',
  evidenceUrl: null,
});

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'gymgo-test-'));
  process.env.GYMGO_DATA_DIR = directory;
  resetStoreCache();
  // Seed copies, not the shared fixtures: the store mutates user records in
  // place, and a test that blocks an account must not leak into the next one.
  await mutateStore((store) => {
    store.users.push({ ...member }, { ...moderator }, { ...admin }, { ...ownerOfA });
  });
});

afterEach(async () => {
  resetStoreCache();
  delete process.env.GYMGO_DATA_DIR;
  await rm(directory, { recursive: true, force: true });
});

describe('submitting contributions', () => {
  it('refuses an anonymous review, correction or claim', async () => {
    await expect(submitReview(ANONYMOUS, review())).rejects.toThrow(/permitted/);
    await expect(submitCorrection(ANONYMOUS, correction())).rejects.toThrow(/permitted/);
    await expect(
      submitOwnershipClaim(ANONYMOUS, {
        gymId: 'gym-a',
        claimantName: 'A',
        claimantRole: 'Manager',
        evidenceType: 'work_email_domain',
        evidenceRef: 'a@example.invalid',
      }),
    ).rejects.toThrow(/permitted/);
  });

  it('holds a new review as pending, never published', async () => {
    const created = await submitReview(member, review());
    expect(created.status).toBe('pending');
    // Nothing a contributor sends can set this.
    expect(created.verifiedVisit).toBe(false);
  });

  it('refuses a second review of the same gym from the same account', async () => {
    await submitReview(member, review());
    await expect(submitReview(member, review())).rejects.toThrow(/already reviewed/);
  });

  it('rate limits reviews per day', async () => {
    for (let index = 0; index < 5; index += 1) {
      await submitReview(member, review(`gym-${index}`));
    }
    await expect(submitReview(member, review('gym-extra'))).rejects.toThrow(/daily limit/);
  });

  it('accepts an anonymous abuse report', async () => {
    const report = await reportContent(ANONYMOUS, {
      subjectType: 'gym',
      subjectId: 'gym-a',
      reason: 'This listing is for a business that never existed.',
    });
    expect(report.status).toBe('open');
  });

  it('keeps a pending correction out of the public record until it is decided', async () => {
    await submitCorrection(member, correction());
    const store = await readStore();
    expect(store.corrections[0]?.status).toBe('pending');
    // Nothing has been applied to any gym yet.
    expect(store.appliedPatches).toHaveLength(0);
  });

  it('files ownership evidence privately and grants nothing on submission', async () => {
    const claim = await submitOwnershipClaim(member, {
      gymId: 'gym-a',
      claimantName: 'Jo',
      claimantRole: 'Manager',
      evidenceType: 'work_email_domain',
      evidenceRef: 'jo@gym-a.example.invalid',
    });

    expect(claim.status).toBe('pending');
    const store = await readStore();
    expect(store.privateEvidence[0]?.evidenceRef).toBe('jo@gym-a.example.invalid');
    // The account has gained nothing.
    expect(store.users.find((user) => user.id === member.id)?.ownedGymIds).toEqual([]);
  });

  it('refuses a duplicate pending claim on the same gym', async () => {
    const input = {
      gymId: 'gym-a',
      claimantName: 'Jo',
      claimantRole: 'Manager',
      evidenceType: 'work_email_domain' as const,
      evidenceRef: 'jo@gym-a.example.invalid',
    };
    await submitOwnershipClaim(member, input);
    await expect(submitOwnershipClaim(member, input)).rejects.toThrow(/already have a claim/);
  });
});

describe('owner boundaries', () => {
  it('refuses a reply from an owner of a different branch', async () => {
    const created = await submitReview(member, review('gym-b'));
    await expect(
      submitOwnerReply(ownerOfA, 'gym-b', { reviewId: created.id, body: 'Thanks.' }),
    ).rejects.toThrow(/permitted/);
  });

  it('refuses a reply that names the owner’s gym but another gym’s review', async () => {
    const created = await submitReview(member, review('gym-b'));
    await expect(
      submitOwnerReply(ownerOfA, 'gym-a', { reviewId: created.id, body: 'Thanks.' }),
    ).rejects.toThrow(/not about this gym/);
  });

  it('allows a reply on the owner’s own branch, held for moderation', async () => {
    const created = await submitReview(member, review('gym-a'));
    await submitOwnerReply(ownerOfA, 'gym-a', { reviewId: created.id, body: 'Thanks for visiting.' });
    const store = await readStore();
    expect(store.reviews[0]?.ownerReply?.status).toBe('pending');
  });

  it('does not let an owner remove a review about their own gym', async () => {
    const created = await submitReview(member, review('gym-a'));
    await expect(removeReview(ownerOfA, created.id, 'Unflattering')).rejects.toThrow(/permitted/);
  });

  it('does not let an owner moderate reviews', async () => {
    const created = await submitReview(member, review('gym-a'));
    await expect(decideReview(ownerOfA, created.id, 'reject', 'No')).rejects.toThrow(/permitted/);
  });
});

describe('moderation', () => {
  it('publishes a review and records why', async () => {
    const created = await submitReview(member, review());
    await decideReview(moderator, created.id, 'approve', 'Meets the guidelines.');

    const store = await readStore();
    expect(store.reviews[0]?.status).toBe('published');
    expect(store.moderationEvents[0]).toMatchObject({
      actorId: 'u-mod',
      action: 'review_published',
      reason: 'Meets the guidelines.',
    });
  });

  it('applies a structured correction with provenance naming the moderator', async () => {
    const created = await submitCorrection(member, correction(), {
      kind: 'offer_price',
      offerId: 'gym-a-casual',
      baseAmountMinor: 2400,
    });
    await decideCorrection(moderator, created.id, 'approve', 'Receipt checked.');

    const store = await readStore();
    const patch = store.appliedPatches[0];
    expect(patch?.change).toEqual({ kind: 'offer_price', offerId: 'gym-a-casual', baseAmountMinor: 2400 });
    expect(patch?.appliedBy).toBe('u-mod');
    // The structured payload is consumed, not left to be applied twice.
    expect(store.pendingStructured[created.id]).toBeUndefined();
  });

  it('publishes a free-text correction beside the fact instead of overwriting it', async () => {
    const created = await submitCorrection(member, { ...correction(), targetKind: 'other', targetId: null });
    await decideCorrection(moderator, created.id, 'approve', 'Plausible and useful.');

    const store = await readStore();
    expect(store.appliedPatches[0]?.change.kind).toBe('annotation');
  });

  it('applies nothing when a correction is rejected', async () => {
    const created = await submitCorrection(member, correction());
    await decideCorrection(moderator, created.id, 'reject', 'No evidence supplied.');

    const store = await readStore();
    expect(store.appliedPatches).toHaveLength(0);
    expect(store.corrections[0]?.status).toBe('rejected');
  });

  it('hides ownership claims from moderators and shows them to administrators', async () => {
    await submitOwnershipClaim(member, {
      gymId: 'gym-a',
      claimantName: 'Jo',
      claimantRole: 'Manager',
      evidenceType: 'phone_callback',
      evidenceRef: '+61 2 5550 0000',
    });

    expect((await loadQueue(moderator)).claims).toHaveLength(0);
    expect((await loadQueue(admin)).claims).toHaveLength(1);
  });

  it('refuses a moderator deciding an ownership claim', async () => {
    const claim = await submitOwnershipClaim(member, {
      gymId: 'gym-a',
      claimantName: 'Jo',
      claimantRole: 'Manager',
      evidenceType: 'phone_callback',
      evidenceRef: '+61 2 5550 0000',
    });
    await expect(decideClaim(moderator, claim.id, 'approve', 'Looks fine')).rejects.toThrow(/permitted/);
  });

  it('grants branch-scoped ownership when an administrator approves a claim', async () => {
    const claim = await submitOwnershipClaim(member, {
      gymId: 'gym-a',
      claimantName: 'Jo',
      claimantRole: 'Manager',
      evidenceType: 'work_email_domain',
      evidenceRef: 'jo@gym-a.example.invalid',
    });
    await decideClaim(admin, claim.id, 'approve', 'Replied from the published domain.');

    const store = await readStore();
    const updated = store.users.find((user) => user.id === member.id);
    expect(updated?.role).toBe('owner');
    expect(updated?.ownedGymIds).toEqual(['gym-a']);
    // Ownership confirms identity. It does not mark any fact as verified.
    expect(store.appliedPatches).toHaveLength(0);
  });

  it('refuses anybody deciding their own claim', async () => {
    const claim = await submitOwnershipClaim(admin, {
      gymId: 'gym-a',
      claimantName: 'Robin',
      claimantRole: 'Also the admin',
      evidenceType: 'business_document',
      evidenceRef: 'doc-1',
    });
    await expect(decideClaim(admin, claim.id, 'approve', 'Trust me')).rejects.toThrow(/own ownership claim/);
  });

  it('stops a blocked account contributing anything further', async () => {
    await blockUser(moderator, member.id, 'Repeated abuse reports upheld.');
    const store = await readStore();
    const blocked = store.users.find((user) => user.id === member.id);
    expect(blocked?.blocked).toBe(true);
    await expect(submitReview({ ...member, blocked: true }, review('gym-x'))).rejects.toThrow(/permitted/);
  });

  it('keeps the audit reason public and the evidence out of it', async () => {
    const claim = await submitOwnershipClaim(member, {
      gymId: 'gym-a',
      claimantName: 'Jo',
      claimantRole: 'Manager',
      evidenceType: 'work_email_domain',
      evidenceRef: 'jo@gym-a.example.invalid',
    });
    await decideClaim(admin, claim.id, 'approve', 'Domain reply confirmed.');

    const store = await readStore();
    const event = store.moderationEvents.find((candidate) => candidate.action === 'claim_approved');
    expect(event?.reason).toBe('Domain reply confirmed.');
    expect(JSON.stringify(event)).not.toContain('jo@gym-a.example.invalid');
  });
});
