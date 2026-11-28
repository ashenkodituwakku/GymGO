/**
 * Map-only gyms that GymGO looked up one at a time, on 11 October 2026: each
 * matched to its own website by name and address, and read through a web
 * search's copy of the gym's own pages (the sites couldn't be opened from
 * where the research ran). See docs/research/prices-2026-10-11.md.
 *
 * Only the gym's own site counts. Promotions and trials aren't treated as
 * the price, chain-wide "from" prices aren't used, and where a gym's own
 * pages disagree every such price is marked as disagreeing. Member hours
 * (when the doors are open) and staffed hours are kept apart; a gym's own
 * hours replace the map's.
 */

import type { AccessAudience, AccessSchedule, EvidenceSource, GymRecord, OpeningWindow, VisitOffer } from '@gymgo/domain';

export const RESEARCHED_AT = '2026-10-11T03:00:00.000Z';

interface Page {
  url: string;
  label: string;
}

interface Price {
  key: string;
  label: string;
  type: VisitOffer['productType'];
  cents: number | null;
  page: Page;
  /** Membership billing period in days; leave out for a visit or pass. */
  everyDays?: number;
  minimumDays?: number | null;
  joiningCents?: number | null;
  cardCents?: number | null;
  noticeDays?: number | null;
  validityDays?: number | null;
  inclusions?: string[];
  floor?: VisitOffer['grantsGymFloorAccess'];
  notes?: string[];
  /** Set when the gym's own pages give different prices for this. */
  disagreement?: string;
}

interface Hours {
  audience: AccessAudience;
  page: Page;
  /** Round the clock. */
  always?: boolean;
  /** [days (0 = Sunday), open, close] in minutes. */
  windows?: Array<[number[], number, number]>;
}

interface Researched {
  /** The gym's own page listing it: the gym is then shown as trading. */
  listed?: Page;
  /** Where the gym's own site gives a fuller or truer address than the map. */
  address?: { line1?: string; suburb?: string; postcode?: string };
  phone?: string;
  prices?: Price[];
  hours?: Hours[];
}

const h = (hour: number, minute = 0) => hour * 60 + minute;
const WEEKDAYS = [1, 2, 3, 4, 5];
const MON_THU = [1, 2, 3, 4];
const WEEKEND = [6, 0];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

// --- Melbourne ---------------------------------------------------------------

const NMBF_PRICES: Page = { url: 'https://www.boxing-fitness.com/pricing', label: "Gym's website: pricing" };
const NMBF_CONTACT: Page = { url: 'https://www.boxing-fitness.com/contact-us-five', label: "Gym's website: contact" };
const OLYMPIA: Page = { url: 'https://olympiagymnasium.com.au/contact-details/', label: "Gym's website: contact details" };
const GYM247: Page = { url: 'https://gym247.co/', label: "Gym's website: home page" };
const GYM247_MEMBERSHIPS: Page = { url: 'https://gym247.co/fitness-memberships/', label: "Gym's website: memberships" };
const GYM247_TRIAL: Page = { url: 'https://gym247.co/free-trial/', label: "Gym's website: free trial" };
const RETRO: Page = { url: 'https://gymretro.com.au/', label: "Gym's website: home page" };
const ALTIUS: Page = { url: 'https://www.altiusboxing.com.au/timetable', label: "Gym's website: timetable" };

// --- Sydney ------------------------------------------------------------------

