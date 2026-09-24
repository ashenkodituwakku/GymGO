import { describe, expect, it } from 'vitest';
import { suggestGyms } from './gymSearch';
import { BUNDLED_GYMS } from './query';

const real = BUNDLED_GYMS.filter((record) => !record.location.isDemoData);
const MELBOURNE = { lat: -37.8142, lng: 144.9632 };
const NEW_YORK = { lat: 40.7549, lng: -73.984 };
const names = (query: string, near = MELBOURNE, limit = 4) => suggestGyms(query, real, near, limit).map((record) => record.location.name);

describe('finding a gym by name', () => {
  it('finds gyms whose name starts with what was typed, nearest first', () => {
    const snap = suggestGyms('snap fit', real, MELBOURNE);
    expect(snap.length).toBe(4);
    expect(snap.every((record) => record.location.name.startsWith('Snap Fitness'))).toBe(true);
    // Nearest to Melbourne first, so these are Melbourne's.
    expect(snap[0]!.location.address.state).toBe('VIC');
  });

  it('matches the start of any word, ignoring case, accents and apostrophes', () => {
    expect(names('dohertys')).toContain('Doherty’s Gym');
    expect(names('EQUINOX', NEW_YORK)[0]).toBe('Equinox');
    expect(names('eos', NEW_YORK, 50).some((name) => name.startsWith('EōS'))).toBe(true);
    expect(names('first')).toContain('Fitness First');
  });

  it('puts names that start with it before names that merely contain the word', () => {
    const hits = names('fitness', MELBOURNE, 50);
    // Leading punctuation doesn't count: "& Fitness" starts with "fitness".
    const starts = (name: string) => name.toLowerCase().replace(/^[^a-z0-9]+/, '').startsWith('fitness');
    const firstContains = hits.findIndex((name) => !starts(name));
    const lastStarts = hits.map(starts).lastIndexOf(true);
    expect(firstContains).toBeGreaterThan(0);
    expect(lastStarts).toBeLessThan(firstContains === -1 ? Infinity : firstContains);
  });

  it('never matches the middle of a word, and ignores one-letter searches', () => {
    expect(names('itness')).toEqual([]);
    expect(names('f')).toEqual([]);
    expect(names('zzzz')).toEqual([]);
  });
});
