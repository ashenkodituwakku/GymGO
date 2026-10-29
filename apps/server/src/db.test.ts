import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, describe, expect, it } from 'vitest';
import { openDb } from './db';

const dir = mkdtempSync(join(tmpdir(), 'gymgo-db-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('opening a database made by an older GymGO', () => {
  it('widens visit prices to every currency, keeping every report', () => {
    const path = join(dir, 'old.db');
    // The table as it was: A$ and US$ only.
    const old = new DatabaseSync(path);
    old.exec(`create table users (id text primary key);
      insert into users (id) values ('u1');
      create table price_reports (
        gym_id text not null,
        user_id text not null references users(id) on delete cascade,
        amount_minor integer not null check (amount_minor between 100 and 50000),
        currency text not null check (currency in ('AUD', 'USD')),
        paid_on text not null,
        reported_at text not null,
        primary key (gym_id, user_id)
      );
      insert into price_reports values ('carlton-fitness', 'u1', 2000, 'AUD', '2026-09-01', '2026-09-02T00:00:00Z');`);
    old.close();

    const db = openDb(path);
    expect(db.prepare('select gym_id, amount_minor, currency from price_reports').all()).toEqual([
      { gym_id: 'carlton-fitness', amount_minor: 2000, currency: 'AUD' },
    ]);
    db.prepare("insert into price_reports values ('a-berlin-gym', 'u1', 1500, 'EUR', '2026-09-01', '2026-09-02T00:00:00Z')").run();
    // Every country's own currency now, sized to it: ¥250,000 is ¥2,500.
    db.prepare("insert into price_reports values ('a-tokyo-gym', 'u1', 250000, 'JPY', '2026-09-01', '2026-09-02T00:00:00Z')").run();
    expect(() => db.prepare("insert into price_reports values ('a-gym', 'u1', 1500, 'YENS', '2026-09-01', '2026-09-02T00:00:00Z')").run()).toThrow();
    expect(() => db.prepare("insert into price_reports values ('b-gym', 'u1', 0, 'EUR', '2026-09-01', '2026-09-02T00:00:00Z')").run()).toThrow();
    db.close();
    // Opening it again changes nothing.
    const again = openDb(path);
    expect((again.prepare('select count(*) as n from price_reports').get() as { n: number }).n).toBe(3);
    again.close();
  });

  it('widens a database from the five-currency days too', () => {
    const path = join(dir, 'five.db');
    const old = new DatabaseSync(path);
    old.exec(`create table users (id text primary key);
      insert into users (id) values ('u1');
      create table price_reports (
        gym_id text not null,
        user_id text not null references users(id) on delete cascade,
        amount_minor integer not null check (amount_minor between 100 and 50000),
        currency text not null check (currency in ('AUD', 'USD', 'EUR', 'GBP', 'CHF')),
        paid_on text not null,
        reported_at text not null,
        primary key (gym_id, user_id)
      );
      insert into price_reports values ('a-zurich-gym', 'u1', 3000, 'CHF', '2026-09-01', '2026-09-02T00:00:00Z');`);
    old.close();
    const db = openDb(path);
    db.prepare("insert into price_reports values ('a-mumbai-gym', 'u1', 50000, 'INR', '2026-09-01', '2026-09-02T00:00:00Z')").run();
    expect(db.prepare('select gym_id, currency from price_reports order by gym_id').all()).toEqual([
      { gym_id: 'a-mumbai-gym', currency: 'INR' },
      { gym_id: 'a-zurich-gym', currency: 'CHF' },
    ]);
    db.close();
  });
});
