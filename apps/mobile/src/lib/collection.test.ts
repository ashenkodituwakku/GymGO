import { describe, expect, it } from 'vitest';
import { badges, checkIn, cityFor, collect, collectionStats, flag, tierFor, type Collection } from './collection';

// Doherty's Gym, Flinders Street, Melbourne.
const GYM = { lat: -37.81907, lng: 144.95865 };
const doherty = { id: 'dohertys-gym-city', name: 'Doherty’s Gym', suburb: 'Melbourne', countryCode: 'AU', brand: 'Doherty’s Gym', position: GYM };

describe('checkIn', () => {
  it('counts you as here within 150 m, allowing for a fair fix', () => {
    expect(checkIn({ position: GYM, accuracyM: 10 }, GYM)).toEqual({ kind: 'here', metres: 0 });
    const nextDoor = { lat: GYM.lat + 0.0012, lng: GYM.lng }; // about 133 m
    expect(checkIn({ position: nextDoor, accuracyM: 20 }, GYM).kind).toBe('here');
    const blockAway = { lat: GYM.lat + 0.0018, lng: GYM.lng }; // about 200 m, fix good to 60 m
    expect(checkIn({ position: blockAway, accuracyM: 60 }, GYM).kind).toBe('here');
    expect(checkIn({ position: blockAway, accuracyM: 10 }, GYM).kind).toBe('far');
  });

  it('says a rough fix is rough rather than guessing, and far is far', () => {
    const near = { lat: GYM.lat + 0.004, lng: GYM.lng }; // about 445 m
    expect(checkIn({ position: near, accuracyM: 900 }, GYM).kind).toBe('rough');
    const town = { lat: GYM.lat + 0.05, lng: GYM.lng };
    const result = checkIn({ position: town, accuracyM: 900 }, GYM);
    expect(result.kind).toBe('far');
  });
});

describe('collect', () => {
  it('adds a new gym, then a visit a day, never two on one day', () => {
    const day1 = new Date(2026, 8, 1, 7);
    const first = collect({}, doherty, day1);
    expect(first.fresh).toBe('new');
    expect(first.entry.city).toBe('Melbourne');
    expect(first.entry.days).toEqual(['2026-09-01']);
    const again = collect(first.collection, doherty, new Date(2026, 8, 1, 19));
    expect(again.fresh).toBe('again-today');
    expect(again.collection).toBe(first.collection);
    const next = collect(first.collection, doherty, new Date(2026, 8, 3, 7));
    expect(next.fresh).toBe('visit');
    expect(next.entry.days).toEqual(['2026-09-01', '2026-09-03']);
    expect(next.entry.firstAt).toBe(first.entry.firstAt);
  });
});

describe('tiers and totals', () => {
  it('moves up by visits, and says how far the next tier is', () => {
    expect(tierFor(1)).toMatchObject({ tier: 'bronze', next: { label: 'Silver', visits: 2 } });
    expect(tierFor(3).tier).toBe('silver');
    expect(tierFor(12)).toMatchObject({ tier: 'gold', next: { label: 'Platinum', visits: 13 } });
    expect(tierFor(40)).toMatchObject({ tier: 'platinum', next: null });
  });

  it('counts gyms, cities and countries, and the badges they earn', () => {
    const days = (n: number) => Array.from({ length: n }, (_, index) => `2026-01-${String(index + 1).padStart(2, '0')}`);
    const entry = (id: string, city: string, countryCode: string, visits: number) => ({ id, name: id, suburb: city, city, countryCode, brand: null, days: days(visits), firstAt: '', lastAt: '' });
    const collection: Collection = { a: entry('a', 'Melbourne', 'AU', 11), b: entry('b', 'Melbourne', 'AU', 1), c: entry('c', 'Sydney', 'AU', 2), d: entry('d', 'London', 'GB', 1) };
    const stats = collectionStats(collection);
    expect(stats).toEqual({ gyms: 4, visits: 15, cities: 3, countries: 2, topTier: 'gold' });
    const earned = badges(stats).filter((badge) => badge.earned).map((badge) => badge.id);
    expect(earned).toEqual(['first', 'cities', 'countries', 'gold']);
  });

  it('draws a flag from a country code, and nothing from junk', () => {
    expect(flag('AU')).toBe('🇦🇺');
    expect(flag('xx')).toBe('');
  });

  it('names the big city near a gym, or its suburb far from one', () => {
    expect(cityFor(GYM, 'AU', 'Melbourne')).toBe('Melbourne');
    expect(cityFor({ lat: -23.7, lng: 133.88 }, 'AU', 'Alice Springs')).toBe('Alice Springs');
  });
});
