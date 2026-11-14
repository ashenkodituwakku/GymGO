import { describe, expect, it } from 'vitest';
import { evidenceLine, foundLabel } from './machines';

describe('machine search, in words', () => {
  it('says where each yes comes from', () => {
    expect(evidenceLine({ equipmentTypeId: 'hack_squat', source: 'record', recordStatus: 'owner_confirmed', members: null, maxWeightKg: null })).toEqual({
      text: 'Hack squat · From the gym',
      known: true,
    });
    expect(
      evidenceLine({ equipmentTypeId: 'leg_press', source: 'members', recordStatus: null, members: { yes: 3, no: 1, maxWeightKg: null }, maxWeightKg: null }).text,
    ).toBe('Leg press · 3 members say so, 1 says no');
    expect(
      evidenceLine({ equipmentTypeId: 'dumbbells', source: 'members', recordStatus: null, members: { yes: 1, no: 0, maxWeightKg: 45 }, maxWeightKg: 45 }).text,
    ).toBe('Dumbbells · 1 member says so · up to 45 kg');
    expect(evidenceLine({ equipmentTypeId: 'rower', source: null, recordStatus: null, members: null, maxWeightKg: null })).toEqual({
      text: 'Rowing machine · Not known',
      known: false,
    });
  });

  it('counts what it has of what you asked for', () => {
    const machine = { equipmentTypeId: 'rower', source: null, recordStatus: null, members: null, maxWeightKg: null } as const;
    expect(foundLabel({ found: 1, machines: [machine] })).toBe('Has it');
    expect(foundLabel({ found: 2, machines: [machine, machine] })).toBe('Has all 2');
    expect(foundLabel({ found: 1, machines: [machine, machine, machine] })).toBe('Has 1 of 3');
  });
});
