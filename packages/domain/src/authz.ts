/**
 * Authorisation rules.
 *
 * These are pure functions so the same rule can be asserted in tests and
 * enforced on the server. The client may use them to hide controls, but
 * hiding a control is not access control: every server route re-checks.
 */

import type { Role, User } from './types';

export type Permission =
  | 'review.create'
  | 'review.moderate'
  | 'review.remove'
  | 'correction.create'
  | 'correction.moderate'
  | 'claim.create'
  | 'claim.moderate'
  | 'gym.edit'
  | 'gym.reply_to_review'
  | 'moderation.view_queue'
  | 'moderation.view_private_evidence'
  | 'user.block';

/** An anonymous caller. Used when no session cookie is present. */
export const ANONYMOUS: User = {
  id: 'anonymous',
  displayName: 'Guest',
  role: 'anonymous',
  ownedGymIds: [],
  blocked: false,
  createdAt: '1970-01-01T00:00:00.000Z',
};

const ROLE_RANK: Record<Role, number> = {
  anonymous: 0,
  member: 1,
  owner: 2,
  moderator: 3,
  admin: 4,
};

export function atLeast(user: User, role: Role): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[role];
}

export interface PermissionContext {
  /** Required for any permission scoped to a single branch. */
  gymId?: string;
}

/**
 * The single source of truth for "may this user do this?".
 *
 * Two rules worth stating explicitly, because they are the ones that get
 * quietly broken:
 *  - An owner's power is scoped to the branches they were approved for.
 *  - Owners cannot remove reviews about their own gym, only reply to them.
 */
export function can(user: User, permission: Permission, context: PermissionContext = {}): boolean {
  if (user.blocked) return false;

  const ownsContextGym =
    context.gymId !== undefined && user.ownedGymIds.includes(context.gymId);

  switch (permission) {
    case 'review.create':
    case 'correction.create':
    case 'claim.create':
      return atLeast(user, 'member');

    case 'gym.reply_to_review':
      // Owner of this branch, or staff.
      return (user.role === 'owner' && ownsContextGym) || atLeast(user, 'moderator');

    case 'gym.edit':
      // "Edit" here means "submit a change for review", never write-through.
      return (user.role === 'owner' && ownsContextGym) || atLeast(user, 'moderator');

    case 'review.moderate':
    case 'correction.moderate':
    case 'moderation.view_queue':
      return atLeast(user, 'moderator');

    case 'review.remove':
    case 'user.block':
      return atLeast(user, 'moderator');

    case 'claim.moderate':
    case 'moderation.view_private_evidence':
      // Ownership evidence can contain personal information, so it sits behind
      // the highest role and is never returned in a public response.
      return atLeast(user, 'admin');
  }
}

/** Throwing variant for server routes. */
export class AuthorizationError extends Error {
  readonly permission: Permission;
  readonly status = 403;

  constructor(permission: Permission) {
    super(`Not permitted: ${permission}`);
    this.name = 'AuthorizationError';
    this.permission = permission;
  }
}

export function assertCan(
  user: User,
  permission: Permission,
  context: PermissionContext = {},
): void {
  if (!can(user, permission, context)) throw new AuthorizationError(permission);
}

/**
 * An approved ownership claim grants a branch-scoped owner role.
 * It never grants moderation powers, and it never upgrades an existing
 * moderator or admin downwards.
 */
export function grantOwnership(user: User, gymId: string): User {
  if (user.ownedGymIds.includes(gymId)) return user;
  return {
    ...user,
    role: atLeast(user, 'moderator') ? user.role : 'owner',
    ownedGymIds: [...user.ownedGymIds, gymId],
  };
}
