/**
 * Friends, invites to train, and leaderboards (the routes are in app.ts).
 *
 * - Everyone signed in has a friend code. Adding someone takes their code,
 *   and they have to accept; codes are long enough, and adding is limited
 *   enough (see app.ts), that guessing one isn't a way in.
 * - Friends see each other's cards and totals (domain friendCard: the look
 *   and a visit count, never the days), and can invite each other to train
 *   at a gym at a time. Either can end the friendship at any time, which
 *   takes its invites with it.
 * - Leaderboards: the public one lists only people who joined it, by
 *   display name, and leaving takes you off at once. The friends' board is
 *   your friends and you, who can see each other's collections anyway.
 *
 * Deleting an account deletes all of it (every table cascades from users).
 */

import { randomUUID } from 'node:crypto';
import {
  collectionTotals,
  formatFriendCode,
  friendCard,
  makeFriendCode,
  normaliseFriendCode,
  rankBoard,
  type CollectedGym,
  type CollectionTotals,
  type FriendCard,
} from '@gymgo/domain';
import type { Db } from './db';

export class SocialError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The most friends one account has (accepted and waiting together). */
export const MAX_FRIENDS = 200;
/** The most invites waiting from one person to another. */
export const MAX_OPEN_INVITES = 5;
/** Invites stay listed until a day after the time they were for. */
const INVITE_KEPT_MS = 24 * 60 * 60_000;
/** Furthest ahead an invite can be for. */
const INVITE_AHEAD_MS = 90 * 24 * 60 * 60_000;
/** The longest board shown. */
export const BOARD_SIZE = 50;

export interface Person {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Friend extends Person {
  since: string;
  totals: CollectionTotals;
}

export interface Invite {
  id: string;
  from: Person;
  to: Person;
  gymId: string;
  gymName: string;
  at: string;
  note: string | null;
  answer: 'yes' | 'no' | null;
}

export interface BoardEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  gyms: number;
  visits: number;
  you: boolean;
}

type UserRow = { id: string; display_name: string; avatar_id: string | null };
type InviteRow = {
  id: string;
  from_user: string;
  to_user: string;
  gym_id: string;
  gym_name: string;
  at: string;
  note: string | null;
  answer: 'yes' | 'no' | null;
};

const person = (row: UserRow): Person => ({
  id: row.id,
  displayName: row.display_name,
  avatarUrl: row.avatar_id ? `/api/avatars/${row.avatar_id}` : null,
});