const NSOP_CASUAL: Page = { url: 'https://northsydneyolympicpool.com.au/casual-entry/', label: "Venue's website: casual entry fees" };
const NSOP_MEMBERSHIPS: Page = { url: 'https://northsydneyolympicpool.com.au/memberships/', label: "Venue's website: memberships" };
const NSOP_VISIT: Page = { url: 'https://northsydneyolympicpool.com.au/visit-us/', label: "Venue's website: visit us" };
const ELOUERA: Page = { url: 'https://eloueratonymundinegym.com.au/membership/', label: "Gym's website: membership" };
const ELOUERA_CONTACT: Page = { url: 'https://eloueratonymundinegym.com.au/contact-us/', label: "Gym's website: contact" };
const FOXFIT: Page = { url: 'https://foxfit.com.au/pages/redfern-pricing', label: "Gym's website: Redfern pricing" };
const STEED: Page = { url: 'https://steedfitness.com.au/membership/', label: "Gym's website: memberships and casual passes" };
const STEED_CONTACT: Page = { url: 'https://steedfitness.com.au/Contact-Us/', label: "Gym's website: contact" };
const FORGE: Page = { url: 'https://forgegym.com.au/join', label: "Gym's website: join" };
const FORGE_HOME: Page = { url: 'https://forgegym.com.au/', label: "Gym's website: home page" };
const JNCC: Page = { url: 'https://www.cityofsydney.nsw.gov.au/community-centres/juanita-nielsen-community-centre', label: 'City of Sydney: Juanita Nielsen Community Centre' };

// --- Brisbane ----------------------------------------------------------------

const CORDELIA: Page = { url: 'https://sustainoncordelia.com.au/staffed-hours/', label: "Gym's website: staffed hours" };
const OXFORD: Page = { url: 'https://sustainonoxford.com.au/', label: "Gym's website: home page" };
const EASTSIDE_PRICES: Page = { url: 'https://www.eastsidegym.com.au/pricing/', label: "Gym's website: memberships" };
const EASTSIDE_TIMETABLE: Page = { url: 'https://www.eastsidegym.com.au/boxing-timetable/', label: "Gym's website: boxing timetable" };

