import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  explainNoMatches,
  formatMoney,
  search,
  type GymSearchResult,
  type ResultTier,
} from '@gymgo/domain';
import { FilterPanel } from '@/components/FilterPanel';
import { GymCard } from '@/components/GymCard';
import { MapPanel, type MapMarker } from '@/components/MapPanel';
import { CompareTray } from '@/components/CompareToggle';
import { loadGymRecords, loadPublishedReviewsByGym } from '@/server/gyms';
import { PILOT_AREA, PILOT_FRESHNESS, config } from '@/server/config';
import {
  buildSearchParams,
  formatMinuteInput,
  parseSearchParams,
  type ParamsRecord,
} from '@/server/search-params';
import { TIER_EXPLANATION, TIER_LABEL, pluralise } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Search gyms',
  description:
    'Filter inner Sydney gyms by equipment, total visit cost, and whether a visitor can enter at the time you want.',
  // Filter permutations are not useful search results and should not be
  // indexed; the curated area pages are what we want in an index.
  robots: { index: false, follow: true },
};

const TIER_ORDER: ResultTier[] = ['confirmed', 'needs_confirmation', 'ruled_out'];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<ParamsRecord>;
}) {
  const params = await searchParams;
  const parsed = parseSearchParams(params);
  const asOf = new Date();

  const records = await loadGymRecords();
  const reviewsByGymId = await loadPublishedReviewsByGym();

  const outcome = search({
    records,
    reviewsByGymId,
    query: parsed.query,
    asOf,
    policy: PILOT_FRESHNESS,
  });

  const byTier = new Map<ResultTier, GymSearchResult[]>();
  for (const result of outcome.results) {
    const list = byTier.get(result.tier) ?? [];
    list.push(result);
    byTier.set(result.tier, list);
  }

  const searchQuery = buildSearchParams(params, {});
  const compareNames = parsed.compareIds
    .map((id) => outcome.results.find((result) => result.record.location.id === id))
    .filter((result): result is GymSearchResult => result !== undefined)
    .map((result) => ({ id: result.record.location.id, name: result.record.location.name }));

  const markers: MapMarker[] = outcome.results.map((result) => ({
    id: result.record.location.id,
    name: result.record.location.name,
    lat: result.record.location.position.lat,
    lng: result.record.location.position.lng,
    tier: result.tier,
    tierLabel: TIER_LABEL[result.tier],
    href: `/gym/${result.record.location.slug}?${searchQuery}`,
  }));

  const total = outcome.results.length;
  const heading = parsed.placeName
    ? `Gyms near ${parsed.placeName}`
    : `Gyms in ${PILOT_AREA.label}`;

  return (
    <div className="search-layout" data-view={parsed.view}>
      <Suspense fallback={<div className="search-filters">Loading filters…</div>}>
        <FilterPanel
          text={parsed.text}
          budget={parsed.query.budgetMinor === null ? '' : String(parsed.query.budgetMinor / 100)}
          visitDate={parsed.query.visitDate}
          visitTime={formatMinuteInput(parsed.query.visitMinuteOfDay)}
          requiredEquipment={parsed.query.requiredEquipment.map((item) => item.equipmentTypeId)}
          dumbbellMin={String(
            parsed.query.requiredEquipment.find((item) => item.equipmentTypeId === 'dumbbells')
              ?.minMaxWeightKg ?? '',
          )}
          requiredAmenities={parsed.query.requiredAmenities}
          sort={parsed.query.sort}
          radiusKm={parsed.query.radiusKm}
          isLocalResident={parsed.query.profile.isLocalResident}
        />
      </Suspense>

      <div className="search-results">
        <div className="stack">
          <div>
            <h1 style={{ marginBottom: 4 }}>{heading}</h1>
            <p className="meta-line" style={{ margin: 0 }}>
              {pluralise(total, 'gym')} in this area ·{' '}
              {pluralise(outcome.counts.confirmed, 'confirmed match', 'confirmed matches')} ·{' '}
              {outcome.counts.needs_confirmation} needing confirmation
            </p>
            <p className="meta-line" style={{ marginTop: 2 }}>
              Visiting {parsed.query.visitDate} at {formatMinuteInput(parsed.query.visitMinuteOfDay)}{' '}
              ({PILOT_AREA.timezone})
              {parsed.query.budgetMinor !== null
                ? ` · budget ${formatMoney(parsed.query.budgetMinor)} non-refundable`
                : ''}
            </p>
          </div>

          <div className="view-switch" role="group" aria-label="Choose list or map">
            <Link
              href={`/search?${buildSearchParams(params, { view: null })}`}
              aria-current={parsed.view === 'list'}
            >
              List
            </Link>
            <Link
              href={`/search?${buildSearchParams(params, { view: 'map' })}`}
              aria-current={parsed.view === 'map'}
            >
              Map
            </Link>
          </div>

          {parsed.outOfArea && (
            <p className="notice notice--warning">
              We do not cover “{parsed.text}” yet. The pilot is limited to a compact part of inner
              Sydney, and we would rather say so than show you a thin list. Results below are for{' '}
              {PILOT_AREA.label}.
            </p>
          )}

          {parsed.usedDeviceLocation && (
            <p className="notice small">
              Using your approximate location, rounded to about 100 metres. It is not stored and is
              never sent to analytics.
            </p>
          )}

          {parsed.query.bbox && (
            <p className="notice small">
              Showing the map area you searched.{' '}
              <Link href={`/search?${buildSearchParams(params, { bbox: null })}`}>
                Search the whole {parsed.query.radiusKm} km radius again
              </Link>
            </p>
          )}

          {config.dataSource === 'none' && (
            <p className="notice notice--warning">
              No listings are loaded in this environment, so there is nothing to search.
            </p>
          )}

          {total === 0 && config.dataSource !== 'none' && (
            <div className="card">
              <h2>No gyms in this area</h2>
              <p className="small muted">
                Nothing in the pilot dataset falls inside{' '}
                {parsed.query.bbox ? 'the map area you searched' : `${parsed.query.radiusKm} km of here`}.
                Try widening the radius or searching a different suburb.
              </p>
            </div>
          )}

          {outcome.counts.confirmed === 0 && total > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 17 }}>Nothing matches everything you asked for</h2>
              <p className="small muted">
                We have not removed any of your filters. Here is what ruled gyms out, and what a
                single change would open up.
              </p>
              {explainNoMatches(outcome).length > 0 && (
                <ul className="limitation-list" style={{ marginTop: 8 }}>
                  {explainNoMatches(outcome).map((explanation) => (
                    <li key={explanation}>{explanation}</li>
                  ))}
                </ul>
              )}
              {outcome.relaxations.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p className="field__label">Try one of these</p>
                  <ul className="match-list">
                    {outcome.relaxations.map((relaxation) => (
                      <li key={relaxation.label}>
                        <Link
                          className="button button--small"
                          href={`/search?${buildSearchParams(params, relaxationOverrides(relaxation.patch, params))}`}
                        >
                          {relaxation.label} ({relaxation.confirmedCount})
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="meta-line" style={{ marginTop: 6 }}>
                    The number in brackets is how many confirmed matches that change would give you.
                  </p>
                </div>
              )}
            </div>
          )}

          {TIER_ORDER.map((tier) => {
            const results = byTier.get(tier);
            if (!results || results.length === 0) return null;
            return (
              <section key={tier} aria-labelledby={`tier-${tier}`}>
                <h2 className="tier-heading" id={`tier-${tier}`}>
                  {TIER_LABEL[tier]}
                  <span className="meta-line">{pluralise(results.length, 'gym')}</span>
                </h2>
                <p className="meta-line" style={{ marginTop: -4, marginBottom: 8 }}>
                  {TIER_EXPLANATION[tier]}
                </p>
                <ul className="result-list">
                  {results.map((result) => (
                    <li key={result.record.location.id}>
                      <GymCard result={result} searchQuery={searchQuery} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {total > 0 && (
            <p className="meta-line">Ordering: {outcome.sortDescription} No paid placement exists.</p>
          )}
        </div>

        <Suspense fallback={null}>
          <CompareTray names={compareNames} />
        </Suspense>
      </div>

      <MapPanel
        markers={markers}
        selectedId={parsed.selectedGymId}
        centre={parsed.query.centre ?? PILOT_AREA.centre}
        provider={config.map}
        resultCount={total}
      />
    </div>
  );
}

/** Translate a relaxation's query patch into URL parameters. */
function relaxationOverrides(
  patch: Record<string, unknown>,
  current: ParamsRecord,
): Record<string, string | string[] | null> {
  const overrides: Record<string, string | string[] | null> = {};

  if ('requiredEquipment' in patch) {
    const items = patch.requiredEquipment as Array<{ equipmentTypeId: string; minMaxWeightKg?: number | null }>;
    overrides.eq = items.map((item) => item.equipmentTypeId);
    const dumbbells = items.find((item) => item.equipmentTypeId === 'dumbbells');
    overrides.db = dumbbells?.minMaxWeightKg ? String(dumbbells.minMaxWeightKg) : null;
  }
  if ('requiredAmenities' in patch) {
    overrides.am = patch.requiredAmenities as string[];
  }
  if ('budgetMinor' in patch) {
    const budget = patch.budgetMinor as number | null;
    overrides.budget = budget === null ? null : String(budget / 100);
  }
  if ('radiusKm' in patch) {
    overrides.r = String(patch.radiusKm as number);
  }
  if ('visitMinuteOfDay' in patch) {
    overrides.time = formatMinuteInput(patch.visitMinuteOfDay as number);
  }
  // Changing a filter searches the area again rather than keeping a viewport
  // the person has not looked at since.
  if (current.bbox !== undefined) overrides.bbox = null;

  return overrides;
}
