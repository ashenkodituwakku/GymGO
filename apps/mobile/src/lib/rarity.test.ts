import { describe, expect, it } from 'vitest';
import { collect } from './collection';
import { FOIL_ONE_IN, GEMS, RARITIES, cardFor, cardName, dice, newSeed, oddsLine, rarityForRoll, rarityRank } from './rarity';

const gym = { id: 'dohertys-gym-city', name: 'Doherty’s Gym', suburb: 'Melbourne', countryCode: 'AU', brand: null, position: { lat: -37.81907, lng: 144.95865 } };

describe('card rarity', () => {
  it('turns a roll into a rarity with the odds it shows', () => {
    expect(RARITIES.reduce((sum, item) => sum + item.odds, 0)).toBeCloseTo(1);
    expect(rarityForRoll(0)).toBe('legendary');
    expect(rarityForRoll(0.0099)).toBe('legendary');
    expect(rarityForRoll(0.01)).toBe('epic');
    expect(rarityForRoll(0.049)).toBe('epic');
    expect(rarityForRoll(0.05)).toBe('rare');
    expect(rarityForRoll(0.149)).toBe('rare');
    expect(rarityForRoll(0.15)).toBe('uncommon');
    expect(rarityForRoll(0.399)).toBe('uncommon');
    expect(rarityForRoll(0.4)).toBe('common');
    expect(rarityForRoll(0.9999)).toBe('common');
    expect(oddsLine()).toBe('Common 60%, Uncommon 25%, Rare 10%, Epic 4%, Legendary 1%');
  });

  it('rolls fairly: over many seeds each rarity, gem and foil comes up about as often as it says', () => {
    const counts = new Map<string, number>();
    const gems = new Map<string, number>();
    let foils = 0;
    const n = 40_000;
    for (let at = 0; at < n; at++) {
      const look = cardFor({ id: `gym-${at}`, firstAt: '2026-09-01T07:00:00.000Z', days: ['2026-09-01'], seed: `s${at}` });
      counts.set(look.rarity, (counts.get(look.rarity) ?? 0) + 1);
      gems.set(look.gem, (gems.get(look.gem) ?? 0) + 1);
      if (look.foil) foils += 1;
    }
    for (const item of RARITIES) expect((counts.get(item.id) ?? 0) / n).toBeCloseTo(item.odds, 2);
    for (const gem of GEMS) expect((gems.get(gem.id) ?? 0) / n).toBeCloseTo(1 / GEMS.length, 1);
    expect(foils / n).toBeCloseTo(1 / FOIL_ONE_IN, 2);
    const rolls = Array.from({ length: 10_000 }, (_, at) => dice(`x${at}`));
    expect(Math.min(...rolls)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...rolls)).toBeLessThan(1);
  });

  it('keeps a card the same every time it’s drawn, and its best roll as visits add up', () => {
    const entry = { id: 'a', firstAt: '2026-09-01T07:00:00.000Z', days: ['2026-09-01'], seed: 'k3y5eed0' };
    expect(cardFor(entry)).toEqual(cardFor({ ...entry }));
    let days: string[] = [];
    let best = -1;
    for (let day = 1; day <= 60; day++) {
      days = [...days, `2026-10-${String(day).padStart(2, '0')}`];
      const rank = rarityRank(cardFor({ ...entry, days }).rarity);
      expect(rank).toBeGreaterThanOrEqual(best);
      best = rank;
    }
    // The gem and foil never change with visits.
    const first = cardFor({ ...entry, days: days.slice(0, 1) });
    const later = cardFor({ ...entry, days });
    expect(later.gem).toBe(first.gem);
    expect(later.foil).toBe(first.foil);
  });

  it('gives a newly collected gym a random seed, and an older one a steady card without one', () => {
    const rolls = [0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4];
    let at = 0;
    const { entry } = collect({}, gym, new Date(2026, 8, 1, 7), () => rolls[at++ % rolls.length]!);
    expect(entry.seed).toBe(newSeed(() => [0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4][at++ % 8]!));
    expect(entry.seed).toMatch(/^[0-9a-z]{8}$/);
    const old = { id: 'old', firstAt: '2025-01-01T07:00:00.000Z', days: ['2025-01-01', '2025-01-05'] };
    expect(cardFor(old)).toEqual(cardFor({ ...old }));
    expect(cardName({ rarity: 'legendary', gem: 'rose', foil: true, bestDay: null })).toBe('Legendary Rose quartz foil');
  });
});