const RESEARCHED: Record<string, Researched> = {
  'north-melbourne-boxing-and-fitness-centre-sutton-street-melbourne': {
    listed: NMBF_CONTACT,
    prices: [
      { key: 'casual', label: 'Casual gym session', type: 'casual_gym_visit', cents: 2500, page: NMBF_PRICES },
      { key: 'ten-visits', label: '10 visits', type: 'multi_day_pass', cents: 18500, validityDays: 91, page: NMBF_PRICES, notes: ['Valid for three months.'] },
      { key: 'one-month', label: '1 month up front', type: 'membership', cents: 18000, everyDays: 30, minimumDays: 30, page: NMBF_PRICES },
      { key: 'three-months', label: '3 months up front', type: 'membership', cents: 48000, everyDays: 91, minimumDays: 91, page: NMBF_PRICES },
      { key: 'debit-3', label: 'Monthly direct debit (3-month minimum)', type: 'membership', cents: 16000, everyDays: 30, minimumDays: 91, page: NMBF_PRICES, notes: ['Direct debit carries an administration fee.', 'Student rates are also listed.'] },
      { key: 'debit-6', label: 'Monthly direct debit (6-month minimum)', type: 'membership', cents: 13000, everyDays: 30, minimumDays: 182, page: NMBF_PRICES, notes: ['Direct debit carries an administration fee.'] },
    ],
    // Its home page also says it now opens Sundays 9 am–12 pm, and another page
    // has Saturday until 3 pm; only what every page agrees on is shown.
    hours: [{ audience: 'member', page: NMBF_CONTACT, windows: [[MON_THU, h(6, 30), h(20, 30)], [[5], h(6, 30), h(19, 30)], [[6], h(9), h(14)]] }],
  },
  'olympia-gymnasium-montague-street-melbourne': {
    listed: OLYMPIA,
    phone: '03 9696 3961',
    // "Open every day of the year": weekdays 6 am–10 pm, weekends and public holidays 8 am–7 pm.
    hours: [{ audience: 'member', page: OLYMPIA, windows: [[WEEKDAYS, h(6), h(22)], [WEEKEND, h(8), h(19)]] }],
  },
  'gym-24-7-richmond-victoria-street-melbourne': {
    listed: GYM247,
    prices: [
      {
        key: 'weekly',
        label: 'Membership',
        type: 'membership',
        cents: 1499,
        everyDays: 7,
        minimumDays: 0,
        joiningCents: 0,
        page: GYM247,
        notes: ['"No contract & no joining fee."'],
        disagreement: 'Its home page says $14.99 a week; its memberships page says $13.99. Check with the gym.',
      },
    ],
    hours: [
      { audience: 'member', page: GYM247, always: true },
      // Its home page says Mon–Thu 2–7 pm, its trial page 1–7 pm; the hours both give.
      { audience: 'staffed', page: GYM247_TRIAL, windows: [[MON_THU, h(14), h(19)], [WEEKEND, h(10), h(13)]] },
    ],
  },
  'gym-retro-albert-street-melbourne': {
    listed: RETRO,
    prices: [
      { key: 'weekly', label: 'Direct debit', type: 'membership', cents: 2300, everyDays: 7, joiningCents: 0, noticeDays: 30, page: RETRO, notes: ['Unlimited gym access.', 'Up to 30 days’ notice to cancel.'] },
    ],
    hours: [{ audience: 'member', page: RETRO, windows: [[EVERY_DAY, h(6), h(22)]] }],
  },
  'altius-boxing-gym-johnston-street-melbourne': {
    listed: ALTIUS,
    hours: [{ audience: 'member', page: ALTIUS, windows: [[MON_THU, h(6), h(9)], [MON_THU, h(16), h(20)], [[5], h(6), h(13)], [[6], h(10), h(13)]] }],
  },

  'north-sydney-gym-sydney': {
    listed: NSOP_VISIT,
    prices: [
      {
        key: 'casual',
        label: 'Casual gym entry',
        type: 'casual_gym_visit',
        cents: 3330,
        page: NSOP_CASUAL,
        inclusions: ['Gym floor', 'Standard group fitness classes'],
        notes: ['$25 with a pensioner, seniors or DVA card.', '10 visits $299.70, 20 visits $566.10.', 'Cashless.'],
      },
      { key: 'legends', label: 'Legends', type: 'membership', cents: 3700, everyDays: 7, joiningCents: 0, page: NSOP_MEMBERSHIPS, inclusions: ['Gym floor', 'Every pool'], notes: ['Billed fortnightly.', '"No joining fees, no cancellation fees."', 'Concession $27.75 a week.'] },
      { key: 'legends-plus', label: 'Legends Plus', type: 'membership', cents: 6500, everyDays: 7, joiningCents: 0, page: NSOP_MEMBERSHIPS, inclusions: ['Gym floor', 'Every pool', 'Unlimited Reformer Pilates'], notes: ['Billed fortnightly.'] },
    ],
    // Gym hours; its home page has weekends from 6 am rather than 7, so from 7 is shown.
    hours: [{ audience: 'member', page: NSOP_VISIT, windows: [[WEEKDAYS, h(5, 30), h(21, 30)], [WEEKEND, h(7), h(19)]] }],
  },
  'elouera-tony-mundine-gym-sydney': {
    listed: ELOUERA_CONTACT,
    address: { line1: '72–102 Eveleigh Street (corner of Caroline Street)', suburb: 'Redfern', postcode: '2016' },
    prices: [
      { key: 'casual', label: 'Casual visit', type: 'casual_gym_visit', cents: 2500, page: ELOUERA, notes: ['10 visits for $200.'] },
      { key: 'standard', label: 'Standard (12 months)', type: 'membership', cents: 2500, everyDays: 7, minimumDays: 365, joiningCents: 2000, cardCents: 2000, page: ELOUERA, inclusions: ['Gym floor', 'Every class', 'Sauna'] },
      { key: 'flexible', label: 'Flexible', type: 'membership', cents: 3495, everyDays: 7, minimumDays: 0, joiningCents: 2000, cardCents: 2000, page: ELOUERA, inclusions: ['Gym floor', 'Every class', 'Sauna'], notes: ['No lock-in; cancel any time.', 'Student and youth rates are sold in person.'] },
    ],
  },
  'foxfit-eveleigh-street-sydney': {
    listed: FOXFIT,
    address: { suburb: 'Redfern', postcode: '2016' },
    prices: (
      [
        ['three', '3 visits a week', 6000],
        ['five', '5 visits a week', 7000],
        ['unlimited', 'Unlimited', 8000],
      ] as const
    ).map(([key, label, cents]) => ({ key, label, type: 'membership' as const, cents, everyDays: 7, minimumDays: 28, page: FOXFIT, floor: 'unknown' as const, inclusions: [label], notes: ['A four-week minimum.'] })),
  },
  'steed-fitness-sydney': {
    listed: STEED_CONTACT,
    address: { line1: 'Suite 1, 36–42 Chippen Street', postcode: '2008' },
    phone: '0426 775 706',
    prices: [
      { key: 'off-peak', label: 'Off-peak', type: 'membership', cents: 2900, everyDays: 7, minimumDays: 0, joiningCents: 4900, page: STEED, inclusions: ['Gym floor: weekdays 8 am–5 pm, weekends all day', 'Chippendale and Milsons Point'] },
      { key: 'day', label: '1-day casual pass', type: 'day_pass', cents: null, page: STEED, notes: ['Bought online in advance; the price isn’t published.'] },
      { key: 'week', label: '1-week casual pass', type: 'week_pass', cents: null, validityDays: 7, page: STEED, notes: ['Bought online in advance; the price isn’t published.'] },
    ],
  },
  'forge-gym-sydney': {
    listed: FORGE_HOME,
    address: { line1: '134 Abercrombie Street', postcode: '2008' },
    phone: '0451 793 496',
    prices: [
      { key: 'membership', label: 'Membership', type: 'membership', cents: 9000, everyDays: 7, minimumDays: 0, joiningCents: 0, page: FORGE, floor: 'unknown', inclusions: ['Small-group sessions (12 at most)'], notes: ['No lock-in, no minimum term, no joining fee.', 'Open for scheduled sessions and coaching appointments only.'] },
    ],
  },
  'juanita-nielsen-community-centre-gym-sydney': {
    listed: JNCC,
    address: { line1: '31 Nicholson Street', postcode: '2011' },
    // The community centre's opening hours; closed Sundays and public holidays.
    hours: [{ audience: 'member', page: JNCC, windows: [[[1, 3, 5], h(7), h(18)], [[2, 4], h(9), h(18)], [[6], h(10), h(16)]] }],
  },

  'sustain-on-cordelia-cordelia-street-brisbane': {
    listed: CORDELIA,
    prices: [
      { key: 'casual', label: 'Casual visit', type: 'casual_gym_visit', cents: 1800, page: CORDELIA },
      { key: 'week', label: 'Unlimited visits for a week', type: 'week_pass', cents: 4500, validityDays: 7, page: CORDELIA },
    ],
    hours: [
      { audience: 'member', page: CORDELIA, always: true },
      { audience: 'staffed', page: CORDELIA, windows: [[[1, 3], h(12), h(14)], [MON_THU, h(16, 30), h(18, 30)], [[5], h(12), h(14)]] },
    ],
  },
  'sustain-on-oxford-24-7-gym-oxford-street-brisbane': {
    listed: OXFORD,
    // "24/7 Access". Its membership prices read ambiguously in the copy, so none are shown.
    hours: [{ audience: 'member', page: OXFORD, always: true }],
  },
  'eastside-boxing-gym-montague-road-brisbane': {
    listed: EASTSIDE_TIMETABLE,
    prices: [
      { key: 'adult', label: 'Adult membership', type: 'membership', cents: 4500, everyDays: 7, joiningCents: 0, page: EASTSIDE_PRICES, inclusions: ['Gym floor', 'Unlimited classes'], notes: ['Students $35 a week.'] },
      { key: 'ten-sessions', label: '10 sessions', type: 'multi_day_pass', cents: 20000, validityDays: null, page: EASTSIDE_PRICES, notes: ['Drop-ins are welcome; a single session’s price isn’t published.'] },
    ],
    hours: [{ audience: 'member', page: EASTSIDE_TIMETABLE, windows: [[EVERY_DAY, h(6), h(21)]] }],
  },
};

