/**
 * Membership tiers that a chain publishes for every one of its clubs, so
 * they can be shown at each branch the map or the operator lists.
 *
 * Only chains whose own site gives one price table for all clubs are here
 * (read on 30 September 2026 through a web search's copy of each page: the
 * sites couldn't be opened directly from where the research ran). Chains
 * that let each club set its price (Anytime Fitness, Snap Fitness, Jetts,
 * Plus Fitness, Fitness First, F45…) are left out: a "from" price isn't what
 * that club charges. Promotions (first weeks free, no joining fee "today")
 * aren't treated as the price. See docs/research/prices-2026-09-30.md.
 */

import type { EvidenceSource, VisitOffer } from '@gymgo/domain';

export const CHAIN_PRICES_READ = '2026-09-30T04:00:00.000Z';

interface Tier {
  key: string;
  label: string;
  /** The amount taken each billing interval, in cents. */
  amountMinor: number;
  intervalDays: number;
  joiningFeeMinor: number | null;
  minimumTermDays: number | null;
  cancellationNoticeDays: number | null;
  inclusions: string[];
  notes: string[];
}

interface Chain {
  /** Does this map or operator row belong to the chain? */
  matches: (row: { name: string; brand?: string; state: string }) => boolean;
  source: { url: string; label: string };
  tiers: (state: string) => Tier[];
}

const weekly = (key: string, label: string, cents: number, extra: Partial<Tier> = {}): Tier => ({
  key,
  label,
  amountMinor: cents,
  intervalDays: 7,
  joiningFeeMinor: null,
  minimumTermDays: null,
  cancellationNoticeDays: null,
  inclusions: ['Gym floor'],
  notes: [],
  ...extra,
});

const CHAINS: Chain[] = [
  {
    // "Level One Membership: $9.69 per week, debited at $42.00 per month";
    // "Level Two membership is $12.69 per week, debited at $55.00 per month";
    // no joining fee. Its terms set one fee table for "all Revo Fitness Facilities".
    matches: (row) => row.brand === 'Revo Fitness' || /^Revo Fitness\b/.test(row.name),
    source: { url: 'https://revofitness.com.au/memberships/', label: 'Revo Fitness website: memberships' },
    tiers: () => [
      {
        key: 'level-one',
        label: 'Level One',
        amountMinor: 4200,
        intervalDays: 30,
        joiningFeeMinor: 0,
        minimumTermDays: null,
        cancellationNoticeDays: null,
        inclusions: ['Gym floor', 'Every Revo club'],
        notes: ['Advertised as $9.69 a week, debited at $42.00 a month.', 'Paying by card can add a processing fee to each payment.'],
      },
      {
        key: 'level-two',
        label: 'Level Two',
        amountMinor: 5500,
        intervalDays: 30,
        joiningFeeMinor: 0,
        minimumTermDays: null,
        cancellationNoticeDays: null,
        inclusions: ['Gym floor', 'Every Revo club', 'Level Two extras'],
        notes: ['Advertised as $12.69 a week, debited at $55.00 a month.', 'Paying by card can add a processing fee to each payment.'],
      },
    ],
  },
  {
    // Passport (every club): "12 month: $13.59 a week", "18 month: $11.19 a
    // week", "12 month: $11.99 (SOUTH AUSTRALIA ONLY)". Home (one club):
    // "12 month: $11.99 a week", "12 month: $10.39 (SOUTH AUSTRALIA ONLY)".
    // Its no-joining-fee offer is a promotion, so the fee stays unpublished.
    matches: (row) => row.brand === 'Zap Fitness' || /^Zap Fitness\b/.test(row.name),
    source: { url: 'https://www.zapfitness.com.au/memberships-pricing/', label: 'Zap Fitness website: membership pricing' },
    tiers: (state) => {
      const sa = state === 'SA';
      const year = { minimumTermDays: 365, notes: ['Price per week over a 12-month term.'] };
      return [
        weekly('home-12', 'Home, 12 months', sa ? 1039 : 1199, { ...year, inclusions: ['Gym floor', 'This club only'] }),
        weekly('passport-18', 'Passport, 18 months', 1119, {
          minimumTermDays: 548,
          inclusions: ['Gym floor', 'Every Zap club'],
          notes: ['Price per week over an 18-month term.'],
        }),
        weekly('passport-12', 'Passport, 12 months', sa ? 1199 : 1359, { ...year, inclusions: ['Gym floor', 'Every Zap club'] }),
      ];
    },
  },
  {
    // "From 1 April 2026, weekly Core memberships are $12.95 and Premium
    // memberships inclusive of Group fitness classes are $16.95." "Payments are
    // deducted each fortnight"; "$59 Establishment fee and $10 Debit Success
    // Fee" with the first payment; "30-day notice period for all cancellations".
    matches: (row) => row.brand === 'Derrimut 24:7 Gym' || /^Derrimut 24:7\b/.test(row.name),
    source: { url: 'https://www.derrimut247.com.au/pages/memberships', label: 'Derrimut 24:7 website: memberships' },
    tiers: () => {
      const terms = {
        joiningFeeMinor: 5900,
        cancellationNoticeDays: 30,
        notes: ['Debited each fortnight.', 'A $10 debit fee is added to the first payment.'],
      };
      return [
        weekly('core', 'Core', 1295, terms),
        weekly('premium', 'Premium', 1695, { ...terms, inclusions: ['Gym floor', 'Group fitness classes'] }),
      ];
    },
  },
];

/** The chain-wide membership tiers for a club, or none. */
export function chainOffersFor(gymId: string, row: { name: string; brand?: string; state: string }): VisitOffer[] {
  const chain = CHAINS.find((item) => item.matches(row));
  if (!chain) return [];
  const evidence: EvidenceSource = {
    id: `ev-chain-${gymId}`,
    sourceType: 'operator_website',
    evidenceRef: chain.source.url,
    label: `${chain.source.label} (one price table for every club; read via a web search's copy)`,
    observedAt: CHAIN_PRICES_READ,
    checkedAt: CHAIN_PRICES_READ,
    reviewerId: null,
  };
  return chain.tiers(row.state).map((tier) => ({
    id: `${gymId}-${tier.key}`,
    gymId,
    productType: 'membership',
    label: tier.label,
    currency: 'AUD',
    baseAmountMinor: tier.amountMinor,
    // Australian consumer prices are advertised including GST.
    taxIncluded: true,
    taxAmountMinor: null,
    mandatoryCharges: [],
    refundableDeposits: [],
    grantsGymFloorAccess: 'yes',
    inclusions: tier.inclusions,
    durationMinutes: null,
    validityDays: null,
    eligibility: {
      localResidentOnly: 'unknown',
      memberGuestOnly: 'unknown',
      firstTimeVisitorOnly: 'unknown',
      membershipRequired: 'no',
      photoIdRequired: 'unknown',
      minAgeYears: null,
      notes: [],
    },
    purchaseMethod: 'unknown',
    availableFrom: null,
    availableUntil: null,
    membershipTerms: {
      billingIntervalDays: tier.intervalDays,
      joiningFeeMinor: tier.joiningFeeMinor,
      accessCardFeeMinor: null,
      minimumTermDays: tier.minimumTermDays,
      cancellationNoticeDays: tier.cancellationNoticeDays,
      notes: tier.notes,
    },
    provenance: { status: 'owner_confirmed', sources: [evidence], conflictNote: null },
  }));
}
