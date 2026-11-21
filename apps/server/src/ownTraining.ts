/**
 * Training of your own, kept on your account: exercises you add and splits
 * you make (packages/domain/src/ownTraining.ts says what each may hold).
 * Making or changing either is Pro; app.ts checks that before calling here.
 * Reading and deleting stay open on Free, so nobody loses sight of what
 * they made or the right to tidy it away.
 *
 * Deleting an exercise archives it rather than removing it: workouts you
 * logged with it still say its name, and it can't be picked again.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { OWN_LIMITS, cleanOwnExercise, cleanSplit, type OwnExercise, type Split } from '@gymgo/domain';
import type { Db } from './db';

export class OwnTrainingError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface ExerciseRow {
  id: string;
  name: string;
  fields_json: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SplitRow {
  id: string;
  name: string;
  days_json: string;
  created_at: string;
  updated_at: string;
}

/** "mine-" and ten letters or digits: an id no GymGO exercise has, and too long to guess. */
function newExerciseId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return `mine-${[...randomBytes(10)].map((byte) => alphabet[byte % alphabet.length]).join('')}`;
}

export class OwnTraining {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {
    db.exec(`
      create table if not exists own_exercises (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        name text not null,
        fields_json text not null,
        archived_at text,
        created_at text not null,
        updated_at text not null
      );
      create index if not exists own_exercises_user on own_exercises(user_id);
      create table if not exists own_splits (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        name text not null,
        days_json text not null,
        created_at text not null,
        updated_at text not null
      );
      create index if not exists own_splits_user on own_splits(user_id);
    `);
  }

  private exerciseView(row: ExerciseRow): OwnExercise {
    return { id: row.id, ...(JSON.parse(row.fields_json) as Omit<OwnExercise, 'id' | 'archived' | 'createdAt' | 'updatedAt'>), name: row.name, archived: row.archived_at !== null, createdAt: row.created_at, updatedAt: row.updated_at };
  }

  /** Every exercise you made, archived ones too (the app needs their names for your history). */
  exercises(userId: string): OwnExercise[] {
    const rows = this.db.prepare('select id, name, fields_json, archived_at, created_at, updated_at from own_exercises where user_id = ? order by created_at').all(userId) as unknown as ExerciseRow[];
    return rows.map((row) => this.exerciseView(row));
  }

  /** A name another of your exercises (not archived) already has, ignoring case. */
  private nameTaken(userId: string, name: string, except: string | null): boolean {
    const row = this.db
      .prepare('select id from own_exercises where user_id = ? and archived_at is null and lower(name) = lower(?) and id is not ?')
      .get(userId, name, except);
    return row !== undefined;
  }

  addExercise(userId: string, input: unknown): OwnExercise {
    const cleaned = cleanOwnExercise(input);
    if (!cleaned.ok) throw new OwnTrainingError(400, cleaned.problem);
    const { name, ...fields } = cleaned.value;
    if (this.nameTaken(userId, name, null)) throw new OwnTrainingError(409, `You already have an exercise called “${name}”.`);
    const count = (this.db.prepare('select count(*) as n from own_exercises where user_id = ? and archived_at is null').get(userId) as { n: number }).n;
    if (count >= OWN_LIMITS.exercises) throw new OwnTrainingError(409, `You have ${count} exercises of your own, the most there’s room for. Delete one first.`);
    const at = this.now().toISOString();
    const id = newExerciseId();
    this.db.prepare('insert into own_exercises (id, user_id, name, fields_json, archived_at, created_at, updated_at) values (?, ?, ?, ?, null, ?, ?)').run(id, userId, name, JSON.stringify(fields), at, at);
    return { id, name, ...fields, archived: false, createdAt: at, updatedAt: at };
  }

