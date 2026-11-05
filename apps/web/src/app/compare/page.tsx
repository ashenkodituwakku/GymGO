import type { Metadata } from 'next';
import Link from 'next/link';
import {
  accessVerdictLabel,
  describeRating,
  equipmentLabel,
  equipmentMatchStateLabel,
  evaluateGym,
  formatDistanceKm,
  formatMoney,
  isMultiVisitProduct,
  productTypeLabel,
  describeMembership,
  summariseRatings,
  summariseWeek,
  type GymSearchResult,
} from '@gymgo/domain';
import { loadGyms, loadPublishedReviewsByGym } from '@/server/gyms';
import { PILOT_AREA, PILOT_FRESHNESS } from '@/server/config';
import { parseSearchParams, formatMinuteInput, type ParamsRecord } from '@/server/search-params';
import { accessBadgeClass, cashNeededNote, priceSummary, TIER_LABEL } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Compare gyms',
  description: 'Compare up to three gyms on visit cost, visitor access, equipment and evidence age.',
  robots: { index: false, follow: true },
};

const MAX = 3;

/**
 * Side-by-side comparison.
 *
 * Every cell says what we hold, including when that is nothing. A blank is
 * never rendered as "no" and an unknown price is never rendered as free — the
 * whole point of comparing is that the gaps are as informative as the values.
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<ParamsRecord>;
}) {
  const params = await searchParams;
  const parsed = parseSearchParams(params);
  const asOf = new Date();

  const ids = (Array.isArray(params.ids) ? params.ids.join(',') : (params.ids ?? ''))
    .split(',')
    .filter(Boolean)
    .slice(0, MAX);

  const gyms = await loadGyms();
  const reviewsByGymId = await loadPublishedReviewsByGym();

  const results: GymSearchResult[] = ids
    .map((id) => gyms.find((gym) => gym.record.location.id === id))
    .filter((gym): gym is NonNullable<typeof gym> => gym !== undefined)
    .map((gym) =>
      evaluateGym(gym.record, parsed.query, {
        reviews: reviewsByGymId[gym.record.location.id] ?? [],
        asOf,
        policy: PILOT_FRESHNESS,
      }),
    );

  if (results.length === 0) {
    return (
      <div className="page page--narrow">
        <h1>Compare gyms</h1>
        <p className="notice">
          Nothing selected yet. Pick up to {MAX} gyms with the Compare button on a search result.
        </p>
        <p>
          <Link className="button button--primary" href="/search">
            Back to search
          </Link>
        </p>
      </div>
    );
  }

  const requirements = parsed.query.requiredEquipment;

  return (
    <div className="page">
      <h1>Comparing {results.length} {results.length === 1 ? 'gym' : 'gyms'}</h1>
      <p className="muted">
        For a visit on {parsed.query.visitDate} at {formatMinuteInput(parsed.query.visitMinuteOfDay)}{' '}
        ({PILOT_AREA.timezone})
        {parsed.query.budgetMinor !== null
          ? `, with a ${formatMoney(parsed.query.budgetMinor)} non-refundable budget`
          : ''}
        .
      </p>

      <div className="table-scroll" style={{ marginTop: 16 }}>
        <table className="compare">
          <caption className="visually-hidden">
            Comparison of {results.map((result) => result.record.location.name).join(', ')}
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Attribute</span>
              </th>
              {results.map((result) => (
                <th scope="col" key={result.record.location.id}>
                  <Link href={`/gym/${result.record.location.slug}`}>
                    {result.record.location.name}
                  </Link>
                  <div className="meta-line">{result.record.location.address.suburb}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Match</th>
              {results.map((result) => (
                <td key={result.record.location.id}>
                  {TIER_LABEL[result.tier]}
                  {result.limitations.length > 0 && (
                    <ul className="limitation-list" style={{ marginTop: 4 }}>
                      {result.limitations.slice(0, 3).map((limitation, index) => (
                        <li key={index}>{limitation.message}</li>
                      ))}
                    </ul>
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row">Visit cost</th>
              {results.map((result) => {
                const price = priceSummary(result.offers);
                const cash = cashNeededNote(result.offers.bestAvailable?.cost ?? null);
                return (
                  <td key={result.record.location.id}>
                    <strong>{price.headline}</strong>
                    <div className="meta-line">{price.sublabel}</div>
                    {cash && <div className="meta-line">{cash}</div>}
                  </td>
                );
              })}
            </tr>

            <tr>
              <th scope="row">Longer products</th>
              {results.map((result) => {
                const multi = result.record.offers.filter(isMultiVisitProduct);
                const memberships = result.record.offers.filter(
                  (offer) => offer.productType === 'membership',
                );
                return (
                  <td key={result.record.location.id}>
                    {multi.length === 0 && memberships.length === 0 && (
                      <span className="muted">None recorded</span>
                    )}
                    {multi.map((offer) => (
                      <div key={offer.id}>
                        {productTypeLabel(offer.productType)}: {formatMoney(offer.baseAmountMinor, offer.currency)}
                        {offer.validityDays ? ` for ${offer.validityDays} days` : ''}
                      </div>
                    ))}
                    {memberships.map((offer) => {
                      const membership = describeMembership(offer);
                      return (
                        <div key={offer.id} style={{ marginTop: 4 }}>
                          Membership: {formatMoney(offer.baseAmountMinor, offer.currency)}{' '}
                          {membership?.billingLabel}
                          <div className="meta-line">
                            {membership?.minimumTermLabel}. {membership?.cancellationLabel}. Upfront{' '}
                            {membership?.upfrontUnknown
                              ? 'not confirmed'
                              : formatMoney(membership?.upfrontMinor ?? null, offer.currency)}
                            .
                          </div>
                          {membership?.effectiveWeeklyNote && (
                            <div className="meta-line">{membership.effectiveWeeklyNote}</div>
                          )}
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>

            <tr>
              <th scope="row">Visitor access at your time</th>
              {results.map((result) => (
                <td key={result.record.location.id}>
                  <span className={accessBadgeClass(result.access.verdict)}>
                    {accessVerdictLabel(result.access.verdict)}
                  </span>
                  <ul className="limitation-list" style={{ marginTop: 4 }}>
                    {result.access.reasons.slice(0, 3).map((reason, index) => (
                      <li key={index}>{reason.message}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row">Visitor hours</th>
              {results.map((result) => {
                const schedule = result.access.visitorSchedule;
                return (
                  <td key={result.record.location.id}>
                    {schedule ? (
                      <ul className="limitation-list">
                        {summariseWeek(schedule).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="muted">Not established</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {requirements.map((requirement) => (
              <tr key={requirement.equipmentTypeId}>
                <th scope="row">
                  {equipmentLabel(requirement.equipmentTypeId)}
                  {requirement.minMaxWeightKg ? ` ${requirement.minMaxWeightKg} kg` : ''}
                </th>
                {results.map((result) => {
                  const match = result.equipment.matches.find(
                    (candidate) => candidate.requirement.equipmentTypeId === requirement.equipmentTypeId,
                  );
                  return (
                    <td key={result.record.location.id}>
                      {match ? (
                        <>
                          {equipmentMatchStateLabel(match.state)}
                          <div className="meta-line">{match.detail}</div>
                        </>
                      ) : (
                        <span className="muted">Not established</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {requirements.length === 0 && (
              <tr>
                <th scope="row">Equipment</th>
                {results.map((result) => (
                  <td key={result.record.location.id}>
                    <span className="muted">
                      No equipment requirements set. Add some on the search page to compare them
                      here.
                    </span>
                    <div className="meta-line" style={{ marginTop: 4 }}>
                      {result.record.equipment.filter((item) => item.presence === 'yes').length} items
                      recorded as available.
                    </div>
                  </td>
                ))}
              </tr>
            )}

            <tr>
              <th scope="row">Facilities</th>
              {results.map((result) => {
                const present = result.record.amenities.filter((item) => item.present === 'yes');
                const unknown = result.record.amenities.filter((item) => item.present === 'unknown');
                return (
                  <td key={result.record.location.id}>
                    {present.length > 0 ? (
                      present.map((item) => item.amenityId.replace(/_/g, ' ')).join(', ')
                    ) : (
                      <span className="muted">None recorded as available</span>
                    )}
                    {unknown.length > 0 && (
                      <div className="meta-line">
                        Not established: {unknown.map((item) => item.amenityId.replace(/_/g, ' ')).join(', ')}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>

            <tr>
              <th scope="row">Reviews</th>
              {results.map((result) => (
                <td key={result.record.location.id}>
                  {describeRating(summariseRatings(reviewsByGymId[result.record.location.id] ?? []))}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row">Evidence age</th>
              {results.map((result) => {
                const priceChecked = result.offers.bestAvailable?.freshness;
                const accessChecked = result.access.freshness;
                return (
                  <td key={result.record.location.id}>
                    <div className="meta-line">
                      Price:{' '}
                      {priceChecked?.lastCheckedAt
                        ? `${priceChecked.ageDays} days ago`
                        : 'never checked'}
                    </div>
                    <div className="meta-line">
                      Visitor hours:{' '}
                      {accessChecked?.lastCheckedAt
                        ? `${accessChecked.ageDays} days ago`
                        : 'never checked'}
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr>
              <th scope="row">Distance</th>
              {results.map((result) => (
                <td key={result.record.location.id}>
                  {result.distanceKm === null
                    ? 'No search centre set'
                    : formatDistanceKm(result.distanceKm)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="meta-line" style={{ marginTop: 16 }}>
        A blank cell here means we hold no record, not that the answer is no. Day, week and
        membership products are kept apart, and any weekly figure shows its arithmetic.
      </p>
    </div>
  );
}
