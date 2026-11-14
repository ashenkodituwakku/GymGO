/**
 * The demo dataset: seventeen invented gyms in inner Sydney.
 *
 * Every venue here is fictional. None of the names, addresses, prices, hours,
 * equipment lists or reviews describe a real business, and every record is
 * flagged `isDemoData`. The set exists to exercise the edge cases the product
 * is built for, so it is deliberately messy: unknown fees, conflicting
 * reports, an expired offer, a closed gym, and several gyms that simply have
 * not been checked recently.
 *
 * Production ingestion refuses records with `isDemoData` set; see
 * src/server/gyms.ts.
 */

import type { GymRecord } from '@gymgo/domain';
import {
  ALL_DAYS,
  WEEKDAYS,
  WEEKEND,
  conflicting,
  from,
  hours,
  makeAmenity,
  makeEquipment,
  makeLocation,
  makeOffer,
  makePrerequisites,
  makeRecord,
  makeSchedule,
  unknownFact,
  windowsOn,
} from './builders';

/** Every fact a resolved, walk-in-friendly gym would have. */
function resolvedPrerequisites(gymId: string, ageDays = 12) {
  return makePrerequisites(gymId, {
    advanceBookingRequired: 'no',
    inductionRequired: 'no',
    inductionAvailableDuringStaffedHoursOnly: 'no',
    photoIdRequired: 'yes',
    minAgeYears: 16,
    residencyRule: 'none',
    memberAccompanimentRequired: 'no',
    provenance: from({ ageDays, sourceType: 'owner_submission' }),
  });
}

