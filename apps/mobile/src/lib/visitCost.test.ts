import { describe, expect, it } from 'vitest';
import type { Collection, GymRecord, VisitOffer } from '@gymgo/domain';
import { comparePrices } from './priceWatch';
import type { TrainingSession } from './training';
import { breakEvenVisits, compareLine, spendReports, spentIn, totals, visitDays, visitPrice, type Spend } from './visitCost';

const offer = (over: Partial<VisitOffer> = {}): VisitOffer =>
  ({
    id: 'casual',
    gymId: 'g1',
    productType: 'casual_gym_visit',
    label: 'Casual visit',
    currency: 'AUD',
    baseAmountMinor: 2000,
    taxIncluded: true,
    taxAmountMinor: null,
    mandatoryCharges: [],
    refundableDeposits: [],
    grantsGymFloorAccess: 'yes',
    inclusions: [],
    durationMinutes: null,
    validityDays: 1,
    eligibility: { localResidentOnly: 'no', memberGuestOnly: 'no', firstTimeVisitorOnly: 'no', membershipRequired: 'no', photoIdRequired: 'no', minAgeYears: null, notes: [] },
    purchaseMethod: 'at_reception',
    availableFrom: null,
    availableUntil: null,
    membershipTerms: null,
    provenance: { status: 'verified', sources: [{ id: 's', sourceType: 'operator_website', evidenceRef: null, label: 'Club price list', observedAt: '2026-10-12T00:00:00Z', checkedAt: '2026-10-12T00:00:00Z' }] },
    ...over,
  }) as VisitOffer;
const record = (offers: VisitOffer[], id = 'g1', name = 'Doherty’s Gym'): GymRecord => ({ location: { id, name }, offers }) as unknown as GymRecord;

const membership = (over: Partial<Spend> = {}): Spend => ({
  id: 'm',
  gymId: 'g1',
  gymName: 'Doherty’s Gym',
  kind: 'membership',
  label: 'Membership',
  amountMinor: 2000,
  currency: 'AUD',
  every: 'week',
  startedOn: '2026-09-01',
  endedOn: null,
  ...over,
});
const collection = (days: string[], id = 'g1'): Collection =>
  ({ [id]: { id, name: 'Doherty’s Gym', suburb: '', city: '', countryCode: 'AU', brand: null, days, firstAt: '', lastAt: '' } }) as Collection;
const workoutAt = (gymId: string | null, finishedAt: string): TrainingSession => ({ id: finishedAt, name: 'W', unit: 'kg', startedAt: finishedAt, finishedAt, workoutId: null, gymId, exercises: [] });

describe('visits', () => {
  it('counts check-ins and workouts logged at the gym, each day once', () => {
    const days = visitDays(collection(['2026-10-01', '2026-10-03']), [workoutAt('g1', '2026-10-03T08:00:00'), workoutAt('g1', '2026-10-05T08:00:00'), workoutAt('other', '2026-10-06T08:00:00'), workoutAt(null, '2026-10-07T08:00:00')], 'g1');
    expect(days).toEqual(['2026-10-01', '2026-10-03', '2026-10-05']);
  });

  it('counts every gym for a spend that covers any', () => {
    expect(visitDays({ ...collection(['2026-10-01']), ...collection(['2026-10-02'], 'g2') }, [], null)).toEqual(['2026-10-01', '2026-10-02']);
  });
});

describe('what it cost', () => {
  it('charges a membership by the day, inside when it ran', () => {
    // A$20 a week over 14 days is A$40.
    expect(spentIn(membership(), '2026-10-01', '2026-10-14')).toBe(4000);
    // Started part-way through: only from then.
    expect(spentIn(membership({ startedOn: '2026-10-08' }), '2026-10-01', '2026-10-14')).toBe(2000);
    // Ended: nothing after.
    expect(spentIn(membership({ endedOn: '2026-10-07' }), '2026-10-01', '2026-10-14')).toBe(2000);
    expect(spentIn(membership({ startedOn: '2026-11-01' }), '2026-10-01', '2026-10-14')).toBe(0);
  });

  it('counts something paid once in the period it was paid', () => {
    const pass = membership({ kind: 'once', every: null, amountMinor: 15000, startedOn: '2026-10-05', label: '10-visit pass' });
    expect(spentIn(pass, '2026-10-01', '2026-10-30')).toBe(15000);
    expect(spentIn(pass, '2026-10-06', '2026-10-30')).toBe(0);
  });

  it('gives a cost per visit, and none before a visit', () => {
    const reports = spendReports([membership()], collection(['2026-10-20', '2026-10-25', '2026-10-28', '2026-10-30']), [], '2026-10-30', 28);
    expect(reports[0]).toMatchObject({ spentMinor: 8000, visits: 4, perVisitMinor: 2000 });
    expect(spendReports([membership()], {}, [], '2026-10-30', 28)[0]!.perVisitMinor).toBeNull();
  });

  it('counts a visit once in the totals, even when two things you pay cover it', () => {
    // A membership at the gym, and a pass that covers any gym: the same two visits, not four.
    const pass = membership({ id: 'p', gymId: null, gymName: null, kind: 'once', label: '10-visit pass', amountMinor: 15000, every: null, startedOn: '2026-10-10' });
    const reports = spendReports([membership(), pass], collection(['2026-10-25', '2026-10-28']), [], '2026-10-30', 28);
    expect(reports.map((report) => report.visits)).toEqual([2, 2]);
    expect(totals(reports)[0]).toMatchObject({ currency: 'AUD', visits: 2, spentMinor: 8000 + 15000, perVisitMinor: 11500 });
  });

  it('never adds different currencies together', () => {
    const reports = spendReports([membership(), membership({ id: 'n', currency: 'USD', gymId: 'g2' })], collection(['2026-10-30']), [], '2026-10-30', 7);
    expect(totals(reports).map((total) => total.currency)).toEqual(['AUD', 'USD']);
  });
});

