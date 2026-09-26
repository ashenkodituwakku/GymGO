/**
 * Every gym's result for the current search, whether or not it is within the
 * search radius, keyed by gym. Saved gyms, recent gyms and the compare
 * screen need a gym's verdict even when it is on the other side of town.
 * Distances stay measured from the search's centre.
 */

import type { GymRecord, GymSearchResult, RatingSummary } from '@gymgo/domain';
import { runSearch, type Filters } from './query';

export function resultsById(
  filters: Filters,
  records: GymRecord[],
  asOf: Date,
  ratings?: Record<string, RatingSummary>,
): Map<string, GymSearchResult> {
  const outcome = runSearch({ ...filters, radiusKm: 100_000 }, { records, ratings }, asOf);
  return new Map(outcome.results.map((result) => [result.record.location.id, result]));
}
