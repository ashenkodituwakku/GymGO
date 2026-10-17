/**
 * What a franchise publishes for every one of its gyms, shown at each branch
 * the map has: that its clubs are open to members round the clock, and its
 * prices. Read on 11 October 2026 through a web search's copy of each
 * chain's own pages (the sites couldn't be opened from where the research
 * ran). See docs/research/chains-2026-10-11.md.
 *
 * A chain that lets each club set its price is shown with `priceBasis`
 * `from` (its lowest published price) or `recommended` (its recommended
 * price), and the gym page says the club may charge more. Promotions aren't
 * treated as prices. Hours are only "open 24/7 to members" where the chain
 * says every club is; staffed and visitor hours stay unknown.
 *
 * Matching is by the map's brand tag, else the gym's name, and by country:
 * a fact read on a chain's Australian site applies only in Australia.
 */

import type { AccessSchedule, EvidenceSource, VisitOffer } from '@gymgo/domain';

export const CHAINS_READ = '2026-10-11T03:00:00.000Z';

interface ChainPrice {
  key: string;
  label: string;
  type: VisitOffer['productType'];
  cents: number;
  currency: string;
  basis?: VisitOffer['priceBasis'];
  /** Billing period for a membership. */
  everyDays?: number;
  minimumDays?: number | null;
  joiningCents?: number | null;
  cardCents?: number | null;
  noticeDays?: number | null;
  inclusions?: string[];
  notes?: string[];
  memberGuestOnly?: 'yes' | 'no' | 'unknown';
  /** Where the chain's own pages give a different figure. */
  disagreement?: string;
}

interface Chain {
  name: string;
  /** The chain's name as a brand tag or at the start of a gym's name. */
  pattern: RegExp;
  /** Countries (ISO alpha-2) these facts were read for. */
  countries: string[];
  source: { url: string; label: string };
  open247?: { url: string; label: string };
  prices?: ChainPrice[];
  /** Branches that don't take these prices (a premium club with its own). */
  except?: RegExp;
}

const AUD = 'AUD';

