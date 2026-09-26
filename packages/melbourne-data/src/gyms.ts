/**
 * Real gyms in inner Melbourne.
 *
 * Positions, names and most addresses come from OpenStreetMap (© OpenStreetMap
 * contributors, ODbL), queried on 23 September 2026. Prices, hours and
 * equipment come only from each operator's own website, read the same day,
 * and each fact links to the page it came from.
 *
 * What a gym does not publish is left unknown. A blank is never a no, a
 * missing price is never free, and staffed hours are never assumed to be
 * guest hours unless the gym says so. That is why several of these gyms show
 * "Worth a call": we genuinely don't know, and saying otherwise would send
 * someone to a door they can't open.
 *
 * Nothing here was supplied by, or agreed with, the gyms.
 */

import type { GymRecord } from '@gymgo/domain';
import {
  EVERY_DAY,
  MON_FRI,
  MON_THU,
  WEEKEND,
  equipment,
  hm,
  location,
  offer,
  on,
  prerequisites,
  record,
  schedule,
  website,
} from './build';

// --- Doherty's Gym ---------------------------------------------------------

const DOHERTYS_HOME = website('https://dohertysgym.com/', "Gym's website: locations and hours");
const DOHERTYS_MEMBERSHIP = website('https://dohertysgym.com/membership/', "Gym's website: membership page");

function dohertysOffers(gymId: string) {
  return [
    offer(
      gymId,
      'casual',
      {
        productType: 'casual_gym_visit',
        label: 'Casual Pass',
        baseAmountMinor: 2000,
        inclusions: ['Single session', 'Gym floor'],
        eligibility: {
          localResidentOnly: 'no',
          memberGuestOnly: 'no',
          firstTimeVisitorOnly: 'no',
          membershipRequired: 'no',
          photoIdRequired: 'unknown',
          minAgeYears: null,
          notes: ['"Single session pass. Available during all regular hours."'],
        },
      },
      DOHERTYS_MEMBERSHIP,
    ),
    offer(
      gymId,
      'weekly',
      {
        productType: 'membership',
        label: 'Weekly direct debit',
        baseAmountMinor: 2000,
        validityDays: null,
        membershipTerms: {
          billingIntervalDays: 7,
          joiningFeeMinor: 0,
          accessCardFeeMinor: null,
          minimumTermDays: 28,
          cancellationNoticeDays: 30,
          notes: ['Valid at all Doherty’s locations.'],
        },
      },
      DOHERTYS_MEMBERSHIP,
    ),
  ];
}

const dohertysCityId = 'dohertys-gym-city';
const dohertysCityHours = [...on(MON_FRI, hm(5), hm(24)), ...on(WEEKEND, hm(6), hm(22))];

const dohertysCity = record(
  location({
    id: dohertysCityId,
    name: 'Doherty’s Gym',
    branch: 'City',
    brand: 'Doherty’s Gym',
    line1: '367 Flinders Street',
    suburb: 'Melbourne',
    postcode: '3000',
    lat: -37.81912,
    lng: 144.96259,
    osmElement: 'node/2296860514',
    trainingTypes: ['full_gym'],
    phone: '(03) 9621 1022',
    website: 'https://dohertysgym.com/',
    listedByOperator: DOHERTYS_HOME,
  }),
  {
    schedules: [
      schedule(dohertysCityId, 'member', { windows: dohertysCityHours, source: DOHERTYS_HOME }),
      schedule(dohertysCityId, 'staffed', { windows: dohertysCityHours, source: DOHERTYS_HOME }),
      // "Available during all regular hours" is the gym's own wording.
      schedule(dohertysCityId, 'visitor', { windows: dohertysCityHours, source: [DOHERTYS_HOME, DOHERTYS_MEMBERSHIP] }),
    ],
    offers: dohertysOffers(dohertysCityId),
    prerequisites: prerequisites(dohertysCityId, {
      // "A casual pass can be purchased at any time."
      advanceBookingRequired: 'no',
      notes: [
        'Open and staffed every day, including public holidays.',
        'A free trial pass exists for local residents, on weekdays only (terms apply).',
      ],
      source: DOHERTYS_HOME,
    }),
  },
);

