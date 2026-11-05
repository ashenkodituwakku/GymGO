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

import type { GymRecord, VisitOffer } from '@gymgo/domain';
import type { Cite } from './build';
import {
  EVERY_DAY,
  MON_FRI,
  MON_THU,
  WEEKEND,
  equipment,
  hm,
  websiteCopy,
  location,
  octoberCopy,
  offer,
  on,
  prerequisites,
  record,
  schedule,
  website,
} from './build';

/**
 * Where a gym's own pages give different prices for the same thing, every
 * such price is shown as disagreeing ("Check with the gym"), with what each
 * page said.
 */
function disputed(offers: VisitOffer[], conflictNote: string): VisitOffer[] {
  return offers.map((item) => ({ ...item, provenance: { ...item.provenance, status: 'conflicting' as const, conflictNote } }));
}

/** Weekly membership terms, with what the page says about them. */
const weeklyTerms = (notes: string[], extra: Partial<NonNullable<VisitOffer['membershipTerms']>> = {}): VisitOffer['membershipTerms'] => ({
  billingIntervalDays: 7,
  joiningFeeMinor: null,
  accessCardFeeMinor: null,
  minimumTermDays: null,
  cancellationNoticeDays: null,
  notes,
  ...extra,
});

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
    // A web search's copy of the same membership page, 30 Sep: "12 Months:
    // $19.99/week, 3 Months: $24.99/week, and FIFO 12 Months: $9.99/week.
    // Joining fees apply." It disagrees with the weekly plan read directly on
    // 23 Sep, so every membership here is marked as disagreeing until someone
    // opens the live page again.
    ...(
      [
        ['12-months', '12 Months', 1999, 365, []],
        ['3-months', '3 Months', 2499, 91, []],
        ['fifo-12-months', 'FIFO 12 Months', 999, 365, []],
      ] as const
    ).map(([key, label, cents, days, notes]) =>
      offer(
        gymId,
        key,
        {
          productType: 'membership',
          label,
          baseAmountMinor: cents,
          validityDays: null,
          // The page names who the FIFO plan is for and nothing else, so the
          // rest stays as unknown as on the other plans.
          ...(key === 'fifo-12-months'
            ? {
                eligibility: {
                  localResidentOnly: 'unknown',
                  memberGuestOnly: 'unknown',
                  firstTimeVisitorOnly: 'unknown',
                  membershipRequired: 'no',
                  photoIdRequired: 'unknown',
                  minAgeYears: null,
                  onlyFor: 'Fly-in fly-out workers',
                  notes: [],
                },
              }
            : {}),
          membershipTerms: {
            billingIntervalDays: 7,
            joiningFeeMinor: null,
            accessCardFeeMinor: null,
            minimumTermDays: days,
            cancellationNoticeDays: 30,
            notes: ['"Joining fees apply."', ...notes],
          },
        },
        websiteCopy('https://dohertysgym.com/membership/', "Gym's website: membership page"),
      ),
    ),
  ].map((item) =>
    item.productType === 'membership'
      ? {
          ...item,
          provenance: {
            ...item.provenance,
            status: 'conflicting' as const,
            conflictNote:
              'Read directly on 23 Sep 2026, the membership page showed a weekly direct debit of $20 with no joining fee. A search copy of the same page on 30 Sep shows 12-month, 3-month and FIFO plans with joining fees. Check with the gym.',
          },
        }
      : item,
  );
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
      // The memberships page's search copy, 11 Oct: gym only $35 a week, two
      // classes a week $50, unlimited classes and gym $65; "no lock-in
      // contracts or joining fees". Its casual class price appears twice ($35
      // and $39), so no class price is shown.
      ...(
        [
          ['gym-only', 'Gym only', 3500, ['Gym floor'], []],
          ['two-classes', 'Two classes a week', 5000, ['Two classes a week'], ['Whether it includes the gym floor isn’t said.']],
          ['unlimited', 'Unlimited classes and gym', 6500, ['Gym floor', 'Unlimited classes'], []],
        ] as const
      ).map(([key, label, cents, inclusions, notes]) =>
        offer(
          primeId,
          key,
          {
            productType: 'membership',
            label,
            baseAmountMinor: cents,
            validityDays: null,
            grantsGymFloorAccess: (inclusions as readonly string[]).includes('Gym floor') ? 'yes' : 'unknown',
            inclusions: [...inclusions],
            membershipTerms: weeklyTerms(['"No lock-in contracts or joining fees."', ...notes], { joiningFeeMinor: 0, minimumTermDays: 0 }),
          },
          octoberCopy('https://www.primeathletica.com.au/memberships', "Gym's website: memberships"),
        ),
      ),
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
    offers: [
      // "Free trial classes are only available to local residents. Interstate
      // and international visitors can purchase 1-day or 7-day passes." Their
      // prices aren't published.
      ...(
        [
          ['visitor-day', 'Visitor 1-day pass', 'day_pass', 1],
          ['visitor-week', 'Visitor 7-day pass', 'week_pass', 7],
        ] as const
      ).map(([key, label, productType, days]) =>
        offer(
          absoluteId,
          key,
          {
            productType,
            label,
            baseAmountMinor: null,
            validityDays: days,
            grantsGymFloorAccess: 'unknown',
            inclusions: [],
            eligibility: {
              localResidentOnly: 'no',
              memberGuestOnly: 'no',
              firstTimeVisitorOnly: 'no',
              membershipRequired: 'no',
              photoIdRequired: 'unknown',
              minAgeYears: null,
              notes: ['For interstate and international visitors; locals get a free trial class instead.'],
            },
          },
          octoberCopy('https://absolutemma.com.au/', "Gym's website: home page"),
        ),
      ),
    ],
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
    // "FULL ACCESS ... $39.90 per week": the gym and unlimited classes, month
    // to month, "no lock-in contract". On 11 Oct the search copy of its
    // pricing page had the Class + Gym membership at $42.90 a week, so the
    // price is shown as disagreeing. Its single visit ($35) was only on older
    // pages, so it isn't shown.
    offers: disputed([
      offer(
        aspId,
        'full-access',
        {
          productType: 'membership',
          label: 'Full Access',
          baseAmountMinor: 3990,
          validityDays: null,
          inclusions: ['Gym floor', 'Unlimited classes'],
          membershipTerms: {
            billingIntervalDays: 7,
            joiningFeeMinor: null,
            accessCardFeeMinor: null,
            minimumTermDays: 0,
            cancellationNoticeDays: null,
            notes: ['"No lock-in contract", month to month.'],
          },
        },
        websiteCopy('https://trainasp.com.au/what-we-offer/', "Gym's website: what we offer"),
      ),
    ], 'Its what-we-offer page (30 Sep) said $39.90 a week; its pricing page (11 Oct) says $42.90 a week for Class + Gym. Check with the gym.'),
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
    offers: [
      // "$11.95 per week via direct debit, no joining fee, no contract."
      offer(
        nextLevelId,
        'weekly',
        {
          productType: 'membership',
          label: 'Weekly direct debit',
          baseAmountMinor: 1195,
          validityDays: null,
          membershipTerms: {
            billingIntervalDays: 7,
            joiningFeeMinor: 0,
            accessCardFeeMinor: null,
            minimumTermDays: 0,
            cancellationNoticeDays: null,
            notes: ['"No joining fee, no contract."', 'Pay-up-front memberships are also offered; their prices aren’t published.'],
          },
        },
        websiteCopy('https://nextlevelfitness.com.au/membershipsthmelb/', "Gym's website: South Melbourne memberships"),
      ),
      // Another of its South Melbourne membership pages, 11 Oct: "12-month
      // direct debit $18 a week, $79 joining fee"; no contract $21 a week.
      offer(
        nextLevelId,
        '12-months',
        {
          productType: 'membership',
          label: '12-month direct debit',
          baseAmountMinor: 1800,
          validityDays: null,
          membershipTerms: weeklyTerms([], { joiningFeeMinor: 7900, minimumTermDays: 365 }),
        },
        octoberCopy('https://nextlevelfitness.com.au/membership/south-melbourne/', "Gym's website: South Melbourne membership"),
      ),
      offer(
        nextLevelId,
        'no-contract',
        {
          productType: 'membership',
          label: 'No contract',
          baseAmountMinor: 2100,
          validityDays: null,
          membershipTerms: weeklyTerms([], { minimumTermDays: 0 }),
        },
        octoberCopy('https://nextlevelfitness.com.au/membership/south-melbourne/', "Gym's website: South Melbourne membership"),
      ),
    ].map((item) =>
      item.productType === 'membership'
        ? disputed([item], 'One of its South Melbourne pages says $11.95 a week with no joining fee (30 Sep); another says $18 a week for 12 months with a $79 joining fee, or $21 a week with no contract (11 Oct). Check with the gym.')[0]!
        : item,
    ),
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
    ].map((item) => disputed([item], 'Its own pages give three weekly prices: $18.95 (home page), $16.95 (contact page) and $17.95 with no sign-up fee (join page). Check with the gym.')[0]!),
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
      notes: [
        'Drop-ins are booked through the contact form, and are for experienced athletes.',
        'Classes (its schedule page, 11 Oct): Monday to Thursday 5:30, 6:30 and 7:30 am, 12 pm, 5 and 6 pm; Friday the same until 5 pm; Saturday 8 and 9 am.',
      ],
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
  /** A website GymGO found by searching the web for the gym (the map gives none), checked by hand. */
  foundWebsite?: string;
  /** Mapped as `opening_hours=24/7`. */
  mapped247?: boolean;
  /** Prices the gym publishes, each with its own source. */
  offers?: GymRecord['offers'];
  phone?: string;
  /** The operator's own page listing this branch (it's then shown as trading). */
  listedByOperator?: Cite;
  /** Why its trading status is in doubt, in place of the usual line. */
  statusNote?: string;
  /** Hours from the gym's own site; these replace a map's 24/7. */
  schedules?: GymRecord['schedules'];
  prerequisites?: GymRecord['prerequisites'];
}

