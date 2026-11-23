/**
 * The friends' feed: the workouts your friends log, newest first, with what
 * they add up to (time, volume, sets, the records they broke), and likes and
 * comments on them. The routes are in app.ts.
 *
 * - Sharing is your choice, and off until you turn it on (Feed → Share my
 *   workouts). Then your friends, and only your friends, see the workouts
 *   you log: the name, when, how long, the exercises and sets, and the
 *   records, and the gym when you tag one. Never your notes. Any one workout can be
 *   hidden from them, and turning sharing off hides them all at once.
 * - Seeing a friend's workouts doesn't need you to share yours.
 * - Likes and comments are between friends: you can like or comment on a
 *   workout you can see. A comment can be deleted by whoever wrote it, by
 *   whoever's workout it's on, and by moderators; reporting one sends it to
 *   the team. Ending a friendship takes away each one's likes and comments
 *   on the other's workouts.
 * - Records are worked out from the person's own earlier workouts
 *   (recordsBroken, @gymgo/domain), kept with the workout, and worked out
 *   again when an earlier one changes.
 *
 * Deleting an account or a workout deletes its likes and comments (the
 * tables cascade).
 */

import { randomUUID } from 'node:crypto';
import { personalRecords, recordsBroken, setCount, volumeKg, type LoggedExercise, type NewRecord, type TrainingSession, type WeightUnit } from '@gymgo/domain';
import type { Db } from './db';

export class FeedError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Workouts in one page of the feed. */
export const FEED_PAGE = 20;
/** The longest comment. */
export const MAX_COMMENT = 300;
/** Comments one workout can have. */
export const MAX_COMMENTS = 200;
/** People listed as having liked a workout, on its card. */
const LIKERS_SHOWN = 3;

export interface FeedPerson {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FeedItem {
  id: string;
  person: FeedPerson;
  /** Your own workout. */
  you: boolean;
  name: string;
  unit: WeightUnit;
  startedAt: string;
  finishedAt: string;
  /** Each exercise with its sets; `name` for an exercise its owner made (the app knows GymGO's own). */
  exercises: Array<LoggedExercise & { name?: string }>;
  /** Everything lifted (working sets' weight × reps), in kg. */
  volumeKg: number;
  /** Working sets (warm-ups left out). */
  sets: number;
  records: NewRecord[];
  likes: number;
  liked: boolean;
  /** A few of the people who liked it (you first, when you did). */
  likedBy: FeedPerson[];
  comments: number;
  /** Your own workout, hidden from your friends. */
  hidden?: boolean;
  /** The gym it was at, when one was tagged. */
  gym: { id: string; name: string } | null;
}

export interface FeedComment {
  id: string;
  person: FeedPerson;
  you: boolean;
  body: string;
  createdAt: string;
  /** Yours, or on your workout. */
  canDelete: boolean;
}

type SessionRow = {
  id: string;
  user_id: string;
  name: string;
  unit: WeightUnit;
  started_at: string;
  finished_at: string;
  exercises_json: string;
  hidden: number;
  records_json: string | null;
  gym_id: string | null;
  gym_name: string | null;
};
type UserRow = { id: string; display_name: string; avatar_id: string | null };
type CommentRow = { id: string; session_id: string; user_id: string; body: string; created_at: string };

const SESSION_COLUMNS = 's.id, s.user_id, s.name, s.unit, s.started_at, s.finished_at, s.exercises_json, s.hidden, s.records_json, s.gym_id, s.gym_name';

const person = (row: UserRow): FeedPerson => ({
  id: row.id,
  displayName: row.display_name,
  avatarUrl: row.avatar_id ? `/api/avatars/${row.avatar_id}` : null,
});

/** A comment's text: trimmed, runs of spaces folded, at most two line breaks in a row. */
export function cleanComment(value: unknown): string {
  if (typeof value !== 'string') throw new FeedError(400, 'Write a comment.');
  const body = value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!body) throw new FeedError(400, 'Write a comment.');
  if (body.length > MAX_COMMENT) throw new FeedError(400, `Keep it to ${MAX_COMMENT} characters.`);
  return body;
}

/** Someone liked or commented on one of your workouts. */
export interface FeedActivity {
  kind: 'like' | 'comment';
  person: FeedPerson;
  workoutId: string;
  workoutName: string;
  /** A comment's words. */
  body?: string;
  at: string;
}

/** How far back Activity looks, and how much it lists. */
const ACTIVITY_DAYS = 30;
const ACTIVITY_SHOWN = 20;

