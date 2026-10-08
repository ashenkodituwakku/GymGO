/**
 * Machine search: "where near here has a hack squat?"
 *
 * Two kinds of evidence, kept apart and named: what the gym's record says
 * (published by the gym, checked by GymGO, or reported and kept on the
 * record), and what members who train there have ticked (a tally, "3 members
 * say so"). A record that says the gym doesn't have it rules it out; members
 * count only when more say yes than no. Nothing is guessed: a gym nobody has
 * said anything about isn't listed.
 */

import { haversineKm } from './geo';
import type { FactStatus, GymRecord, LatLng } from './types';

/** What members have said about one machine at one gym. */
export interface MemberTally {
  yes: number;
  no: number;
  maxWeightKg: number | null;
}

/** Members' tallies by gym, then by machine: what the server's /api/equipment/reported gives. */
export type ReportedEquipment = Record<string, Record<string, MemberTally>>;

export interface MachineEvidence {
  equipmentTypeId: string;
  /** Where the yes comes from: the gym's record, members, or neither. */
  source: 'record' | 'members' | null;
  /** The record's status when it says yes (from the gym, checked by GymGO, from a member). */
  recordStatus: FactStatus | null;
  members: MemberTally | null;
  /** The heaviest weight known, for dumbbells and the like. */
  maxWeightKg: number | null;
}

export interface MachineHit {
  record: GymRecord;
  distanceKm: number;
  /** One per machine asked for, in the order asked. */
  machines: MachineEvidence[];
  /** How many of the machines asked for it has. */
  found: number;
}

function evidenceFor(record: GymRecord, equipmentTypeId: string, tally: MemberTally | undefined): MachineEvidence | 'ruled_out' {
  const observation = record.equipment.find((item) => item.equipmentTypeId === equipmentTypeId);
  const status = observation?.provenance.status;
  const established = status !== undefined && status !== 'unknown' && status !== 'conflicting';
  if (observation && established && observation.presence === 'no') return 'ruled_out';
  const members = tally && tally.yes > 0 ? tally : null;
  if (observation && established && observation.presence === 'yes') {
    return {
      equipmentTypeId,
      source: 'record',
      recordStatus: status,
      members,
      maxWeightKg: observation.maxWeightKg ?? members?.maxWeightKg ?? null,
    };
  }
  if (members && members.yes > members.no) {
    return { equipmentTypeId, source: 'members', recordStatus: null, members, maxWeightKg: members.maxWeightKg };
  }
  return { equipmentTypeId, source: null, recordStatus: null, members, maxWeightKg: null };
}

/**
 * The gyms within `radiusKm` of `centre` that have at least one of the
 * machines, by the evidence above: those with all of them first, then by
 * distance. A gym whose record says it lacks one of them is left out.
 */
export function findMachines(input: {
  records: readonly GymRecord[];
  centre: LatLng;
  radiusKm: number;
  equipmentTypeIds: readonly string[];
  reported?: ReportedEquipment;
}): MachineHit[] {
  const wanted = [...new Set(input.equipmentTypeIds)];
  if (wanted.length === 0) return [];
  const hits: MachineHit[] = [];
  for (const record of input.records) {
    if (record.location.operatingStatus === 'permanently_closed') continue;
    const distanceKm = haversineKm(input.centre, record.location.position);
    if (distanceKm > input.radiusKm) continue;
    const tallies = input.reported?.[record.location.id] ?? {};
    const machines: MachineEvidence[] = [];
    let ruledOut = false;
    for (const id of wanted) {
      const evidence = evidenceFor(record, id, tallies[id]);
      if (evidence === 'ruled_out') {
        ruledOut = true;
        break;
      }
      machines.push(evidence);
    }
    if (ruledOut) continue;
    const found = machines.filter((machine) => machine.source !== null).length;
    if (found > 0) hits.push({ record, distanceKm, machines, found });
  }
  return hits.sort((a, b) => b.found - a.found || a.distanceKm - b.distanceKm);
}
