/**
 * Amenity matching.
 *
 * Accessibility facts are modelled as separate, specific items. A step-free
 * entrance does not imply an accessible bathroom, and neither is inferred from
 * a blanket "accessible" claim, because getting that wrong strands someone at
 * the door.
 */

import { assessFreshness, type FreshnessInfo } from './freshness';
import {
  DEFAULT_FRESHNESS_POLICY,
  type AmenityId,
  type AmenityObservation,
  type FreshnessPolicy,
} from './types';

export interface AmenityDefinition {
  id: AmenityId;
  label: string;
  group: 'comfort' | 'accessibility' | 'facilities';
  /** Shown beside accessibility items so the claim's limits are explicit. */
  note?: string;
}

export const AMENITIES: AmenityDefinition[] = [
  { id: 'showers', label: 'Showers', group: 'comfort' },
  { id: 'lockers', label: 'Lockers', group: 'comfort' },
  { id: 'towel_service', label: 'Towel service', group: 'comfort' },
  { id: 'parking', label: 'Parking', group: 'facilities' },
  { id: 'sauna', label: 'Sauna', group: 'facilities' },
  { id: 'pool', label: 'Pool', group: 'facilities' },
  { id: 'staffed_reception', label: 'Staffed reception', group: 'facilities' },
  {
    id: 'step_free_entrance',
    label: 'Step-free entrance',
    group: 'accessibility',
    note: 'Entrance only. Says nothing about bathrooms or change rooms.',
  },
  {
    id: 'accessible_bathroom',
    label: 'Accessible bathroom',
    group: 'accessibility',
    note: 'Recorded separately from the entrance and the change room.',
  },
  {
    id: 'accessible_change_room',
    label: 'Accessible change room',
    group: 'accessibility',
    note: 'Recorded separately from the bathroom.',
  },
];

const BY_ID = new Map(AMENITIES.map((amenity) => [amenity.id, amenity]));

export function amenityLabel(id: AmenityId): string {
  return BY_ID.get(id)?.label ?? id;
}

export function amenityDefinition(id: AmenityId): AmenityDefinition | undefined {
  return BY_ID.get(id);
}

export type AmenityMatchState = 'confirmed' | 'missing' | 'stale' | 'unknown';

export interface AmenityMatch {
  amenityId: AmenityId;
  state: AmenityMatchState;
  observation: AmenityObservation | null;
  freshness: FreshnessInfo | null;
  detail: string;
}

export interface AmenityMatchResult {
  matches: AmenityMatch[];
  allConfirmed: boolean;
  anyRuledOut: boolean;
  anyUnresolved: boolean;
}

export function matchAmenities(
  required: AmenityId[],
  observations: AmenityObservation[],
  options: { asOf?: Date; policy?: FreshnessPolicy } = {},
): AmenityMatchResult {
  const asOf = options.asOf ?? new Date();
  const policy = options.policy ?? DEFAULT_FRESHNESS_POLICY;

  const matches = required.map<AmenityMatch>((amenityId) => {
    const observation = observations.find((item) => item.amenityId === amenityId) ?? null;
    const label = amenityLabel(amenityId).toLowerCase();

    if (observation === null || observation.present === 'unknown') {
      return {
        amenityId,
        state: 'unknown',
        observation,
        freshness: observation ? assessFreshness(observation.provenance, 'amenity', asOf, policy) : null,
        detail: `No record of ${label} either way.`,
      };
    }

    const freshness = assessFreshness(observation.provenance, 'amenity', asOf, policy);

    if (observation.present === 'no') {
      return { amenityId, state: 'missing', observation, freshness, detail: `Recorded as not available.` };
    }
    if (freshness.state !== 'fresh') {
      return {
        amenityId,
        state: 'stale',
        observation,
        freshness,
        detail: 'Recorded as available, but due for a recheck.',
      };
    }
    return {
      amenityId,
      state: 'confirmed',
      observation,
      freshness,
      detail: observation.note ?? 'Confirmed available.',
    };
  });

  return {
    matches,
    allConfirmed: matches.every((match) => match.state === 'confirmed'),
    anyRuledOut: matches.some((match) => match.state === 'missing'),
    anyUnresolved: matches.some((match) => match.state === 'unknown' || match.state === 'stale'),
  };
}
