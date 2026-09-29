import { describe, expect, it } from 'vitest';
import type { GymRecord } from '@gymgo/domain';
import { mapOnlyRecord } from './record';
import { withoutKnown, withoutTwins } from './same';

const gym = (id: string, name: string, lat: number, lng: number, osm: string, demo = false): GymRecord => {
  const record = mapOnlyRecord(
    { id, osm, name, line1: '', locality: 'Melbourne', state: 'VIC', postcode: '', lat, lng, type: 'full_gym' },
    { countryCode: 'AU', timezone: 'Australia/Melbourne', fetchedAt: '2026-09-29T00:00:00Z' },
  );
  return { ...record, location: { ...record.location, isDemoData: demo } };
};

// What GymGO carries.
const KNOWN = [
  gym('anytime-fitness-collingwood', 'Anytime Fitness Collingwood', -37.8003, 144.9845, 'node/1'),
  gym('dohertys-gym-city', 'Doherty’s Gym', -37.8136, 144.9631, 'node/2'),
];

describe('the same gym, reached twice', () => {
  it('leaves out the map’s copy of a gym GymGO carries: the same element, or the same name within 100 m', () => {
    const extra = [
      // Same element, another id (an area search's).
      gym('anytime-fitness-n1', 'Anytime Fitness', -37.8003, 144.9845, 'node/1'),
      // Another element, the same gym 40 m away (a building outline).
      gym('dohertys-gym-w99', 'Dohertys Gym', -37.8139, 144.9634, 'way/99'),
      // A different gym next door: kept.
      gym('fight-club-n5', 'Fight Club', -37.8137, 144.9632, 'node/5'),
      // The same name 3 km away, another branch: kept.
      gym('anytime-fitness-n6', 'Anytime Fitness Richmond', -37.8230, 145.0010, 'node/6'),
    ];
    expect(withoutKnown(extra, KNOWN).map((record) => record.location.id)).toEqual(['fight-club-n5', 'anytime-fitness-n6']);
  });

  it('never counts an invented demo gym as the real one', () => {
    const demo = [gym('demo-dohertys', 'Doherty’s Gym', -37.8136, 144.9631, 'node/77', true)];
    const real = [gym('dohertys-gym-n2', 'Doherty’s Gym', -37.8136, 144.9631, 'node/88')];
    expect(withoutKnown(real, demo)).toHaveLength(1);
  });
});

describe('one gym mapped twice', () => {
  it('keeps one of a gym mapped as a point and an outline, or at an operator’s address and the map’s', () => {
    const records = [
      gym('snap-fitness-gaffney-street-melbourne', 'Snap Fitness', -37.7458, 144.9632, 'node/10'),
      gym('snap-fitness-melbourne-w355845748', 'Snap Fitness', -37.7459, 144.9633, 'way/355845748'),
      gym('revo-fitness-southland', 'Revo Fitness', -37.9580, 145.0490, ''),
      gym('revo-fitness-n9579466394', 'Revo Fitness', -37.9600, 145.0490, 'node/9579466394'),
      gym('vivagym-barcelona', 'VivaGym', 41.3860, 2.1640, 'node/20'),
      gym('vivagym-universitat-barcelona', 'VivaGym Universitat', 41.3861, 2.1641, 'node/21'),
    ];
    expect(withoutTwins(records).map((record) => record.location.id)).toEqual(['snap-fitness-gaffney-street-melbourne', 'revo-fitness-southland', 'vivagym-barcelona']);
  });

  it('never merges two gyms in one building, or two branches of a chain streets apart', () => {
    const records = [
      gym('f45-richmond', 'F45 Training Richmond', -37.8230, 145.0010, 'node/30'),
      gym('richmond-boxing', 'Richmond Boxing', -37.8231, 145.0011, 'node/31'),
      gym('anytime-a', 'Anytime Fitness', -37.8000, 144.9800, 'node/32'),
      gym('anytime-b', 'Anytime Fitness', -37.8060, 144.9800, 'node/33'),
    ];
    expect(withoutTwins(records)).toHaveLength(4);
  });
});