const dohertysBrunswickId = 'dohertys-gym-brunswick';
const dohertysBrunswick = record(
  location({
    id: dohertysBrunswickId,
    name: 'Doherty’s Gym',
    branch: 'Brunswick',
    brand: 'Doherty’s Gym',
    line1: '45–49 Weston Street',
    suburb: 'Brunswick',
    postcode: '3056',
    lat: -37.77504,
    lng: 144.96462,
    osmElement: 'node/5031640221',
    trainingTypes: ['full_gym'],
    phone: '(03) 9388 0866',
    website: 'https://dohertysgym.com/',
    listedByOperator: DOHERTYS_HOME,
  }),
  {
    schedules: [
      schedule(dohertysBrunswickId, 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: DOHERTYS_HOME }),
      schedule(dohertysBrunswickId, 'staffed', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: DOHERTYS_HOME }),
      schedule(dohertysBrunswickId, 'visitor', {
        alwaysOpen: true,
        windows: on(EVERY_DAY, 0, hm(24)),
        source: [DOHERTYS_HOME, DOHERTYS_MEMBERSHIP],
      }),
    ],
    offers: dohertysOffers(dohertysBrunswickId),
    prerequisites: prerequisites(dohertysBrunswickId, {
      advanceBookingRequired: 'no',
      notes: [
        'Open and staffed 24 hours, every day, including public holidays.',
        'A free trial pass exists for local residents, on weekdays only (terms apply).',
      ],
      source: DOHERTYS_HOME,
    }),
  },
);

// --- Prime Athletica, Fitzroy ------------------------------------------------

const PRIME_HOME = website('https://primeathletica.com.au', "Gym's website: studios and opening hours");
const PRIME_MEMBERSHIPS = website('https://primeathletica.com.au/memberships', "Gym's website: Fitzroy memberships");
const primeId = 'prime-athletica-fitzroy';

const primeAthletica = record(
  location({
    id: primeId,
    name: 'Prime Athletica',
    branch: 'Fitzroy',
    brand: 'Prime Athletica',
    line1: '10 Spring Street',
    suburb: 'Fitzroy',
    postcode: '3065',
    lat: -37.79747,
    lng: 144.97617,
    osmElement: 'node/13648658323',
    trainingTypes: ['full_gym', 'functional'],
    website: 'https://primeathletica.com.au',
    listedByOperator: PRIME_HOME,
  }),
  {
    schedules: [
      // "Opening hours (all clubs)". The site doesn't say when casual entry
      // is sold or when staff are on, so those stay unknown.
      schedule(primeId, 'member', {
        windows: [
          ...on(MON_THU, hm(6), hm(20)),
          ...on([5], hm(6), hm(19)),
          ...on([6], hm(8), hm(15)),
          ...on([0], hm(9), hm(15)),
        ],
        source: PRIME_HOME,
      }),
    ],
    offers: [
      offer(primeId, 'casual', { productType: 'casual_gym_visit', label: 'Casual Gym Entry', baseAmountMinor: 2000 }, PRIME_MEMBERSHIPS),
    ],
    prerequisites: prerequisites(primeId, {
      notes: ['Closed all public holidays.', 'Offers one free trial session, booked through the website.'],
      source: PRIME_HOME,
    }),
  },
);

// --- Absolute MMA, Melbourne CBD ---------------------------------------------

const ABSOLUTE_CBD = website(
  'https://absolutemma.com.au/locations/absolute-melbourne-cbd/',
  "Gym's website: Melbourne CBD page",
);
const absoluteId = 'absolute-mma-melbourne-cbd';