const CHAINS: Chain[] = [
  {
    name: 'Anytime Fitness',
    pattern: /^anytime fitness\b/i,
    countries: ['AU'],
    // "As of 1 July 2024, the Recommended Retail Price of a 12-month Standard
    // Agreement was $24.95 per week"; "Initial Joining Fee: Metropolitan Clubs
    // $99.00"; access card $89. Clubs set their own ("starting from $21.95"
    // to "$26.95" on club pages).
    source: { url: 'https://www.anytimefitness.com.au/terms-and-conditions/', label: 'Anytime Fitness Australia: terms and conditions' },
    prices: [
      {
        key: 'chain-12-months',
        label: '12-month standard',
        type: 'membership',
        cents: 2495,
        currency: AUD,
        basis: 'recommended',
        everyDays: 7,
        minimumDays: 365,
        joiningCents: null,
        cardCents: null,
        notes: ['Anytime Fitness’s recommended price; each club sets its own (club pages show about $22–$27 a week).', 'Joining fee up to $99 at metropolitan clubs, plus an $89 access card.'],
      },
    ],
  },
  {
    name: 'Anytime Fitness',
    pattern: /^anytime fitness\b/i,
    countries: [],
    // "Open 24/7 for your convenience"; members' key fobs open every club.
    source: { url: 'https://www.anytimefitness.com/blog/getting-started-at-anytime-fitness-our-guide-to-making-healthy-happen', label: 'Anytime Fitness: getting started' },
    open247: { url: 'https://www.anytimefitness.com/blog/getting-started-at-anytime-fitness-our-guide-to-making-healthy-happen', label: 'Anytime Fitness: open 24/7 to members' },
  },
  {
    name: 'Snap Fitness',
    pattern: /^snap fitness\b/i,
    countries: ['AU'],
    // Every club page: "24/7 Gym"; prices and day passes ($10–$25) are set club by club.
    source: { url: 'https://www.snapfitness.com/au/member-faqs', label: 'Snap Fitness Australia: member FAQs' },
    open247: { url: 'https://www.snapfitness.com/au', label: 'Snap Fitness Australia: 24/7 gyms' },
  },
  {
    name: 'Jetts',
    pattern: /^jetts\b/i,
    countries: ['AU'],
    // "Weekly Freedom Membership is $16.95 [or $18.95, $19.95, by club], based
    // on recurring fortnightly direct debit"; access card "up to $89"; some
    // clubs a joining fee "up to $79"; no lock-in; 24/7 access.
    source: { url: 'https://www.jetts.com.au/terms-and-conditions', label: 'Jetts: terms and conditions' },
    open247: { url: 'https://www.jetts.com.au/', label: 'Jetts: 24/7 access' },
    prices: [
      {
        key: 'chain-freedom',
        label: 'Freedom',
        type: 'membership',
        cents: 1695,
        currency: AUD,
        basis: 'from',
        everyDays: 7,
        minimumDays: 0,
        notes: ['$16.95, $18.95 or $19.95 a week depending on the club, debited fortnightly.', 'Access card up to $89; some clubs charge a joining fee of up to $79.', 'No lock-in; every Jetts club in Australia.'],
      },
    ],
  },
  {
    name: 'Fitness First',
    pattern: /^fitness first\b/i,
    countries: ['AU'],
    // FAQ: a visiting friend "for a nominal fee: $32 per visit to Barangaroo
    // Titanium and $25 per visit to any other club, during staffed hours only".
    source: { url: 'https://www.fitnessfirst.com.au/faq/', label: 'Fitness First Australia: FAQ' },
    except: /barangaroo/i,
    prices: [
      {
        key: 'chain-visit',
        label: 'Visit with a member',
        type: 'casual_gym_visit',
        cents: 2500,
        currency: AUD,
        memberGuestOnly: 'yes',
        notes: ['For a member’s visiting friend, during staffed hours only.', 'Fitness First also offers first-timers a free introductory pass.'],
      },
    ],
  },
  {
    name: 'Planet Fitness',
    pattern: /^planet fitness\b/i,
    countries: ['US'],
    // "Classic memberships regularly begin at $15, and PF Black Card
    // memberships regularly begin at $24.99"; an annual fee of up to $59.
    source: { url: 'https://www.planetfitness.com/newsroom/news/planet-fitness-membership', label: 'Planet Fitness: membership' },
    prices: [
      { key: 'chain-classic', label: 'Classic', type: 'membership', cents: 1500, currency: 'USD', basis: 'from', everyDays: 30, inclusions: ['Gym floor', 'Your home club'], notes: ['An annual fee of up to $59; some memberships have a 12-month commitment.', 'Prices vary by club; taxes may apply.'] },
      { key: 'chain-black-card', label: 'PF Black Card', type: 'membership', cents: 2499, currency: 'USD', basis: 'from', everyDays: 30, inclusions: ['Gym floor', 'Every Planet Fitness club'], notes: ['An annual fee of up to $59.', 'Prices vary by club; taxes may apply.'] },
    ],
  },
  {
    name: 'Crunch Fitness',
    pattern: /^crunch( fitness)?\b/i,
    countries: ['US'],
    source: { url: 'https://www.crunch.com/thehub/what-is-the-cheapest-gym-membership-our-honest-breakdown-of-the-top-4/', label: 'Crunch: membership prices' },
    prices: [{ key: 'chain-base', label: 'Base', type: 'membership', cents: 999, currency: 'USD', basis: 'from', everyDays: 30, notes: ['Peak and Peak Results cost more; prices vary by club.'] }],
  },
  {
    name: 'EōS Fitness',
    pattern: /^e[oō]s fitness\b/i,
    countries: ['US'],
    source: { url: 'https://www.eosfitness.com/memberships', label: 'EōS Fitness: memberships' },
    prices: [{ key: 'chain-will-do', label: 'Will Do', type: 'membership', cents: 999, currency: 'USD', basis: 'from', everyDays: 30, notes: ['A $59.99 annual fee may apply; a $2.99 processing fee unless paid by bank transfer.', 'Lux and Landmark clubs start higher.'] }],
  },
  {
    name: 'McFit',
    pattern: /^mcfit\b/i,
    countries: ['DE'],
    // "Standard 12 Monate 29,90 € mtl.", "24 Monate 24,90 €", "Premium 39,90 €";
    // a one-off 39 € sign-up fee and a 15 € service fee twice a year.
    source: { url: 'https://www.mcfit.com/mitgliedschaft', label: 'McFIT: Mitgliedschaft' },
    prices: [
      { key: 'chain-standard-24', label: 'Standard, 24 months', type: 'membership', cents: 2490, currency: 'EUR', everyDays: 30, minimumDays: 730, joiningCents: 3900, notes: ['A 15 € service fee twice a year.'] },
      { key: 'chain-standard-12', label: 'Standard, 12 months', type: 'membership', cents: 2990, currency: 'EUR', everyDays: 30, minimumDays: 365, joiningCents: 3900, notes: ['A 15 € service fee twice a year.'] },
      { key: 'chain-premium', label: 'Premium', type: 'membership', cents: 3990, currency: 'EUR', everyDays: 30, minimumDays: 365, joiningCents: 3900, notes: ['A 15 € service fee twice a year.'] },
    ],
  },
  {
    name: 'Basic-Fit',
    pattern: /^basic[- ]fit\b/i,
    countries: ['FR'],
    source: { url: 'https://www.basic-fit.com/fr-fr/prix', label: 'Basic-Fit France: prix et abonnements' },
    prices: [
      { key: 'chain-comfort', label: 'Comfort', type: 'membership', cents: 2499, currency: 'EUR', basis: 'from', everyDays: 28, minimumDays: 365, joiningCents: 1999, notes: ['With a year’s commitment; the price page also shows €34.98 every 4 weeks.', 'Billed every four weeks.'] },
      { key: 'chain-premium', label: 'Premium', type: 'membership', cents: 2999, currency: 'EUR', basis: 'from', everyDays: 28, minimumDays: 365, joiningCents: 1999, inclusions: ['Gym floor', 'Every Basic-Fit club in Europe'], notes: ['With a year’s commitment; the price page also shows €39.98 every 4 weeks.', 'A friend free once a week.'] },
    ],
  },
  {
    name: 'SportCity',
    pattern: /^sportcity\b/i,
    countries: ['NL'],
    source: { url: 'https://www.sportcity.nl/lidmaatschap', label: 'SportCity: lidmaatschap' },
    prices: [{ key: 'chain-city-one', label: 'City One', type: 'membership', cents: 2799, currency: 'EUR', basis: 'from', everyDays: 28, notes: ['Prices differ by club (one club charges €52.99).', 'Billed every four weeks; flexible, 4-month, 1-year and 2-year terms.'] }],
  },
  {
    name: 'Fitness24Seven',
    pattern: /^fitness ?24 ?seven\b/i,
    countries: ['SE'],
    // "299 kr/mån", "startavgift 249 kr", no binding period, two months' notice;
    // "Öppet dygnet runt" at every gym.
    source: { url: 'https://se.fitness24seven.com/medlemskap/vara-medlemskap/', label: 'Fitness24Seven: våra medlemskap' },
    open247: { url: 'https://se.fitness24seven.com/detta-ingar-i-ditt-medlemskap/', label: 'Fitness24Seven: open round the clock' },
    prices: [
      {
        key: 'chain-standard',
        label: 'Membership',
        type: 'membership',
        cents: 29900,
        currency: 'SEK',
        everyDays: 30,
        minimumDays: 0,
        joiningCents: 24900,
        noticeDays: 60,
        inclusions: ['Gym floor', 'Group training'],
        notes: ['Students and pensioners 269 kr.', 'Two months’ notice plus the rest of the month.'],
        disagreement: 'Its membership page says 299 kr a month; its home page shows 229 kr. Check with the gym.',
      },
    ],
  },
  {
    name: 'PureGym',
    pattern: /^pure ?gym\b/i,
    countries: ['GB'],
    source: { url: 'https://www.puregym.com/membership-options/', label: 'PureGym: membership options' },
    prices: [
      { key: 'chain-off-peak', label: 'Off-Peak', type: 'membership', cents: 1799, currency: 'GBP', basis: 'from', everyDays: 30, minimumDays: 0, notes: ['Plus a joining fee (from £10); prices vary by gym.', 'No contract.'] },
      { key: 'chain-core', label: 'Core', type: 'membership', cents: 2299, currency: 'GBP', basis: 'from', everyDays: 30, minimumDays: 0, notes: ['Plus a joining fee (from £10); prices vary by gym.'] },
      { key: 'chain-plus', label: 'Plus', type: 'membership', cents: 2899, currency: 'GBP', basis: 'from', everyDays: 30, minimumDays: 0, notes: ['Plus a joining fee (from £10); prices vary by gym.'] },
    ],
  },
  {
    name: 'Activ Fitness',
    pattern: /^activ ?fitness\b/i,
    countries: ['CH'],
    // Category 1 to 3 by studio: CHF 54, 70 or 80 a month on 12 months (CHF 70
    // admin fee), or CHF 599, 799 or 899 a year up front.
    source: { url: 'https://www.activfitness.ch/en/subscription-configurator/', label: 'Activ Fitness: subscription finder' },
    prices: [
      { key: 'chain-monthly', label: '12 months, paid monthly', type: 'membership', cents: 5400, currency: 'CHF', basis: 'from', everyDays: 30, minimumDays: 365, joiningCents: 7000, notes: ['CHF 54, 70 or 80 a month by the studio’s category.', 'The CHF 70 is an administration fee.'] },
      { key: 'chain-yearly', label: '1 year up front', type: 'membership', cents: 59900, currency: 'CHF', basis: 'from', everyDays: 365, minimumDays: 365, notes: ['CHF 599, 799 or 899 a year by the studio’s category.'] },
    ],
  },
];