describe('against paying each time', () => {
  it('uses the gym’s own cheapest one-visit price for the gym floor, with its source', () => {
    const price = visitPrice(record([offer({ id: 'day', label: 'Day pass', baseAmountMinor: 2500 }), offer()]), 'AUD', '2026-11-02');
    expect(price).toMatchObject({ amountMinor: 2000, label: 'Casual visit', sourceLabel: 'Club price list', checkedAt: '2026-10-12T00:00:00Z', stale: false });
    // Checked long ago: still the gym's price, said to be one to confirm.
    const old = visitPrice(record([offer()]), 'AUD', '2027-06-01')!;
    expect(old.stale).toBe(true);
    expect(compareLine(membership(), old, 1, () => '12 Oct 2026')).toContain('checked 12 Oct 2026; to confirm)');
  });

  it('has no price, never $0, when the gym doesn’t publish one it charges', () => {
    expect(visitPrice(record([offer({ baseAmountMinor: null })]), 'AUD', '2026-11-02')).toBeNull();
    expect(visitPrice(record([offer({ priceBasis: 'from' })]), 'AUD', '2026-11-02')).toBeNull();
    expect(visitPrice(record([offer({ grantsGymFloorAccess: 'no' })]), 'AUD', '2026-11-02')).toBeNull();
    expect(visitPrice(record([offer({ productType: 'trial' })]), 'AUD', '2026-11-02')).toBeNull();
    expect(visitPrice(record([offer({ currency: 'USD' })]), 'AUD', '2026-11-02')).toBeNull();
    expect(visitPrice(record([offer({ availableUntil: '2026-10-01' })]), 'AUD', '2026-11-02')).toBeNull();
    expect(visitPrice(record([offer({ provenance: { status: 'unknown', sources: [] } })]), 'AUD', '2026-11-02')).toBeNull();
  });

  it('says from how many visits the membership pays off, and how it went', () => {
    expect(breakEvenVisits(8571, 2000)).toBe(5);
    const price = visitPrice(record([offer()]), 'AUD', '2026-11-02');
    const line = compareLine(membership(), price, 7, () => '12 Oct 2026')!;
    expect(line).toContain('Casual visit here is A$20 (Club price list, checked 12 Oct 2026)');
    expect(line).toContain('pays off from 5 visits');
    expect(line).toContain('the membership was the better deal');
    const few = compareLine(membership(), price, 2, () => '12 Oct 2026')!;
    expect(few).toContain('paying each time would have cost A$40');
    expect(compareLine(membership(), null, 2, () => '')).toContain('doesn’t publish a visit price');
    expect(compareLine(membership({ kind: 'once', every: null }), price, 2, () => '')).toBeNull();
  });
});

describe('price changes at saved gyms', () => {
  it('only remembers a gym’s prices the first time', () => {
    const first = comparePrices(['g1'], [record([offer()])], {});
    expect(first.changes).toEqual([]);
    expect(first.seen.g1).toEqual([{ offerId: 'casual', label: 'Casual visit', amountMinor: 2000, currency: 'AUD' }]);
  });

  it('notes a new price with the old one, its source and when it was checked', () => {
    const { seen } = comparePrices(['g1'], [record([offer()])], {});
    const later = comparePrices(['g1'], [record([offer({ baseAmountMinor: 2200 })])], seen);
    expect(later.changes).toEqual([
      expect.objectContaining({ gymName: 'Doherty’s Gym', label: 'Casual visit', before: { amountMinor: 2000, currency: 'AUD' }, after: { amountMinor: 2200, currency: 'AUD' }, sourceLabel: 'Club price list', checkedAt: '2026-10-12T00:00:00Z' }),
    ]);
    expect(later.seen.g1![0]!.amountMinor).toBe(2200);
    // Seen again with no change: no note.
    expect(comparePrices(['g1'], [record([offer({ baseAmountMinor: 2200 })])], later.seen).changes).toEqual([]);
  });

  it('says a price is no longer published, and a new one is newly published', () => {
    const { seen } = comparePrices(['g1'], [record([offer()])], {});
    const gone = comparePrices(['g1'], [record([offer({ baseAmountMinor: null }), offer({ id: 'day', label: 'Day pass', baseAmountMinor: 3000 })])], seen);
    expect(gone.changes.find((change) => change.label === 'Casual visit')).toMatchObject({ after: null });
    expect(gone.changes.find((change) => change.label === 'Day pass')).toMatchObject({ before: null, after: { amountMinor: 3000 } });
  });

  it('keeps a saved gym not loaded this time, and forgets one no longer saved', () => {
    const { seen } = comparePrices(['g1', 'g2'], [record([offer()]), record([offer()], 'g2', 'Other')], {});
    const next = comparePrices(['g1'], [], seen);
    expect(Object.keys(next.seen)).toEqual(['g1']);
  });
});
