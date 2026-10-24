/**
 * Verified gym owners (the routes are in app.ts).
 *
 * 1. Someone who runs a gym claims it: their role, a way to reach them at
 *    the business (a work email or the gym's listed phone), and how GymGO
 *    can check (the website's staff page, say).
 * 2. An admin checks and approves or turns it down (domain authz.ts:
 *    claim.moderate is admin-only, as the evidence can hold personal
 *    details, which are never shown publicly). Approval makes them the
 *    gym's owner (grantOwnership: branch-scoped, never moderation powers).
 * 3. An owner submits visitor hours or the casual visit price; a moderator
 *    approves each (domain owner.ts) before it shows, as "From the gym".
 *
 * Every table cascades from users, so deleting an account removes its
 * claims and submissions; approved updates go with it too.
 */

import { randomUUID } from 'node:crypto';
import { OwnerUpdateError, cleanOwnerUpdate, type ApprovedOwnerUpdate, type OwnerUpdatePayload } from '@gymgo/domain';
import type { Db } from './db';

export class OwnerError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Claims one person may have waiting at once. */
export const MAX_OPEN_CLAIMS = 3;

export interface ClaimView {
  id: string;
  gymId: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  createdAt: string;
}

type ClaimRow = {
  id: string;
  gym_id: string;
  user_id: string;
  role_title: string;
  contact: string;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  created_at: string;
};

type UpdateRow = {
  id: string;
  gym_id: string;
  user_id: string;
  payload_json: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  created_at: string;
  decided_at: string | null;
};

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');

export class Owners {
  private approvedCache: ApprovedOwnerUpdate[] | null = null;

  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** The gyms an account owns. */
  ownedGyms(userId: string): string[] {
    return (this.db.prepare('select gym_id from gym_owners where user_id = ? order by gym_id').all(userId) as Array<{ gym_id: string }>).map((row) => row.gym_id);
  }

  isOwned(gymId: string): { since: string } | null {
    const row = this.db.prepare('select min(approved_at) as since from gym_owners where gym_id = ?').get(gymId) as { since: string | null };
    return row.since ? { since: row.since } : null;
  }

  claim(userId: string, gymId: string, body: Record<string, unknown>): ClaimView {
    if (this.db.prepare('select 1 from gym_owners where user_id = ? and gym_id = ?').get(userId, gymId)) throw new OwnerError(409, 'You’re already this gym’s verified owner.');
    if (this.db.prepare(`select 1 from gym_claims where user_id = ? and gym_id = ? and status = 'pending'`).get(userId, gymId)) {
      throw new OwnerError(409, 'Your claim is waiting to be checked.');
    }
    const open = (this.db.prepare(`select count(*) as n from gym_claims where user_id = ? and status = 'pending'`).get(userId) as { n: number }).n;
    if (open >= MAX_OPEN_CLAIMS) throw new OwnerError(429, `You have ${MAX_OPEN_CLAIMS} claims waiting already.`);
    const roleTitle = text(body.roleTitle, 80);
    const contact = text(body.contact, 160);
    const evidence = text(body.evidence, 1000);
    if (!roleTitle) throw new OwnerError(400, 'Say what you do at the gym (owner, manager…).');
    if (!contact) throw new OwnerError(400, 'Give a work email at the gym’s own address, or the gym’s listed phone, so we can check.');
    if (evidence.length < 10) throw new OwnerError(400, 'Say how we can check it’s yours: a staff page, an ABN or company record, anything public.');
    const id = randomUUID();
    this.db
      .prepare(`insert into gym_claims (id, gym_id, user_id, role_title, contact, evidence, status, created_at) values (?, ?, ?, ?, ?, ?, 'pending', ?)`)
      .run(id, gymId, userId, roleTitle, contact, evidence, this.now().toISOString());
    return { id, gymId, status: 'pending', reason: null, createdAt: this.now().toISOString() };
  }

