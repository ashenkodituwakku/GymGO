import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  EQUIPMENT_TYPES,
  defaultQuery,
  evaluateGym,
  formatDistanceKm,
  formatMoney,
  haversineKm,
  summariseWeek,
} from '@gymgo/domain';
import { PILOT_PLACES, suburbSlug } from '@/server/geocode';
import { loadGymRecords } from '@/server/gyms';
import { PILOT_AREA, PILOT_FRESHNESS, config } from '@/server/config';
import { todayInPilotArea } from '@/server/search-params';
import { priceSummary } from '@/lib/format';

const RADIUS_KM = 1.5;

async function areaData(areaSlug: string) {
  const place = PILOT_PLACES.find((candidate) => suburbSlug(candidate.name) === areaSlug);
  if (!place) return null;

  const records = await loadGymRecords();
  const nearby = records
    .map((record) => ({ record, distanceKm: haversineKm(place.position, record.location.position) }))
    .filter((entry) => entry.distanceKm <= RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // A page with nothing on it is not worth having, let alone indexing.
  if (nearby.length === 0) return null;
  return { place, nearby };
}

/**
 * Curated area pages.
 *
 * One page per pilot suburb that actually has listings, with real text on it.
 * Filter permutations are deliberately not indexable: thousands of thin
 * generated pages would be the opposite of what this product is for.
 */
export async function generateStaticParams() {
  const records = await loadGymRecords();
  return PILOT_PLACES.filter((place) =>
    records.some((record) => haversineKm(place.position, record.location.position) <= RADIUS_KM),
  ).map((place) => ({ area: suburbSlug(place.name) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const data = await areaData(area);
  if (!data) return { title: 'Area not covered' };

  return {
    title: `Gyms in ${data.place.name}`,
    description: `${data.nearby.length} gyms within ${RADIUS_KM} km of ${data.place.name} ${data.place.postcode}, with visitor prices, guest entry hours and equipment, each showing when it was last checked.`,
    alternates: { canonical: `/gyms/${area}` },
    robots: config.dataSource === 'demo' ? { index: false, follow: false } : undefined,
  };
}

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const data = await areaData(area);
  if (!data) notFound();

  const asOf = new Date();
  const query = defaultQuery({
    centre: data.place.position,
    radiusKm: RADIUS_KM,
    visitDate: todayInPilotArea(asOf),
    visitMinuteOfDay: 19 * 60,
  });

  const evaluated = data.nearby.map((entry) => ({
    ...entry,
    result: evaluateGym(entry.record, query, { asOf, policy: PILOT_FRESHNESS }),
  }));

  const withPrice = evaluated.filter(
    (entry) => entry.result.offers.bestAvailable?.cost.totalNonRefundableMinor != null,
  );
  const cheapest = withPrice
    .map((entry) => entry.result.offers.bestAvailable!.cost.totalNonRefundableMinor!)
    .sort((a, b) => a - b)[0];

  // Equipment pages exist for anchor suburbs only; see gyms/[area]/[equipment].
  const hasEquipmentPages = ['Surry Hills', 'Newtown', 'Alexandria', 'Pyrmont'].includes(
    data.place.name,
  );
  const equipmentCounts = EQUIPMENT_TYPES.map((type) => ({
    type,
    count: data.nearby.filter((entry) =>
      entry.record.equipment.some(
        (item) => item.equipmentTypeId === type.id && item.presence === 'yes',
      ),
    ).length,
  }))
    // Mirrors the generation rule for the equipment pages, so the links here
    // never point at a page that was not built.
    .filter((entry) => entry.count >= 3)
    .sort((a, b) => b.count - a.count || a.type.id.localeCompare(b.type.id))
    .slice(0, 3);

  return (
    <div className="page page--narrow">
      <h1>Gyms in {data.place.name}</h1>

      <p className="muted">
        {data.nearby.length} {data.nearby.length === 1 ? 'gym' : 'gyms'} within {RADIUS_KM} km of{' '}
        {data.place.name} {data.place.postcode}, {PILOT_AREA.label}.
        {cheapest !== undefined
          ? ` The cheapest single visit we have confirmed here is ${formatMoney(cheapest)}.`
          : ' We have not confirmed a single-visit price for any of them yet.'}{' '}
        Prices are the total you do not get back, and every fact below shows when it was last
        checked.
      </p>

      <p>
        <Link className="button button--primary" href={`/search?q=${encodeURIComponent(data.place.name)}`}>
          Search {data.place.name} with your own filters
        </Link>
      </p>

      {hasEquipmentPages && equipmentCounts.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2>What you can find here</h2>
          <ul>
            {equipmentCounts.map((entry) => (
              <li key={entry.type.id}>
                <Link href={`/gyms/${area}/${entry.type.id.replace(/_/g, '-')}`}>
                  {entry.type.label}
                </Link>{' '}
                — recorded at {entry.count} of these gyms
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <h2>Every gym in this area</h2>
        <div className="stack">
          {evaluated.map(({ record, distanceKm, result }) => {
            const price = priceSummary(result.offers);
            const visitorSchedule = record.schedules.find(
              (schedule) => schedule.audience === 'visitor',
            );
            return (
              <article className="card" key={record.location.id}>
                <h3 style={{ marginBottom: 2 }}>
                  <Link href={`/gym/${record.location.slug}`}>
                    {record.location.name}
                    {record.location.branch ? ` — ${record.location.branch}` : ''}
                  </Link>
                </h3>
                <p className="meta-line" style={{ marginTop: 0 }}>
                  {record.location.address.line1}, {record.location.address.suburb} ·{' '}
                  {formatDistanceKm(distanceKm)}
                </p>
                <p style={{ marginTop: 8, marginBottom: 4 }}>
                  <strong>{price.headline}</strong> — {price.sublabel}
                </p>
                <p className="small muted" style={{ marginBottom: 4 }}>
                  Visitor entry:{' '}
                  {visitorSchedule ? summariseWeek(visitorSchedule).join('; ') : 'not established'}.
                </p>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  Equipment recorded as available:{' '}
                  {record.equipment
                    .filter((item) => item.presence === 'yes')
                    .map((item) => item.equipmentTypeId.replace(/_/g, ' '))
                    .join(', ') || 'none yet'}
                  .
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Nearby areas</h2>
        <ul className="match-list">
          {PILOT_PLACES.filter((place) => place.name !== data.place.name)
            .map((place) => ({ place, km: haversineKm(data.place.position, place.position) }))
            .sort((a, b) => a.km - b.km)
            .slice(0, 5)
            .map(({ place }) => (
              <li key={place.name}>
                <Link className="button button--small" href={`/gyms/${suburbSlug(place.name)}`}>
                  {place.name}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <p className="meta-line" style={{ marginTop: 24 }}>
        Recheck targets: visitor prices and access every {PILOT_FRESHNESS.visitorPriceAccessDays}{' '}
        days, equipment every {PILOT_FRESHNESS.equipmentDays} days.{' '}
        <Link href="/about/data">How we check facts</Link>
      </p>
    </div>
  );
}
