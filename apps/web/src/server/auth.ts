/**
 * Sessions and identity.
 *
 * The only adapter implemented here is `local-dev`: a signed-out-by-default
 * cookie holding a user id, plus a visible account switcher. It is not an
 * identity provider and makes no attempt to be one — it exists so the
 * permission rules can be exercised locally.
 *
 * It is disabled in a production build unless someone deliberately opts in
 * twice, and when they do, every page carries a warning banner. Production
 * needs a real provider; see docs/ARCHITECTURE.md.
 */

import { cookies } from 'next/headers';
import { ANONYMOUS, type Role, type User } from '@gymgo/domain';
import { config } from './config';
import { mutateStore, nowIso, readStore } from './store';

const COOKIE_NAME = 'gymgo_session';

export interface Persona {
  id: string;
  displayName: string;
  role: Role;
  description: string;
}

/**
 * The local account switcher's options.
 *
 * The owner persona starts with no branches: an ownership claim has to be
 * submitted and approved before it can edit anything, which is the rule the
 * product is meant to enforce.
 */
export const PERSONAS: Persona[] = [
  {
    id: 'demo-member',
    displayName: 'Sam (member)',
    role: 'member',
    description: 'A signed-in user. Can review, suggest corrections and claim a gym.',
  },
  {
    id: 'demo-owner',
    displayName: 'Jo (gym operator)',
    role: 'member',
    description:
      'Starts with no branches. Must submit an ownership claim and have it approved before editing anything.',
  },
  {
    id: 'demo-moderator',
    displayName: 'Ali (moderator)',
    role: 'moderator',
    description: 'Reviews corrections and reviews. Cannot see private ownership evidence.',
  },
  {
    id: 'demo-admin',
    displayName: 'Robin (administrator)',
    role: 'admin',
    description: 'Decides ownership claims and can see the evidence attached to them.',
  },
];

export class AuthUnavailableError extends Error {
  readonly status = 503;
  constructor() {
    super('Sign-in is not available in this environment.');
    this.name = 'AuthUnavailableError';
  }
}

export function authEnabled(): boolean {
  return config.authAdapter === 'local-dev';
}

async function ensureUser(personaId: string): Promise<User> {
  const persona = PERSONAS.find((candidate) => candidate.id === personaId);
  if (!persona) throw new Error(`Unknown persona: ${personaId}`);

  return mutateStore((store) => {
    const existing = store.users.find((user) => user.id === persona.id);
    if (existing) return existing;
    const created: User = {
      id: persona.id,
      displayName: persona.displayName,
      role: persona.role,
      ownedGymIds: [],
      blocked: false,
      createdAt: nowIso(),
    };
    store.users.push(created);
    return created;
  });
}

/**
 * The caller, or the anonymous user. Never throws; browsing needs no account.
 *
 * `cookies()` is read before anything else, unconditionally. Reading it is
 * what marks a page as per-request, and a page whose content depends on who is
 * asking must never be prerendered at build time — a statically generated
 * moderation queue or owner dashboard would serve everyone the empty state it
 * was built with. Doing the read first means that cannot depend on which
 * adapter happens to be configured when the build runs.
 */
export async function getCurrentUser(): Promise<User> {
  const jar = await cookies();
  if (!authEnabled()) return ANONYMOUS;
  const userId = jar.get(COOKIE_NAME)?.value;
  if (!userId) return ANONYMOUS;

  const store = await readStore();
  return store.users.find((user) => user.id === userId) ?? ANONYMOUS;
}

export async function signIn(personaId: string): Promise<User> {
  if (!authEnabled()) throw new AuthUnavailableError();
  const user = await ensureUser(personaId);
  const jar = await cookies();
  jar.set(COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProductionBuild,
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return user;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * Account deletion.
 *
 * Implemented before public registration exists, as it must be. It removes the
 * account and its private evidence, and redacts the author of published
 * contributions rather than deleting other people's view of a gym's history.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await mutateStore((store) => {
    store.users = store.users.filter((user) => user.id !== userId);
    store.claims = store.claims.filter((claim) => claim.userId !== userId);
    store.privateEvidence = store.privateEvidence.filter(
      (evidence) => !store.claims.some((claim) => claim.id === evidence.claimId),
    );
    store.reviews = store.reviews.map((review) =>
      review.authorId === userId
        ? { ...review, authorId: 'deleted-account', authorDisplayName: 'Deleted account', body: '[Removed at the author’s request]' }
        : review,
    );
    store.corrections = store.corrections.map((correction) =>
      correction.submittedBy === userId ? { ...correction, submittedBy: 'deleted-account' } : correction,
    );
  });
  await signOut();
}
