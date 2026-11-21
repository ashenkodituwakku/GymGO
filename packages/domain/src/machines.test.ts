import { describe, expect, it } from 'vitest';
import { findMachines } from './machines';
import { equipment, location, record, unknownProvenance } from './testing';

const centre = { lat: -33.8846, lng: 151.2113 };
const near = (id: string, km: number, overrides: Parameters<typeof record>[0] = {}) =>
  record({ location: location({ id, position: { lat: centre.lat + km / 111.2, lng: centre.lng } }), ...overrides });

describe('machine search', () => {
  it('lists gyms with the machine on their record or by members’ say-so, nearest first, all of them before some', () => {
    const records = [
      near('listed', 2, { equipment: [equipment('hack_squat')] }),
      near('members', 1),
      near('both', 3, { equipment: [equipment('hack_squat'), equipment('leg_press')] }),
      near('silent', 0.5),
    ];
    const hits = findMachines({
      records,
      centre,
      radiusKm: 5,
      equipmentTypeIds: ['hack_squat', 'leg_press'],
      reported: { members: { hack_squat: { yes: 3, no: 1, maxWeightKg: null } } },
    });
    expect(hits.map((hit) => [hit.record.location.id, hit.found])).toEqual([
      ['both', 2],
      ['members', 1],
      ['listed', 1],
    ]);
    expect(hits[1]!.machines[0]).toMatchObject({ source: 'members', members: { yes: 3, no: 1 } });
    expect(hits[1]!.machines[1]).toMatchObject({ source: null });
    expect(hits[2]!.machines[0]).toMatchObject({ source: 'record', recordStatus: 'independently_checked' });
  });

  it('leaves out a gym whose record says no, members who disagree, unknowns and anything too far', () => {
    const records = [
      near('says-no', 1, { equipment: [equipment('hack_squat', { presence: 'no' })] }),
      near('split', 1),
      near('unknown', 1, { equipment: [equipment('hack_squat', { presence: 'yes', provenance: unknownProvenance() })] }),
      near('far', 9, { equipment: [equipment('hack_squat')] }),
    ];
    const hits = findMachines({
      records,
      centre,
      radiusKm: 5,
      equipmentTypeIds: ['hack_squat'],
      reported: { 'says-no': { hack_squat: { yes: 4, no: 0, maxWeightKg: null } }, split: { hack_squat: { yes: 1, no: 1, maxWeightKg: null } } },
    });
    expect(hits).toEqual([]);
    expect(findMachines({ records, centre, radiusKm: 5, equipmentTypeIds: [] })).toEqual([]);
  });

  it('carries the heaviest weight known', () => {
    const hits = findMachines({
      records: [near('db', 1)],
      centre,
      radiusKm: 5,
      equipmentTypeIds: ['dumbbells'],
      reported: { db: { dumbbells: { yes: 2, no: 0, maxWeightKg: 45 } } },
    });
    expect(hits[0]!.machines[0]!.maxWeightKg).toBe(45);
  });
});
