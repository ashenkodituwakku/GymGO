/**
 * The database: one SQLite file, through Node's built-in `node:sqlite`.
 *
 * No server to install, nothing to pay for, and nothing to compile on
 * Windows. The file lives in apps/server/data/ (git-ignored). Moving to a
 * hosted Postgres later means reimplementing this module; the routes only
 * see the functions below.
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { GymRecord } from '@gymgo/domain';

export type Db = DatabaseSync;

const SCHEMA = `
  create table if not exists users (
    id text primary key,
    email text not null unique collate nocase,
    display_name text not null,
    password_hash text not null,
    role text not null default 'member',
    blocked integer not null default 0,
    created_at text not null
  );
  create table if not exists sessions (
    token_hash text primary key,
    user_id text not null references users(id) on delete cascade,
    created_at text not null,
    expires_at text not null
  );
  create index if not exists sessions_user on sessions(user_id);
  create table if not exists saved_gyms (
    user_id text not null references users(id) on delete cascade,
    gym_id text not null,
    created_at text not null,
    primary key (user_id, gym_id)
  );
  create table if not exists reviews (
    id text primary key,
    gym_id text not null,
    user_id text not null references users(id) on delete cascade,
    overall integer not null check (overall between 1 and 5),
    body text not null,
    visited_on text,
    status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'removed')),
    moderation_reason text,
    created_at text not null,
    moderated_at text,
    moderated_by text
  );
  create index if not exists reviews_gym on reviews(gym_id, status);
  create table if not exists gyms (
    id text primary key,
    record_json text not null,
    is_demo integer not null,
    updated_at text not null
  );
`;

export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('pragma foreign_keys = on;');
  if (path !== ':memory:') db.exec('pragma journal_mode = wal;');
  db.exec(SCHEMA);
  return db;
}

/**
 * Load the gym records into the database.
 *
 * The records are maintained in code (packages/melbourne-data and
 * packages/demo-data), with their sources, so the database copy is replaced
 * on every start. Gyms that are no longer in the dataset are removed; saved
 * gyms and reviews that point at them stay, and simply stop matching.
 */
export function seedGyms(db: Db, records: GymRecord[], now = new Date()): void {
  const upsert = db.prepare(
    `insert into gyms (id, record_json, is_demo, updated_at) values (?, ?, ?, ?)
     on conflict(id) do update set record_json = excluded.record_json, is_demo = excluded.is_demo, updated_at = excluded.updated_at`,
  );
  db.exec('begin');
  try {
    const ids = new Set<string>();
    for (const record of records) {
      ids.add(record.location.id);
      upsert.run(record.location.id, JSON.stringify(record), record.location.isDemoData ? 1 : 0, now.toISOString());
    }
    const existing = db.prepare('select id from gyms').all() as Array<{ id: string }>;
    const remove = db.prepare('delete from gyms where id = ?');
    for (const row of existing) if (!ids.has(row.id)) remove.run(row.id);
    db.exec('commit');
  } catch (error) {
    db.exec('rollback');
    throw error;
  }
}

export function allGyms(db: Db): GymRecord[] {
  const rows = db.prepare('select record_json from gyms order by is_demo, id').all() as Array<{ record_json: string }>;
  return rows.map((row) => JSON.parse(row.record_json) as GymRecord);
}

export function gymExists(db: Db, gymId: string): boolean {
  return db.prepare('select 1 from gyms where id = ?').get(gymId) !== undefined;
}
