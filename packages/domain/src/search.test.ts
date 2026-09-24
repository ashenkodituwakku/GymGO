/**
 * Search tiering, ranking stability and relaxation suggestions.
 */

import { describe, expect, it } from 'vitest';
import { defaultQuery, evaluateGym, explainNoMatches, search, type SearchQuery } from './search';
import {
  NOW,
  checked,
  equipment,
  everyDayWindows,
  location,
  offer,
  prerequisites,
  record,
  review,
  schedule,
  weekdayWindows,
} from './testing';
import type { GymRecord, Review } from './types';

/** The reference task from the brief, as a query. */
const REFERENCE_QUERY: SearchQuery = defaultQuery({
  centre: { lat: -33.8846, lng: 151.2113 },
  radiusKm: 3,
  budgetMinor: 3000,
  visitDate: '2026-09-23',
  visitMinuteOfDay: 19 * 60,
  requiredEquipment: [
    { equipmentTypeId: 'squat_rack' },
    { equipmentTypeId: 'cable_station' },
    { equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 },
  ],
});

function gym(id: string, overrides: Partial<GymRecord> = {}): GymRecord {
  return record({
    location: location({ id, slug: id, name: id, position: { lat: -33.885, lng: 151.211 } }),
    schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60) })],
    equipment: [
      equipment('squat_rack', { count: 3 }),
      equipment('cable_station', { count: 2 }),
      equipment('dumbbells', { maxWeightKg: 50 }),
    ],
    offers: [offer({ baseAmountMinor: 2500 })],
    ...overrides,
  });
}

function runSearch(records: GymRecord[], query = REFERENCE_QUERY, reviews: Record<string, Review[]> = {}) {
  return search({ records, reviewsByGymId: reviews, query, asOf: NOW });
}

describe('result tiers', () => {
  it('confirms a gym that meets every stated requirement with fresh evidence', () => {
    const outcome = runSearch([gym('alpha')]);
    expect(outcome.counts.confirmed).toBe(1);
    expect(outcome.results[0]?.tier).toBe('confirmed');
    expect(outcome.results[0]?.limitations).toEqual([]);
  });

  it('rules out a gym whose guest entry closes before the requested time', () => {
    const outcome = runSearch([
      gym('daytime-only', {
        schedules: [
          schedule('member', { alwaysOpen: true }),
          schedule('visitor', { windows: weekdayWindows(9 * 60, 16 * 60) }),
        ],
      }),
    ]);
    expect(outcome.results[0]?.tier).toBe('ruled_out');
    expect(outcome.counts.confirmed).toBe(0);
  });

  it('moves a gym with one unknown requirement into needs-confirmation, not confirmed', () => {
    const outcome = runSearch([
      gym('unknown-cables', {
        equipment: [
          equipment('squat_rack'),
          equipment('dumbbells', { maxWeightKg: 45 }),
          // No cable_station record at all.
        ],
      }),
    ]);
    expect(outcome.results[0]?.tier).toBe('needs_confirmation');
    expect(outcome.counts.confirmed).toBe(0);
  });

  it('rules out a gym that is over budget and says what the cheapest confirmed price was', () => {
    const outcome = runSearch([gym('pricey', { offers: [offer({ baseAmountMinor: 4500 })] })]);
    expect(outcome.results[0]?.tier).toBe('ruled_out');
    expect(outcome.results[0]?.limitations.map((l) => l.message).join(' ')).toContain('A$45');
  });

  it('names the budget and the offer that actually exceeded it', () => {
    const outcome = runSearch([gym('pricey', { offers: [offer({ id: 'casual', baseAmountMinor: 4500 })] })]);
    const message = outcome.results[0]?.limitations.find((l) => l.code === 'over_budget')?.message;
    expect(message).toContain('A$45');
    expect(message).toContain('budget of A$30');
  });

  it('blames the expiry, not the budget, when the cheap offer has lapsed', () => {
    const outcome = runSearch([
      gym('lapsed', {
        offers: [
          offer({ id: 'winter', productType: 'day_pass', baseAmountMinor: 1800, availableUntil: '2026-08-31' }),
          offer({ id: 'casual', baseAmountMinor: 3200 }),
        ],
      }),
    ]);
    const message = outcome.results[0]?.limitations.find((l) => l.code === 'over_budget')?.message;
    // A$18 was never usable for this visit, so it must not be quoted as the
    // cheapest confirmed price.
    expect(message).toContain('A$32');
    expect(message).not.toContain('A$18');
  });

  it('reports a non-budget blocker rather than inventing a budget one', () => {
    const outcome = runSearch([
      gym('pool-only', {
        offers: [
          offer({ id: 'pool', productType: 'day_pass', baseAmountMinor: 850, grantsGymFloorAccess: 'no' }),
        ],
      }),
    ]);
    const codes = outcome.results[0]?.limitations.map((l) => l.code) ?? [];
    expect(codes).toContain('no_gym_floor_access');
    expect(codes).not.toContain('over_budget');
  });

  it('does not downgrade a gym for an unknown price when no budget was stated', () => {
    const noBudget = { ...REFERENCE_QUERY, budgetMinor: null };
    const outcome = runSearch([gym('no-price', { offers: [offer({ baseAmountMinor: null })] })], noBudget);
    expect(outcome.results[0]?.tier).toBe('confirmed');
  });

  it('asks for confirmation when a budget is stated but no single-visit price is recorded', () => {
    const outcome = runSearch([gym('week-only', { offers: [offer({ productType: 'week_pass', baseAmountMinor: 4900 })] })]);
    expect(outcome.results[0]?.tier).toBe('needs_confirmation');
    expect(outcome.results[0]?.limitations.map((l) => l.code)).toContain('no_single_visit_price');
  });

  it('never lets an unknown fact produce a confirmed match', () => {
    const outcome = runSearch([
      gym('all-unknown', {
        equipment: [],
        schedules: [schedule('visitor', { provenance: { status: 'unknown', sources: [], conflictNote: null } })],
        offers: [],
        prerequisites: prerequisites({ inductionRequired: 'unknown', advanceBookingRequired: 'unknown' }),
      }),
    ]);
    expect(outcome.counts.confirmed).toBe(0);
    expect(outcome.results[0]?.tier).toBe('needs_confirmation');
  });
});

