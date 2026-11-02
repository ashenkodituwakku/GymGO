/**
 * Cost per visit: what you pay (you enter it: a membership, or a pass paid
 * once), set against your visits, from check-ins and workouts logged at a
 * gym. And when a membership beats paying per visit, from the gym's own
 * published day-pass or casual price.
 *
 * Only prices you entered or the gym publishes are used. A gym that doesn't
 * publish a visit price gets no comparison: unknown is never $0.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { assessFreshness, computeCost, isOfferExpired, isSingleVisitProduct, priceLabel, type Collection, type GymRecord } from '@gymgo/domain';
import type { TrainingSession } from './training';

export type Every = 'week' | 'fortnight' | 'month' | 'year';
export const EVERY: Array<{ id: Every; label: string; days: number }> = [
  { id: 'week', label: 'a week', days: 7 },
  { id: 'fortnight', label: 'a fortnight', days: 14 },
  { id: 'month', label: 'a month', days: 365.25 / 12 },
  { id: 'year', label: 'a year', days: 365.25 },
];
const daysOf = (every: Every) => EVERY.find((entry) => entry.id === every)!.days;

/** Something you pay, as you entered it. */
export interface Spend {
  id: string;
  /** The gym it's for; null for one that covers any gym (a chain's, say), which counts every visit. */
  gymId: string | null;
  gymName: string | null;
  /** A membership charged every so often, or something paid once (a 10-visit pass). */
  kind: 'membership' | 'once';
  /** What it's called, yours: "Membership", "10-visit pass". */
  label: string;
  amountMinor: number;
  currency: string;
  /** A membership's billing period. */
  every: Every | null;
  /** YYYY-MM-DD: when it started, or (paid once) the day you paid. */
  startedOn: string;
  /** YYYY-MM-DD: when a membership ended; null while it's going. */
  endedOn: string | null;
}

// --- Days --------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const at = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
};
const key = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** Days from `from` to `to`, both counted. */
const span = (from: string, to: string) => Math.max(0, Math.round((at(to) - at(from)) / DAY_MS) + 1);
export const addDays = (day: string, days: number) => key(at(day) + days * DAY_MS);

