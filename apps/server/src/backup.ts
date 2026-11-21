/**
 * Daily copies of the database, to put GymGO back after a mistake or a
 * damaged file. Turned on by GYMGO_BACKUP_DIR (the hosting setup sets it).
 *
 * `VACUUM INTO` writes a complete, consistent copy while the server keeps
 * running. Copies are kept for 14 days and then deleted: the privacy policy
 * promises that a deleted account leaves the backups within 14 days. They
 * sit on the same disk as the database, so they don't survive losing the
 * disk; README ("Put GymGO online") says how to copy them somewhere else.
 */

import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './db';

export const BACKUP_DAYS = 14;
const NAME = /^gymgo-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.db$/;

/** Writes a copy of the database into `dir`, named for when it was made, and returns its path. */
export function backupDatabase(db: Db, dir: string, now = new Date()): string {
  mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
  const file = join(dir, `gymgo-${stamp}.db`);
  db.prepare('vacuum into ?').run(file);
  return file;
}

/** Deletes this module's copies older than `days`, and returns what it deleted. */
export function pruneBackups(dir: string, now = new Date(), days = BACKUP_DAYS): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const cutoff = now.getTime() - days * 24 * 60 * 60_000;
  const removed: string[] = [];
  for (const name of names) {
    if (!NAME.test(name)) continue;
    const file = join(dir, name);
    if (statSync(file).mtimeMs < cutoff) {
      unlinkSync(file);
      removed.push(file);
    }
  }
  return removed;
}

/**
 * A copy a minute after the server starts, then one a day, each followed by
 * deleting the ones past 14 days. Returns a function that stops it.
 */
export function scheduleBackups(
  db: Db,
  dir: string,
  options: { everyMs?: number; firstAfterMs?: number; log?: (line: string) => void; now?: () => Date } = {},
): () => void {
  const log = options.log ?? ((line: string) => console.log(line));
  const now = options.now ?? (() => new Date());
  const run = () => {
    try {
      const file = backupDatabase(db, dir, now());
      const removed = pruneBackups(dir, now());
      log(`[backup] Wrote ${file}${removed.length ? `; deleted ${removed.length} older than ${BACKUP_DAYS} days` : ''}`);
    } catch (error) {
      log(`[backup] Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  let daily: NodeJS.Timeout | null = null;
  const first = setTimeout(() => {
    run();
    daily = setInterval(run, options.everyMs ?? 24 * 60 * 60_000);
    daily.unref();
  }, options.firstAfterMs ?? 60_000);
  first.unref();
  return () => {
    clearTimeout(first);
    if (daily) clearInterval(daily);
  };
}