const absoluteMma = record(
  location({
    id: absoluteId,
    name: 'Absolute MMA',
    branch: 'Melbourne CBD',
    brand: 'Absolute MMA',
    line1: 'The Basement, 136 Exhibition Street',
    suburb: 'Melbourne',
    postcode: '3000',
    lat: -37.81238,
    lng: 144.97113,
    osmElement: 'node/10799191105',
    trainingTypes: ['functional'],
    phone: '(03) 9663 9122',
    website: 'https://absolutemma.com.au/locations/absolute-melbourne-cbd/',
    listedByOperator: ABSOLUTE_CBD,
  }),
  {
    schedules: [
      // "Reception hours of operation".
      schedule(absoluteId, 'staffed', {
        windows: [...on(MON_THU, hm(6), hm(21)), ...on([5], hm(6), hm(20)), ...on([6], hm(8, 30), hm(12))],
        source: ABSOLUTE_CBD,
      }),
    ],
    // "Free weights including rubber-coated dumbbells, rubber-coated Olympic
    // bumper weight plates and array of Olympic bars. Heavy-duty power racks,
    // benches and cable stations. Treadmill, rowing machines..."
    equipment: equipment(absoluteId, ['dumbbells', 'barbells', 'power_rack', 'cable_station', 'treadmill', 'rower'], ABSOLUTE_CBD),
    prerequisites: prerequisites(absoluteId, { notes: ['Closed Sundays and public holidays.'], source: ABSOLUTE_CBD }),
  },
);

// --- Australian Strength Performance, Brunswick East ------------------------

const ASP_HOME = website('https://trainasp.com.au/', "Gym's website: home page");
// "Dedicated lifting platforms" and "Premium racks and bars: Including Eleiko
// competition equipment and calibrated plates." It also mentions racks
// without saying which kind, so no rack type is recorded.
const ASP_OFFER = website('https://trainasp.com.au/what-we-offer/', "Gym's website: what we offer");
const aspId = 'australian-strength-performance';

const asp = record(
  location({
    id: aspId,
    name: 'Australian Strength Performance',
    line1: '120 Weston Street',
    suburb: 'Brunswick East',
    postcode: '3057',
    lat: -37.77617,
    lng: 144.97164,
    osmElement: 'node/1671554435',
    trainingTypes: ['strength_focused'],
    phone: '(03) 9038 8008',
    website: 'https://trainasp.com.au/',
    listedByOperator: ASP_HOME,
  }),
  {
    schedules: [
      schedule(aspId, 'member', {
        windows: [...on(MON_FRI, hm(6), hm(20)), ...on([6], hm(8, 30), hm(15, 30)), ...on([0], hm(9), hm(13))],
        source: ASP_HOME,
      }),
    ],
    equipment: equipment(aspId, ['lifting_platform', 'barbells'], ASP_OFFER),
    prerequisites: prerequisites(aspId, {
      notes: ['Offers a free first visit, booked in advance.', 'Public holiday hours are posted on its social media.'],
      source: ASP_HOME,
    }),
  },
);

// --- Next Level Fitness, South Melbourne -------------------------------------

const NEXT_LEVEL = website('https://nextlevelfitness.com.au/south-melbourne/', "Gym's website: South Melbourne page");
const nextLevelId = 'next-level-fitness-south-melbourne';

const nextLevel = record(
  location({
    id: nextLevelId,
    name: 'Next Level Fitness',
    branch: 'South Melbourne',
    brand: 'Next Level Fitness',
    line1: '13/21 Palmerston Crescent',
    suburb: 'South Melbourne',
    postcode: '3205',
    lat: -37.83364,
    lng: 144.97039,
    osmElement: 'node/585589573',
    trainingTypes: ['full_gym'],
    phone: '(03) 9682 5775',
    website: 'https://nextlevelfitness.com.au/south-melbourne/',
    listedByOperator: NEXT_LEVEL,
  }),
  {
    schedules: [
      schedule(nextLevelId, 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: NEXT_LEVEL }),
      schedule(nextLevelId, 'staffed', {
        windows: [...on(MON_THU, hm(10), hm(19)), ...on([5, 6], hm(10), hm(14))],
        source: NEXT_LEVEL,
      }),
    ],
    prerequisites: prerequisites(nextLevelId, {
      notes: ['Offers a free pass for you and a friend (arranged with the gym).'],
      source: NEXT_LEVEL,
    }),
  },
);

