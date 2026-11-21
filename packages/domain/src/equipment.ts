/**
 * Equipment requirements and matching.
 *
 * Required equipment is AND by default: every requirement must be met.
 * A requirement is only *confirmed* met when the observation says `yes`, is
 * fresh, is not conflicting, and (for weight-based requirements) the recorded
 * maximum clears the bar. Unknown and stale never quietly satisfy a
 * requirement; they move the gym into a separate "needs confirmation" bucket.
 */

import { assessFreshness, type FreshnessInfo } from './freshness';
import {
  DEFAULT_FRESHNESS_POLICY,
  type EquipmentObservation,
  type EquipmentType,
  type FreshnessPolicy,
} from './types';

/**
 * The pilot filter set. Deliberately short: these are candidate categories to
 * test in interviews, not a finished taxonomy.
 */
export const EQUIPMENT_TYPES: EquipmentType[] = [
  {
    id: 'power_rack',
    label: 'Power rack',
    category: 'racks_and_platforms',
    usesMaxWeight: false,
    hint: 'Full cage with safety bars.',
  },
  {
    id: 'squat_rack',
    label: 'Squat rack',
    category: 'racks_and_platforms',
    usesMaxWeight: false,
    hint: 'Half rack or squat stand.',
  },
  {
    id: 'smith_machine',
    label: 'Smith machine',
    category: 'racks_and_platforms',
    usesMaxWeight: false,
    hint: 'Guided barbell.',
  },
  {
    id: 'lifting_platform',
    label: 'Lifting platform',
    category: 'racks_and_platforms',
    usesMaxWeight: false,
    hint: 'For olympic lifts and dropping the bar.',
  },
  {
    id: 'cable_station',
    label: 'Cable station',
    category: 'machines',
    usesMaxWeight: false,
    hint: 'Adjustable pulleys or a functional trainer.',
  },
  {
    id: 'dumbbells',
    label: 'Dumbbells',
    category: 'free_weights',
    usesMaxWeight: true,
    hint: 'Set a minimum for the heaviest pair you need.',
  },
  {
    id: 'barbells',
    label: 'Barbells and plates',
    category: 'free_weights',
    usesMaxWeight: false,
    hint: 'Olympic bars with loading plates.',
  },
  {
    id: 'bench',
    label: 'Adjustable bench',
    category: 'free_weights',
    usesMaxWeight: false,
    hint: 'Flat to incline.',
  },
  {
    id: 'leg_press',
    label: 'Leg press',
    category: 'machines',
    usesMaxWeight: false,
    hint: 'Plate-loaded or selectorised.',
  },
  {
    id: 'hack_squat',
    label: 'Hack squat',
    category: 'machines',
    usesMaxWeight: false,
    hint: 'Angled sled machine.',
  },
  {
    id: 'lat_pulldown',
    label: 'Lat pulldown',
    category: 'machines',
    usesMaxWeight: false,
    hint: 'Seated pulldown station.',
  },
  {
    id: 'treadmill',
    label: 'Treadmill',
    category: 'cardio',
    usesMaxWeight: false,
    hint: '',
  },
  {
    id: 'rower',
    label: 'Rowing machine',
    category: 'cardio',
    usesMaxWeight: false,
    hint: '',
  },
  {
    id: 'assault_bike',
    label: 'Air bike',
    category: 'cardio',
    usesMaxWeight: false,
    hint: 'Fan bike.',
  },
  {
    id: 'turf_sled',
    label: 'Turf and sled',
    category: 'functional',
    usesMaxWeight: false,
    hint: 'Push/pull sled lane.',
  },
];

const BY_ID = new Map(EQUIPMENT_TYPES.map((type) => [type.id, type]));

export function equipmentType(id: string): EquipmentType | undefined {
  return BY_ID.get(id);
}

export function equipmentLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/** One line of a search's equipment requirements. */
export interface EquipmentRequirement {
  equipmentTypeId: string;
  /** Only meaningful for types where `usesMaxWeight` is true. */
  minMaxWeightKg?: number | null;
}

export type EquipmentMatchState =
  /** Present, fresh, no conflict, and any weight bar is cleared. */
  | 'confirmed'
  /** Recorded as absent. */
  | 'missing'
  /** Recorded as present but the recorded maximum is below the requirement. */
  | 'below_requirement'
  /** Present but the check is older than the recheck target. */
  | 'stale'
  /** Sources disagree. */
  | 'conflicting'
  /** Nobody has established this either way. */
  | 'unknown';

