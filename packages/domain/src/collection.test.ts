import { describe, expect, it } from 'vitest';
import { cleanCollectedGym, mergeCollectedGym, mergeCollections, visitsAfter, type CollectedGym } from './collection';

const NOW = new Date('2026-09-29T10:00:00Z');
const gym = (id: string, days: string[], extra: Partial<CollectedGym> = {}): CollectedGym => ({
  id,
  name: `Gym ${id}`,
  suburb: 'Fitzroy',
  city: 'Melbourne',
  countryCode: 'AU',
  brand: null,
  days,
  firstAt: `${days[0]}T08:00:00.000Z`,
  lastAt: `${days[days.length - 1]}T08:00:00.000Z`,
  seed: `seed${id}`,
  ...extra,
});

describe('a collected gym as stored', () => {
  it('keeps a real entry, tidied', () => {
    const clean = cleanCollectedGym({ ...gym('a', ['2026-09-02', '2026-09-01', '2026-09-02']), name: '  Doherty’s   Gym ' }, NOW);
    expect(clean?.name).toBe('Doherty’s Gym');
    expect(clean?.days).toEqual(['2026-09-01', '2026-09-02']);
    expect(clean?.seed).toBe('seeda');
  });

  it('turns away what isn’t one, and days from the future', () => {
    expect(cleanCollectedGym(null, NOW)).toBeNull();
    expect(cleanCollectedGym({ ...gym('a', ['2026-09-01']), countryCode: 'Australia' }, NOW)).toBeNull();
    expect(cleanCollectedGym({ ...gym('a', ['2026-09-01']), id: '' }, NOW)).toBeNull();
    expect(cleanCollectedGym({ ...gym('a', ['2026-09-01']), days: ['yesterday'] }, NOW)).toBeNull();
    // A day ahead is allowed for time zones; a week ahead isn't.
    expect(cleanCollectedGym(gym('a', ['2026-09-29', '2026-09-30', '2026-10-06']), NOW)?.days).toEqual(['2026-09-29', '2026-09-30']);
  });
});

describe('merging two copies of a collection', () => {
  it('keeps every visit from both, and the first copy’s card', () => {
    const phone = gym('a', ['2026-09-01', '2026-09-03'], { seed: 'phone' });
    const laptop = gym('a', ['2026-08-30', '2026-09-03', '2026-09-05'], { seed: 'laptop', name: 'Gym A (renamed)' });
    const merged = mergeCollectedGym(phone, laptop);
    expect(merged.days).toEqual(['2026-08-30', '2026-09-01', '2026-09-03', '2026-09-05']);
    expect(merged.seed).toBe('phone');
    expect(merged.firstAt).toBe('2026-08-30T08:00:00.000Z');
    expect(merged.lastAt).toBe('2026-09-05T08:00:00.000Z');
    // Names as of the latest visit.
    expect(merged.name).toBe('Gym A (renamed)');
  });

  it('adds gyms only one copy has', () => {
    const merged = mergeCollections({ a: gym('a', ['2026-09-01']) }, { b: gym('b', ['2026-09-02']) });
    expect(Object.keys(merged).sort()).toEqual(['a', 'b']);
  });

  it('after a reset elsewhere, keeps only visits from later days', () => {
    const left = visitsAfter({ a: gym('a', ['2026-09-01', '2026-09-10']), b: gym('b', ['2026-09-02']) }, '2026-09-05');
    expect(Object.keys(left)).toEqual(['a']);
    expect(left.a!.days).toEqual(['2026-09-10']);
  });
});
