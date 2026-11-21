/**
 * Freshness: how old a fact is allowed to be before we stop calling it confirmed.
 *
 * Staleness is an evidence state, not a value. A stale "has a squat rack" still
 * means we last saw a squat rack; it just stops satisfying a strict requirement
 * on its own.
 */

import type { FreshnessClass, FreshnessPolicy, Provenance } from './types';
import { DEFAULT_FRESHNESS_POLICY } from './types';

export type FreshnessState = 'fresh' | 'stale' | 'unknown';

export interface FreshnessInfo {
  state: FreshnessState;
  /** Most recent `checkedAt` across the fact's sources. */
  lastCheckedAt: string | null;
  ageDays: number | null;
  /** The recheck target that applied, in days. */
  targetDays: number;
}

function targetFor(freshnessClass: FreshnessClass, policy: FreshnessPolicy): number {
  switch (freshnessClass) {
    case 'visitor_price_access':
      return policy.visitorPriceAccessDays;
    case 'equipment':
      return policy.equipmentDays;
    case 'amenity':
      return policy.amenityDays;
  }
}

export function latestCheckedAt(provenance: Provenance): string | null {
  let latest: string | null = null;
  for (const source of provenance.sources) {
    if (latest === null || source.checkedAt > latest) latest = source.checkedAt;
  }
  return latest;
}

export function assessFreshness(
  provenance: Provenance,
  freshnessClass: FreshnessClass,
  asOf: Date,
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
): FreshnessInfo {
  const targetDays = targetFor(freshnessClass, policy);
  const lastCheckedAt = latestCheckedAt(provenance);

  if (provenance.status === 'unknown' || lastCheckedAt === null) {
    return { state: 'unknown', lastCheckedAt, ageDays: null, targetDays };
  }

  const ageMs = asOf.getTime() - new Date(lastCheckedAt).getTime();
  const ageDays = Math.floor(ageMs / 86_400_000);
  return {
    state: ageDays > targetDays ? 'stale' : 'fresh',
    lastCheckedAt,
    ageDays,
    targetDays,
  };
}

/** "Checked 12 days ago" / "Checked 4 months ago — due for a recheck". */
export function describeFreshness(info: FreshnessInfo): string {
  if (info.state === 'unknown' || info.ageDays === null) return 'Not checked';
  const age =
    info.ageDays === 0
      ? 'today'
      : info.ageDays === 1
        ? 'yesterday'
        : info.ageDays < 31
          ? `${info.ageDays} days ago`
          : `${Math.round(info.ageDays / 30)} months ago`;
  const suffix = info.state === 'stale' ? ' — due for a recheck' : '';
  return `Checked ${age}${suffix}`;
}

/** Reader-facing label for where a fact came from. */
export function describeStatus(provenance: Provenance): string {
  switch (provenance.status) {
    case 'owner_confirmed':
      return 'Confirmed by the gym';
    case 'independently_checked':
      return 'Checked by us';
    case 'community_reported':
      return 'Reported by a user';
    case 'conflicting':
      return 'Sources disagree';
    case 'unknown':
      return 'Not established';
  }
}