  changeExercise(userId: string, id: string, input: unknown): OwnExercise {
    const row = this.db.prepare('select id, name, fields_json, archived_at, created_at, updated_at from own_exercises where id = ? and user_id = ?').get(id, userId) as ExerciseRow | undefined;
    if (!row || row.archived_at) throw new OwnTrainingError(404, 'No exercise of yours with that id.');
    const cleaned = cleanOwnExercise(input);
    if (!cleaned.ok) throw new OwnTrainingError(400, cleaned.problem);
    const { name, ...fields } = cleaned.value;
    if (this.nameTaken(userId, name, id)) throw new OwnTrainingError(409, `You already have an exercise called “${name}”.`);
    const at = this.now().toISOString();
    this.db.prepare('update own_exercises set name = ?, fields_json = ?, updated_at = ? where id = ?').run(name, JSON.stringify(fields), at, id);
    return { id, name, ...fields, archived: false, createdAt: row.created_at, updatedAt: at };
  }

  /** Archived, not removed: logged workouts still name it. */
  archiveExercise(userId: string, id: string): void {
    const at = this.now().toISOString();
    const changed = this.db.prepare('update own_exercises set archived_at = ?, updated_at = ? where id = ? and user_id = ? and archived_at is null').run(at, at, id, userId);
    if (changed.changes === 0) throw new OwnTrainingError(404, 'No exercise of yours with that id.');
  }

  private splitView(row: SplitRow): Split {
    return { id: row.id, name: row.name, days: JSON.parse(row.days_json) as Split['days'], createdAt: row.created_at, updatedAt: row.updated_at };
  }

  splits(userId: string): Split[] {
    const rows = this.db.prepare('select id, name, days_json, created_at, updated_at from own_splits where user_id = ? order by created_at').all(userId) as unknown as SplitRow[];
    return rows.map((row) => this.splitView(row));
  }

  private splitNameTaken(userId: string, name: string, except: string | null): boolean {
    return this.db.prepare('select id from own_splits where user_id = ? and lower(name) = lower(?) and id is not ?').get(userId, name, except) !== undefined;
  }

  addSplit(userId: string, input: unknown): Split {
    const cleaned = cleanSplit(input);
    if (!cleaned.ok) throw new OwnTrainingError(400, cleaned.problem);
    const { name, days } = cleaned.value;
    if (this.splitNameTaken(userId, name, null)) throw new OwnTrainingError(409, `You already have a split called “${name}”.`);
    const count = (this.db.prepare('select count(*) as n from own_splits where user_id = ?').get(userId) as { n: number }).n;
    if (count >= OWN_LIMITS.splits) throw new OwnTrainingError(409, `You have ${count} splits, the most there’s room for. Delete one first.`);
    const at = this.now().toISOString();
    const id = randomUUID();
    this.db.prepare('insert into own_splits (id, user_id, name, days_json, created_at, updated_at) values (?, ?, ?, ?, ?, ?)').run(id, userId, name, JSON.stringify(days), at, at);
    return { id, name, days, createdAt: at, updatedAt: at };
  }

  changeSplit(userId: string, id: string, input: unknown): Split {
    const row = this.db.prepare('select id, name, days_json, created_at, updated_at from own_splits where id = ? and user_id = ?').get(id, userId) as SplitRow | undefined;
    if (!row) throw new OwnTrainingError(404, 'No split of yours with that id.');
    const cleaned = cleanSplit(input);
    if (!cleaned.ok) throw new OwnTrainingError(400, cleaned.problem);
    const { name, days } = cleaned.value;
    if (this.splitNameTaken(userId, name, id)) throw new OwnTrainingError(409, `You already have a split called “${name}”.`);
    const at = this.now().toISOString();
    this.db.prepare('update own_splits set name = ?, days_json = ?, updated_at = ? where id = ?').run(name, JSON.stringify(days), at, id);
    return { id, name, days, createdAt: row.created_at, updatedAt: at };
  }

  removeSplit(userId: string, id: string): void {
    const removed = this.db.prepare('delete from own_splits where id = ? and user_id = ?').run(id, userId);
    if (removed.changes === 0) throw new OwnTrainingError(404, 'No split of yours with that id.');
  }

  /** For Download my data. */
  exportFor(userId: string): { ownExercises: OwnExercise[]; ownSplits: Split[] } {
    return { ownExercises: this.exercises(userId), ownSplits: this.splits(userId) };
  }
}