/** One exercise both of you have done: each one's best, in kg (null where there's none, a body-weight exercise's weight say). */
export interface HeadToHeadRow {
  exerciseId: string;
  /** For an exercise one of you made. */
  name?: string;
  you: { heaviestKg: number | null; e1rmKg: number | null; mostReps: number | null };
  them: { heaviestKg: number | null; e1rmKg: number | null; mostReps: number | null };
}

/** Where the next page starts: after this workout. */
export interface FeedCursor {
  finishedAt: string;
  id: string;
}

export function readCursor(value: string | null): FeedCursor | null {
  if (!value) return null;
  const [finishedAt, id] = value.split('|');
  if (!finishedAt || !id || Number.isNaN(Date.parse(finishedAt)) || id.length > 60) throw new FeedError(400, 'That page of the feed doesn’t exist.');
  return { finishedAt, id };
}

export class Feed {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // --- Sharing -----------------------------------------------------------------

  /** Whether your friends see your workouts. */
  sharing(userId: string): boolean {
    const row = this.db.prepare('select share_workouts from users where id = ?').get(userId) as { share_workouts: number } | undefined;
    return row?.share_workouts === 1;
  }

  setSharing(userId: string, on: boolean): boolean {
    this.db.prepare('update users set share_workouts = ? where id = ?').run(on ? 1 : 0, userId);
    return on;
  }

  // --- Who sees what ---------------------------------------------------------------

  /** Your accepted friends' ids. */
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

  private areFriends(a: string, b: string): boolean {
    return Boolean(
      this.db
        .prepare(`select 1 from friend_links where status = 'accepted' and ((from_user = ? and to_user = ?) or (from_user = ? and to_user = ?))`)
        .get(a, b, b, a),
    );
  }

  /** A workout you may see: your own, or a friend's they share and haven't hidden. 404 otherwise, the same for one that doesn't exist. */
  private visible(viewerId: string, sessionId: string): SessionRow {
    const row = this.db.prepare(`select ${SESSION_COLUMNS} from training_sessions s where s.id = ?`).get(sessionId) as SessionRow | undefined;
    if (row && (row.user_id === viewerId || (row.hidden === 0 && this.sharing(row.user_id) && this.areFriends(viewerId, row.user_id)))) return row;
    throw new FeedError(404, 'That workout isn’t there, or isn’t shared with you.');
  }

  // --- The feed ------------------------------------------------------------------

  /**
   * A page of the feed, newest first: your friends' shared workouts, and
   * your own while you share them (so you see what they see, and their
   * likes and comments).
   */
  page(
    userId: string,
    after: FeedCursor | null,
    limit = FEED_PAGE,
    personId: string | null = null,
  ): { sharing: boolean; items: FeedItem[]; next: string | null; activity?: FeedActivity[]; person?: { person: FeedPerson; workouts: number } } {
    const sharing = this.sharing(userId);
    // One person's workouts (a profile): yours, or a friend's who shares them.
    if (personId !== null) {
      const allowed = personId === userId || (this.areFriends(userId, personId) && this.sharing(personId));
      if (!allowed) throw new FeedError(404, 'You see a friend’s workouts once they share them.');
    }
    // With the first page of the whole feed: who liked or commented on your workouts lately.
    const activity = after || personId ? {} : { activity: this.activity(userId) };
    const profile =
      personId && !after
        ? {
            person: {
              person: person(this.user(personId)),
              workouts: (this.db.prepare(`select count(*) as n from training_sessions where user_id = ?${personId === userId ? '' : ' and hidden = 0'}`).get(personId) as { n: number }).n,
            },
          }
        : {};
    const sharers = this.friendIds(userId).filter((id) => this.sharing(id));
    const people = personId ? [personId] : sharing ? [userId, ...sharers] : sharers;
    if (people.length === 0) return { sharing, items: [], next: null, ...activity, ...profile };
    const marks = people.map(() => '?').join(', ');
    const rows = this.db
      .prepare(
        `select ${SESSION_COLUMNS} from training_sessions s
         where s.user_id in (${marks}) and (s.hidden = 0 or (s.user_id = ? and ? = 1))
           and (? is null or s.finished_at < ? or (s.finished_at = ? and s.id < ?))
         order by s.finished_at desc, s.id desc limit ?`,
      )
      .all(...people, userId, personId === userId ? 1 : 0, after?.finishedAt ?? null, after?.finishedAt ?? null, after?.finishedAt ?? null, after?.id ?? null, limit + 1) as SessionRow[];
    const shown = rows.slice(0, limit);
    const last = shown.at(-1);
    return { sharing, items: shown.map((row) => this.itemView(userId, row)), next: rows.length > limit && last ? `${last.finished_at}|${last.id}` : null, ...activity, ...profile };
  }

