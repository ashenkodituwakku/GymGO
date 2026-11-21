/**
 * Monthly challenges with friends (domain challenges.ts): join a month with
 * a target number of training days; the count is the days you logged a
 * workout that month on your own calendar. Friends who joined the same month
 * see each other's count and target, nothing else. Reaching the target
 * keeps that month's card. Nobody is in a challenge, or seen in one, until
 * they join it.
 */

import { CHALLENGE_TARGETS, isChallengeTarget, isMonthKey, isTimeZone, monthIn, nextMonth, trainingDays } from '@gymgo/domain';
import type { Db } from './db';
import type { Social } from './social';

export class ChallengeError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface MemberRow {
  user_id: string;
  month: string;
  target: number;
  time_zone: string;
  joined_at: string;
  finished_at: string | null;
}

export interface ChallengeStanding {
  displayName: string;
  avatarUrl: string | null;
  target: number;
  days: number;
  finished: boolean;
  you: boolean;
}

export class Challenges {
  constructor(
    private readonly db: Db,
    private readonly social: Social,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private days(userId: string, month: string, timeZone: string): number {
    // A month either side is enough for any time zone's edges.
    const rows = this.db
      .prepare('select finished_at from training_sessions where user_id = ? and finished_at >= ? and finished_at < ?')
      .all(userId, `${shiftMonth(month, -1)}-28`, `${nextMonth(month)}-03`) as Array<{ finished_at: string }>;
    return trainingDays(
      rows.map((row) => row.finished_at),
      month,
      timeZone,
    );
  }

  /** A member's standing, keeping the day they first reached the target. */
  private standing(row: MemberRow): { days: number; finished: boolean } {
    const days = this.days(row.user_id, row.month, row.time_zone);
    const finished = days >= row.target;
    if (finished && !row.finished_at) {
      this.db.prepare('update challenge_members set finished_at = ? where user_id = ? and month = ?').run(this.now().toISOString(), row.user_id, row.month);
      row.finished_at = this.now().toISOString();
    }
    return { days, finished: finished || row.finished_at !== null };
  }

  private member(userId: string, month: string): MemberRow | null {
    return (this.db.prepare('select * from challenge_members where user_id = ? and month = ?').get(userId, month) as MemberRow | undefined) ?? null;
  }

  /** This month as `timeZone` sees it: yours, your friends' who joined, and the cards you've earned. */
  view(userId: string, timeZone: unknown) {
    if (!isTimeZone(timeZone)) throw new ChallengeError(400, 'Say which time zone you’re in.');
    const month = monthIn(this.now().toISOString(), timeZone);
    const mine = this.member(userId, month);
    const people = [userId, ...this.social.friendIds(userId)];
    const rows = people.map((id) => this.member(id, month)).filter((row): row is MemberRow => row !== null);
    const standings: ChallengeStanding[] = rows
      .map((row) => {
        const who = this.db.prepare('select display_name, avatar_id from users where id = ?').get(row.user_id) as { display_name: string; avatar_id: string | null } | undefined;
        const { days, finished } = this.standing(row);
        return {
          displayName: who?.display_name ?? 'Someone',
          avatarUrl: who?.avatar_id ? `/api/avatars/${who.avatar_id}` : null,
          target: row.target,
          days,
          finished,
          you: row.user_id === userId,
        };
      })
      .sort((a, b) => b.days / b.target - a.days / a.target || b.days - a.days || a.displayName.localeCompare(b.displayName));
    const cards = (this.db.prepare('select month, target, finished_at from challenge_members where user_id = ? and finished_at is not null order by month desc').all(userId) as Array<{
      month: string;
      target: number;
      finished_at: string;
    }>).map((row) => ({ month: row.month, target: row.target, finishedAt: row.finished_at }));
    const you = standings.find((entry) => entry.you) ?? null;
    return {
      month,
      targets: CHALLENGE_TARGETS,
      mine: mine && you ? { target: mine.target, days: you.days, finished: you.finished } : null,
      friends: standings,
      cards,
    };
  }

  /** Join this month (or change your target), as `timeZone` sees the month. */
  join(userId: string, month: unknown, body: Record<string, unknown>): void {
    if (!isMonthKey(month)) throw new ChallengeError(400, 'Say which month.');
    if (!isTimeZone(body.timeZone)) throw new ChallengeError(400, 'Say which time zone you’re in.');
    if (!isChallengeTarget(body.target)) throw new ChallengeError(400, `Pick a target of ${CHALLENGE_TARGETS.join(', ')} days.`);
    const current = monthIn(this.now().toISOString(), body.timeZone);
    if (month !== current) throw new ChallengeError(400, 'You can join this month’s challenge.');
    const existing = this.member(userId, month);
    if (existing?.finished_at) throw new ChallengeError(409, 'You’ve already finished this month’s challenge.');
    this.db
      .prepare(
        `insert into challenge_members (user_id, month, target, time_zone, joined_at) values (?, ?, ?, ?, ?)
         on conflict (user_id, month) do update set target = excluded.target, time_zone = excluded.time_zone`,
      )
      .run(userId, month, body.target, body.timeZone, this.now().toISOString());
  }

  /** Leave a month's challenge. A card already earned goes with it. */
  leave(userId: string, month: unknown): void {
    if (!isMonthKey(month)) throw new ChallengeError(400, 'Say which month.');
    this.db.prepare('delete from challenge_members where user_id = ? and month = ?').run(userId, month);
  }

  /** For Download my data. */
  exportFor(userId: string): Array<Record<string, unknown>> {
    return this.db
      .prepare('select month, target, time_zone as timeZone, joined_at as joinedAt, finished_at as finishedAt from challenge_members where user_id = ? order by month')
      .all(userId) as Array<Record<string, unknown>>;
  }
}

/** "2026-10" for ("2026-11", -1). */
function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split('-').map(Number);
  const index = year! * 12 + (number! - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}