// --- Carlton Fitness, Carlton North ------------------------------------------

const CARLTON = website('https://www.carltonfitnessgym.com.au/', "Gym's website: home page");
const carltonId = 'carlton-fitness';

const carlton = record(
  location({
    id: carltonId,
    name: 'Carlton Fitness',
    line1: 'Level 1, 657 Nicholson Street',
    suburb: 'Carlton North',
    postcode: '3054',
    lat: -37.78397,
    lng: 144.97721,
    osmElement: 'node/12179710321',
    trainingTypes: ['full_gym'],
    phone: '9193 3558',
    website: 'https://www.carltonfitnessgym.com.au/',
    listedByOperator: CARLTON,
  }),
  {
    schedules: [
      schedule(carltonId, 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: CARLTON }),
      schedule(carltonId, 'staffed', {
        windows: [...on(MON_THU, hm(11), hm(19)), ...on([6], hm(9), hm(13))],
        source: CARLTON,
      }),
    ],
    offers: [
      offer(
        carltonId,
        'weekly',
        {
          productType: 'membership',
          label: 'Membership',
          baseAmountMinor: 1895,
          validityDays: null,
          membershipTerms: {
            billingIntervalDays: 7,
            joiningFeeMinor: null,
            accessCardFeeMinor: 2500,
            minimumTermDays: 0,
            cancellationNoticeDays: null,
            notes: ['"No lock in contract. $25 Access Pass fee."'],
          },
        },
        CARLTON,
      ),
    ],
    prerequisites: prerequisites(carltonId, { notes: ['Staff ask you to make an appointment.'], source: CARLTON }),
  },
);

// --- Snap Fitness, Brunswick ---------------------------------------------------

const SNAP_BRUNSWICK = website('https://www.snapfitness.com/au/gyms/brunswick', "Gym's website: Brunswick page");
const snapBrunswickId = 'snap-fitness-brunswick';

const snapBrunswick = record(
  location({
    id: snapBrunswickId,
    name: 'Snap Fitness',
    branch: 'Brunswick',
    brand: 'Snap Fitness',
    line1: '50 Sydney Road',
    suburb: 'Brunswick',
    postcode: '3056',
    lat: -37.77656,
    lng: 144.96068,
    osmElement: 'node/7150402726',
    trainingTypes: ['full_gym'],
    phone: '0459 119 951',
    website: 'https://www.snapfitness.com/au/gyms/brunswick',
    listedByOperator: SNAP_BRUNSWICK,
  }),
  {
    schedules: [
      // "Open 24 hours to members". Its staffed hours load in the browser and
      // weren't readable, so they stay unknown.
      schedule(snapBrunswickId, 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: SNAP_BRUNSWICK }),
    ],
  },
);

// --- CrossFit Collingwood ------------------------------------------------------

const CROSSFIT_COLLINGWOOD = website('https://crossfitcollingwood.com/', "Gym's website: home page");
const crossfitId = 'crossfit-collingwood';

