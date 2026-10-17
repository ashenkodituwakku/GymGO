/**
 * Gyms' results for the current search, wherever they are. Saved gyms,
 * recent gyms, the compare screen and a gym's own page need a gym's verdict
 * even when it's on the other side of town, or outside an area just
 * searched. Distances stay measured from the search's centre.
 *
 * Each gym asked for is weighed on its own (the same `evaluateGym` a search
 * uses, so the verdict is the same), rather than by running a whole search
 * and picking it out: a search weighs every gym it holds and, when none is
 * a sure thing (as is usual), every one again for each change it might
 * suggest. That was thousands of gyms weighed to answer for one, again on
 * every change as a page loaded, and a gym opened from a link took seconds.
 */

import { evaluateGym, type GymRecord, type GymSearchResult, type RatingSummary } from '@gymgo/domain';
import { toQuery, type Filters } from './query';

/** The results for the gyms `ids` names, keyed by gym; one it doesn't know is left out. */
export function resultsById(
  filters: Filters,
  records: GymRecord[],
  asOf: Date,
  ratings: Record<string, RatingSummary> | undefined,
  ids: readonly string[],
): Map<string, GymSearchResult> {
  const out = new Map<string, GymSearchResult>();
  const wanted = new Set(ids);
  if (wanted.size === 0) return out;
  const query = toQuery(filters);
  for (const record of records) {
    const id = record.location.id;
    if (!wanted.has(id) || out.has(id)) continue;
    out.set(id, evaluateGym(record, query, { rating: ratings?.[id], asOf }));
    if (out.size === wanted.size) break;
  }
  return out;
}

/** One gym's result, or undefined if it isn't one GymGO knows (yet). */
export function resultFor(
  filters: Filters,
  records: GymRecord[],
  id: string | undefined,
  asOf: Date,
  ratings?: Record<string, RatingSummary>,
): GymSearchResult | undefined {
  return id ? resultsById(filters, records, asOf, ratings, [id]).get(id) : undefined;
}