export interface ChainFacts {
  offers: VisitOffer[];
  /** Members' round-the-clock access, from the chain. */
  open247: AccessSchedule | null;
}

function evidence(gymId: string, page: { url: string; label: string }): EvidenceSource {
  return {
    id: `ev-chain-${gymId}-${page.url.replace(/[^a-z0-9]+/gi, '-').slice(-40)}`,
    sourceType: 'operator_website',
    evidenceRef: page.url,
    label: `${page.label} (the chain's own page, for every club; read via a web search's copy)`,
    observedAt: CHAINS_READ,
    checkedAt: CHAINS_READ,
    reviewerId: null,
  };
}

function offerFor(gymId: string, chain: Chain, price: ChainPrice): VisitOffer {
  const membership = price.type === 'membership';
  return {
    id: `${gymId}-${price.key}`,
    gymId,
    productType: price.type,
    label: price.label,
    currency: price.currency,
    baseAmountMinor: price.cents,
    taxIncluded: price.currency !== 'USD',
    taxAmountMinor: null,
    mandatoryCharges: [],
    refundableDeposits: [],
    grantsGymFloorAccess: 'yes',
    inclusions: price.inclusions ?? ['Gym floor'],
    durationMinutes: null,
    validityDays: membership ? null : 1,
    eligibility: {
      localResidentOnly: membership ? 'unknown' : 'no',
      memberGuestOnly: price.memberGuestOnly ?? (membership ? 'unknown' : 'no'),
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
          billingIntervalDays: price.everyDays ?? 30,
          joiningFeeMinor: price.joiningCents ?? null,
          accessCardFeeMinor: price.cardCents ?? null,
          minimumTermDays: price.minimumDays ?? null,
          cancellationNoticeDays: price.noticeDays ?? null,
          notes: price.notes ?? [],
        }
      : null,
    ...(price.basis ? { priceBasis: price.basis } : {}),
    provenance: {
      status: price.disagreement ? 'conflicting' : 'owner_confirmed',
      sources: [evidence(gymId, chain.source)],
      conflictNote: price.disagreement ?? null,
    },
  };
}