  /** Your latest claim on a gym, if any. */
  claimFor(userId: string, gymId: string): ClaimView | null {
    const row = this.db
      .prepare('select id, gym_id, status, reason, created_at from gym_claims where user_id = ? and gym_id = ? order by created_at desc limit 1')
      .get(userId, gymId) as Pick<ClaimRow, 'id' | 'gym_id' | 'status' | 'reason' | 'created_at'> | undefined;
    return row ? { id: row.id, gymId: row.gym_id, status: row.status, reason: row.reason, createdAt: row.created_at } : null;
  }

  /** Admins: the claims waiting, with their evidence. */
  claimQueue(): Array<ClaimView & { displayName: string; email: string; roleTitle: string; contact: string; evidence: string }> {
    const rows = this.db
      .prepare(
        `select c.*, u.display_name, u.email from gym_claims c join users u on u.id = c.user_id where c.status = 'pending' order by c.created_at`,
      )
      .all() as Array<ClaimRow & { display_name: string; email: string }>;
    return rows.map((row) => ({
      id: row.id,
      gymId: row.gym_id,
      status: row.status,
      reason: row.reason,
      createdAt: row.created_at,
      displayName: row.display_name,
      email: row.email,
      roleTitle: row.role_title,
      contact: row.contact,
      evidence: row.evidence,
    }));
  }

  decideClaim(deciderId: string, claimId: string, decision: unknown, reasonInput: unknown): void {
    if (decision !== 'approve' && decision !== 'reject') throw new OwnerError(400, 'Decide approve or reject.');
    const reason = text(reasonInput, 300) || null;
    if (decision === 'reject' && !reason) throw new OwnerError(400, 'Give a reason when turning a claim down.');
    const row = this.db.prepare(`select * from gym_claims where id = ? and status = 'pending'`).get(claimId) as ClaimRow | undefined;
    if (!row) throw new OwnerError(404, 'No claim waiting with that id.');
    const at = this.now().toISOString();
    this.db.exec('begin');
    try {
      this.db.prepare('update gym_claims set status = ?, reason = ?, decided_at = ?, decided_by = ? where id = ?').run(decision === 'approve' ? 'approved' : 'rejected', reason, at, deciderId, claimId);
      if (decision === 'approve') {
        this.db.prepare('insert into gym_owners (user_id, gym_id, approved_at) values (?, ?, ?) on conflict do nothing').run(row.user_id, row.gym_id, at);
        // grantOwnership: a member becomes an owner; staff keep their role.
        this.db.prepare(`update users set role = 'owner' where id = ? and role = 'member'`).run(row.user_id);
      }
      this.db.exec('commit');
    } catch (error) {
      this.db.exec('rollback');
      throw error;
    }
  }

  /** An owner's submission, waiting for a moderator. A newer one of the same kind replaces one still waiting. */
  submitUpdate(userId: string, gymId: string, countryCode: string, input: unknown): { id: string; payload: OwnerUpdatePayload } {
    let payload: OwnerUpdatePayload;
    try {
      payload = cleanOwnerUpdate(input, countryCode);
    } catch (error) {
      if (error instanceof OwnerUpdateError) throw new OwnerError(400, error.message);
      throw error;
    }
    const waiting = (this.db.prepare(`select id, payload_json from owner_updates where user_id = ? and gym_id = ? and status = 'pending'`).all(userId, gymId) as Array<{
      id: string;
      payload_json: string;
    }>).filter((row) => (JSON.parse(row.payload_json) as OwnerUpdatePayload).kind === payload.kind);
    for (const row of waiting) this.db.prepare('delete from owner_updates where id = ?').run(row.id);
    const id = randomUUID();
    this.db
      .prepare(`insert into owner_updates (id, gym_id, user_id, payload_json, status, created_at) values (?, ?, ?, ?, 'pending', ?)`)
      .run(id, gymId, userId, JSON.stringify(payload), this.now().toISOString());
    return { id, payload };
  }

