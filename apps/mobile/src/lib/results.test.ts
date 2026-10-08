import { describe, expect, it } from 'vitest';
import { resultFor, resultsById } from './results';
import { BUNDLED_GYMS, boxAround, initialFilters, runSearch } from './query';

const morning = new Date('2026-09-24T21:00:00Z');
const filters = { ...initialFilters(morning), visitMinuteOfDay: 18 * 60, visitDate: '2026-09-25', budgetMinor: 2500 };

describe('a gym’s result, wherever it is', () => {
  it('gives the verdict a whole search gives it, weighing only the gyms asked for', () => {
    const ids = ['dohertys-gym-city', 'snap-fitness-fitzroy', 'nowhere-gym'];
    const mine = resultsById(filters, BUNDLED_GYMS, morning, undefined, ids);
    const whole = new Map(runSearch({ ...filters, radiusKm: 100_000 }, { records: BUNDLED_GYMS }, morning).results.map((result) => [result.record.location.id, result]));
    expect([...mine.keys()].sort()).toEqual(['dohertys-gym-city', 'snap-fitness-fitzroy']);
    for (const [id, result] of mine) {
      const same = whole.get(id)!;
      expect(result.tier).toBe(same.tier);
      expect(result.distanceKm).toBe(same.distanceKm);
      expect(result.limitations).toEqual(same.limitations);
    }
  });

  it('answers for a gym outside an area just searched (a saved gym across town)', () => {
    // A small box around Doherty's, in the city: Fitzroy's Snap Fitness is outside it.
    const doherty = BUNDLED_GYMS.find((record) => record.location.id === 'dohertys-gym-city')!;
    const boxed = { ...filters, bbox: boxAround(doherty.location.position, 0.01) };
    expect(runSearch(boxed, { records: BUNDLED_GYMS }, morning).results.some((result) => result.record.location.id === 'snap-fitness-fitzroy')).toBe(false);
    expect(resultFor(boxed, BUNDLED_GYMS, 'snap-fitness-fitzroy', morning)?.record.location.name).toMatch(/Snap/);
  });

  it('has nothing for no id, or an id it doesn’t know', () => {
    expect(resultFor(filters, BUNDLED_GYMS, undefined, morning)).toBeUndefined();
    expect(resultFor(filters, BUNDLED_GYMS, 'nowhere-gym', morning)).toBeUndefined();
    expect(resultsById(filters, BUNDLED_GYMS, morning, undefined, []).size).toBe(0);
  });
});