export class Social {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
    private readonly random: () => number = Math.random,
  ) {}

  private user(id: string): UserRow | null {
    return (this.db.prepare('select id, display_name, avatar_id from users where id = ?').get(id) as UserRow | undefined) ?? null;
  }

  private entries(userId: string): CollectedGym[] {
    return (this.db.prepare('select entry_json from collection_gyms where user_id = ?').all(userId) as Array<{ entry_json: string }>).map(
      (row) => JSON.parse(row.entry_json) as CollectedGym,
    );
  }

  private totals(userId: string, inCity?: { city: string; countryCode: string } | null): CollectionTotals {
    return collectionTotals(
      this.entries(userId).map((entry) => ({ city: entry.city, countryCode: entry.countryCode, visits: entry.days.length })),
      inCity,
    );
  }

  /** Your friend code ("K7QM-2XPH"), made the first time it's asked for. */
  codeFor(userId: string): string {
    const found = this.db.prepare('select code from friend_codes where user_id = ?').get(userId) as { code: string } | undefined;
    if (found) return formatFriendCode(found.code);
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = makeFriendCode(this.random);
      const taken = this.db.prepare('select 1 from friend_codes where code = ?').get(code);
      if (taken) continue;
      this.db.prepare('insert into friend_codes (user_id, code, created_at) values (?, ?, ?)').run(userId, code, this.now().toISOString());
      return formatFriendCode(code);
    }
    throw new SocialError(503, 'Couldn’t make a friend code just now. Try again?');
  }

  private link(a: string, b: string): { from_user: string; to_user: string; status: 'pending' | 'accepted'; accepted_at: string | null } | null {
    return (
      (this.db
        .prepare('select from_user, to_user, status, accepted_at from friend_links where (from_user = ? and to_user = ?) or (from_user = ? and to_user = ?)')
        .get(a, b, b, a) as { from_user: string; to_user: string; status: 'pending' | 'accepted'; accepted_at: string | null } | undefined) ?? null
    );
  }

  areFriends(a: string, b: string): boolean {
    return this.link(a, b)?.status === 'accepted';
  }

  private friendIds(userId: string): string[] {
    return (
      this.db
        .prepare(
          `select case when from_user = ? then to_user else from_user end as id from friend_links
           where status = 'accepted' and (from_user = ? or to_user = ?)`,
        )
        .all(userId, userId, userId) as Array<{ id: string }>
    ).map((row) => row.id);
  }

  /** Everything the Friends screen shows. */
  overview(userId: string): {
    code: string;
    friends: Friend[];
    incoming: Person[];
    outgoing: Person[];
    invites: { incoming: Invite[]; outgoing: Invite[] };
    leaderboard: boolean;
  } {
    const links = this.db
      .prepare('select from_user, to_user, status, created_at, accepted_at from friend_links where from_user = ? or to_user = ? order by created_at')
      .all(userId, userId) as Array<{ from_user: string; to_user: string; status: 'pending' | 'accepted'; created_at: string; accepted_at: string | null }>;
    const friends: Friend[] = [];
    const incoming: Person[] = [];
    const outgoing: Person[] = [];
    for (const link of links) {
      const otherId = link.from_user === userId ? link.to_user : link.from_user;
      const other = this.user(otherId);
      if (!other) continue;
      if (link.status === 'accepted') friends.push({ ...person(other), since: link.accepted_at ?? link.created_at, totals: this.totals(otherId) });
      else if (link.to_user === userId) incoming.push(person(other));
      else outgoing.push(person(other));
    }
    friends.sort((a, b) => b.totals.gyms - a.totals.gyms || a.displayName.localeCompare(b.displayName));
    const cutoff = new Date(this.now().getTime() - INVITE_KEPT_MS).toISOString();
    const invites = (
      this.db.prepare('select * from train_invites where (from_user = ? or to_user = ?) and at >= ? order by at').all(userId, userId, cutoff) as InviteRow[]
    )
      .map((row) => this.inviteView(row))
      .filter((invite): invite is Invite => invite !== null);
    return {
      code: this.codeFor(userId),
      friends,
      incoming,
      outgoing,
      invites: { incoming: invites.filter((invite) => invite.to.id === userId), outgoing: invites.filter((invite) => invite.from.id === userId) },
      leaderboard: this.onBoard(userId),
    };
  }

  /** Ask to be friends with whoever has this code; if they'd already asked you, you're friends. */
  add(userId: string, typed: string): { status: 'requested' | 'accepted'; friend: Person } {
    const code = normaliseFriendCode(typed);
    if (!code) throw new SocialError(400, 'A friend code is 8 letters and numbers, like K7QM-2XPH.');
    const owner = this.db.prepare('select user_id from friend_codes where code = ?').get(code) as { user_id: string } | undefined;
    if (!owner) throw new SocialError(404, 'No one has that code. Check it with your friend?');
    if (owner.user_id === userId) throw new SocialError(400, 'That’s your own code. Send it to a friend instead.');
    const other = this.user(owner.user_id);
    if (!other) throw new SocialError(404, 'No one has that code. Check it with your friend?');
    const existing = this.link(userId, owner.user_id);
    if (existing?.status === 'accepted') throw new SocialError(409, `You’re already friends with ${other.display_name}.`);
    if (existing && existing.from_user === userId) throw new SocialError(409, `You’ve already asked ${other.display_name}. They need to accept.`);
    if (existing) {
      this.accept(userId, owner.user_id);
      return { status: 'accepted', friend: person(other) };
    }
    for (const id of [userId, owner.user_id]) {
      const count = (this.db.prepare('select count(*) as n from friend_links where from_user = ? or to_user = ?').get(id, id) as { n: number }).n;
      if (count >= MAX_FRIENDS) throw new SocialError(409, id === userId ? `You have ${MAX_FRIENDS} friends and requests, the most there can be.` : 'They can’t take more friends just now.');
    }
    this.db
      .prepare(`insert into friend_links (from_user, to_user, status, created_at) values (?, ?, 'pending', ?)`)
      .run(userId, owner.user_id, this.now().toISOString());
    return { status: 'requested', friend: person(other) };
  }

  /** Accept someone's request. */
  accept(userId: string, otherId: string): void {
    const link = this.link(userId, otherId);
    if (!link || link.to_user !== userId) throw new SocialError(404, 'There’s no request from them to accept.');
    if (link.status === 'accepted') return;
    this.db
      .prepare(`update friend_links set status = 'accepted', accepted_at = ? where from_user = ? and to_user = ?`)
      .run(this.now().toISOString(), otherId, userId);
  }

  /** Unfriend, turn down a request, or take back your own: and the invites between you go too. */
  remove(userId: string, otherId: string): void {
    this.db.exec('begin');
    try {
      this.db.prepare('delete from friend_links where (from_user = ? and to_user = ?) or (from_user = ? and to_user = ?)').run(userId, otherId, otherId, userId);
      this.db.prepare('delete from train_invites where (from_user = ? and to_user = ?) or (from_user = ? and to_user = ?)').run(userId, otherId, otherId, userId);
      this.db.exec('commit');
    } catch (error) {
      this.db.exec('rollback');
      throw error;
    }
  }

  /** A friend's cards (newest first) and totals; only for friends. */
  friendCollection(userId: string, friendId: string): { friend: Person; totals: CollectionTotals; cards: FriendCard[] } {
    const friend = this.user(friendId);
    if (!friend || !this.areFriends(userId, friendId)) throw new SocialError(404, 'You can see a collection once you’re friends.');
    const entries = this.entries(friendId).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
    return { friend: person(friend), totals: this.totals(friendId), cards: entries.map(friendCard) };
  }

  private inviteView(row: InviteRow): Invite | null {
    const from = this.user(row.from_user);
    const to = this.user(row.to_user);
    if (!from || !to) return null;
    return { id: row.id, from: person(from), to: person(to), gymId: row.gym_id, gymName: row.gym_name, at: row.at, note: row.note, answer: row.answer };
  }

  /** Invite a friend to train at a gym, at a time. */
  invite(userId: string, friendId: string, body: Record<string, unknown>): Invite {
    if (!this.areFriends(userId, friendId)) throw new SocialError(404, 'You can invite friends only.');
    const gymId = typeof body.gymId === 'string' && body.gymId.length > 0 && body.gymId.length <= 200 ? body.gymId : null;
    const gymName = typeof body.gymName === 'string' ? body.gymName.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
    const at = typeof body.at === 'string' && !Number.isNaN(Date.parse(body.at)) ? new Date(body.at) : null;
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().replace(/\s+/g, ' ').slice(0, 200) : null;
    if (!gymId || !gymName) throw new SocialError(400, 'Pick the gym.');
    const nowMs = this.now().getTime();
    if (!at || at.getTime() < nowMs - 60 * 60_000 || at.getTime() > nowMs + INVITE_AHEAD_MS) throw new SocialError(400, 'Pick a time in the next three months.');
    const open = (
      this.db.prepare('select count(*) as n from train_invites where from_user = ? and to_user = ? and answer is null and at >= ?').get(
        userId,
        friendId,
        new Date(nowMs).toISOString(),
      ) as { n: number }
    ).n;
    if (open >= MAX_OPEN_INVITES) throw new SocialError(429, `You have ${MAX_OPEN_INVITES} invites waiting for an answer from them already.`);
    const id = randomUUID();
    this.db
      .prepare('insert into train_invites (id, from_user, to_user, gym_id, gym_name, at, note, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, userId, friendId, gymId, gymName, at.toISOString(), note, new Date(nowMs).toISOString());
    return this.inviteView(this.db.prepare('select * from train_invites where id = ?').get(id) as InviteRow)!;
  }

  /** Say yes or no to an invite you were sent. */
  answerInvite(userId: string, inviteId: string, answer: unknown): Invite {
    if (answer !== 'yes' && answer !== 'no') throw new SocialError(400, 'Answer yes or no.');
    const row = this.db.prepare('select * from train_invites where id = ? and to_user = ?').get(inviteId, userId) as InviteRow | undefined;
    if (!row) throw new SocialError(404, 'That invite isn’t there any more.');
    this.db.prepare('update train_invites set answer = ? where id = ?').run(answer, inviteId);
    return this.inviteView({ ...row, answer })!;
  }

  /** Take back an invite you sent. */
  cancelInvite(userId: string, inviteId: string): void {
    const done = this.db.prepare('delete from train_invites where id = ? and from_user = ?').run(inviteId, userId);
    if (!done.changes) throw new SocialError(404, 'That invite isn’t there any more.');
  }

  onBoard(userId: string): boolean {
    return Boolean(this.db.prepare('select 1 from leaderboard_members where user_id = ?').get(userId));
  }

  /** Join or leave the public leaderboard. */
  setLeaderboard(userId: string, join: unknown): boolean {
    if (typeof join !== 'boolean') throw new SocialError(400, 'Say whether to be on the leaderboard.');
    if (join) {
      this.db.prepare('insert into leaderboard_members (user_id, joined_at) values (?, ?) on conflict (user_id) do nothing').run(userId, this.now().toISOString());
    } else {
      this.db.prepare('delete from leaderboard_members where user_id = ?').run(userId);
    }
    return join;
  }

  /**
   * A board: everyone who joined, or your friends and you; for all gyms or
   * one city's. You're marked on it, and given your place even when it's
   * below the top BOARD_SIZE.
   */
  board(
    userId: string,
    scope: 'everyone' | 'friends',
    inCity: { city: string; countryCode: string } | null,
  ): { joined: boolean; rows: BoardEntry[]; you: BoardEntry | null; people: number } {
    const joined = this.onBoard(userId);
    const ids =
      scope === 'everyone'
        ? (this.db.prepare('select user_id from leaderboard_members').all() as Array<{ user_id: string }>).map((row) => row.user_id)
        : [userId, ...this.friendIds(userId)];
    const users = ids.map((id) => this.user(id)).filter((row): row is UserRow => row !== null);
    const ranked = rankBoard(
      users.map((row) => {
        const totals = this.totals(row.id, inCity);
        return { id: row.id, displayName: row.display_name, avatarUrl: person(row).avatarUrl, gyms: totals.gyms, visits: totals.visits };
      }),
    );
    const view = (row: (typeof ranked)[number]): BoardEntry => ({
      rank: row.rank,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      gyms: row.gyms,
      visits: row.visits,
      you: row.id === userId,
    });
    const mine = ranked.find((row) => row.id === userId);
    return { joined, rows: ranked.slice(0, BOARD_SIZE).map(view), you: mine ? view(mine) : null, people: ranked.length };
  }

  /** For Download my data. */
  exportFor(userId: string): Record<string, unknown> {
    const rows = (sql: string, ...args: string[]) => this.db.prepare(sql).all(...args) as Array<Record<string, unknown>>;
    const code = this.db.prepare('select code, created_at as createdAt from friend_codes where user_id = ?').get(userId) as Record<string, unknown> | undefined;
    return {
      friendCode: code ? { code: formatFriendCode(String(code.code)), createdAt: code.createdAt } : null,
      friends: rows(
        `select u.display_name as displayName, l.status, l.created_at as askedAt, l.accepted_at as acceptedAt,
                case when l.from_user = ? then 'you asked' else 'they asked' end as who
         from friend_links l join users u on u.id = case when l.from_user = ? then l.to_user else l.from_user end
         where l.from_user = ? or l.to_user = ? order by l.created_at`,
        userId,
        userId,
        userId,
        userId,
      ),
      invites: rows(
        `select case when from_user = ? then 'sent' else 'received' end as direction, gym_id as gymId, gym_name as gymName, at, note, answer, created_at as createdAt
         from train_invites where from_user = ? or to_user = ? order by created_at`,
        userId,
        userId,
        userId,
      ),
      leaderboard: rows('select joined_at as joinedAt from leaderboard_members where user_id = ?', userId)[0] ?? null,
    };
  }
}
