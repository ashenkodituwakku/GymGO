import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  EQUIPMENT_TYPES,
  assessFreshness,
  describeFreshness,
  formatDistanceKm,
  haversineKm,
} from '@gymgo/domain';
import { PILOT_PLACES, suburbSlug } from '@/server/geocode';
import { loadGymRecords } from '@/server/gyms';
import { PILOT_FRESHNESS, config } from '@/server/config';

const RADIUS_KM = 1.5;
/** Below this, the page has too little on it to be worth having. */
const MIN_GYMS = 3;
/**
 * At most this many equipment pages per area.
 *
 * Inner-city suburbs overlap heavily at a 1.5 km radius, so generating a page
 * for every area-and-equipment pair produces near-duplicates of each other.
 * Keeping the few with the most gyms behind them leaves pages that answer a
 * real query instead of an index full of thin variations.
 */
const MAX_PER_AREA = 3;
/**
 * Equipment pages exist only for these anchor suburbs.
 *
 * "Gyms with a squat rack in <suburb>" is a real query, but only for places
 * people actually name when they search. Generating one for every suburb in
 * the pilot would produce a set of near-identical pages, which is the thin
 * generated page problem wearing a different hat. This list is a judgement
 * call to be checked against real search behaviour, not a finding.
 */
const ANCHOR_AREAS = ['Surry Hills', 'Newtown', 'Alexandria', 'Pyrmont'];

const equipmentSlug = (id: string) => id.replace(/_/g, '-');

async function pageData(areaSlug: string, equipmentSlugValue: string) {
  const place = PILOT_PLACES.find((candidate) => suburbSlug(candidate.name) === areaSlug);
  const type = EQUIPMENT_TYPES.find((candidate) => equipmentSlug(candidate.id) === equipmentSlugValue);
  if (!place || !type || !ANCHOR_AREAS.includes(place.name)) return null;

  const records = await loadGymRecords();
  const matches = records
    .map((record) => ({
      record,
      distanceKm: haversineKm(place.position, record.location.position),
      observation: record.equipment.find((item) => item.equipmentTypeId === type.id),
    }))
    .filter((entry) => entry.distanceKm <= RADIUS_KM && entry.observation?.presence === 'yes')
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (matches.length < MIN_GYMS) return null;
  return { place, type, matches };
}

/**
 * Area-plus-equipment pages, generated only where there is something to say.
 *
 * A page is created only when at least two gyms in the area have the item
 * recorded as available, which keeps this to a handful of genuinely useful
 * pages instead of an index full of near-empty ones.
 */
export async function generateStaticParams() {
  const records = await loadGymRecords();
  const params: Array<{ area: string; equipment: string }> = [];

  for (const place of PILOT_PLACES.filter((candidate) => ANCHOR_AREAS.includes(candidate.name))) {
    const nearby = records.filter(
      (record) => haversineKm(place.position, record.location.position) <= RADIUS_KM,
    );

    const ranked = EQUIPMENT_TYPES.map((type) => ({
      type,
      count: nearby.filter((record) =>
        record.equipment.some((item) => item.equipmentTypeId === type.id && item.presence === 'yes'),
      ).length,
    }))
      .filter((entry) => entry.count >= MIN_GYMS)
      .sort((a, b) => b.count - a.count || a.type.id.localeCompare(b.type.id))
      .slice(0, MAX_PER_AREA);

    for (const entry of ranked) {
      params.push({ area: suburbSlug(place.name), equipment: equipmentSlug(entry.type.id) });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string; equipment: string }>;
}): Promise<Metadata> {
  const { area, equipment } = await params;
  const data = await pageData(area, equipment);
  if (!data) return { title: 'Not covered' };

  return {
    title: `Gyms with a ${data.type.label.toLowerCase()} in ${data.place.name}`,
    description: `${data.matches.length} gyms near ${data.place.name} where a ${data.type.label.toLowerCase()} is recorded as available, with the date each was last confirmed.`,
    alternates: { canonical: `/gyms/${area}/${equipment}` },
    robots: config.dataSource === 'demo' ? { index: false, follow: false } : undefined,
  };
}

export default async function AreaEquipmentPage({
  params,
}: {
  params: Promise<{ area: string; equipment: string }>;
}) {
  const { area, equipment } = await params;
  const data = await pageData(area, equipment);
  if (!data) notFound();

  const asOf = new Date();

  return (
    <div className="page page--narrow">
      <h1>
        Gyms with a {data.type.label.toLowerCase()} in {data.place.name}
      </h1>
      <p className="muted">
        {data.matches.length} gyms within {RADIUS_KM} km of {data.place.name} have a{' '}
        {data.type.label.toLowerCase()} recorded as available. {data.type.hint} We recheck equipment
        every {PILOT_FRESHNESS.equipmentDays} days; each entry below says when it was last
        confirmed, and anything older than that target does not count as confirmed.
      </p>

      <div className="stack">
        {data.matches.map(({ record, distanceKm, observation }) => {
          const freshness = observation
            ? assessFreshness(observation.provenance, 'equipment', asOf, PILOT_FRESHNESS)
            : null;
          return (
            <article className="card" key={record.location.id}>
              <h2 style={{ fontSize: 17, marginBottom: 2 }}>
                <Link href={`/gym/${record.location.slug}`}>{record.location.name}</Link>
              </h2>
              <p className="meta-line" style={{ marginTop: 0 }}>
                {record.location.address.suburb} · {formatDistanceKm(distanceKm)}
              </p>
              <p style={{ marginTop: 8, marginBottom: 0 }}>
                {observation?.count !== null && observation?.count !== undefined
                  ? `${observation.count} recorded`
                  : 'Present, count not recorded'}
                {observation?.maxWeightKg ? ` · heaviest pair ${observation.maxWeightKg} kg` : ''}
                {freshness ? ` · ${describeFreshness(freshness)}` : ''}
              </p>
            </article>
          );
        })}
      </div>

      <p style={{ marginTop: 24 }}>
        <Link
          className="button button--primary"
          href={`/search?q=${encodeURIComponent(data.place.name)}&eq=${data.type.id}`}
        >
          Search with this filter and your own budget and visit time
        </Link>
      </p>

      <p className="meta-line" style={{ marginTop: 16 }}>
        <Link href={`/gyms/${area}`}>All gyms in {data.place.name}</Link>
      </p>
    </div>
  );
}
