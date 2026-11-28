/**
 * Authorisation. Each of these is a route the server re-checks; hiding a
 * button in the client is not one of the controls under test.
 */

import { describe, expect, it } from 'vitest';
import { ANONYMOUS, assertCan, can, grantOwnership } from './authz';
import type { User } from './types';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    displayName: 'Test',
    role: 'member',
    ownedGymIds: [],
    blocked: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('can', () => {
  it('lets anyone browse but not contribute anonymously', () => {
    expect(can(ANONYMOUS, 'review.create')).toBe(false);
    expect(can(ANONYMOUS, 'correction.create')).toBe(false);
    expect(can(ANONYMOUS, 'claim.create')).toBe(false);
  });

  it('lets a signed-in member contribute', () => {
    expect(can(user(), 'review.create')).toBe(true);
    expect(can(user(), 'correction.create')).toBe(true);
  });

  it('stops an ordinary member moderating', () => {
    expect(can(user(), 'review.moderate')).toBe(false);
    expect(can(user(), 'correction.moderate')).toBe(false);
    expect(can(user(), 'moderation.view_queue')).toBe(false);
  });

  it('scopes an owner to the branches they were approved for', () => {
    const owner = user({ role: 'owner', ownedGymIds: ['gym-a'] });
    expect(can(owner, 'gym.edit', { gymId: 'gym-a' })).toBe(true);
    expect(can(owner, 'gym.edit', { gymId: 'gym-b' })).toBe(false);
    expect(can(owner, 'gym.reply_to_review', { gymId: 'gym-b' })).toBe(false);
  });

  it('does not let an owner remove reviews about their own gym', () => {
    const owner = user({ role: 'owner', ownedGymIds: ['gym-a'] });
    expect(can(owner, 'review.remove', { gymId: 'gym-a' })).toBe(false);
    expect(can(owner, 'review.moderate', { gymId: 'gym-a' })).toBe(false);
    // They can reply, which is the legitimate route.
    expect(can(owner, 'gym.reply_to_review', { gymId: 'gym-a' })).toBe(true);
  });

  it('does not let an owner approve ownership claims, including their own', () => {
    const owner = user({ role: 'owner', ownedGymIds: ['gym-a'] });
    expect(can(owner, 'claim.moderate', { gymId: 'gym-a' })).toBe(false);
  });

  it('keeps private ownership evidence behind the admin role', () => {
    expect(can(user({ role: 'moderator' }), 'moderation.view_private_evidence')).toBe(false);
    expect(can(user({ role: 'admin' }), 'moderation.view_private_evidence')).toBe(true);
  });

  it('refuses everything to a blocked user', () => {
    const blocked = user({ role: 'admin', blocked: true });
    expect(can(blocked, 'review.create')).toBe(false);
    expect(can(blocked, 'moderation.view_queue')).toBe(false);
  });

  it('refuses a branch-scoped permission when no branch was supplied', () => {
    const owner = user({ role: 'owner', ownedGymIds: ['gym-a'] });
    expect(can(owner, 'gym.edit')).toBe(false);
  });
});

describe('assertCan', () => {
  it('throws a 403-shaped error naming the permission', () => {
    expect(() => assertCan(user(), 'review.moderate')).toThrowError(/review\.moderate/);
    try {
      assertCan(user(), 'review.moderate');
    } catch (error) {
      expect((error as { status: number }).status).toBe(403);
    }
  });
});

describe('grantOwnership', () => {
  it('promotes a member to a branch-scoped owner', () => {
    const granted = grantOwnership(user(), 'gym-a');
    expect(granted.role).toBe('owner');
    expect(granted.ownedGymIds).toEqual(['gym-a']);
  });

  it('adds a second branch without duplicating it', () => {
    const once = grantOwnership(user({ role: 'owner', ownedGymIds: ['gym-a'] }), 'gym-b');
    expect(once.ownedGymIds).toEqual(['gym-a', 'gym-b']);
    expect(grantOwnership(once, 'gym-b').ownedGymIds).toEqual(['gym-a', 'gym-b']);
  });

  it('does not demote a moderator who also owns a gym', () => {
    const granted = grantOwnership(user({ role: 'moderator' }), 'gym-a');
    expect(granted.role).toBe('moderator');
    expect(granted.ownedGymIds).toEqual(['gym-a']);
  });

  it('grants no moderation powers along with ownership', () => {
    const granted = grantOwnership(user(), 'gym-a');
    expect(can(granted, 'review.moderate', { gymId: 'gym-a' })).toBe(false);
    expect(can(granted, 'claim.moderate', { gymId: 'gym-a' })).toBe(false);
  });
});