  /** An owner's own submissions for a gym, newest first. */
  updatesBy(userId: string, gymId: string): Array<{ id: string; payload: OwnerUpdatePayload; status: string; reason: string | null; createdAt: string }> {
    return (this.db.prepare('select * from owner_updates where user_id = ? and gym_id = ? order by created_at desc limit 10').all(userId, gymId) as UpdateRow[]).map((row) => ({
      id: row.id,
      payload: JSON.parse(row.payload_json) as OwnerUpdatePayload,
      status: row.status,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  }

  /** Moderators: owners' submissions waiting. */
  updateQueue(): Array<{ id: string; gymId: string; displayName: string; payload: OwnerUpdatePayload; createdAt: string }> {
    const rows = this.db
      .prepare(`select o.*, u.display_name from owner_updates o join users u on u.id = o.user_id where o.status = 'pending' order by o.created_at`)
      .all() as Array<UpdateRow & { display_name: string }>;
    return rows.map((row) => ({ id: row.id, gymId: row.gym_id, displayName: row.display_name, payload: JSON.parse(row.payload_json) as OwnerUpdatePayload, createdAt: row.created_at }));
  }

  decideUpdate(deciderId: string, updateId: string, decision: unknown, reasonInput: unknown): void {
    if (decision !== 'approve' && decision !== 'reject') throw new OwnerError(400, 'Decide approve or reject.');
    const reason = text(reasonInput, 300) || null;
    if (decision === 'reject' && !reason) throw new OwnerError(400, 'Give a reason when turning an update down.');
    const result = this.db
      .prepare(`update owner_updates set status = ?, reason = ?, decided_at = ?, decided_by = ? where id = ? and status = 'pending'`)
      .run(decision === 'approve' ? 'approved' : 'rejected', reason, this.now().toISOString(), deciderId, updateId);
    if (result.changes === 0) throw new OwnerError(404, 'No update waiting with that id.');
    this.approvedCache = null;
  }

  /** Every approved update, for laying over the gyms the server sends (domain applyOwnerUpdates). */
  approved(): ApprovedOwnerUpdate[] {
    if (!this.approvedCache) {
      // Only from people who still own the gym.
      const rows = this.db
        .prepare(
          `select o.id, o.gym_id, o.payload_json, o.decided_at from owner_updates o
           join gym_owners g on g.user_id = o.user_id and g.gym_id = o.gym_id
           where o.status = 'approved' order by o.decided_at`,
        )
        .all() as Array<{ id: string; gym_id: string; payload_json: string; decided_at: string }>;
      this.approvedCache = rows.map((row) => ({ id: row.id, gymId: row.gym_id, payload: JSON.parse(row.payload_json) as OwnerUpdatePayload, approvedAt: row.decided_at }));
    }
    return this.approvedCache;
  }

  /** Accounts can be deleted at any time; their updates go with them. */
  forget(): void {
    this.approvedCache = null;
  }

  counts(): { claims: number; ownerUpdates: number } {
    return {
      claims: (this.db.prepare(`select count(*) as n from gym_claims where status = 'pending'`).get() as { n: number }).n,
      ownerUpdates: (this.db.prepare(`select count(*) as n from owner_updates where status = 'pending'`).get() as { n: number }).n,
    };
  }

  exportFor(userId: string): Record<string, unknown> {
    const rows = (sql: string) => this.db.prepare(sql).all(userId) as Array<Record<string, unknown>>;
    return {
      gymClaims: rows(
        'select gym_id as gymId, role_title as roleTitle, contact, evidence, status, reason, created_at as createdAt, decided_at as decidedAt from gym_claims where user_id = ? order by created_at',
      ),
      gymsOwned: rows('select gym_id as gymId, approved_at as approvedAt from gym_owners where user_id = ? order by approved_at'),
      ownerUpdates: rows(
        'select gym_id as gymId, payload_json as payload, status, reason, created_at as createdAt, decided_at as decidedAt from owner_updates where user_id = ? order by created_at',
      ).map((row) => ({ ...row, payload: JSON.parse(String(row.payload)) })),
    };
  }
}
