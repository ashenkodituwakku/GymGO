/**
 * Equipment matching. Unknown must never satisfy a strict requirement.
 */

import { describe, expect, it } from 'vitest';
import { matchEquipment } from './equipment';
import { NOW, checked, equipment } from './testing';

const asOf = { asOf: NOW };

describe('matchEquipment', () => {
  it('confirms a requirement backed by a fresh positive observation', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'squat_rack' }],
      [equipment('squat_rack', { count: 4 })],
      asOf,
    );
    expect(result.allConfirmed).toBe(true);
    expect(result.matches[0]?.detail).toContain('4 recorded');
  });

  it('confirms presence even when nobody counted them', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'squat_rack' }],
      [equipment('squat_rack', { count: null })],
      asOf,
    );
    expect(result.matches[0]?.state).toBe('confirmed');
    expect(result.matches[0]?.detail).toContain('count not recorded');
  });

  it('does not satisfy a requirement from a missing record', () => {
    const result = matchEquipment([{ equipmentTypeId: 'cable_station' }], [], asOf);
    expect(result.allConfirmed).toBe(false);
    expect(result.anyUnresolved).toBe(true);
    expect(result.anyRuledOut).toBe(false);
    expect(result.matches[0]?.state).toBe('unknown');
  });

  it('rules a gym out when the item is recorded as absent', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'leg_press' }],
      [equipment('leg_press', { presence: 'no' })],
      asOf,
    );
    expect(result.anyRuledOut).toBe(true);
    expect(result.matches[0]?.state).toBe('missing');
  });

  it('does not confirm a 40 kg dumbbell requirement when the maximum is unrecorded', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 }],
      [equipment('dumbbells', { maxWeightKg: null })],
      asOf,
    );
    expect(result.matches[0]?.state).toBe('unknown');
    expect(result.matches[0]?.detail).toContain('heaviest pair is not recorded');
  });

  it('rules out a gym whose heaviest dumbbell is below the requirement', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 }],
      [equipment('dumbbells', { maxWeightKg: 32 })],
      asOf,
    );
    expect(result.matches[0]?.state).toBe('below_requirement');
    expect(result.anyRuledOut).toBe(true);
    expect(result.matches[0]?.detail).toContain('32 kg');
  });

  it('confirms a dumbbell requirement that is cleared', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 }],
      [equipment('dumbbells', { maxWeightKg: 50 })],
      asOf,
    );
    expect(result.allConfirmed).toBe(true);
  });

  it('demotes an observation that is past the equipment recheck target', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'squat_rack' }],
      [equipment('squat_rack', { provenance: checked(120) })],
      asOf,
    );
    expect(result.matches[0]?.state).toBe('stale');
    expect(result.allConfirmed).toBe(false);
    expect(result.anyUnresolved).toBe(true);
    // Stale is not the same as absent: the gym is not ruled out.
    expect(result.anyRuledOut).toBe(false);
  });

  it('keeps a conflict visible instead of choosing a side', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'hack_squat' }],
      [
        equipment('hack_squat', {
          provenance: {
            ...checked(3),
            status: 'conflicting',
            conflictNote: 'One report says it was removed in August; another says it is still there.',
          },
        }),
      ],
      asOf,
    );
    expect(result.matches[0]?.state).toBe('conflicting');
    expect(result.matches[0]?.detail).toContain('removed in August');
  });

  it('requires every listed item (AND, not OR)', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'squat_rack' }, { equipmentTypeId: 'cable_station' }],
      [equipment('squat_rack')],
      asOf,
    );
    expect(result.allConfirmed).toBe(false);
  });

  it('notes an item last reported out of service without hiding it', () => {
    const result = matchEquipment(
      [{ equipmentTypeId: 'rower' }],
      [equipment('rower', { count: 2, condition: 'out_of_service' })],
      asOf,
    );
    // Inventory and condition are separate questions: it is still present.
    expect(result.matches[0]?.state).toBe('confirmed');
    expect(result.matches[0]?.detail).toContain('out of service');
  });

  it('treats an empty requirement list as "nothing confirmed", not "everything matches"', () => {
    const result = matchEquipment([], [equipment('squat_rack')], asOf);
    expect(result.allConfirmed).toBe(false);
    expect(result.anyRuledOut).toBe(false);
    expect(result.anyUnresolved).toBe(false);
  });
});