  /** Likes and comments by others on your workouts, newest first, over the last ACTIVITY_DAYS. */
  activity(userId: string): FeedActivity[] {
    const since = new Date(this.now().getTime() - ACTIVITY_DAYS * 86_400_000).toISOString();
    type Row = { kind: 'like' | 'comment'; user_id: string; session_id: string; name: string; body: string | null; at: string };
    const rows = this.db
      .prepare(
        `select 'like' as kind, l.user_id, l.session_id, s.name, null as body, l.created_at as at
           from feed_likes l join training_sessions s on s.id = l.session_id
           where s.user_id = ? and l.user_id != ? and l.created_at >= ?
         union all
         select 'comment' as kind, c.user_id, c.session_id, s.name, c.body, c.created_at as at
           from feed_comments c join training_sessions s on s.id = c.session_id
           where s.user_id = ? and c.user_id != ? and c.created_at >= ?
         order by at desc limit ?`,
      )
      .all(userId, userId, since, userId, userId, since, ACTIVITY_SHOWN) as Row[];
    return rows.map((row) => ({
      kind: row.kind,
      person: person(this.user(row.user_id)),
      workoutId: row.session_id,
      workoutName: row.name,
      ...(row.body !== null ? { body: row.body } : {}),
      at: row.at,
    }));
  }