/** When the found websites were read. */
const WEBSITES_FOUND = '2026-09-28T16:00:00.000Z';

function mapOnly(spec: MapOnly): GymRecord {
  const mapped = location({ ...spec, trainingTypes: spec.trainingTypes ?? ['full_gym'] });
  // A found website is cited as GymGO's own finding, never as the map's or the gym's.
  const loc = spec.foundWebsite
    ? {
        ...mapped,
        website: spec.foundWebsite,
        provenance: {
          ...mapped.provenance,
          sources: [
            ...mapped.provenance.sources,
            {
              id: `ev-found-${spec.id}`,
              sourceType: 'independent_check' as const,
              evidenceRef: spec.foundWebsite,
              label: 'Website found by GymGO: a web search for the gym, checked by hand against its name and suburb',
              observedAt: WEBSITES_FOUND,
              checkedAt: WEBSITES_FOUND,
              reviewerId: null,
            },
          ],
        },
      }
    : mapped;
  if (spec.statusNote) loc.operatingStatusNote = spec.statusNote;
  return record(loc, {
    offers: spec.offers ?? [],
    ...(spec.prerequisites ? { prerequisites: spec.prerequisites } : {}),
    schedules: spec.schedules
      ? spec.schedules
      : spec.mapped247
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
    // Its club page, 11 Oct: 164 Wellington Street; "the club has reopened";
    // staffed hours are limited, so it asks you to call to book a time.
    website: 'https://www.anytimefitness.com.au/gyms/au-1308/collingwood-vic-3066/',
    phone: '0479 103 066',
    listedByOperator: octoberCopy('https://www.anytimefitness.com.au/gyms/au-1308/collingwood-vic-3066/', "Anytime Fitness website: Collingwood club page"),
    schedules: [
      schedule('anytime-fitness-collingwood', 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: { url: 'https://www.openstreetmap.org/node/9209446749', label: 'OpenStreetMap', kind: 'osm' } }),
      // Its club page's staffed hours, 11 Oct.
      schedule('anytime-fitness-collingwood', 'staffed', {
        windows: [...on(MON_THU, hm(8), hm(20)), ...on([5], hm(10), hm(16)), ...on(WEEKEND, hm(10), hm(14))],
        source: octoberCopy('https://www.anytimefitness.com.au/gyms/au-1308/collingwood-vic-3066/', "Anytime Fitness website: Collingwood club page"),
      }),
    ],
  }),
  mapOnly({
    id: 'anytime-fitness-docklands',
    name: 'Anytime Fitness',
    branch: 'Docklands',
    brand: 'Anytime Fitness',
    line1: 'Shop 9B, Collins Square, 747 Collins Street',
    suburb: 'Docklands',
    postcode: '3008',
    lat: -37.82109,
    lng: 144.94944,
    osmElement: 'node/6856256775',
    // Its club page, 11 Oct (not the separate Melbourne CBD club at 367 Collins Street).
    website: 'https://www.anytimefitness.com.au/gyms/au-1256/docklands-vic-3008/',
    phone: '0427 979 997',
    listedByOperator: octoberCopy('https://club.anytimefitness.com.au/docklands-vic', "Anytime Fitness website: Docklands club page"),
    mapped247: true,
  }),
  mapOnly({
    id: 'anytime-fitness-south-melbourne',
    name: 'Anytime Fitness',
    branch: 'South Melbourne',
    brand: 'Anytime Fitness',
    line1: 'Ground Floor, 105 York Street',
    suburb: 'South Melbourne',
    postcode: '3205',
    lat: -37.83125,
    lng: 144.95892,
    osmElement: 'node/12956407101',
    website: 'https://www.anytimefitness.com.au/gyms/au-1263/south-melbourne-vic-3205/',
    listedByOperator: octoberCopy('https://www.anytimefitness.com.au/gyms/au-1263/south-melbourne-vic-3205/', "Anytime Fitness website: South Melbourne club page"),
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
    website: 'https://eqhf.com.au/north-melbourne/',
    listedByOperator: octoberCopy('https://eqhf.com.au/north-melbourne/', "Gym's website: North Melbourne"),
    // "Open 24/7, every day", for members. Staffed hours aren't published.
    schedules: [schedule('equilibrium-fitness-north-melbourne', 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: octoberCopy('https://eqhf.com.au/contact-us-north-melbourne/', "Gym's website: contact, North Melbourne") })],
    // Its North Melbourne memberships, 11 Oct: priced by the week, debited
    // monthly, or 12 months up front. The $20 seven-day intro is a promotion,
    // left out. No casual visit is listed.
    offers: [
      ...(
        [
          ['freedom-gym', 'Freedom 24/7 Gym', 2195, ['Gym floor']],
          ['freedom-classes', 'Freedom with Classes', 2495, ['Gym floor', 'Classes']],
        ] as const
      ).map(([key, label, cents, inclusions]) =>
        offer(
          'equilibrium-fitness-north-melbourne',
          key,
          { productType: 'membership', label, baseAmountMinor: cents, validityDays: null, inclusions: [...inclusions], membershipTerms: weeklyTerms(['Priced by the week, debited monthly.']) },
          octoberCopy('https://eqhf.com.au/north-melbourne/', "Gym's website: North Melbourne"),
        ),
      ),
      ...(
        [
          ['upfront-gym', '12 months up front: gym', 80000, ['Gym floor']],
          ['upfront-classes', '12 months up front: with classes', 90000, ['Gym floor', 'Classes']],
        ] as const
      ).map(([key, label, cents, inclusions]) =>
        offer(
          'equilibrium-fitness-north-melbourne',
          key,
          {
            productType: 'membership',
            label,
            baseAmountMinor: cents,
            validityDays: null,
            inclusions: [...inclusions],
            membershipTerms: { billingIntervalDays: 365, joiningFeeMinor: null, accessCardFeeMinor: null, minimumTermDays: 365, cancellationNoticeDays: null, notes: ['Paid up front for the year.'] },
          },
          octoberCopy('https://eqhf.com.au/north-melbourne/', "Gym's website: North Melbourne"),
        ),
      ),
    ],
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
    website: 'https://www.goodlifehealthclubs.com.au/Clubs/VIC/Fitzroy/',
    phone: '03 9915 2900',
    listedByOperator: octoberCopy('https://www.goodlifehealthclubs.com.au/Clubs/VIC/Fitzroy/', "Gym's website: Fitzroy club page"),
    // Its club page's opening hours, 11 Oct. Whether members have 24/7 access
    // beyond these, and when staff are on, isn't said for Fitzroy.
    schedules: [
      schedule('goodlife-fitzroy', 'member', {
        windows: [...on([1, 2, 3], hm(6), hm(22)), ...on([4], hm(6), hm(21)), ...on([5], hm(6), hm(20)), ...on([6], hm(8), hm(17)), ...on([0], hm(9), hm(17))],
        source: octoberCopy('https://www.goodlifehealthclubs.com.au/Clubs/VIC/Fitzroy/', "Gym's website: Fitzroy club page"),
      }),
    ],
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
    // 11 Oct: a search of RBT's own site no longer finds this branch, and a
    // Facebook page for it reads "Permanently Closed". Neither is the operator
    // saying so on its site, so it isn't marked closed.
    statusNote: 'It may have closed: RBT’s own site no longer turns up this branch, and a Facebook page for it says “Permanently Closed”. Call before you go.',
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
    website: 'https://www.snapfitness.com/au/gyms/fitzroy',
    phone: '0499 600 667',
    listedByOperator: octoberCopy('https://www.snapfitness.com/au/gyms/fitzroy', "Gym's website: Fitzroy page"),
    // "Open 24 hours to members". Its staffed hours came without their days, so they aren't shown.
    schedules: [schedule('snap-fitness-fitzroy', 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: octoberCopy('https://www.snapfitness.com/au/gyms/fitzroy', "Gym's website: Fitzroy page") })],
    offers: [
      // "Our day pass is only $20!" Bought in person while staff are in; the
      // page doesn't give those hours.
      offer(
        'snap-fitness-fitzroy',
        'day-pass',
        {
          productType: 'day_pass',
          label: 'Day pass',
          baseAmountMinor: 2000,
          purchaseMethod: 'at_reception',
          eligibility: {
            localResidentOnly: 'no',
            memberGuestOnly: 'no',
            firstTimeVisitorOnly: 'no',
            membershipRequired: 'no',
            photoIdRequired: 'unknown',
            minAgeYears: null,
            notes: ['Arrive during staffed hours to buy one; the page doesn’t list them, so call first.'],
          },
        },
        octoberCopy('https://www.snapfitness.com/au/gyms/fitzroy', "Gym's website: Fitzroy page"),
      ),
    ],
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
    foundWebsite: 'https://thestrongzone.com.au/',
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
    offers: [
      // "New members can get unlimited classes for 4 weeks ... then $215/month.
      // Pause or cancel anytime." A class studio: whether the plan includes a
      // gym floor isn't said. The first-month offer is a promotion, so it's left out.
      offer(
        'fitness-xo-northcote',
        'unlimited',
        {
          productType: 'membership',
          label: 'Unlimited classes',
          baseAmountMinor: 21500,
          validityDays: null,
          grantsGymFloorAccess: 'unknown',
          inclusions: ['Unlimited classes'],
          membershipTerms: {
            billingIntervalDays: 30,
            joiningFeeMinor: null,
            accessCardFeeMinor: null,
            minimumTermDays: 0,
            cancellationNoticeDays: null,
            notes: ['"Pause or cancel anytime."', 'A lower first-month price for new members is advertised.'],
          },
        },
        websiteCopy('https://fitnessxo.com/pricing-northcote/', "Gym's website: Northcote pricing"),
      ),
      // "Drop-in" single class, $29.50, to use within a month (11 Oct).
      offer(
        'fitness-xo-northcote',
        'drop-in',
        {
          productType: 'class_only',
          label: 'Drop-in class',
          baseAmountMinor: 2950,
          validityDays: 30,
          grantsGymFloorAccess: 'unknown',
          inclusions: ['One class'],
          eligibility: {
            localResidentOnly: 'no',
            memberGuestOnly: 'no',
            firstTimeVisitorOnly: 'no',
            membershipRequired: 'no',
            photoIdRequired: 'unknown',
            minAgeYears: null,
            notes: ['Use it within a month.'],
          },
        },
        octoberCopy('https://fitnessxo.com/pricing-northcote/', "Gym's website: Northcote pricing"),
      ),
    ],
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
    foundWebsite: 'https://www.prosport.net.au/',
    phone: '(03) 9913 7267',
    // Every membership lists "24 hr gym access". Staffed hours aren't published.
    schedules: [schedule('prosport-richmond', 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: octoberCopy('https://www.prosport.net.au/pricing-non-alfred-health-staff', "Gym's website: pricing") })],
    // Its site now calls it PS Fitness; "conveniently located at 344 Swan
    // Street Richmond". Prices from its pricing page for people who aren't
    // Alfred Health staff (11 Oct). The free trial week isn't shown.
    offers: [
      ...(
        [
          ['gold', 'Gold', 8815, ['Gym floor, 24 hours', 'Unlimited group classes', 'Two Altitude classes a week']],
          ['silver', 'Silver', 5565, ['Gym floor, 24 hours', 'Unlimited group classes', 'One Altitude class a week']],
          ['bronze', 'Bronze', 3465, ['Gym floor, 24 hours', 'Three group classes a week (not Altitude)']],
        ] as const
      ).map(([key, label, cents, inclusions]) =>
        offer(
          'prosport-richmond',
          key,
          {
            productType: 'membership',
            label,
            baseAmountMinor: cents,
            validityDays: null,
            inclusions: [...inclusions],
            membershipTerms: { billingIntervalDays: 14, joiningFeeMinor: null, accessCardFeeMinor: null, minimumTermDays: null, cancellationNoticeDays: null, notes: ['Billed fortnightly.'] },
          },
          octoberCopy('https://www.prosport.net.au/pricing-non-alfred-health-staff', "Gym's website: pricing"),
        ),
      ),
      ...(
        [
          ['class', 'Group class', 2500],
          ['altitude-class', 'Altitude class', 3300],
        ] as const
      ).map(([key, label, cents]) =>
        offer(
          'prosport-richmond',
          key,
          {
            productType: 'class_only',
            label,
            baseAmountMinor: cents,
            grantsGymFloorAccess: 'unknown',
            inclusions: ['One class'],
            eligibility: {
              localResidentOnly: 'no',
              memberGuestOnly: 'no',
              firstTimeVisitorOnly: 'no',
              membershipRequired: 'no',
              photoIdRequired: 'unknown',
              minAgeYears: null,
              notes: [key === 'class' ? 'Also 5 for $115 or 10 for $220.' : 'Also 5 for $150 or 10 for $250.'],
            },
          },
          octoberCopy('https://www.prosport.net.au/pricing-non-alfred-health-staff', "Gym's website: pricing"),
        ),
      ),
    ],
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
    website: 'https://sport.unimelb.edu.au/fitness/fitness-facilities',
    listedByOperator: octoberCopy('https://sport.unimelb.edu.au/about-us/opening-hours', 'MU Sport: opening hours'),
    // MU Sport's opening hours (11 Oct): staffed at set times, otherwise 24
    // hours for inducted fitness members. The Friday and Saturday sessions'
    // start times differ between two of its pages; only the times both give
    // are shown.
    schedules: [
      schedule('lincoln-square-fitness-carlton', 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: octoberCopy('https://sport.unimelb.edu.au/about-us/opening-hours', 'MU Sport: opening hours') }),
      schedule('lincoln-square-fitness-carlton', 'staffed', {
        windows: [
          ...on(MON_THU, hm(11, 30), hm(14, 30)),
          ...on(MON_THU, hm(16, 30), hm(19, 30)),
          ...on([5], hm(17, 15), hm(20)),
          ...on([6], hm(9), hm(12)),
        ],
        source: [octoberCopy('https://sport.unimelb.edu.au/about-us/opening-hours', 'MU Sport: opening hours'), octoberCopy('https://sport.unimelb.edu.au/fitness/fitness-facilities', 'MU Sport: fitness facilities')],
      }),
    ],
    prerequisites: prerequisites('lincoln-square-fitness-carlton', {
      inductionRequired: 'yes',
      notes: [
        'Outside staffed hours, only inducted MU Sport fitness members get in.',
        'Friday evening is a Queer Friendly session and Saturday morning Women’s Only.',
        'Closed, unstaffed access too, over Easter and Christmas–New Year.',
      ],
      source: octoberCopy('https://sport.unimelb.edu.au/about-us/opening-hours', 'MU Sport: opening hours'),
    }),
    // Melbourne University Sport's 2026 price list (11 Oct): its fitness
    // memberships cover every MU Sport centre, Lincoln Square Fitness among them.
    offers: [
      offer(
        'lincoln-square-fitness-carlton',
        'casual',
        {
          productType: 'casual_gym_visit',
          label: 'Casual gym visit',
          baseAmountMinor: 1800,
          eligibility: {
            localResidentOnly: 'no',
            memberGuestOnly: 'no',
            firstTimeVisitorOnly: 'no',
            membershipRequired: 'unknown',
            photoIdRequired: 'unknown',
            minAgeYears: null,
            notes: [
              'The public price; University of Melbourne students pay $9.70, staff and alumni $13.50.',
              '"Non-Fitness Members and non-University of Melbourne students must buy a $99 Access Card annually to receive member rates for casual visits." Ask whether this price needs the card.',
              'Walk up; no booking.',
            ],
          },
        },
        octoberCopy('https://sport.unimelb.edu.au/pdfs/MU-Sport_Pricelist2026.pdf', 'MU Sport price list 2026'),
      ),
      offer(
        'lincoln-square-fitness-carlton',
        'fitness-membership',
        {
          productType: 'membership',
          label: 'Fitness membership',
          baseAmountMinor: 5430,
          validityDays: null,
          inclusions: ['Gym floor', 'Pool', 'Group fitness', 'Every MU Sport centre'],
          membershipTerms: {
            billingIntervalDays: 14,
            joiningFeeMinor: 3000,
            accessCardFeeMinor: null,
            minimumTermDays: 56,
            cancellationNoticeDays: null,
            notes: ['The public price; students pay $32.60, staff and alumni $51.30 a fortnight.', 'At least 4 fortnightly payments, and a one-off $30 provider fee.'],
          },
        },
        octoberCopy('https://sport.unimelb.edu.au/pdfs/MU-Sport_Pricelist2026.pdf', 'MU Sport price list 2026'),
      ),
    ],
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
    // Its own Brunswick page (11 Oct) gives 8 Lygon Street, Brunswick East.
    // Only a chain-wide "from $14.95 a week" is published, so no price.
    website: 'https://www.quickfit.com.au/quickfit-brunswick',
    listedByOperator: octoberCopy('https://www.quickfit.com.au/quickfit-brunswick', "Gym's website: Brunswick page"),
    // "Opening hours: 24hrs"; staffed Monday to Thursday 5–8 pm, Saturday 10 am–12 pm.
    schedules: [
      schedule('quickfit-brunswick-east', 'member', { alwaysOpen: true, windows: on(EVERY_DAY, 0, hm(24)), source: octoberCopy('https://www.quickfit.com.au/quickfit-brunswick', "Gym's website: Brunswick page") }),
      schedule('quickfit-brunswick-east', 'staffed', { windows: [...on(MON_THU, hm(17), hm(20)), ...on([6], hm(10), hm(12))], source: octoberCopy('https://www.quickfit.com.au/quickfit-brunswick', "Gym's website: Brunswick page") }),
    ],
    phone: '(03) 9386 3388',
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
    foundWebsite: 'https://www.richmondboxing.com.au/',
    trainingTypes: ['functional'],
    phone: '0412 742 645',
    // Its home page (11 Oct) gives 13a Gleadell Street and these sessions.
    // Morning classes "planned for 2027" aren't shown.
    offers: (
      [
        ['boxing', 'Boxing training', 500, 'Saturday 8–9:30 am and Sunday 9–11 am; beginners and competitive boxers.'],
        ['circuit', 'Berry’s Circuit', 1000, 'Monday and Wednesday 6:30–8 pm, Saturday 8–9:30 am.'],
        ['learn-to-box', 'Learn to Box Properly', 2000, 'Tuesdays 6:30–7:30 pm (arrive by 6:20); your first class is free.'],
      ] as const
    ).map(([key, label, cents, note]) =>
      offer(
        'leo-berrys-gym-richmond',
        key,
        {
          productType: 'class_only',
          label,
          baseAmountMinor: cents,
          grantsGymFloorAccess: 'unknown',
          inclusions: ['One session'],
          eligibility: {
            localResidentOnly: 'no',
            memberGuestOnly: 'no',
            firstTimeVisitorOnly: 'no',
            membershipRequired: 'no',
            photoIdRequired: 'unknown',
            minAgeYears: null,
            notes: [note],
          },
        },
        octoberCopy('https://richmondboxing.com.au/', "Gym's website: home page"),
      ),
    ),
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