function evidence(gymId: string, page: Page): EvidenceSource {
  return {
    id: `ev-researched-${gymId}-${page.url.replace(/[^a-z0-9]+/gi, '-').slice(-40)}`,
    sourceType: 'operator_website',
    evidenceRef: page.url,
    label: `${page.label} (read via a web search's copy)`,
    observedAt: RESEARCHED_AT,
    checkedAt: RESEARCHED_AT,
    reviewerId: null,
  };
}

function toOffer(gymId: string, price: Price): VisitOffer {
  const membership = price.type === 'membership';
  return {
    id: `${gymId}-${price.key}`,
    gymId,
    productType: price.type,
    label: price.label,
    currency: 'AUD',
    baseAmountMinor: price.cents,
    // Australian consumer prices are advertised including GST.
    taxIncluded: true,
    taxAmountMinor: null,
    mandatoryCharges: [],
    refundableDeposits: [],
    grantsGymFloorAccess: price.floor ?? 'yes',
    inclusions: price.inclusions ?? ['Gym floor'],
    durationMinutes: null,
    validityDays: membership ? null : price.validityDays === undefined ? 1 : price.validityDays,
    eligibility: {
      localResidentOnly: membership ? 'unknown' : 'no',
      memberGuestOnly: membership ? 'unknown' : 'no',
      firstTimeVisitorOnly: membership ? 'unknown' : 'no',
      membershipRequired: 'no',
      photoIdRequired: 'unknown',
      minAgeYears: null,
      notes: membership ? [] : (price.notes ?? []),
    },
    purchaseMethod: 'unknown',
    availableFrom: null,
    availableUntil: null,
    membershipTerms: membership
      ? {
          billingIntervalDays: price.everyDays ?? 7,
          joiningFeeMinor: price.joiningCents ?? null,
          accessCardFeeMinor: price.cardCents ?? null,
          minimumTermDays: price.minimumDays ?? null,
          cancellationNoticeDays: price.noticeDays ?? null,
          notes: price.notes ?? [],
        }
      : null,
    provenance: {
      status: price.disagreement ? 'conflicting' : 'owner_confirmed',
      sources: [evidence(gymId, price.page)],
      conflictNote: price.disagreement ?? null,
    },
  };
}