describe('geographic filtering', () => {
  it('excludes gyms outside the radius entirely rather than showing them as ruled out', () => {
    const far = gym('far');
    far.location.position = { lat: -33.95, lng: 151.35 }; // ~15 km away
    const outcome = runSearch([gym('near'), far]);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.record.location.id).toBe('near');
  });

  it('honours a bounding box from "Search this area" over the radius', () => {
    const query = {
      ...REFERENCE_QUERY,
      bbox: { north: -33.7, south: -33.8, east: 151.3, west: 151.1 },
    };
    const outcome = runSearch([gym('inside-radius-outside-box')], query);
    expect(outcome.results).toHaveLength(0);
  });
});

describe('ranking', () => {
  it('puts confirmed results above needs-confirmation regardless of sort key', () => {
    const confirmed = gym('zz-confirmed');
    const unresolved = gym('aa-unresolved', { equipment: [equipment('squat_rack')] });

    for (const sort of ['best_match', 'distance', 'visit_cost', 'rating'] as const) {
      const outcome = runSearch([unresolved, confirmed], { ...REFERENCE_QUERY, sort });
      expect(outcome.results[0]?.record.location.id).toBe('zz-confirmed');
    }
  });

  it('sorts unknown prices last rather than as zero', () => {
    const cheap = gym('cheap', { offers: [offer({ baseAmountMinor: 1500 })] });
    const unknown = gym('unknown-price', { offers: [offer({ baseAmountMinor: null })] });
    const mid = gym('mid', { offers: [offer({ baseAmountMinor: 2500 })] });

    const outcome = runSearch([unknown, mid, cheap], {
      ...REFERENCE_QUERY,
      budgetMinor: null,
      sort: 'visit_cost',
    });
    expect(outcome.results.map((r) => r.record.location.id)).toEqual(['cheap', 'mid', 'unknown-price']);
  });

  it('sorts gyms with no reviews last rather than as zero stars', () => {
    const reviews = {
      rated: [review({ gymId: 'rated', overall: 4 })],
      lowRated: [review({ gymId: 'lowRated', id: 'r2', overall: 2 })],
    };
    const outcome = runSearch(
      [gym('unrated'), gym('lowRated'), gym('rated')],
      { ...REFERENCE_QUERY, sort: 'rating' },
      reviews,
    );
    expect(outcome.results.map((r) => r.record.location.id)).toEqual(['rated', 'lowRated', 'unrated']);
    expect(outcome.results[2]?.rating.average).toBeNull();
  });

  it('best match puts the gym with fewer open questions first; closest ignores them', () => {
    // Near, but its price and guest hours are unpublished.
    const vague = gym('near-but-vague', {
      location: location({ id: 'near-but-vague', slug: 'near-but-vague', name: 'near', position: { lat: -33.8847, lng: 151.2113 } }),
      offers: [offer({ baseAmountMinor: null })],
      schedules: [],
    });
    // A little farther, and only its price is unpublished.
    const clear = gym('farther-but-clear', {
      location: location({ id: 'farther-but-clear', slug: 'farther-but-clear', name: 'far', position: { lat: -33.8900, lng: 151.2113 } }),
      offers: [offer({ baseAmountMinor: null })],
    });
    const best = runSearch([vague, clear], { ...REFERENCE_QUERY, sort: 'best_match' }).results;
    expect(best.map((r) => r.tier)).toEqual(['needs_confirmation', 'needs_confirmation']);
    expect(best[0]!.limitations.length).toBeLessThan(best[1]!.limitations.length);
    expect(best.map((r) => r.record.location.id)).toEqual(['farther-but-clear', 'near-but-vague']);

    const closest = runSearch([vague, clear], { ...REFERENCE_QUERY, sort: 'distance' }).results;
    expect(closest.map((r) => r.record.location.id)).toEqual(['near-but-vague', 'farther-but-clear']);
  });

  it('is stable: the same input produces the same order every time', () => {
    const records = [gym('c'), gym('a'), gym('b')];
    const first = runSearch(records).results.map((r) => r.record.location.id);
    const second = runSearch([...records].reverse()).results.map((r) => r.record.location.id);
    expect(first).toEqual(second);
    expect(first).toEqual(['a', 'b', 'c']);
  });
});