/** Does this gym belong to the chain, in a country the chain's facts cover? */
function belongs(chain: Chain, gym: { name: string; brand?: string; branch?: string }, country: string): boolean {
  if (chain.countries.length > 0 && !chain.countries.includes(country)) return false;
  if (chain.except && (chain.except.test(gym.name) || chain.except.test(gym.branch ?? ''))) return false;
  return chain.pattern.test(gym.brand ?? '') || chain.pattern.test(gym.name);
}

/** What the gym's franchise publishes for all its gyms, or nothing. */
export function chainFactsFor(gym: { id: string; name: string; brand?: string; branch?: string }, country: string, timezone: string): ChainFacts {
  const offers: VisitOffer[] = [];
  let open247: AccessSchedule | null = null;
  for (const chain of CHAINS) {
    if (!belongs(chain, gym, country)) continue;
    for (const price of chain.prices ?? []) offers.push(offerFor(gym.id, chain, price));
    if (chain.open247 && !open247) {
      open247 = {
        id: `${gym.id}-member`,
        gymId: gym.id,
        audience: 'member',
        timezone,
        windows: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, openMinute: 0, closeMinute: 1440 })),
        exceptions: [],
        alwaysOpen: true,
        provenance: { status: 'owner_confirmed', sources: [evidence(gym.id, chain.open247)], conflictNote: null },
      };
    }
  }
  return { offers, open247 };
}

/** Is this evidence a chain's own page, cited for every club (not the map, not this gym)? */
export function isChainEvidence(source: EvidenceSource): boolean {
  return source.sourceType === 'operator_website' && source.checkedAt === CHAINS_READ && source.id.startsWith('ev-chain-');
}

/** The chains and the countries their facts cover (for tests and the research notes). */
export const CHAIN_NAMES = CHAINS.map((chain) => ({ name: chain.name, countries: chain.countries }));
