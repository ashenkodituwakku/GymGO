/**
 * Australian gyms read from their operators' own websites, where the map
 * (OpenStreetMap) has them missing or out of date.
 *
 * Revo Fitness publishes every branch with its address, map position and
 * hours (scripts/operators.py copies them); T1 Fitness in Burwood East
 * publishes its address on its contact page, which was read by hand. Each
 * fact links to the page it came from. Because the operator itself lists the
 * branch, it's shown as open, which a map feature alone never is.
 *
 * Nothing here was supplied by, or agreed with, the gyms, and nothing they
 * don't publish (prices, guest access, equipment) is filled in.
 */

import type { AccessSchedule, EvidenceSource, GymRecord, Provenance } from '@gymgo/domain';
import { OPERATORS_FETCHED, REVO_ROWS } from './operatorData';
import { chainOffersFor } from './chainOffers';

export interface OperatorRow {
  id: string;
  name: string;
  brand?: string;
  branch?: string;
  line1: string;
  suburb: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  /** The branch's own page. */
  website?: string;
  /** Member access: round the clock, or [day (0 = Sunday), open, close] in minutes. */
  hours?: 'always' | Array<[number, number, number]>;
}

interface OperatorGym extends OperatorRow {
  /** Where the address (and hours, if any) was read. */
  source: { url: string; label: string };
  /** When the map position came from OpenStreetMap rather than the operator. */
  positionFromMap?: string;
  checkedAt: string;
}

/** Each state's clock (the ACT keeps Sydney's). */
const TIMEZONE: Record<string, string> = {
  ACT: 'Australia/Sydney',
  NSW: 'Australia/Sydney',
  NT: 'Australia/Darwin',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  TAS: 'Australia/Hobart',
  VIC: 'Australia/Melbourne',
  WA: 'Australia/Perth',
};

/** T1 Fitness, Burwood East (Melbourne): read from its contact page on 28 September 2026. */
const T1_FITNESS: OperatorGym = {
  id: 't1-fitness-burwood-east',
  name: 'T1 Fitness',
  branch: 'Burwood East',
  line1: 'Retail B, 315 Burwood Highway',
  suburb: 'Burwood East',
  state: 'VIC',
  postcode: '3151',
  // The building at 315 Burwood Highway, from OpenStreetMap: the site gives no position.
  lat: -37.853462,
  lng: 145.16252,
  positionFromMap: 'way/49459307',
  phone: '(03) 9802 2659',
  email: 'info@t1fitness.com.au',
  website: 'https://t1fitness.com.au/',
  source: { url: 'https://t1fitness.com.au/contact-us/', label: "Gym's website: contact page" },
  checkedAt: '2026-09-28T11:40:00.000Z',
};

const REVO: OperatorGym[] = REVO_ROWS.map((row) => ({
  ...row,
  source: { url: row.website ?? 'https://revofitness.com.au/gyms/', label: "Gym's website: this branch's page" },
  checkedAt: OPERATORS_FETCHED,
}));

export function operatorRecord(gym: OperatorGym): GymRecord {
  const timezone = TIMEZONE[gym.state] ?? 'Australia/Sydney';
  const fromOperator: EvidenceSource = {
    id: `ev-web-${gym.id}`,
    sourceType: 'operator_website',
    evidenceRef: gym.source.url,
    label: gym.source.label,
    observedAt: gym.checkedAt,
    checkedAt: gym.checkedAt,
    reviewerId: null,
  };
  const fromMap: EvidenceSource[] = gym.positionFromMap
    ? [
        {
          id: `ev-osm-${gym.positionFromMap.replace('/', '-')}`,
          sourceType: 'licensed_dataset',
          evidenceRef: `https://www.openstreetmap.org/${gym.positionFromMap}`,
          label: 'OpenStreetMap',
          observedAt: gym.checkedAt,
          checkedAt: gym.checkedAt,
          reviewerId: null,
        },
      ]
    : [];
  // The gym saying so on its own site is labelled "from the gym".
  const cited = (): Provenance => ({ status: 'owner_confirmed', sources: [fromOperator, ...fromMap], conflictNote: null });

  const schedules: AccessSchedule[] = gym.hours
    ? [
        {
          id: `${gym.id}-member`,
          gymId: gym.id,
          audience: 'member',
          timezone,
          windows:
            gym.hours === 'always'
              ? [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, openMinute: 0, closeMinute: 1440 }))
              : gym.hours.map(([day, openMinute, closeMinute]) => ({ day, openMinute, closeMinute })),
          exceptions: [],
          alwaysOpen: gym.hours === 'always',
          provenance: { status: 'owner_confirmed', sources: [fromOperator], conflictNote: null },
        },
      ]
    : [];

  return {
    location: {
      id: gym.id,
      slug: gym.id,
      name: gym.name,
      branch: gym.branch ?? null,
      brand: gym.brand ?? null,
      address: { line1: gym.line1, line2: null, suburb: gym.suburb, state: gym.state, postcode: gym.postcode, countryCode: 'AU' },
      position: { lat: gym.lat, lng: gym.lng },
      timezone,
      trainingTypes: ['full_gym'],
      // The operator lists this branch as open today.
      operatingStatus: 'open',
      operatingStatusNote: null,
      phone: gym.phone ?? null,
      website: gym.website ?? null,
      email: gym.email ?? null,
      activities: [],
      // We hold no photographs we have permission to show.
      photos: [],
      isDemoData: false,
      externalRefs: gym.positionFromMap ? { openStreetMap: gym.positionFromMap } : {},
      provenance: cited(),
    },
    equipment: [],
    amenities: [],
    offers: chainOffersFor(gym.id, gym),
    schedules,
    prerequisites: {
      gymId: gym.id,
      advanceBookingRequired: 'unknown',
      bookingLeadTimeHours: null,
      inductionRequired: 'unknown',
      inductionAvailableDuringStaffedHoursOnly: 'unknown',
      photoIdRequired: 'unknown',
      minAgeYears: null,
      residencyRule: 'unknown',
      memberAccompanimentRequired: 'unknown',
      notes: [],
      provenance: { status: 'unknown', sources: [], conflictNote: null },
    },
  };
}

/** Every operator-listed gym, for the generator to leave the map's copies out. */
export const OPERATOR_GYMS_RAW: OperatorGym[] = [...REVO, T1_FITNESS];

export const OPERATOR_GYMS: GymRecord[] = OPERATOR_GYMS_RAW.map(operatorRecord);