export interface EquipmentMatch {
  requirement: EquipmentRequirement;
  state: EquipmentMatchState;
  observation: EquipmentObservation | null;
  freshness: FreshnessInfo | null;
  /** Reader-facing explanation, e.g. "Heaviest pair recorded is 32 kg". */
  detail: string;
}

export interface EquipmentMatchResult {
  matches: EquipmentMatch[];
  /** Every requirement is `confirmed`. */
  allConfirmed: boolean;
  /** At least one requirement is `missing` or `below_requirement`. */
  anyRuledOut: boolean;
  /** At least one requirement is `unknown`, `stale` or `conflicting`. */
  anyUnresolved: boolean;
}

function matchOne(
  requirement: EquipmentRequirement,
  observations: EquipmentObservation[],
  asOf: Date,
  policy: FreshnessPolicy,
): EquipmentMatch {
  const observation =
    observations.find((item) => item.equipmentTypeId === requirement.equipmentTypeId) ?? null;
  const label = equipmentLabel(requirement.equipmentTypeId);

  if (observation === null) {
    return {
      requirement,
      state: 'unknown',
      observation: null,
      freshness: null,
      detail: `No record of ${label.toLowerCase()} either way.`,
    };
  }

  const freshness = assessFreshness(observation.provenance, 'equipment', asOf, policy);

  if (observation.presence === 'no') {
    return { requirement, state: 'missing', observation, freshness, detail: `Recorded as not available.` };
  }

  if (observation.presence === 'unknown') {
    return {
      requirement,
      state: 'unknown',
      observation,
      freshness,
      detail: `Nobody has established whether this gym has ${label.toLowerCase()}.`,
    };
  }

  if (observation.provenance.status === 'conflicting') {
    return {
      requirement,
      state: 'conflicting',
      observation,
      freshness,
      detail: observation.provenance.conflictNote ?? 'Reports disagree about this item.',
    };
  }

  // Weight bar, where one was set.
  const bar = requirement.minMaxWeightKg ?? null;
  if (bar !== null) {
    if (observation.maxWeightKg === null) {
      return {
        requirement,
        state: 'unknown',
        observation,
        freshness,
        detail: `${label} are available but the heaviest pair is not recorded, so we cannot confirm ${bar} kg.`,
      };
    }
    if (observation.maxWeightKg < bar) {
      return {
        requirement,
        state: 'below_requirement',
        observation,
        freshness,
        detail: `Heaviest pair recorded is ${observation.maxWeightKg} kg, below your ${bar} kg requirement.`,
      };
    }
  }

  if (freshness.state === 'stale') {
    return {
      requirement,
      state: 'stale',
      observation,
      freshness,
      detail: `Last confirmed ${freshness.ageDays} days ago, past our ${freshness.targetDays}-day target.`,
    };
  }
  if (freshness.state === 'unknown') {
    return {
      requirement,
      state: 'stale',
      observation,
      freshness,
      detail: 'Present, but with no recorded check date.',
    };
  }

  const extras: string[] = [];
  if (observation.count !== null) extras.push(`${observation.count} recorded`);
  else extras.push('count not recorded');
  if (bar !== null && observation.maxWeightKg !== null) {
    extras.push(`heaviest pair ${observation.maxWeightKg} kg`);
  }
  if (observation.condition === 'out_of_service') {
    extras.push('last reported out of service');
  }

  return {
    requirement,
    state: 'confirmed',
    observation,
    freshness,
    detail: extras.join(', '),
  };
}

export function matchEquipment(
  requirements: EquipmentRequirement[],
  observations: EquipmentObservation[],
  options: { asOf?: Date; policy?: FreshnessPolicy } = {},
): EquipmentMatchResult {
  const asOf = options.asOf ?? new Date();
  const policy = options.policy ?? DEFAULT_FRESHNESS_POLICY;

  const matches = requirements.map((requirement) =>
    matchOne(requirement, observations, asOf, policy),
  );

  return {
    matches,
    allConfirmed: matches.length > 0 && matches.every((match) => match.state === 'confirmed'),
    anyRuledOut: matches.some(
      (match) => match.state === 'missing' || match.state === 'below_requirement',
    ),
    anyUnresolved: matches.some(
      (match) =>
        match.state === 'unknown' || match.state === 'stale' || match.state === 'conflicting',
    ),
  };
}

export function equipmentMatchStateLabel(state: EquipmentMatchState): string {
  switch (state) {
    case 'confirmed':
      return 'Confirmed';
    case 'missing':
      return 'Not available';
    case 'below_requirement':
      return 'Below your requirement';
    case 'stale':
      return 'Due for a recheck';
    case 'conflicting':
      return 'Reports disagree';
    case 'unknown':
      return 'Not established';
  }
}