const crossfitCollingwood = record(
  location({
    id: crossfitId,
    name: 'CrossFit Collingwood',
    brand: 'CrossFit',
    line1: '75 Cromwell Street',
    suburb: 'Collingwood',
    postcode: '3066',
    lat: -37.80606,
    lng: 144.98979,
    osmElement: 'way/1057077956',
    trainingTypes: ['crossfit_box'],
    website: 'https://crossfitcollingwood.com/',
    listedByOperator: CROSSFIT_COLLINGWOOD,
  }),
  {
    offers: [
      // "Experienced athlete drop ins welcome, head to our contact form for
      // bookings." No price is published.
      offer(
        crossfitId,
        'drop-in',
        {
          productType: 'casual_gym_visit',
          label: 'Drop-in',
          baseAmountMinor: null,
          eligibility: {
            localResidentOnly: 'no',
            memberGuestOnly: 'no',
            firstTimeVisitorOnly: 'no',
            membershipRequired: 'no',
            photoIdRequired: 'unknown',
            minAgeYears: null,
            notes: ['For experienced athletes.'],
          },
        },
        CROSSFIT_COLLINGWOOD,
      ),
    ],
    prerequisites: prerequisites(crossfitId, {
      advanceBookingRequired: 'yes',
      notes: ['Drop-ins are booked through the contact form, and are for experienced athletes.'],
      source: CROSSFIT_COLLINGWOOD,
    }),
  },
);

// --- On the map only ---------------------------------------------------------
//
// These come from OpenStreetMap alone. We have their name and place, and for
// a few, that mappers recorded 24/7 access (which, for these chains, is member
// access). Everything else, including whether each branch still trades, is
// unknown until someone checks.

interface MapOnly {
  id: string;
  name: string;
  branch?: string;
  brand?: string;
  line1: string;
  suburb: string;
  postcode: string;
  lat: number;
  lng: number;
  osmElement: string;
  trainingTypes?: GymRecord['location']['trainingTypes'];
  website?: string;
  /** Mapped as `opening_hours=24/7`. */
  mapped247?: boolean;
}

function mapOnly(spec: MapOnly): GymRecord {
  const loc = location({ ...spec, trainingTypes: spec.trainingTypes ?? ['full_gym'] });
  return record(loc, {
    schedules: spec.mapped247
      ? [
          schedule(spec.id, 'member', {
            alwaysOpen: true,
            windows: on(EVERY_DAY, 0, hm(24)),
            source: { url: `https://www.openstreetmap.org/${spec.osmElement}`, label: 'OpenStreetMap', kind: 'osm' },
          }),
        ]
      : [],
  });
}