describe('relaxations', () => {
  it('suggests dropping the requirement that actually excluded the results', () => {
    // Has everything except a cable station, which is recorded as absent.
    const outcome = runSearch([
      gym('no-cables', {
        equipment: [
          equipment('squat_rack'),
          equipment('cable_station', { presence: 'no' }),
          equipment('dumbbells', { maxWeightKg: 50 }),
        ],
      }),
    ]);

    expect(outcome.counts.confirmed).toBe(0);
    const labels = outcome.relaxations.map((relaxation) => relaxation.label);
    expect(labels).toContain('Drop "cable station"');
    expect(outcome.relaxations[0]?.confirmedCount).toBeGreaterThan(0);
  });

  it('suggests raising a budget that was the only blocker', () => {
    const outcome = runSearch([gym('slightly-pricey', { offers: [offer({ baseAmountMinor: 3200 })] })]);
    const kinds = outcome.relaxations.map((relaxation) => relaxation.kind);
    expect(kinds).toContain('raise_budget');
  });

  it('suggests an earlier visit time when guest hours are the blocker', () => {
    const outcome = runSearch([
      gym('daytime-only', {
        schedules: [schedule('visitor', { windows: everyDayWindows(9 * 60, 16 * 60) })],
      }),
    ]);
    expect(outcome.relaxations.map((relaxation) => relaxation.kind)).toContain('change_time');
  });

  it('offers no relaxations when there is already a confirmed result', () => {
    expect(runSearch([gym('alpha')]).relaxations).toEqual([]);
  });

  it('never applies a relaxation on its own', () => {
    const outcome = runSearch([
      gym('no-cables', { equipment: [equipment('squat_rack'), equipment('cable_station', { presence: 'no' })] }),
    ]);
    // The results returned still reflect the original, unrelaxed query.
    expect(outcome.counts.confirmed).toBe(0);
    expect(outcome.results[0]?.tier).toBe('ruled_out');
  });
});

describe('explainNoMatches', () => {
  it('names the blocking reasons and how many gyms each affected', () => {
    const outcome = runSearch([
      gym('a', { offers: [offer({ baseAmountMinor: 9900 })] }),
      gym('b', { offers: [offer({ baseAmountMinor: 9900 })] }),
    ]);
    const explanations = explainNoMatches(outcome);
    expect(explanations.join(' ')).toContain('2 gyms');
  });
});

describe('evaluateGym', () => {
  it('produces the same verdict as the search that contains it', () => {
    const one = gym('alpha');
    const fromSearch = runSearch([one]).results[0];
    const direct = evaluateGym(one, REFERENCE_QUERY, { asOf: NOW });
    expect(direct.tier).toBe(fromSearch?.tier);
    expect(direct.limitations).toEqual(fromSearch?.limitations);
  });

  it('applies the equipment rules identically whether reached by list, map or detail', () => {
    // Same record, same query, three call sites; one implementation.
    const one = gym('alpha', { equipment: [equipment('squat_rack', { provenance: checked(200) })] });
    const direct = evaluateGym(one, REFERENCE_QUERY, { asOf: NOW });
    const viaSearch = runSearch([one]).results[0];
    expect(direct.equipment.matches.map((m) => m.state)).toEqual(
      viaSearch?.equipment.matches.map((m) => m.state),
    );
  });
});
