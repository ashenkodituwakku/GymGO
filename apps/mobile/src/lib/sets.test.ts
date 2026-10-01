import { describe, expect, it } from 'vitest';
import type { GymRecord } from '@gymgo/domain';
import { collect, type Collection } from './collection';
import { CITY_SET_SIZE, collectionSets, setsDone, setsFinished } from './sets';

// Points in inner Melbourne (all within 40 km of the city centre).
const FITZROY = { lat: -37.7985, lng: 144.9785 };
const record = (id: string, name: string, suburb: string, extra: { closed?: boolean; demo?: boolean; at?: { lat: number; lng: number } } = {}) =>
  ({
    location: {
      id,
      name,
      address: { suburb, countryCode: 'AU' },
      position: extra.at ?? FITZROY,
      operatingStatus: extra.closed ? 'permanently_closed' : 'open',
      isDemoData: extra.demo === true,
    },
  }) as unknown as GymRecord;

const LISTED = [
  record('a', 'Alpha Gym', 'Fitzroy'),
  record('b', 'Beta Fitness', 'Fitzroy'),
  record('c', 'Closed Gym', 'Fitzroy', { closed: true }),
  record('d', 'Demo Gym', 'Fitzroy', { demo: true }),
  record('e', 'Echo Strength', 'Collingwood', { at: { lat: -37.8036, lng: 144.9877 } }),
  record('f', 'Solo Gym', 'Carlton', { at: { lat: -37.8, lng: 144.967 } }),
];

const gymOf = (id: string) => {
  const found = LISTED.find((item) => item.location.id === id)!.location;
  return { id, name: found.name, suburb: found.address.suburb, countryCode: 'AU', brand: null, position: found.position };
};
const collectAll = (ids: string[], start = new Date(2026, 8, 1, 7)): Collection =>
  ids.reduce((collection, id, index) => collect(collection, gymOf(id), new Date(start.getTime() + index * 86_400_000)).collection, {} as Collection);

describe('collection sets', () => {
  it('starts a suburb set with the first gym, counting only real, open gyms', () => {
    const sets = collectionSets(collectAll(['a']), LISTED);
    const fitzroy = sets.find((set) => set.kind === 'suburb' && set.name === 'Fitzroy')!;
    expect(fitzroy).toMatchObject({ total: 2, have: 1, complete: false, completedOn: null });
    expect(fitzroy.missing).toEqual([{ id: 'b', name: 'Beta Fitness' }]);
    // A suburb you haven't started, or one with a single gym, isn't shown.
    expect(sets.some((set) => set.name === 'Collingwood' || set.name === 'Carlton')).toBe(false);
  });

  it('finishes a set on the day its last gym was collected, and says so once', () => {
    const before = collectAll(['a']);
    const after = collect(before, gymOf('b'), new Date(2026, 8, 5, 18)).collection;
    const done = setsFinished(before, after, LISTED);
    expect(done.map((set) => set.name)).toEqual(['Fitzroy']);
    expect(done[0]).toMatchObject({ complete: true, have: 2, completedOn: '2026-09-05' });
    // A later visit finishes nothing new.
    const again = collect(after, gymOf('a'), new Date(2026, 8, 9, 7)).collection;
    expect(setsFinished(after, again, LISTED)).toEqual([]);
    expect(setsDone(collectionSets(again, LISTED))).toEqual({ suburbs: 1, cities: 0 });
  });

  it('places a collected gym in the suburb GymGO lists it in now', () => {
    const stale = { ...collectAll(['a']) };
    stale.a = { ...stale.a!, suburb: 'Melbourne' };
    expect(collectionSets(stale, LISTED).find((set) => set.kind === 'suburb')).toMatchObject({ name: 'Fitzroy', have: 1, total: 2 });
  });

  it('leaves a "suburb" the size of a city to the city set', () => {
    const london = Array.from({ length: 20 }, (_, index) => record(`l${index}`, `London gym ${index}`, 'London', { at: { lat: 51.507, lng: -0.128 } }));
    const mine = collect({}, { id: 'l0', name: 'London gym 0', suburb: 'London', countryCode: 'AU', brand: null, position: { lat: 51.507, lng: -0.128 } }).collection;
    expect(collectionSets(mine, london).filter((set) => set.kind === 'suburb')).toEqual([]);
  });

  it('counts a closed gym you collected before it closed', () => {
    const sets = collectionSets(collectAll(['a', 'c']), LISTED);
    expect(sets.find((set) => set.name === 'Fitzroy')).toMatchObject({ total: 3, have: 2 });
  });

  it('makes a city set of every gym GymGO lists there when it has fewer than ten', () => {
    const city = collectionSets(collectAll(['a', 'b', 'e']), LISTED).find((set) => set.kind === 'city')!;
    expect(city.name).toBe('Melbourne');
    // a, b, e and f count (not the closed or demo gym): four, fewer than ten.
    expect(city).toMatchObject({ total: 4, have: 3, complete: false });
    const many = Array.from({ length: 14 }, (_, index) => record(`m${index}`, `Gym ${index}`, `Suburb ${index}`));
    const twelve = Array.from({ length: 12 }, (_, index) => `m${index}`);
    const big = twelve.reduce((collection, id, index) => {
      const found = many.find((item) => item.location.id === id)!.location;
      return collect(collection, { id, name: found.name, suburb: found.address.suburb, countryCode: 'AU', brand: null, position: found.position }, new Date(2026, 8, 1 + index, 7)).collection;
    }, {} as Collection);
    const bigCity = collectionSets(big, many).find((set) => set.kind === 'city')!;
    expect(bigCity).toMatchObject({ total: CITY_SET_SIZE, have: CITY_SET_SIZE, complete: true, completedOn: '2026-09-10' });
  });

  it('lists sets still going before finished ones', () => {
    const sets = collectionSets(collectAll(['a', 'b']), LISTED);
    expect(sets.map((set) => `${set.kind}:${set.name}:${set.complete}`)).toEqual(['city:Melbourne:false', 'suburb:Fitzroy:true']);
    expect(collectionSets({}, LISTED)).toEqual([]);
  });
});
