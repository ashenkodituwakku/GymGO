/**
 * Price changes at your saved gyms. The app keeps, on this device, the
 * prices each saved gym published when you last looked; when GymGO's data
 * for it says something different, you get a note: the old and new price,
 * where the gym publishes it and when that was checked. A price no longer
 * published says so, rather than reading as free; a new one is "newly
 * published".
 *
 * The first time a gym is seen there's nothing to compare with, so no note:
 * its prices are only remembered.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import type { GymRecord } from '@gymgo/domain';

/** One published price, as it was seen. */
export interface SeenPrice {
  offerId: string;
  label: string;
  amountMinor: number;
  currency: string;
}

export interface PriceChange {
  /** Stable, so a note isn't shown twice: gym, offer and the new amount. */
  id: string;
  gymId: string;
  gymName: string;
  label: string;
  /** Null: newly published. */
  before: { amountMinor: number; currency: string } | null;
  /** Null: no longer published (never "free"). */
  after: { amountMinor: number; currency: string } | null;
  sourceLabel: string;
  checkedAt: string;
}

/** A gym's published prices: offers with an amount. */
export function seenPrices(record: GymRecord): SeenPrice[] {
  return record.offers
    .filter((offer) => offer.baseAmountMinor !== null)
    .map((offer) => ({ offerId: offer.id, label: offer.label, amountMinor: offer.baseAmountMinor!, currency: offer.currency }));
}

/**
 * The changes at saved gyms since their prices were last seen, and what to
 * remember now: every saved gym in `records` as it is, others as they were
 * (one not loaded this time keeps its last prices), and nothing for a gym
 * no longer saved.
 */
export function comparePrices(
  saved: readonly string[],
  records: readonly GymRecord[],
  seen: Readonly<Record<string, SeenPrice[]>>,
): { changes: PriceChange[]; seen: Record<string, SeenPrice[]> } {
  const byId = new Map(records.map((record) => [record.location.id, record]));
  const changes: PriceChange[] = [];
  const next: Record<string, SeenPrice[]> = {};
  for (const gymId of saved) {
    const record = byId.get(gymId);
    if (!record) {
      if (seen[gymId]) next[gymId] = seen[gymId]!;
      continue;
    }
    const now = seenPrices(record);
    next[gymId] = now;
    const before = seen[gymId];
    if (!before) continue;
    const offer = (offerId: string) => record.offers.find((each) => each.id === offerId);
    const source = (offerId: string) => {
      const found = offer(offerId)?.provenance.sources[0] ?? record.offers[0]?.provenance.sources[0];
      return { sourceLabel: found?.label ?? 'the gym’s published prices', checkedAt: found?.checkedAt ?? '' };
    };
    for (const price of now) {
      const was = before.find((each) => each.offerId === price.offerId);
      if (was && was.amountMinor === price.amountMinor && was.currency === price.currency) continue;
      changes.push({
        id: `${gymId}|${price.offerId}|${price.currency}${price.amountMinor}`,
        gymId,
        gymName: record.location.name,
        label: price.label,
        before: was ? { amountMinor: was.amountMinor, currency: was.currency } : null,
        after: { amountMinor: price.amountMinor, currency: price.currency },
        ...source(price.offerId),
      });
    }
    for (const was of before) {
      if (now.some((each) => each.offerId === was.offerId)) continue;
      changes.push({
        id: `${gymId}|${was.offerId}|gone`,
        gymId,
        gymName: record.location.name,
        label: was.label,
        before: { amountMinor: was.amountMinor, currency: was.currency },
        after: null,
        ...source(was.offerId),
      });
    }
  }
  return { changes, seen: next };
}
