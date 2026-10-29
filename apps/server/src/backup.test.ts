import { mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { BACKUP_DAYS, backupDatabase, pruneBackups, scheduleBackups } from './backup';
import { openDb } from './db';

const dirs: string[] = [];
const scratch = () => {
  const dir = mkdtempSync(join(tmpdir(), 'gymgo-backup-'));
  dirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('database backups', () => {
  it('copy the whole database while it’s open, into a file that opens on its own', () => {
    const home = scratch();
    const db = openDb(join(home, 'gymgo.db'));
    db.prepare("insert into users (id, email, display_name, password_hash, created_at) values ('u1', 'a@example.com', 'A', '', '2026-10-01')").run();
    const file = backupDatabase(db, join(home, 'backups'), new Date('2026-10-01T03:04:05.678Z'));
    expect(file).toMatch(/gymgo-2026-10-01T03-04-05Z\.db$/);
    db.close();
    const copy = openDb(file);
    expect((copy.prepare('select email from users').get() as { email: string }).email).toBe('a@example.com');
    copy.close();
  });

  it(`are deleted after ${BACKUP_DAYS} days, and nothing else in the folder is`, () => {
    const dir = scratch();
    const now = new Date('2026-10-20T00:00:00Z');
    const old = join(dir, 'gymgo-2026-10-01T00-00-00Z.db');
    const recent = join(dir, 'gymgo-2026-10-15T00-00-00Z.db');
    const other = join(dir, 'notes.txt');
    for (const file of [old, recent, other]) writeFileSync(file, 'x');
    const day = 24 * 60 * 60;
    utimesSync(old, now.getTime() / 1000 - 19 * day, now.getTime() / 1000 - 19 * day);
    utimesSync(recent, now.getTime() / 1000 - 5 * day, now.getTime() / 1000 - 5 * day);
    utimesSync(other, now.getTime() / 1000 - 100 * day, now.getTime() / 1000 - 100 * day);
    expect(pruneBackups(dir, now)).toEqual([old]);
    expect(readdirSync(dir).sort()).toEqual(['gymgo-2026-10-15T00-00-00Z.db', 'notes.txt']);
    expect(pruneBackups(join(dir, 'missing'), now)).toEqual([]);
  });

  it('run on a schedule, and say so', async () => {
    const home = scratch();
    const db = openDb(':memory:');
    const lines: string[] = [];
    const stop = scheduleBackups(db, home, { firstAfterMs: 5, everyMs: 10_000, log: (line) => lines.push(line) });
    await new Promise((resolve) => setTimeout(resolve, 60));
    stop();
    db.close();
    expect(lines[0]).toMatch(/^\[backup\] Wrote .*gymgo-.*\.db$/);
    expect(readdirSync(home)).toHaveLength(1);
  });
});