// ---------------------------------------------------------------------------
// 1. Ironbark Strength Co. — a clean, confirmed match for the reference task.
// ---------------------------------------------------------------------------
const ironbark = (() => {
  const id = 'ironbark-strength-surry-hills';
  return makeRecord(
    makeLocation({
      id,
      name: 'Ironbark Strength Co.',
      branch: 'Surry Hills',
      line1: '18 Foveaux Lane',
      suburb: 'Surry Hills',
      postcode: '2010',
      lat: -33.8851,
      lng: 151.2119,
      trainingTypes: ['strength_focused', 'full_gym'],
      phone: '+61 2 5550 0101',
      website: 'https://example.invalid/ironbark',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'member',
          alwaysOpen: true,
          provenance: from({ ageDays: 10, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: [...windowsOn(WEEKDAYS, hours(6), hours(20)), ...windowsOn(WEEKEND, hours(8), hours(16))],
          provenance: from({ ageDays: 10, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'visitor',
          windows: [...windowsOn(WEEKDAYS, hours(6), hours(21, 30)), ...windowsOn(WEEKEND, hours(8), hours(18))],
          provenance: from({ ageDays: 6, sourceType: 'independent_check', reviewer: 'reviewer-anya' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 6),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 2400,
          taxIncluded: true,
          inclusions: ['Gym floor', 'Showers'],
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 6, sourceType: 'independent_check', reviewer: 'reviewer-anya' }),
        }),
        makeOffer(id, {
          id: 'week',
          productType: 'week_pass',
          label: '7-day pass',
          baseAmountMinor: 8900,
          validityDays: 7,
          inclusions: ['Gym floor', 'Showers'],
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 6, sourceType: 'independent_check' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'power_rack', { count: 2, condition: 'good', conditionAgeDays: 6, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'squat_rack', { count: 4, condition: 'good', conditionAgeDays: 6, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'cable_station', { count: 3, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 60, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'barbells', { count: 12, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'bench', { count: 8, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'lifting_platform', { count: 2, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'leg_press', { count: 1, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'lat_pulldown', { count: 2, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'treadmill', { count: 4, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'rower', { count: 3, provenance: from({ ageDays: 6 }) }),
        makeEquipment(id, 'hack_squat', { presence: 'no', provenance: from({ ageDays: 6 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes', 'Bring your own padlock.'),
        makeAmenity(id, 'staffed_reception', 'yes'),
        makeAmenity(id, 'parking', 'no', 'Street parking only, metered until 10pm.'),
        makeAmenity(id, 'step_free_entrance', 'yes'),
        makeAmenity(id, 'accessible_bathroom', 'unknown'),
        makeAmenity(id, 'sauna', 'no'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 2. Waterloo Aquatic & Fitness Centre — the cheap price buys the pool, not
//    the gym floor.
// ---------------------------------------------------------------------------
const waterlooAquatic = (() => {
  const id = 'waterloo-aquatic-fitness';
  return makeRecord(
    makeLocation({
      id,
      name: 'Waterloo Aquatic & Fitness Centre',
      line1: '3 Bourke Walk',
      suburb: 'Waterloo',
      postcode: '2017',
      lat: -33.8995,
      lng: 151.2085,
      trainingTypes: ['aquatic_centre', 'full_gym'],
      phone: '+61 2 5550 0202',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'staffed',
          windows: [...windowsOn(WEEKDAYS, hours(5, 30), hours(21)), ...windowsOn(WEEKEND, hours(7), hours(19))],
          provenance: from({ ageDays: 9, sourceType: 'operator_website' }),
        }),
        makeSchedule(id, {
          audience: 'visitor',
          windows: [...windowsOn(WEEKDAYS, hours(5, 30), hours(21)), ...windowsOn(WEEKEND, hours(7), hours(19))],
          provenance: from({ ageDays: 9, sourceType: 'operator_website' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 9),
      offers: [
        makeOffer(id, {
          id: 'pool',
          productType: 'pool_only',
          label: 'Adult pool admission',
          baseAmountMinor: 850,
          grantsGymFloorAccess: 'no',
          inclusions: ['50 m pool', 'Change rooms'],
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 9, sourceType: 'operator_website' }),
        }),
        makeOffer(id, {
          id: 'gym-casual',
          productType: 'casual_gym_visit',
          label: 'Adult casual fitness centre entry',
          baseAmountMinor: 2450,
          inclusions: ['Gym floor', 'Pool', 'Sauna'],
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 9, sourceType: 'operator_website' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 2, provenance: from({ ageDays: 40 }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 40 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 32, provenance: from({ ageDays: 40 }) }),
        makeEquipment(id, 'treadmill', { count: 10, provenance: from({ ageDays: 40 }) }),
        makeEquipment(id, 'rower', { count: 4, provenance: from({ ageDays: 40 }) }),
        makeEquipment(id, 'leg_press', { count: 2, provenance: from({ ageDays: 40 }) }),
        makeEquipment(id, 'lifting_platform', { presence: 'no', provenance: from({ ageDays: 40 }) }),
      ],
      amenities: [
        makeAmenity(id, 'pool', 'yes'),
        makeAmenity(id, 'sauna', 'yes'),
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
        makeAmenity(id, 'parking', 'yes', 'Two hours free in the centre car park.'),
        makeAmenity(id, 'step_free_entrance', 'yes'),
        makeAmenity(id, 'accessible_bathroom', 'yes'),
        makeAmenity(id, 'accessible_change_room', 'yes'),
        makeAmenity(id, 'staffed_reception', 'yes'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 3. Halfmoon Fitness Redfern — a trial with residency and first-visit
//    conditions, and no confirmed walk-in price.
// ---------------------------------------------------------------------------
const halfmoon = (() => {
  const id = 'halfmoon-fitness-redfern';
  return makeRecord(
    makeLocation({
      id,
      name: 'Halfmoon Fitness',
      branch: 'Redfern',
      brand: 'Halfmoon Fitness',
      line1: '221 Marrickville Road South',
      suburb: 'Redfern',
      postcode: '2016',
      lat: -33.8932,
      lng: 151.2043,
      phone: '+61 2 5550 0303',
    }),
    {
      schedules: [
        makeSchedule(id, { audience: 'member', alwaysOpen: true, provenance: from({ ageDays: 15, sourceType: 'operator_website' }) }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(10), hours(18)),
          provenance: from({ ageDays: 15, sourceType: 'operator_website' }),
        }),
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(WEEKDAYS, hours(10), hours(18)),
          provenance: from({ ageDays: 15, sourceType: 'operator_website' }),
        }),
      ],
      prerequisites: makePrerequisites(id, {
        advanceBookingRequired: 'yes',
        bookingLeadTimeHours: 24,
        inductionRequired: 'yes',
        inductionAvailableDuringStaffedHoursOnly: 'yes',
        photoIdRequired: 'yes',
        minAgeYears: 18,
        residencyRule: 'local_resident_only',
        memberAccompanimentRequired: 'no',
        notes: ['The trial is described as being for people who live or work within the local area.'],
        provenance: from({ ageDays: 15, sourceType: 'operator_website' }),
      }),
      offers: [
        makeOffer(id, {
          id: 'trial',
          productType: 'trial',
          label: '3-day free trial',
          baseAmountMinor: 0,
          validityDays: 3,
          eligibility: {
            localResidentOnly: 'yes',
            memberGuestOnly: 'no',
            firstTimeVisitorOnly: 'yes',
            membershipRequired: 'no',
            photoIdRequired: 'yes',
            minAgeYears: 18,
            notes: [
              'Advertised as a free trial, with eligibility conditions on residence and prior visits.',
              'This is a promotional trial, not an unrestricted visitor pass.',
            ],
          },
          purchaseMethod: 'online',
          provenance: from({ ageDays: 15, sourceType: 'operator_website' }),
        }),
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: null,
          purchaseMethod: 'unknown',
          provenance: unknownFact(),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 3, provenance: from({ ageDays: 35 }) }),
        makeEquipment(id, 'smith_machine', { count: 2, provenance: from({ ageDays: 35 }) }),
        makeEquipment(id, 'cable_station', { count: 4, provenance: from({ ageDays: 35 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 45, provenance: from({ ageDays: 35 }) }),
        makeEquipment(id, 'bench', { count: 6, provenance: from({ ageDays: 35 }) }),
        makeEquipment(id, 'treadmill', { count: 8, provenance: from({ ageDays: 35 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
        makeAmenity(id, 'parking', 'unknown'),
        makeAmenity(id, 'staffed_reception', 'yes'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 4. Tallow Street Gym — a mandatory fee whose amount nobody has established.
// ---------------------------------------------------------------------------
const tallowStreet = (() => {
  const id = 'tallow-street-gym-chippendale';
  return makeRecord(
    makeLocation({
      id,
      name: 'Tallow Street Gym',
      line1: '7 Tallow Street',
      suburb: 'Chippendale',
      postcode: '2008',
      lat: -33.8865,
      lng: 151.1985,
      phone: '+61 2 5550 0404',
    }),
    {
      schedules: [
        makeSchedule(id, { audience: 'member', alwaysOpen: true, provenance: from({ ageDays: 18, sourceType: 'owner_submission' }) }),
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(ALL_DAYS, hours(6), hours(22)),
          provenance: from({ ageDays: 18, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(9), hours(19)),
          provenance: from({ ageDays: 18, sourceType: 'owner_submission' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 18),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 2200,
          mandatoryCharges: [
            // The club confirms a card fee exists but not what it costs. The
            // product must not quietly treat this as A$0.
            { label: 'One-off access card fee', amountMinor: null, applies: 'yes' },
          ],
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 18, sourceType: 'owner_submission' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 2, provenance: from({ ageDays: 18 }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 18 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 42, provenance: from({ ageDays: 18 }) }),
        makeEquipment(id, 'bench', { count: 5, provenance: from({ ageDays: 18 }) }),
        makeEquipment(id, 'assault_bike', { count: 2, provenance: from({ ageDays: 18 }) }),
      ],
      amenities: [makeAmenity(id, 'showers', 'yes'), makeAmenity(id, 'lockers', 'yes')],
    },
  );
})();

// ---------------------------------------------------------------------------
// 5. Quarry Lane Barbell — confirmed match with a refundable deposit, so the
//    visit cost and the cash needed today are different numbers.
// ---------------------------------------------------------------------------
const quarryLane = (() => {
  const id = 'quarry-lane-barbell-alexandria';
  return makeRecord(
    makeLocation({
      id,
      name: 'Quarry Lane Barbell',
      line1: '44 Quarry Lane',
      suburb: 'Alexandria',
      postcode: '2015',
      lat: -33.9026,
      lng: 151.2001,
      trainingTypes: ['strength_focused'],
      phone: '+61 2 5550 0505',
    }),
    {
      schedules: [
        makeSchedule(id, { audience: 'member', alwaysOpen: true, provenance: from({ ageDays: 8, sourceType: 'owner_submission' }) }),
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(ALL_DAYS, hours(5), hours(23)),
          provenance: from({ ageDays: 8, sourceType: 'independent_check', reviewer: 'reviewer-anya' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(6), hours(20)),
          provenance: from({ ageDays: 8, sourceType: 'owner_submission' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 8),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 2500,
          refundableDeposits: [
            {
              label: 'Access band deposit',
              amountMinor: 2000,
              refundConditions: 'Returned when you hand the band back at reception.',
            },
          ],
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 8, sourceType: 'independent_check' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'power_rack', { count: 6, provenance: from({ ageDays: 8 }) }),
        makeEquipment(id, 'squat_rack', { count: 6, provenance: from({ ageDays: 8 }) }),
        makeEquipment(id, 'lifting_platform', { count: 4, provenance: from({ ageDays: 8 }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 8 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 50, provenance: from({ ageDays: 8 }) }),
        makeEquipment(id, 'barbells', { count: 18, provenance: from({ ageDays: 8 }) }),
        makeEquipment(id, 'bench', { count: 6, provenance: from({ ageDays: 8 }) }),
        makeEquipment(id, 'turf_sled', { count: 1, provenance: from({ ageDays: 8 }) }),
        makeEquipment(id, 'treadmill', { presence: 'no', provenance: from({ ageDays: 8 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
        makeAmenity(id, 'parking', 'yes', 'Six spaces in the laneway.'),
        makeAmenity(id, 'step_free_entrance', 'no', 'Three steps at the entrance, no ramp.'),
        makeAmenity(id, 'accessible_bathroom', 'no'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 6. Marrow & Co — an expired promotional rate sitting beside a current price
//    that happens to be above a A$30 budget.
// ---------------------------------------------------------------------------
const marrowAndCo = (() => {
  const id = 'marrow-and-co-darlinghurst';
  return makeRecord(
    makeLocation({
      id,
      name: 'Marrow & Co',
      line1: '90 Liverpool Street East',
      suburb: 'Darlinghurst',
      postcode: '2010',
      lat: -33.879,
      lng: 151.219,
      trainingTypes: ['studio', 'functional'],
      phone: '+61 2 5550 0606',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'visitor',
          windows: [...windowsOn(WEEKDAYS, hours(6), hours(21)), ...windowsOn(WEEKEND, hours(7), hours(15))],
          provenance: from({ ageDays: 11, sourceType: 'operator_website' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(6), hours(21)),
          provenance: from({ ageDays: 11, sourceType: 'operator_website' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 11),
      offers: [
        makeOffer(id, {
          id: 'winter',
          productType: 'day_pass',
          label: 'Winter visitor rate',
          baseAmountMinor: 1800,
          availableFrom: '2026-06-01',
          availableUntil: '2026-08-31',
          purchaseMethod: 'online',
          provenance: from({ ageDays: 40, sourceType: 'operator_website' }),
        }),
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 3200,
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 11, sourceType: 'operator_website' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 2, provenance: from({ ageDays: 30 }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 30 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 40, provenance: from({ ageDays: 30 }) }),
        makeEquipment(id, 'assault_bike', { count: 4, provenance: from({ ageDays: 30 }) }),
        makeEquipment(id, 'turf_sled', { count: 1, provenance: from({ ageDays: 30 }) }),
        makeEquipment(id, 'leg_press', { presence: 'no', provenance: from({ ageDays: 30 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'towel_service', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 7. Keystone Fitness Ultimo — 24-hour member access, daytime-only guest
//    entry. The case a 7pm visitor search must get right.
// ---------------------------------------------------------------------------
const keystone = (() => {
  const id = 'keystone-fitness-ultimo';
  return makeRecord(
    makeLocation({
      id,
      name: 'Keystone Fitness',
      branch: 'Ultimo',
      brand: 'Keystone Fitness',
      line1: '12 Wattle Crescent',
      suburb: 'Ultimo',
      postcode: '2007',
      lat: -33.8795,
      lng: 151.1975,
      phone: '+61 2 5550 0707',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'member',
          alwaysOpen: true,
          provenance: from({ ageDays: 7, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(9), hours(16)),
          provenance: from({ ageDays: 7, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          // Guests may only enter while reception is staffed.
          audience: 'visitor',
          windows: windowsOn(WEEKDAYS, hours(9), hours(16)),
          provenance: from({ ageDays: 7, sourceType: 'owner_submission' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 7),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 2300,
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 7, sourceType: 'owner_submission' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 3, provenance: from({ ageDays: 21 }) }),
        makeEquipment(id, 'smith_machine', { count: 1, provenance: from({ ageDays: 21 }) }),
        makeEquipment(id, 'cable_station', { count: 3, provenance: from({ ageDays: 21 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 50, provenance: from({ ageDays: 21 }) }),
        makeEquipment(id, 'bench', { count: 7, provenance: from({ ageDays: 21 }) }),
        makeEquipment(id, 'leg_press', { count: 2, provenance: from({ ageDays: 21 }) }),
        makeEquipment(id, 'treadmill', { count: 12, provenance: from({ ageDays: 21 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
        makeAmenity(id, 'sauna', 'yes'),
        makeAmenity(id, 'staffed_reception', 'yes'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 8. Vellum Strength — two sources disagree about a machine and about the
//    price. Neither is silently preferred.
// ---------------------------------------------------------------------------
const vellum = (() => {
  const id = 'vellum-strength-newtown';
  return makeRecord(
    makeLocation({
      id,
      name: 'Vellum Strength',
      line1: '301 Australia Street',
      suburb: 'Newtown',
      postcode: '2042',
      lat: -33.8983,
      lng: 151.1793,
      trainingTypes: ['strength_focused'],
      phone: '+61 2 5550 0808',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(ALL_DAYS, hours(6), hours(22)),
          provenance: from({ ageDays: 13, sourceType: 'community_report' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(10), hours(19)),
          provenance: from({ ageDays: 13, sourceType: 'community_report' }),
        }),
      ],
      prerequisites: makePrerequisites(id, {
        advanceBookingRequired: 'no',
        inductionRequired: 'no',
        photoIdRequired: 'yes',
        residencyRule: 'none',
        memberAccompanimentRequired: 'no',
        inductionAvailableDuringStaffedHoursOnly: 'no',
        provenance: from({ ageDays: 13, sourceType: 'community_report' }),
      }),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 2000,
          purchaseMethod: 'at_reception',
          provenance: conflicting(
            'The gym told us A$20 in July. A user reported paying A$28 in September. We have not resolved which applies.',
            [
              { ageDays: 62, sourceType: 'owner_submission', label: 'Gym price list supplied in July' },
              { ageDays: 4, sourceType: 'community_report', label: 'User report of a September visit' },
            ],
          ),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 4, provenance: from({ ageDays: 20 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 55, provenance: from({ ageDays: 20 }) }),
        makeEquipment(id, 'bench', { count: 5, provenance: from({ ageDays: 20 }) }),
        makeEquipment(id, 'barbells', { count: 10, provenance: from({ ageDays: 20 }) }),
        makeEquipment(id, 'cable_station', {
          count: null,
          provenance: conflicting(
            'One user reported the cable station was removed in the August refit; another used it this month.',
            [
              { ageDays: 30, sourceType: 'community_report', label: 'User report: removed during refit' },
              { ageDays: 5, sourceType: 'community_report', label: 'User report: used it this month' },
            ],
          ),
        }),
      ],
      amenities: [makeAmenity(id, 'showers', 'yes'), makeAmenity(id, 'lockers', 'unknown')],
    },
  );
})();

// ---------------------------------------------------------------------------
// 9. Brickworks Gym — temporarily closed.
// ---------------------------------------------------------------------------
const brickworks = (() => {
  const id = 'brickworks-gym-alexandria';
  return makeRecord(
    makeLocation({
      id,
      name: 'Brickworks Gym',
      line1: '2 Kiln Street',
      suburb: 'Alexandria',
      postcode: '2015',
      lat: -33.9105,
      lng: 151.1945,
      operatingStatus: 'temporarily_closed',
      operatingStatusNote: 'Closed for a floor replacement. The gym has said it expects to reopen in October.',
      provenance: from({ ageDays: 3, sourceType: 'owner_submission' }),
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(ALL_DAYS, hours(6), hours(21)),
          provenance: from({ ageDays: 60, sourceType: 'operator_website' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 60),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 1900,
          provenance: from({ ageDays: 60, sourceType: 'operator_website' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 5, provenance: from({ ageDays: 60 }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 60 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 45, provenance: from({ ageDays: 60 }) }),
      ],
      amenities: [makeAmenity(id, 'showers', 'yes'), makeAmenity(id, 'parking', 'yes')],
    },
  );
})();

// ---------------------------------------------------------------------------
// 10. Foundry Lane Athletic — everything is in stock and affordable, but a
//     first visit needs an induction and 24 hours' notice.
// ---------------------------------------------------------------------------
const foundryLane = (() => {
  const id = 'foundry-lane-erskineville';
  return makeRecord(
    makeLocation({
      id,
      name: 'Foundry Lane Athletic',
      line1: '5 Foundry Lane',
      suburb: 'Erskineville',
      postcode: '2043',
      lat: -33.903,
      lng: 151.1855,
      trainingTypes: ['crossfit_box', 'functional'],
      phone: '+61 2 5550 0909',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'visitor',
          windows: [...windowsOn(WEEKDAYS, hours(5, 30), hours(20, 30)), ...windowsOn(WEEKEND, hours(7), hours(13))],
          provenance: from({ ageDays: 5, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(5, 30), hours(20, 30)),
          provenance: from({ ageDays: 5, sourceType: 'owner_submission' }),
        }),
      ],
      prerequisites: makePrerequisites(id, {
        advanceBookingRequired: 'yes',
        bookingLeadTimeHours: 24,
        inductionRequired: 'yes',
        inductionAvailableDuringStaffedHoursOnly: 'yes',
        photoIdRequired: 'yes',
        minAgeYears: 16,
        residencyRule: 'none',
        memberAccompanimentRequired: 'no',
        notes: ['Drop-ins join the scheduled class rather than training on an open floor.'],
        provenance: from({ ageDays: 5, sourceType: 'owner_submission' }),
      }),
      offers: [
        makeOffer(id, {
          id: 'dropin',
          productType: 'day_pass',
          label: 'Drop-in class',
          baseAmountMinor: 2800,
          inclusions: ['One class', 'Gym floor before and after class'],
          purchaseMethod: 'online',
          provenance: from({ ageDays: 5, sourceType: 'owner_submission' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 8, provenance: from({ ageDays: 5 }) }),
        makeEquipment(id, 'lifting_platform', { count: 8, provenance: from({ ageDays: 5 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 45, provenance: from({ ageDays: 5 }) }),
        makeEquipment(id, 'cable_station', { count: 1, provenance: from({ ageDays: 5 }) }),
        makeEquipment(id, 'assault_bike', { count: 6, provenance: from({ ageDays: 5 }) }),
        makeEquipment(id, 'rower', { count: 8, provenance: from({ ageDays: 5 }) }),
        makeEquipment(id, 'turf_sled', { count: 2, provenance: from({ ageDays: 5 }) }),
        makeEquipment(id, 'smith_machine', { presence: 'no', provenance: from({ ageDays: 5 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
        makeAmenity(id, 'step_free_entrance', 'yes'),
        makeAmenity(id, 'accessible_bathroom', 'unknown'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 11. Saltwater Strength — members have 24-hour access and nobody has
//     established whether visitors are admitted at all.
// ---------------------------------------------------------------------------
const saltwater = (() => {
  const id = 'saltwater-strength-pyrmont';
  return makeRecord(
    makeLocation({
      id,
      name: 'Saltwater Strength',
      line1: '19 Bowman Street North',
      suburb: 'Pyrmont',
      postcode: '2009',
      lat: -33.8695,
      lng: 151.195,
      phone: '+61 2 5550 1010',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'member',
          alwaysOpen: true,
          provenance: from({ ageDays: 16, sourceType: 'operator_website' }),
        }),
        // No visitor schedule has been established. Member hours do not fill
        // the gap.
        makeSchedule(id, { audience: 'visitor', provenance: unknownFact() }),
      ],
      prerequisites: makePrerequisites(id),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: null,
          provenance: unknownFact(),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 4, provenance: from({ ageDays: 25, sourceType: 'community_report' }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 25, sourceType: 'community_report' }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 50, provenance: from({ ageDays: 25, sourceType: 'community_report' }) }),
      ],
      amenities: [makeAmenity(id, 'showers', 'unknown'), makeAmenity(id, 'lockers', 'unknown')],
    },
  );
})();

// ---------------------------------------------------------------------------
// 12. Nightshift Gym — visitor entry runs past midnight on Friday and
//     Saturday, which the schedule model has to express without fudging.
// ---------------------------------------------------------------------------
const nightshift = (() => {
  const id = 'nightshift-gym-haymarket';
  return makeRecord(
    makeLocation({
      id,
      name: 'Nightshift Gym',
      line1: '66 Quay Street Upper',
      suburb: 'Haymarket',
      postcode: '2000',
      lat: -33.88,
      lng: 151.204,
      phone: '+61 2 5550 1111',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'member',
          alwaysOpen: true,
          provenance: from({ ageDays: 9, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'visitor',
          windows: [
            ...windowsOn([1, 2, 3, 4], hours(6), hours(22)),
            // Friday 20:00 to 02:00 Saturday, and Saturday 20:00 to 02:00 Sunday.
            { day: 5, openMinute: hours(6), closeMinute: hours(26) },
            { day: 6, openMinute: hours(8), closeMinute: hours(26) },
            { day: 0, openMinute: hours(8), closeMinute: hours(20) },
          ],
          provenance: from({ ageDays: 9, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(ALL_DAYS, hours(8), hours(20)),
          provenance: from({ ageDays: 9, sourceType: 'owner_submission' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 9),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 2600,
          taxIncluded: false,
          taxAmountMinor: 260,
          purchaseMethod: 'operator_app',
          provenance: from({ ageDays: 9, sourceType: 'owner_submission' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 3, provenance: from({ ageDays: 15 }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 15 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 40, provenance: from({ ageDays: 15 }) }),
        makeEquipment(id, 'bench', { count: 4, provenance: from({ ageDays: 15 }) }),
        makeEquipment(id, 'treadmill', { count: 6, provenance: from({ ageDays: 15 }) }),
      ],
      amenities: [makeAmenity(id, 'showers', 'yes'), makeAmenity(id, 'lockers', 'yes')],
    },
  );
})();

// ---------------------------------------------------------------------------
// 13. Paddington Hill Fitness — sells a week pass and nothing shorter, so
//     there is no single-visit price to compare against a budget.
// ---------------------------------------------------------------------------
const paddingtonHill = (() => {
  const id = 'paddington-hill-fitness';
  return makeRecord(
    makeLocation({
      id,
      name: 'Paddington Hill Fitness',
      line1: '140 Underwood Road',
      suburb: 'Paddington',
      postcode: '2021',
      lat: -33.8845,
      lng: 151.227,
      phone: '+61 2 5550 1212',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(ALL_DAYS, hours(6), hours(21)),
          provenance: from({ ageDays: 12, sourceType: 'operator_website' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(8), hours(19)),
          provenance: from({ ageDays: 12, sourceType: 'operator_website' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 12),
      offers: [
        makeOffer(id, {
          id: 'week',
          productType: 'week_pass',
          label: '7-day visitor pass',
          baseAmountMinor: 5500,
          validityDays: 7,
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 12, sourceType: 'operator_website' }),
        }),
        makeOffer(id, {
          id: 'membership',
          productType: 'membership',
          label: 'Fortnightly membership',
          baseAmountMinor: 6400,
          membershipTerms: {
            billingIntervalDays: 14,
            joiningFeeMinor: 4900,
            accessCardFeeMinor: 3000,
            minimumTermDays: 168,
            cancellationNoticeDays: 30,
            notes: ['Direct debit only.'],
          },
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 12, sourceType: 'operator_website' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 2, provenance: from({ ageDays: 22 }) }),
        makeEquipment(id, 'cable_station', { count: 3, provenance: from({ ageDays: 22 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 42, provenance: from({ ageDays: 22 }) }),
        makeEquipment(id, 'leg_press', { count: 1, provenance: from({ ageDays: 22 }) }),
        makeEquipment(id, 'hack_squat', { count: 1, provenance: from({ ageDays: 22 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
        makeAmenity(id, 'towel_service', 'yes'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 14. Greenway Community Gym — an accessible bathroom is confirmed while the
//     entrance is not. Neither fact is inferred from the other.
// ---------------------------------------------------------------------------
const greenway = (() => {
  const id = 'greenway-community-gym-glebe';
  return makeRecord(
    makeLocation({
      id,
      name: 'Greenway Community Gym',
      line1: '8 Bridge Road West',
      suburb: 'Glebe',
      postcode: '2037',
      lat: -33.879,
      lng: 151.187,
      phone: '+61 2 5550 1313',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'visitor',
          windows: [...windowsOn(WEEKDAYS, hours(7), hours(20)), ...windowsOn(WEEKEND, hours(9), hours(14))],
          provenance: from({ ageDays: 14, sourceType: 'independent_check' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(7), hours(20)),
          provenance: from({ ageDays: 14, sourceType: 'independent_check' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 14),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 1200,
          inclusions: ['Gym floor'],
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 14, sourceType: 'independent_check' }),
        }),
        makeOffer(id, {
          id: 'concession',
          productType: 'casual_gym_visit',
          label: 'Concession casual visit',
          baseAmountMinor: 800,
          eligibility: {
            localResidentOnly: 'no',
            memberGuestOnly: 'no',
            firstTimeVisitorOnly: 'no',
            membershipRequired: 'no',
            photoIdRequired: 'yes',
            minAgeYears: null,
            notes: ['Concession card must be shown at reception.'],
          },
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 14, sourceType: 'independent_check' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 1, provenance: from({ ageDays: 14 }) }),
        makeEquipment(id, 'cable_station', { count: 1, provenance: from({ ageDays: 14 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 30, provenance: from({ ageDays: 14 }) }),
        makeEquipment(id, 'treadmill', { count: 4, provenance: from({ ageDays: 14 }) }),
        makeEquipment(id, 'rower', { count: 2, condition: 'out_of_service', conditionAgeDays: 4, provenance: from({ ageDays: 14 }) }),
        makeEquipment(id, 'lifting_platform', { presence: 'no', provenance: from({ ageDays: 14 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
        makeAmenity(
          id,
          'accessible_bathroom',
          'yes',
          'Ground-floor accessible bathroom with a grab rail, checked in person.',
        ),
        // Deliberately unknown: the accessible bathroom above does not
        // establish that the entrance is step-free.
        makeAmenity(id, 'step_free_entrance', 'unknown'),
        makeAmenity(id, 'accessible_change_room', 'unknown'),
        makeAmenity(id, 'parking', 'no'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 15. Oakline Fitness — nobody has reviewed it and the equipment list is
//     months past its recheck target.
// ---------------------------------------------------------------------------
const oakline = (() => {
  const id = 'oakline-fitness-zetland';
  return makeRecord(
    makeLocation({
      id,
      name: 'Oakline Fitness',
      line1: '2 Defries Avenue',
      suburb: 'Zetland',
      postcode: '2017',
      lat: -33.906,
      lng: 151.209,
      phone: '+61 2 5550 1414',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(ALL_DAYS, hours(6), hours(22)),
          provenance: from({ ageDays: 55, sourceType: 'operator_website' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 55),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 2100,
          purchaseMethod: 'at_reception',
          // Past the 30-day price recheck target.
          provenance: from({ ageDays: 55, sourceType: 'operator_website' }),
        }),
      ],
      equipment: [
        // Past the 90-day equipment recheck target: present, but not fresh.
        makeEquipment(id, 'squat_rack', { count: 3, provenance: from({ ageDays: 140 }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 140 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 50, provenance: from({ ageDays: 140 }) }),
        makeEquipment(id, 'bench', { count: 6, provenance: from({ ageDays: 140 }) }),
      ],
      amenities: [makeAmenity(id, 'showers', 'yes', null, from({ ageDays: 200 }))],
    },
  );
})();

// ---------------------------------------------------------------------------
// 16. Harbourgate Strength — the only visitor price requires a member to sign
//     you in.
// ---------------------------------------------------------------------------
const harbourgate = (() => {
  const id = 'harbourgate-strength-potts-point';
  return makeRecord(
    makeLocation({
      id,
      name: 'Harbourgate Strength',
      line1: '11 Challis Terrace',
      suburb: 'Potts Point',
      postcode: '2011',
      lat: -33.872,
      lng: 151.224,
      phone: '+61 2 5550 1515',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'member',
          alwaysOpen: true,
          provenance: from({ ageDays: 10, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(ALL_DAYS, hours(6), hours(22)),
          provenance: from({ ageDays: 10, sourceType: 'owner_submission' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(9), hours(18)),
          provenance: from({ ageDays: 10, sourceType: 'owner_submission' }),
        }),
      ],
      prerequisites: makePrerequisites(id, {
        advanceBookingRequired: 'no',
        inductionRequired: 'no',
        inductionAvailableDuringStaffedHoursOnly: 'no',
        photoIdRequired: 'yes',
        minAgeYears: 18,
        residencyRule: 'none',
        memberAccompanimentRequired: 'yes',
        notes: ['A member must sign guests in at the door.'],
        provenance: from({ ageDays: 10, sourceType: 'owner_submission' }),
      }),
      offers: [
        makeOffer(id, {
          id: 'guest',
          productType: 'day_pass',
          label: "Member's guest pass",
          baseAmountMinor: 1500,
          eligibility: {
            localResidentOnly: 'no',
            memberGuestOnly: 'yes',
            firstTimeVisitorOnly: 'no',
            membershipRequired: 'no',
            photoIdRequired: 'yes',
            minAgeYears: 18,
            notes: ['Limited to two guest visits per member per month.'],
          },
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 10, sourceType: 'owner_submission' }),
        }),
        makeOffer(id, {
          id: 'membership',
          productType: 'membership',
          label: 'Monthly membership',
          baseAmountMinor: 18900,
          membershipTerms: {
            billingIntervalDays: 28,
            joiningFeeMinor: 9900,
            accessCardFeeMinor: null,
            minimumTermDays: 84,
            cancellationNoticeDays: 30,
            notes: ['The access card fee is mentioned in the terms but the amount is not stated.'],
          },
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 10, sourceType: 'owner_submission' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: 5, provenance: from({ ageDays: 10 }) }),
        makeEquipment(id, 'power_rack', { count: 3, provenance: from({ ageDays: 10 }) }),
        makeEquipment(id, 'cable_station', { count: 4, provenance: from({ ageDays: 10 }) }),
        makeEquipment(id, 'dumbbells', { maxWeightKg: 60, provenance: from({ ageDays: 10 }) }),
        makeEquipment(id, 'hack_squat', { count: 1, provenance: from({ ageDays: 10 }) }),
        makeEquipment(id, 'leg_press', { count: 2, provenance: from({ ageDays: 10 }) }),
        makeEquipment(id, 'bench', { count: 10, provenance: from({ ageDays: 10 }) }),
      ],
      amenities: [
        makeAmenity(id, 'showers', 'yes'),
        makeAmenity(id, 'lockers', 'yes'),
        makeAmenity(id, 'sauna', 'yes'),
        makeAmenity(id, 'towel_service', 'yes'),
        makeAmenity(id, 'staffed_reception', 'yes'),
      ],
    },
  );
})();

// ---------------------------------------------------------------------------
// 17. Copperfield Gym — dumbbells exist but nobody recorded the heaviest
//     pair, so a 40 kg requirement cannot be confirmed from what we hold.
// ---------------------------------------------------------------------------
const copperfield = (() => {
  const id = 'copperfield-gym-camperdown';
  return makeRecord(
    makeLocation({
      id,
      name: 'Copperfield Gym',
      line1: '77 Mallett Street North',
      suburb: 'Camperdown',
      postcode: '2050',
      lat: -33.89,
      lng: 151.176,
      phone: '+61 2 5550 1616',
    }),
    {
      schedules: [
        makeSchedule(id, {
          audience: 'visitor',
          windows: windowsOn(ALL_DAYS, hours(6), hours(22)),
          provenance: from({ ageDays: 11, sourceType: 'community_report' }),
        }),
        makeSchedule(id, {
          audience: 'staffed',
          windows: windowsOn(WEEKDAYS, hours(9), hours(17)),
          provenance: from({ ageDays: 11, sourceType: 'community_report' }),
        }),
      ],
      prerequisites: resolvedPrerequisites(id, 11),
      offers: [
        makeOffer(id, {
          id: 'casual',
          productType: 'casual_gym_visit',
          label: 'Casual visit',
          baseAmountMinor: 1800,
          purchaseMethod: 'at_reception',
          provenance: from({ ageDays: 11, sourceType: 'community_report' }),
        }),
      ],
      equipment: [
        makeEquipment(id, 'squat_rack', { count: null, provenance: from({ ageDays: 11, sourceType: 'community_report' }) }),
        makeEquipment(id, 'cable_station', { count: 2, provenance: from({ ageDays: 11, sourceType: 'community_report' }) }),
        // Present, but the heaviest pair was never recorded.
        makeEquipment(id, 'dumbbells', { maxWeightKg: null, provenance: from({ ageDays: 11, sourceType: 'community_report' }) }),
        makeEquipment(id, 'bench', { count: null, provenance: from({ ageDays: 11, sourceType: 'community_report' }) }),
        makeEquipment(id, 'treadmill', { count: 3, provenance: from({ ageDays: 11, sourceType: 'community_report' }) }),
      ],
      amenities: [makeAmenity(id, 'showers', 'yes'), makeAmenity(id, 'lockers', 'unknown')],
    },
  );
})();

/**
 * The demo dataset, in a deliberately arbitrary order so that any stable
 * ordering in the product comes from the ranking rules rather than from here.
 */
export const DEMO_GYMS: GymRecord[] = [
  keystone,
  ironbark,
  waterlooAquatic,
  vellum,
  halfmoon,
  quarryLane,
  brickworks,
  tallowStreet,
  foundryLane,
  nightshift,
  marrowAndCo,
  saltwater,
  greenway,
  paddingtonHill,
  oakline,
  harbourgate,
  copperfield,
];
