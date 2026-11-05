/**
 * Machine search, in words: where each yes comes from, said plainly
 * ("From the gym", "3 members say so"), and "Not known" where nobody has
 * said. The rules themselves are the domain's findMachines.
 *
 * No React Native imports here, so it is unit-tested in Node.
 */

import { equipmentLabel, type MachineEvidence, type MachineHit } from '@gymgo/domain';
import { sourceLabel } from './copy';

/** Most machines one search looks for: the server's limit too. */
export const MAX_MACHINES = 8;

const members = (count: number) => `${count} member${count === 1 ? '' : 's'}`;

/** One machine at one gym: "Hack squat · From the gym", "Leg press · 3 members say so, 1 says no", "Rower · Not known". */
export function evidenceLine(machine: MachineEvidence): { text: string; known: boolean } {
  const label = equipmentLabel(machine.equipmentTypeId);
  const weight = machine.maxWeightKg !== null ? ` · up to ${machine.maxWeightKg} kg` : '';
  if (machine.source === 'record') {
    const agree = machine.members ? ` · ${members(machine.members.yes)} agree` : '';
    return { text: `${label} · ${sourceLabel(machine.recordStatus ?? 'unknown')}${agree}${weight}`, known: true };
  }
  if (machine.source === 'members' && machine.members) {
    const { yes, no } = machine.members;
    const against = no > 0 ? `, ${no} ${no === 1 ? 'says' : 'say'} no` : '';
    return { text: `${label} · ${members(yes)} ${yes === 1 ? 'says' : 'say'} so${against}${weight}`, known: true };
  }
  return { text: `${label} · Not known`, known: false };
}

/** "Has all 3", "Has 1 of 2", "Has it". */
export function foundLabel(hit: Pick<MachineHit, 'found' | 'machines'>): string {
  const asked = hit.machines.length;
  if (asked === 1) return 'Has it';
  return hit.found === asked ? `Has all ${asked}` : `Has ${hit.found} of ${asked}`;
}