  /**
   * Head to head (Pro, checked in app.ts): your best and a friend's, on every
   * exercise you've both done, from all of yours and the workouts they share
   * with you. Only a friend who shares their workouts.
   */
  headToHead(userId: string, friendId: string): { friend: FeedPerson; rows: HeadToHeadRow[] } {
    if (friendId === userId || !this.areFriends(userId, friendId) || !this.sharing(friendId)) {
      throw new FeedError(404, 'You can compare with a friend who shares their workouts.');
    }
    type Row = { id: string; name: string; unit: WeightUnit; started_at: string; finished_at: string; exercises_json: string };
    const sessions = (id: string, sharedOnly: boolean) =>
      (
        this.db
          .prepare(`select id, name, unit, started_at, finished_at, exercises_json from training_sessions where user_id = ?${sharedOnly ? ' and hidden = 0' : ''}`)
          .all(id) as Row[]
      ).map(
        (row): TrainingSession => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
          startedAt: row.started_at,
          finishedAt: row.finished_at,
          workoutId: null,
          gymId: null,
          exercises: JSON.parse(row.exercises_json) as LoggedExercise[],
        }),
      );
    const mine = personalRecords(sessions(userId, false));
    const theirs = personalRecords(sessions(friendId, true));
    const best = (record: { heaviestKg: number | null; e1rmKg: number | null; mostReps: number | null }) => ({
      heaviestKg: record.heaviestKg === null ? null : Math.round(record.heaviestKg * 10) / 10,
      e1rmKg: record.e1rmKg === null ? null : Math.round(record.e1rmKg * 10) / 10,
      mostReps: record.mostReps,
    });
    // An exercise someone made is theirs alone, so it can't be shared; GymGO's own can.
    const rows: HeadToHeadRow[] = [];
    for (const [exerciseId, record] of mine) {
      const other = theirs.get(exerciseId);
      if (!other || exerciseId.startsWith('mine-') || record.sessions === 0 || other.sessions === 0) continue;
      rows.push({ exerciseId, you: best(record), them: best(other) });
    }
    // The exercises you both do most first.
    rows.sort((a, b) => (theirs.get(b.exerciseId)!.sessions + mine.get(b.exerciseId)!.sessions) - (theirs.get(a.exerciseId)!.sessions + mine.get(a.exerciseId)!.sessions));
    return { friend: person(this.user(friendId)), rows };
  }

  /** One workout, with its comments, oldest first. */
  item(userId: string, sessionId: string): { item: FeedItem; comments: FeedComment[]; sharing: boolean } {
    const row = this.visible(userId, sessionId);
    const comments = this.db
      .prepare('select id, session_id, user_id, body, created_at from feed_comments where session_id = ? order by created_at, id')
      .all(sessionId) as CommentRow[];
    return { item: this.itemView(userId, row), comments: comments.map((comment) => this.commentView(userId, row, comment)), sharing: this.sharing(row.user_id) };
  }

  private user(id: string): UserRow {
    return (this.db.prepare('select id, display_name, avatar_id from users where id = ?').get(id) as UserRow | undefined) ?? { id, display_name: 'Someone', avatar_id: null };
  }

  private itemView(viewerId: string, row: SessionRow): FeedItem {
    const exercises = JSON.parse(row.exercises_json) as LoggedExercise[];
    const session: TrainingSession = {
      id: row.id,
      name: row.name,
      unit: row.unit,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      workoutId: null,
      gymId: null,
      exercises,
    };
    // The names of exercises its owner made (GymGO's own the app knows).
    const own = exercises.map((item) => item.exerciseId).filter((id) => id.startsWith('mine-'));
    const names = new Map<string, string>();
    if (own.length > 0) {
      const marks = own.map(() => '?').join(', ');
      for (const found of this.db.prepare(`select id, name from own_exercises where user_id = ? and id in (${marks})`).all(row.user_id, ...own) as Array<{ id: string; name: string }>) {
        names.set(found.id, found.name);
      }
    }
    const likeRows = this.db
      .prepare(
        `select u.id, u.display_name, u.avatar_id from feed_likes l join users u on u.id = l.user_id
         where l.session_id = ? order by case when l.user_id = ? then 0 else 1 end, l.created_at desc`,
      )
      .all(row.id, viewerId) as UserRow[];
    const comments = (this.db.prepare('select count(*) as n from feed_comments where session_id = ?').get(row.id) as { n: number }).n;
    return {
      id: row.id,
      person: person(this.user(row.user_id)),
      you: row.user_id === viewerId,
      name: row.name,
      unit: row.unit,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      exercises: exercises.map((item) => (names.has(item.exerciseId) ? { ...item, name: names.get(item.exerciseId)! } : item)),
      volumeKg: Math.round(volumeKg(session) * 10) / 10,
      sets: setCount(session),
      records: this.recordsOf(row),
      likes: likeRows.length,
      liked: likeRows.some((liker) => liker.id === viewerId),
      likedBy: likeRows.slice(0, LIKERS_SHOWN).map(person),
      comments,
      gym: row.gym_id && row.gym_name ? { id: row.gym_id, name: row.gym_name } : null,
      ...(row.user_id === viewerId ? { hidden: row.hidden === 1 } : {}),
    };
  }

  // --- Records ---------------------------------------------------------------------

  /** The records a workout broke, against its owner's earlier ones: kept once worked out. */
  private recordsOf(row: SessionRow): NewRecord[] {
    if (row.records_json !== null) return JSON.parse(row.records_json) as NewRecord[];
    const toSession = (item: SessionRow | (Omit<SessionRow, 'hidden' | 'records_json' | 'user_id' | 'gym_id' | 'gym_name'>)): TrainingSession => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      startedAt: item.started_at,
      finishedAt: item.finished_at,
      workoutId: null,
      gymId: null,
      exercises: JSON.parse(item.exercises_json) as LoggedExercise[],
    });
    const earlier = this.db
      .prepare('select id, name, unit, started_at, finished_at, exercises_json from training_sessions where user_id = ? and finished_at < ? and id != ?')
      .all(row.user_id, row.finished_at, row.id) as Array<Omit<SessionRow, 'hidden' | 'records_json' | 'user_id' | 'gym_id' | 'gym_name'>>;
    const records = recordsBroken(toSession(row), earlier.map(toSession));
    this.db.prepare('update training_sessions set records_json = ? where id = ?').run(JSON.stringify(records), row.id);
    return records;
  }

  /**
   * A workout was logged, changed or deleted: the records of this person's
   * workouts from then on are worked out again when next shown.
   */
  forgetRecordsFrom(userId: string, finishedAt: string): void {
    this.db.prepare('update training_sessions set records_json = null where user_id = ? and finished_at >= ?').run(userId, finishedAt);
  }

  // --- Likes ---------------------------------------------------------------------------

  like(userId: string, sessionId: string, on: boolean): { likes: number; liked: boolean } {
    this.visible(userId, sessionId);
    if (on) this.db.prepare('insert into feed_likes (session_id, user_id, created_at) values (?, ?, ?) on conflict do nothing').run(sessionId, userId, this.now().toISOString());
    else this.db.prepare('delete from feed_likes where session_id = ? and user_id = ?').run(sessionId, userId);
    const likes = (this.db.prepare('select count(*) as n from feed_likes where session_id = ?').get(sessionId) as { n: number }).n;
    return { likes, liked: on };
  }

  // --- Comments ------------------------------------------------------------------------

  comment(userId: string, sessionId: string, text: unknown): FeedComment {
    const row = this.visible(userId, sessionId);
    const body = cleanComment(text);
    const count = (this.db.prepare('select count(*) as n from feed_comments where session_id = ?').get(sessionId) as { n: number }).n;
    if (count >= MAX_COMMENTS) throw new FeedError(409, 'This workout has as many comments as it can take.');
    const comment: CommentRow = { id: randomUUID(), session_id: sessionId, user_id: userId, body, created_at: this.now().toISOString() };
    this.db
      .prepare('insert into feed_comments (id, session_id, user_id, body, created_at) values (?, ?, ?, ?, ?)')
      .run(comment.id, comment.session_id, comment.user_id, comment.body, comment.created_at);
    return this.commentView(userId, row, comment);
  }

  private commentView(viewerId: string, session: SessionRow, row: CommentRow): FeedComment {
    return {
      id: row.id,
      person: person(this.user(row.user_id)),
      you: row.user_id === viewerId,
      body: row.body,
      createdAt: row.created_at,
      canDelete: row.user_id === viewerId || session.user_id === viewerId,
    };
  }

  /** A comment, found for someone who can see its workout. */
  private visibleComment(userId: string, commentId: string, moderator: boolean): { comment: CommentRow; session: SessionRow } {
    const comment = this.db.prepare('select id, session_id, user_id, body, created_at from feed_comments where id = ?').get(commentId) as CommentRow | undefined;
    if (!comment) throw new FeedError(404, 'That comment isn’t there any more.');
    if (moderator) {
      const session = this.db.prepare(`select ${SESSION_COLUMNS} from training_sessions s where s.id = ?`).get(comment.session_id) as SessionRow;
      return { comment, session };
    }
    try {
      return { comment, session: this.visible(userId, comment.session_id) };
    } catch {
      throw new FeedError(404, 'That comment isn’t there any more.');
    }
  }

  /** By whoever wrote it, whoever's workout it's on, or a moderator. */
  removeComment(userId: string, commentId: string, moderator = false): void {
    const { comment, session } = this.visibleComment(userId, commentId, moderator);
    if (!moderator && comment.user_id !== userId && session.user_id !== userId) throw new FeedError(403, 'Only whoever wrote it, or whoever’s workout it’s on, can delete a comment.');
    this.db.prepare('delete from feed_comments where id = ?').run(commentId);
  }

  /**
   * Someone reports a comment: remembered once per person, and handed back
   * for the team (app.ts files it as a report, which is emailed to them).
   * Null when this person had already reported it.
   */
  report(userId: string, commentId: string): { body: string; author: FeedPerson; sessionId: string } | null {
    const { comment } = this.visibleComment(userId, commentId, false);
    if (comment.user_id === userId) throw new FeedError(400, 'That’s your own comment: delete it instead.');
    const added = this.db
      .prepare('insert into feed_reports (comment_id, user_id, created_at) values (?, ?, ?) on conflict do nothing')
      .run(commentId, userId, this.now().toISOString());
    if (added.changes === 0) return null;
    return { body: comment.body, author: person(this.user(comment.user_id)), sessionId: comment.session_id };
  }

  // --- Friendships ending, and Download my data ----------------------------------------

  /** Two people stopped being friends: each one's likes and comments on the other's workouts go. */
  forgetBetween(a: string, b: string): void {
    for (const [who, owner] of [
      [a, b],
      [b, a],
    ] as const) {
      this.db.prepare('delete from feed_likes where user_id = ? and session_id in (select id from training_sessions where user_id = ?)').run(who, owner);
      this.db.prepare('delete from feed_comments where user_id = ? and session_id in (select id from training_sessions where user_id = ?)').run(who, owner);
    }
  }

  exportFor(userId: string): Record<string, unknown> {
    return {
      sharesWorkoutsWithFriends: this.sharing(userId),
      workoutsHiddenFromFriends: (this.db.prepare('select id from training_sessions where user_id = ? and hidden = 1 order by finished_at').all(userId) as Array<{ id: string }>).map(
        (row) => row.id,
      ),
      feedLikes: this.db.prepare('select session_id as workoutId, created_at as likedAt from feed_likes where user_id = ? order by created_at').all(userId),
      feedComments: this.db
        .prepare('select id, session_id as workoutId, body, created_at as createdAt from feed_comments where user_id = ? order by created_at')
        .all(userId),
      reportedComments: this.db.prepare('select comment_id as commentId, created_at as reportedAt from feed_reports where user_id = ? order by created_at').all(userId),
    };
  }
}