/** Your local day for a moment, as YYYY-MM-DD. */
export function localDay(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The days you went to a gym (or, null, any gym): check-ins and workouts
 * logged there, each day once.
 */
export function visitDays(collection: Collection, sessions: readonly TrainingSession[], gymId: string | null): string[] {
  const days = new Set<string>();
  for (const [id, gym] of Object.entries(collection)) if (gymId === null || id === gymId) for (const day of gym.days) days.add(day);
  for (const session of sessions) if (session.gymId && (gymId === null || session.gymId === gymId)) days.add(localDay(session.finishedAt));
  return [...days].sort();
}

// --- What it cost -------------------------------------------------------------

/** What a spend cost from `from` to `to` (both counted): a membership by the day, a one-off in full if paid then. */
export function spentIn(spend: Spend, from: string, to: string): number {
  if (spend.kind === 'once') return spend.startedOn >= from && spend.startedOn <= to ? spend.amountMinor : 0;
  if (!spend.every) return 0;
  const start = spend.startedOn > from ? spend.startedOn : from;
  const end = spend.endedOn && spend.endedOn < to ? spend.endedOn : to;
  if (end < start) return 0;
  return Math.round((spend.amountMinor * span(start, end)) / daysOf(spend.every));
}

export interface SpendReport {
  spend: Spend;
  spentMinor: number;
  visits: number;
  /** Null with no visits yet. */
  perVisitMinor: number | null;
}

/** Each spend over the `days` up to `today`, with your visits while it applied. */
export function spendReports(spends: readonly Spend[], collection: Collection, sessions: readonly TrainingSession[], today: string, days: number): SpendReport[] {
  const from = addDays(today, -(days - 1));
  return spends.map((spend) => {
    const spentMinor = spentIn(spend, from, today);
    // Visits while it applied: from when it started (in the period), to when it ended. A one-off covers visits after it was paid.
    const start = spend.startedOn > from ? spend.startedOn : from;
    const end = spend.kind === 'membership' && spend.endedOn && spend.endedOn < today ? spend.endedOn : today;
    const visits = visitDays(collection, sessions, spend.gymId).filter((day) => day >= start && day <= end).length;
    return { spend, spentMinor, visits, perVisitMinor: visits > 0 && spentMinor > 0 ? Math.round(spentMinor / visits) : null };
  });
}

/** Per currency (prices in different currencies are never added together): spent, visits and per visit. */
export function totals(reports: readonly SpendReport[]): Array<{ currency: string; spentMinor: number; visits: number; perVisitMinor: number | null }> {
  const byCurrency = new Map<string, { spentMinor: number; visits: number }>();
  for (const report of reports) {
    const now = byCurrency.get(report.spend.currency) ?? { spentMinor: 0, visits: 0 };
    byCurrency.set(report.spend.currency, { spentMinor: now.spentMinor + report.spentMinor, visits: now.visits + report.visits });
  }
  return [...byCurrency].map(([currency, sum]) => ({ currency, ...sum, perVisitMinor: sum.visits > 0 && sum.spentMinor > 0 ? Math.round(sum.spentMinor / sum.visits) : null }));
}

// --- Against paying per visit -----------------------------------------------------

export interface VisitPrice {
  amountMinor: number;
  currency: string;
  label: string;
  /** Where the gym publishes it, and when it was last checked. */
  sourceLabel: string;
  checkedAt: string;
  /** Older than GymGO's recheck target for prices: shown as "to confirm", as the gym's page does. */
  stale: boolean;
}

/**
 * The gym's own cheapest one-visit price that gets you on the gym floor, in
 * a currency: a day pass or casual visit with every part of its cost known.
 * Null when it publishes none: then there's nothing to compare with.
 */
export function visitPrice(record: GymRecord | null, currency: string, today: string): VisitPrice | null {
  if (!record) return null;
  const prices = record.offers
    .filter(
      (offer) =>
        isSingleVisitProduct(offer) &&
        offer.productType !== 'trial' &&
        offer.currency === currency &&
        offer.grantsGymFloorAccess !== 'no' &&
        // A chain's "from" or recommended price isn't what this gym charges.
        !offer.priceBasis &&
        offer.provenance.status !== 'unknown' &&
        !isOfferExpired(offer, today),
    )
    .map((offer) => ({ offer, cost: computeCost(offer) }))
    .filter((entry) => entry.cost.known && entry.cost.totalNonRefundableMinor !== null)
    .sort((a, b) => a.cost.totalNonRefundableMinor! - b.cost.totalNonRefundableMinor!);
  const best = prices[0];
  if (!best) return null;
  const source = best.offer.provenance.sources[0];
  return {
    amountMinor: best.cost.totalNonRefundableMinor!,
    currency,
    label: best.offer.label,
    sourceLabel: source?.label ?? 'the gym’s published prices',
    checkedAt: source?.checkedAt ?? '',
    stale: assessFreshness(best.offer.provenance, 'visitor_price_access', new Date(`${today}T12:00:00Z`)).state !== 'fresh',
  };
}

/** What a membership costs over 30 days. */
export const monthlyMinor = (spend: Spend) => (spend.kind === 'membership' && spend.every ? Math.round((spend.amountMinor * 30) / daysOf(spend.every)) : null);

/** Visits in 30 days from which the membership costs less than paying each time. */
export function breakEvenVisits(perMonthMinor: number, perVisitMinor: number): number {
  return Math.max(1, Math.ceil(perMonthMinor / perVisitMinor));
}

/**
 * "A casual visit here is A$20 (club price list, checked 12 Oct 2026). Your
 * membership is about A$86 over 30 days, so it pays off from 5 visits; you
 * went 7 times." Null when there's nothing honest to say.
 */
export function compareLine(spend: Spend, price: VisitPrice | null, visitsIn30Days: number, checkedLabel: (iso: string) => string): string | null {
  const month = monthlyMinor(spend);
  if (month === null) return null;
  if (!price) return 'This gym doesn’t publish a visit price, so GymGO can’t say when the membership beats paying each time.';
  const from = breakEvenVisits(month, price.amountMinor);
  const source = `${price.sourceLabel}${price.checkedAt ? `, checked ${checkedLabel(price.checkedAt)}` : ''}${price.stale ? '; to confirm' : ''}`;
  const went = `In the last 30 days you went ${visitsIn30Days === 1 ? 'once' : `${visitsIn30Days} times`}`;
  const verdict =
    visitsIn30Days >= from
      ? 'so the membership was the better deal.'
      : `so paying each time would have cost ${priceLabel(visitsIn30Days * price.amountMinor, price.currency)}, ${priceLabel(month - visitsIn30Days * price.amountMinor, price.currency)} less.`;
  return `${price.label} here is ${priceLabel(price.amountMinor, price.currency)} (${source}). Your membership is about ${priceLabel(month, spend.currency)} over 30 days, so it pays off from ${from} visit${from === 1 ? '' : 's'}. ${went}, ${verdict}`;
}