const mapped: GymRecord[] = [
  mapOnly({
    id: 'anytime-fitness-collingwood',
    name: 'Anytime Fitness',
    branch: 'Collingwood',
    brand: 'Anytime Fitness',
    line1: '164 Wellington Street',
    suburb: 'Collingwood',
    postcode: '3066',
    lat: -37.80424,
    lng: 144.98668,
    osmElement: 'node/9209446749',
    website: 'https://www.anytimefitness.com.au',
    mapped247: true,
  }),
  mapOnly({
    id: 'anytime-fitness-docklands',
    name: 'Anytime Fitness',
    branch: 'Docklands',
    brand: 'Anytime Fitness',
    line1: '747 Collins Street',
    suburb: 'Docklands',
    postcode: '3008',
    lat: -37.82109,
    lng: 144.94944,
    osmElement: 'node/6856256775',
    mapped247: true,
  }),
  mapOnly({
    id: 'anytime-fitness-south-melbourne',
    name: 'Anytime Fitness',
    branch: 'South Melbourne',
    brand: 'Anytime Fitness',
    line1: '105 York Street',
    suburb: 'South Melbourne',
    postcode: '3205',
    lat: -37.83125,
    lng: 144.95892,
    osmElement: 'node/12956407101',
    website: 'https://anytimefitness.com.au/',
    mapped247: true,
  }),
  mapOnly({
    id: 'equilibrium-fitness-north-melbourne',
    name: 'Equilibrium Fitness',
    branch: 'North Melbourne',
    line1: '23 Errol Street',
    suburb: 'North Melbourne',
    postcode: '3051',
    lat: -37.80446,
    lng: 144.94916,
    osmElement: 'node/4733654588',
    website: 'https://www.eqhf.com.au/',
    mapped247: true,
  }),
  mapOnly({
    id: 'goodlife-fitzroy',
    name: 'GoodLife Health Clubs',
    branch: 'Fitzroy',
    brand: 'GoodLife Health Clubs',
    line1: '41 Johnston Street',
    suburb: 'Fitzroy',
    postcode: '3065',
    lat: -37.79786,
    lng: 144.97629,
    osmElement: 'way/227614789',
    website: 'https://www.goodlifehealthclubs.com.au/',
  }),
  mapOnly({
    id: 'l9-fitness-fitzroy-north',
    name: 'L9 Fitness & Skills',
    branch: 'Fitzroy North',
    line1: '646 Nicholson Street',
    suburb: 'Fitzroy North',
    postcode: '3068',
    lat: -37.78431,
    lng: 144.97756,
    osmElement: 'node/7418269153',
    website: 'https://www.l9.com.au/',
  }),
  mapOnly({
    id: 'rbt-south-melbourne',
    name: 'RBT',
    branch: 'South Melbourne',
    brand: 'RBT',
    line1: '146 Thistlethwaite Street',
    suburb: 'South Melbourne',
    postcode: '3205',
    lat: -37.83276,
    lng: 144.94932,
    osmElement: 'node/7676964910',
    website: 'https://rbtgyms.com',
  }),
  mapOnly({
    id: 'snap-fitness-fitzroy',
    name: 'Snap Fitness',
    branch: 'Fitzroy',
    brand: 'Snap Fitness',
    line1: '224 Brunswick Street',
    suburb: 'Fitzroy',
    postcode: '3065',
    lat: -37.80083,
    lng: 144.97841,
    osmElement: 'way/228468292',
  }),
  mapOnly({
    id: 'the-strong-zone-collingwood',
    name: 'The Strong Zone',
    line1: '10–12 Wellington Street',
    suburb: 'Collingwood',
    postcode: '3066',
    lat: -37.80823,
    lng: 144.9862,
    osmElement: 'way/962484820',
    trainingTypes: ['strength_focused'],
  }),
  mapOnly({
    id: 'fitness-xo-northcote',
    name: 'Fitness XO',
    line1: '82 High Street',
    suburb: 'Northcote',
    postcode: '3070',
    lat: -37.78026,
    lng: 144.99714,
    osmElement: 'way/609091134',
    website: 'https://fitnessxo.com/',
  }),
  mapOnly({
    id: 'prosport-richmond',
    name: 'Prosport Health & Fitness',
    line1: '344 Swan Street',
    suburb: 'Richmond',
    postcode: '3121',
    lat: -37.8265,
    lng: 145.00277,
    osmElement: 'node/9837515522',
  }),
  mapOnly({
    id: 'lincoln-square-fitness-carlton',
    name: 'Lincoln Square Fitness',
    line1: '183 Bouverie Street',
    suburb: 'Carlton',
    postcode: '3053',
    lat: -37.80211,
    lng: 144.96186,
    osmElement: 'node/10718846595',
  }),
  mapOnly({
    id: 'quickfit-brunswick-east',
    name: 'QuickFit',
    line1: '8 Lygon Street',
    suburb: 'Brunswick East',
    postcode: '3057',
    lat: -37.77865,
    lng: 144.97086,
    osmElement: 'node/11586244572',
    mapped247: true,
  }),
  mapOnly({
    id: 'leo-berrys-gym-richmond',
    name: 'Leo Berry’s Gym',
    line1: '13A Gleadell Street',
    suburb: 'Richmond',
    postcode: '3121',
    lat: -37.81804,
    lng: 145.00201,
    osmElement: 'way/1496822354',
    trainingTypes: ['functional'],
  }),
];

export const MELBOURNE_GYMS: GymRecord[] = [
  dohertysCity,
  dohertysBrunswick,
  primeAthletica,
  absoluteMma,
  asp,
  nextLevel,
  carlton,
  snapBrunswick,
  crossfitCollingwood,
  ...mapped,
];
