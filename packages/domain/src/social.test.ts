import { describe, expect, it } from 'vitest';
import { cardFor } from './cards';
import type { CollectedGym } from './collection';
import { collectionTotals, formatFriendCode, friendCard, makeFriendCode, normaliseFriendCode, rankBoard } from './social';

const gym = (id: string, city: string, days: string[], countryCode = 'AU'): CollectedGym => ({
  id,
  name: id,
  suburb: '',
  city,
  countryCode,
  brand: null,
  days,
  firstAt: `${days[0]}T08:00:00.000Z`,
  lastAt: `${days[days.length - 1]}T08:00:00.000Z`,
  seed: `seed-${id}`,
});

describe('friend codes', () => {
  it('are eight unmistakable characters, read back however they’re typed', () => {
    let n = 0;
    const code = makeFriendCode(() => (n++ * 0.137) % 1);
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    expect(formatFriendCode('K7QM2XPH')).toBe('K7QM-2XPH');
    expect(normaliseFriendCode(' k7qm-2xph ')).toBe('K7QM2XPH');
    expect(normaliseFriendCode('K7QM 2XPH')).toBe('K7QM2XPH');
    expect(normaliseFriendCode('K7QM-2XP0')).toBeNull();
    expect(normaliseFriendCode('K7QM')).toBeNull();
  });
});

describe('a friend’s cards', () => {
  it('look the same as on their phone, without the days they trained', () => {
    const entry = gym('fitzroy-gym', 'Melbourne', ['2026-09-01', '2026-09-03', '2026-09-20']);
    const card = friendCard(entry);
    const { rarity, gem, foil } = cardFor(entry);
    expect(card).toMatchObject({ id: 'fitzroy-gym', visits: 3, since: '2026-09', rarity, gem, foil });
    expect(JSON.stringify(card)).not.toContain('2026-09-03');
    expect(card).not.toHaveProperty('days');
  });

  it('adds up, for everything or one city', () => {
    const entries = [gym('a', 'Melbourne', ['2026-09-01']), gym('b', 'Melbourne', ['2026-09-01', '2026-09-02']), gym('c', 'New York', ['2026-09-05'], 'US')].map(
      (entry) => ({ ...entry, visits: entry.days.length }),
    );
    expect(collectionTotals(entries)).toEqual({ gyms: 3, visits: 4, cities: 2, countries: 2 });
    expect(collectionTotals(entries, { city: 'melbourne', countryCode: 'AU' })).toEqual({ gyms: 2, visits: 3, cities: 1, countries: 1 });
  });
});

describe('leaderboards', () => {
  it('rank by gyms, then visits, with ties sharing a place, and leave out anyone with none', () => {
    const board = rankBoard([
      { id: '1', displayName: 'Ana', gyms: 4, visits: 9 },
      { id: '2', displayName: 'Ben', gyms: 6, visits: 7 },
      { id: '3', displayName: 'Cy', gyms: 4, visits: 9 },
      { id: '4', displayName: 'Di', gyms: 4, visits: 2 },
      { id: '5', displayName: 'Ed', gyms: 0, visits: 0 },
    ]);
    expect(board.map((row) => [row.displayName, row.rank])).toEqual([
      ['Ben', 1],
      ['Ana', 2],
      ['Cy', 2],
      ['Di', 4],
    ]);
  });
});