function toSchedule(gymId: string, timezone: string, hours: Hours): AccessSchedule {
  const windows: OpeningWindow[] = hours.always
    ? EVERY_DAY.map((day) => ({ day, openMinute: 0, closeMinute: 1440 }))
    : (hours.windows ?? []).flatMap(([days, openMinute, closeMinute]) => days.map((day) => ({ day, openMinute, closeMinute })));
  return {
    id: `${gymId}-${hours.audience}`,
    gymId,
    audience: hours.audience,
    timezone,
    windows,
    exceptions: [],
    alwaysOpen: Boolean(hours.always),
    provenance: { status: 'owner_confirmed', sources: [evidence(gymId, hours.page)], conflictNote: null },
  };
}

/** A map-only record with what GymGO found on the gym's own site, if it looked it up. */
export function withResearch(record: GymRecord): GymRecord {
  const found = RESEARCHED[record.location.id];
  if (!found) return record;
  const { location } = record;
  const id = location.id;
  const ownHours = (found.hours ?? []).map((item) => toSchedule(id, location.timezone, item));
  const replaced = new Set(ownHours.map((item) => item.audience));
  return {
    ...record,
    location: {
      ...location,
      address: { ...location.address, ...found.address },
      phone: found.phone ?? location.phone,
      ...(found.listed ? { operatingStatus: 'open' as const, operatingStatusNote: null } : {}),
      provenance: found.listed || found.address ? { ...location.provenance, sources: [...location.provenance.sources, evidence(id, found.listed ?? found.prices?.[0]?.page ?? { url: location.website ?? '', label: "Gym's website" })] } : location.provenance,
    },
    offers: [...record.offers, ...(found.prices ?? []).map((price) => toOffer(id, price))],
    schedules: [...record.schedules.filter((item) => !replaced.has(item.audience)), ...ownHours],
  };
}

/** Which gyms were looked up (for tests and the research notes). */
export const RESEARCHED_IDS = Object.keys(RESEARCHED);
