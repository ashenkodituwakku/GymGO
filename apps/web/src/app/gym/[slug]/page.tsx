import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AMENITIES,
  EQUIPMENT_TYPES,
  accessVerdictLabel,
  assessAllOffers,
  describeMembership,
  describeNextOpening,
  describeRating,
  equipmentLabel,
  equipmentMatchStateLabel,
  evaluateGym,
  formatMoney,
  productTypeLabel,
  publishedReviews,
  summariseAspects,
  summariseRatings,
  summariseWeek,
  zonedTimeToInstant,
  type AccessAudience,
  type AmenityId,
  type EquipmentCategory,
} from '@gymgo/domain';
import { ConflictNote, EvidenceLabel, PhotoSlot, SourceList } from '@/components/Evidence';
import { PrimaryActions } from '@/components/PrimaryActions';
import { SaveButton } from '@/components/SaveButton';
import { GymContributions } from '@/components/GymContributions';
import { findGymBySlug, loadGyms, loadReviewsForGym } from '@/server/gyms';
import { loadAuditTrail, MODERATION_ACTION_LABELS } from '@/server/moderation';
import { getCurrentUser } from '@/server/auth';
import { PILOT_AREA, PILOT_FRESHNESS, config } from '@/server/config';
import { formatMinuteInput, parseSearchParams, type ParamsRecord } from '@/server/search-params';
import { accessBadgeClass, cashNeededNote, priceHeadline, titleCase } from '@/lib/format';

export async function generateStaticParams() {
  const gyms = await loadGyms();
  return gyms.map((gym) => ({ slug: gym.record.location.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gym = await findGymBySlug(slug);
  if (!gym) return { title: 'Gym not found' };

  const location = gym.record.location;
  const name = `${location.name}${location.branch ? ` — ${location.branch}` : ''}`;
  const visitor = gym.record.schedules.find((schedule) => schedule.audience === 'visitor');
  const hoursKnown = visitor && visitor.provenance.status !== 'unknown';

  return {
    title: `${name}, ${location.address.suburb}`,
    description:
      `${name} in ${location.address.suburb}, ${location.address.state}. ` +
      `Visitor prices, ${hoursKnown ? 'guest entry hours' : 'guest entry hours not yet confirmed'}, ` +
      `equipment and the entry conditions for a first visit. Each fact shows its source and check date.`,
    alternates: { canonical: `/gym/${location.slug}` },
    // Demo records must never be indexed as though they were real venues.
    robots: location.isDemoData ? { index: false, follow: false } : undefined,
  };
}

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  racks_and_platforms: 'Racks and platforms',
  free_weights: 'Free weights',
  machines: 'Machines',
  cardio: 'Cardio',
  functional: 'Functional',
};

const AUDIENCE_LABELS: Record<AccessAudience, string> = {
  member: 'Member access',
  staffed: 'Reception staffed',
  visitor: 'Visitor entry',
};

const AUDIENCE_NOTES: Record<AccessAudience, string> = {
  member: 'When existing members can get in. This does not establish guest entry.',
  staffed: 'When someone is at the desk. Inductions and first visits usually need this.',
  visitor: 'When someone without a membership can enter. This is the one that matters for a visit.',
};

export default async function GymPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ParamsRecord>;
}) {
  const { slug } = await params;
  const gym = await findGymBySlug(slug);
  if (!gym) notFound();

  const query = await searchParams;
  const parsed = parseSearchParams(query);
  const asOf = new Date();
  const record = gym.record;
  const location = record.location;

  const allReviews = await loadReviewsForGym(location.id);
  const published = publishedReviews(allReviews);
  const rating = summariseRatings(allReviews);
  const aspects = summariseAspects(allReviews);
  const auditTrail = await loadAuditTrail(location.id);
  const user = await getCurrentUser();

  const evaluation = evaluateGym(record, parsed.query, {
    reviews: published,
    asOf,
    policy: PILOT_FRESHNESS,
  });
  const offerAssessments = assessAllOffers(record.offers, {
    profile: parsed.query.profile,
    visitLocalDate: parsed.query.visitDate,
    asOf,
    policy: PILOT_FRESHNESS,
  });

  const visitInstant = zonedTimeToInstant(
    parsed.query.visitDate,
    parsed.query.visitMinuteOfDay,
    PILOT_AREA.timezone,
  );

  const backHref = `/search?${new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined ? [] : (Array.isArray(value) ? value : [value]).map((item) => [key, item] as [string, string]),
    ),
  ).toString()}`;

  const flash = typeof query.done === 'string' ? query.done : null;
  const flashError = typeof query.error === 'string' ? query.error : null;

  return (
    <div className="page">
      <p className="small">
        <Link href={backHref}>← Back to results</Link>
      </p>

      {flash && (
        <p className="notice notice--success" role="status">
          {flash}
        </p>
      )}
      {flashError && (
        <p className="notice notice--error" role="alert">
          {flashError}
        </p>
      )}

      <header className="stack stack--tight">
        <h1 style={{ marginBottom: 2 }}>
          {location.name}
          {location.branch ? ` — ${location.branch}` : ''}
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          {location.address.line1}, {location.address.suburb} {location.address.state}{' '}
          {location.address.postcode} · {location.trainingTypes.map(titleCase).join(', ')}
        </p>
        <div className="row">
          <span className={accessBadgeClass(evaluation.access.verdict)}>
            {accessVerdictLabel(evaluation.access.verdict)} at{' '}
            {formatMinuteInput(parsed.query.visitMinuteOfDay)} on {parsed.query.visitDate}
          </span>
          <span className="meta-line">{describeRating(rating)}</span>
        </div>
      </header>

      {location.operatingStatus !== 'open' && (
        <p className="notice notice--warning" style={{ marginTop: 12 }}>
          <strong>{titleCase(location.operatingStatus)}.</strong>{' '}
          {location.operatingStatusNote ?? 'We have not recorded a reopening date.'}
        </p>
      )}

      <div className="detail-grid" style={{ marginTop: 20 }}>
        <div className="stack stack--loose">
          <section>
            <PhotoSlot large />
            <p className="meta-line" style={{ marginTop: 6 }}>
              {location.isDemoData
                ? 'This is a demo listing for an invented gym, so no photograph of it exists.'
                : 'No photograph has been supplied with permission to publish.'}
            </p>
          </section>

          {/* --- Cost of a visit ------------------------------------------ */}
          <section aria-labelledby="prices">
            <h2 id="prices">What a visit costs</h2>
            {offerAssessments.length === 0 && (
              <p className="notice">No prices have been recorded for this gym yet.</p>
            )}

            <div className="stack">
              {offerAssessments.map((assessment) => {
                const offer = assessment.offer;
                const membership = describeMembership(offer);
                const cash = cashNeededNote(assessment.cost);
                return (
                  <div className="card" key={offer.id}>
                    <div className="row row--between">
                      <div>
                        <h3 style={{ marginBottom: 2 }}>{offer.label}</h3>
                        <p className="meta-line" style={{ margin: 0 }}>
                          {productTypeLabel(offer.productType)}
                          {offer.validityDays ? ` · valid ${offer.validityDays} day${offer.validityDays === 1 ? '' : 's'}` : ''}
                          {offer.durationMinutes ? ` · ${offer.durationMinutes} minutes` : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="gym-card__price">{priceHeadline(assessment.cost)}</div>
                        {offer.grantsGymFloorAccess !== 'yes' && (
                          <span className="badge badge--ruled-out">
                            {offer.grantsGymFloorAccess === 'no'
                              ? 'No gym floor access'
                              : 'Gym floor access unconfirmed'}
                          </span>
                        )}
                      </div>
                    </div>

                    <table className="price-table" style={{ marginTop: 10 }}>
                      <caption className="visually-hidden">Price breakdown for {offer.label}</caption>
                      <tbody>
                        {assessment.cost.lines.map((line, index) => (
                          <tr key={`${line.label}-${index}`}>
                            <td>
                              {line.label}
                              {line.kind === 'deposit' ? ' (refundable)' : ''}
                            </td>
                            <td>
                              {line.amountMinor === null ? 'Not confirmed' : formatMoney(line.amountMinor, offer.currency)}
                            </td>
                          </tr>
                        ))}
                        <tr className="total">
                          <td>Total you do not get back</td>
                          <td>{priceHeadline(assessment.cost)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {cash && <p className="small muted" style={{ marginTop: 6 }}>{cash}</p>}

                    {offer.inclusions.length > 0 && (
                      <p className="small muted" style={{ marginTop: 6 }}>
                        Includes: {offer.inclusions.join(', ')}.
                      </p>
                    )}

                    <p className="meta-line" style={{ marginTop: 6 }}>
                      Buy: {titleCase(offer.purchaseMethod)}
                      {offer.availableUntil ? ` · available until ${offer.availableUntil}` : ''}
                    </p>

                    {membership && (
                      <details className="disclosure" style={{ marginTop: 10 }}>
                        <summary>Membership commitment</summary>
                        <ul className="limitation-list">
                          <li>
                            {formatMoney(membership.perIntervalMinor, offer.currency)} {membership.billingLabel}
                          </li>
                          <li>
                            Upfront:{' '}
                            {membership.upfrontUnknown
                              ? 'not confirmed — at least one joining or card fee amount is unstated'
                              : formatMoney(membership.upfrontMinor, offer.currency)}
                          </li>
                          <li>{membership.minimumTermLabel}</li>
                          <li>{membership.cancellationLabel}</li>
                          {membership.effectiveWeeklyNote && <li>{membership.effectiveWeeklyNote}</li>}
                        </ul>
                      </details>
                    )}

                    {assessment.reasons.length > 0 && (
                      <ul className="limitation-list" style={{ marginTop: 10 }}>
                        {assessment.reasons.map((reason, index) => (
                          <li key={`${reason.code}-${index}`}>{reason.message}</li>
                        ))}
                      </ul>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <EvidenceLabel
                        provenance={offer.provenance}
                        freshnessClass="visitor_price_access"
                        asOf={asOf}
                      />
                      <ConflictNote provenance={offer.provenance} />
                      <details className="disclosure" style={{ marginTop: 8 }}>
                        <summary>Where this price came from</summary>
                        <SourceList provenance={offer.provenance} />
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="meta-line" style={{ marginTop: 10 }}>
              Budgets are matched against the total you do not get back. Refundable deposits are
              listed separately and never counted towards a budget, but are included in the cash
              you need on the day.
            </p>
          </section>

          {/* --- Getting in ------------------------------------------------ */}
          <section aria-labelledby="access">
            <h2 id="access">Getting in as a visitor</h2>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="row">
                <span className={accessBadgeClass(evaluation.access.verdict)}>
                  {accessVerdictLabel(evaluation.access.verdict)}
                </span>
                <span className="meta-line">
                  for {parsed.query.visitDate} at {formatMinuteInput(parsed.query.visitMinuteOfDay)}{' '}
                  ({PILOT_AREA.timezone})
                </span>
              </div>
              {evaluation.access.reasons.length > 0 ? (
                <ul className="limitation-list" style={{ marginTop: 8 }}>
                  {evaluation.access.reasons.map((reason, index) => (
                    <li key={`${reason.code}-${index}`}>{reason.message}</li>
                  ))}
                </ul>
              ) : (
                <p className="small muted" style={{ marginTop: 8 }}>
                  Guest entry is open at that time and we have no outstanding conditions on record.
                </p>
              )}
            </div>

            <div className="stack">
              {(['visitor', 'staffed', 'member'] as AccessAudience[]).map((audience) => {
                const schedule = record.schedules.find((item) => item.audience === audience);
                if (!schedule) {
                  return (
                    <div className="card card--muted" key={audience}>
                      <h3 style={{ marginBottom: 2 }}>{AUDIENCE_LABELS[audience]}</h3>
                      <p className="small muted" style={{ margin: 0 }}>
                        Not established. {AUDIENCE_NOTES[audience]}
                      </p>
                    </div>
                  );
                }
                const next =
                  audience === 'visitor' ? describeNextOpening(schedule, visitInstant) : null;
                return (
                  <div className="card card--muted" key={audience}>
                    <h3 style={{ marginBottom: 2 }}>{AUDIENCE_LABELS[audience]}</h3>
                    <p className="meta-line" style={{ marginTop: 0 }}>{AUDIENCE_NOTES[audience]}</p>
                    <ul className="limitation-list" style={{ marginTop: 6 }}>
                      {summariseWeek(schedule).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    {schedule.exceptions.length > 0 && (
                      <ul className="limitation-list" style={{ marginTop: 6 }}>
                        {schedule.exceptions.map((exception) => (
                          <li key={exception.date}>
                            {exception.date}: {exception.closed ? 'closed' : 'changed hours'} — {exception.note}
                          </li>
                        ))}
                      </ul>
                    )}
                    {next && (
                      <p className="meta-line" style={{ marginTop: 6 }}>
                        Next guest entry after your chosen time: {next}.
                      </p>
                    )}
                    <p className="meta-line" style={{ marginTop: 6 }}>
                      All times {schedule.timezone}.
                    </p>
                    <div style={{ marginTop: 8 }}>
                      <EvidenceLabel
                        provenance={schedule.provenance}
                        freshnessClass="visitor_price_access"
                        asOf={asOf}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <h3>Before your first visit</h3>
              <ul className="limitation-list">
                <li>Advance booking: {triLabel(record.prerequisites.advanceBookingRequired)}
                  {record.prerequisites.bookingLeadTimeHours !== null
                    ? ` (${record.prerequisites.bookingLeadTimeHours} hours ahead)`
                    : ''}
                </li>
                <li>Induction on a first visit: {triLabel(record.prerequisites.inductionRequired)}</li>
                <li>Photo identification: {triLabel(record.prerequisites.photoIdRequired)}</li>
                <li>
                  Minimum age:{' '}
                  {record.prerequisites.minAgeYears === null
                    ? 'not established'
                    : `${record.prerequisites.minAgeYears}`}
                </li>
                <li>
                  Residency conditions:{' '}
                  {record.prerequisites.residencyRule === 'unknown'
                    ? 'not established'
                    : titleCase(record.prerequisites.residencyRule)}
                </li>
                <li>
                  A member must sign you in: {triLabel(record.prerequisites.memberAccompanimentRequired)}
                </li>
                {record.prerequisites.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <div style={{ marginTop: 8 }}>
                <EvidenceLabel
                  provenance={record.prerequisites.provenance}
                  freshnessClass="visitor_price_access"
                  asOf={asOf}
                />
              </div>
            </div>
          </section>

          {/* --- Equipment ------------------------------------------------- */}
          <section aria-labelledby="equipment">
            <h2 id="equipment">Equipment</h2>
            <p className="small muted">
              What is on the floor, how many where we know, and when it was last confirmed. Whether
              a machine is free right now is a different question, and we do not claim to answer it.
            </p>

            {evaluation.equipment.matches.length > 0 && (
              <div className="card card--muted" style={{ marginBottom: 12 }}>
                <h3 style={{ marginBottom: 6 }}>Against what you asked for</h3>
                <ul className="limitation-list">
                  {evaluation.equipment.matches.map((match) => (
                    <li key={match.requirement.equipmentTypeId}>
                      <strong>{equipmentLabel(match.requirement.equipmentTypeId)}</strong>:{' '}
                      {equipmentMatchStateLabel(match.state)} — {match.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(Object.keys(CATEGORY_LABELS) as EquipmentCategory[]).map((category) => {
              const types = EQUIPMENT_TYPES.filter((type) => type.category === category);
              const rows = types
                .map((type) => ({
                  type,
                  observation: record.equipment.find((item) => item.equipmentTypeId === type.id),
                }))
                .filter((row) => row.observation !== undefined);
              if (rows.length === 0) return null;

              return (
                <div key={category} style={{ marginBottom: 12 }}>
                  <h3>{CATEGORY_LABELS[category]}</h3>
                  <ul className="stack stack--tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {rows.map(({ type, observation }) => {
                      if (!observation) return null;
                      return (
                        <li className="fact" key={type.id}>
                          <div className="row row--between">
                            <div>
                              <div className="fact__label">{type.label}</div>
                              <div className="fact__value">
                                {observation.presence === 'yes' && (
                                  <>
                                    Available
                                    {observation.count !== null ? ` · ${observation.count}` : ' · count not recorded'}
                                    {observation.maxWeightKg !== null
                                      ? ` · heaviest pair ${observation.maxWeightKg} kg`
                                      : type.usesMaxWeight
                                        ? ' · heaviest pair not recorded'
                                        : ''}
                                    {observation.brand ? ` · ${observation.brand}` : ''}
                                  </>
                                )}
                                {observation.presence === 'no' && 'Not available'}
                                {observation.presence === 'unknown' && 'Not established'}
                              </div>
                              {observation.condition !== 'unknown' && (
                                <div className="meta-line">
                                  Condition when last seen: {titleCase(observation.condition)}
                                  {observation.conditionObservedAt
                                    ? ` (${observation.conditionObservedAt.slice(0, 10)})`
                                    : ''}
                                </div>
                              )}
                            </div>
                            <EvidenceLabel
                              provenance={observation.provenance}
                              freshnessClass="equipment"
                              asOf={asOf}
                            />
                          </div>
                          <ConflictNote provenance={observation.provenance} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {record.equipment.length === 0 && (
              <p className="notice">No equipment has been recorded for this gym yet.</p>
            )}
          </section>

          {/* --- Amenities -------------------------------------------------- */}
          <section aria-labelledby="amenities">
            <h2 id="amenities">Facilities and accessibility</h2>
            <ul className="stack stack--tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {AMENITIES.map((amenity) => {
                const observation = record.amenities.find(
                  (item) => item.amenityId === (amenity.id as AmenityId),
                );
                if (!observation) return null;
                return (
                  <li className="fact" key={amenity.id}>
                    <div className="row row--between">
                      <div>
                        <div className="fact__label">{amenity.label}</div>
                        <div className="fact__value">
                          {observation.present === 'yes' && 'Available'}
                          {observation.present === 'no' && 'Not available'}
                          {observation.present === 'unknown' && 'Not established'}
                          {observation.note ? ` — ${observation.note}` : ''}
                        </div>
                        {amenity.note && <div className="meta-line">{amenity.note}</div>}
                      </div>
                      <EvidenceLabel
                        provenance={observation.provenance}
                        freshnessClass="amenity"
                        asOf={asOf}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="meta-line" style={{ marginTop: 8 }}>
              Accessibility facts are recorded one at a time. A step-free entrance does not tell us
              about the bathroom, and neither is inferred from a general claim.
            </p>
          </section>

          {/* --- Busyness --------------------------------------------------- */}
          <section aria-labelledby="busyness">
            <h2 id="busyness">How busy it is</h2>
            <p className="notice">
              <strong>Live crowd information unavailable.</strong> We have no authorised source for
              how busy this gym is right now, and we will not estimate it. We also do not infer
              whether a particular machine is free from how many people are in the building.
            </p>
            <p className="meta-line">
              No recent user crowd reports. Reports would need a timestamp, an expiry and enough
              independent submissions before we would show one.
            </p>
          </section>

          {/* --- Reviews ---------------------------------------------------- */}
          <section aria-labelledby="reviews">
            <h2 id="reviews">Reviews</h2>
            <p className="small muted">
              These are GymGO reviews only. We do not mix in ratings from anywhere else, and we do
              not average across sources.
            </p>

            {published.length === 0 ? (
              <p className="notice">No reviews yet. That is an absence of reviews, not a low score.</p>
            ) : (
              <>
                <div className="card card--muted">
                  <div className="row">
                    <strong>{describeRating(rating)}</strong>
                    {(['equipment', 'cleanliness', 'atmosphere', 'value'] as const).map((aspect) => (
                      <span className="meta-line" key={aspect}>
                        {titleCase(aspect)}:{' '}
                        {aspects[aspect].average === null
                          ? 'not rated'
                          : `${aspects[aspect].average} (${aspects[aspect].count})`}
                      </span>
                    ))}
                  </div>
                </div>
                <ul className="stack" style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                  {published.map((review) => (
                    <li className="card" key={review.id}>
                      <div className="row row--between">
                        <strong>{review.overall} out of 5</strong>
                        <span className="meta-line">
                          {review.authorDisplayName} · {review.createdAt.slice(0, 10)}
                          {review.visitedOn ? ` · says they visited ${review.visitedOn}` : ''}
                        </span>
                      </div>
                      <p style={{ marginTop: 8 }}>{review.body}</p>
                      <p className="meta-line">
                        Visit not independently verified. We have no mechanism to confirm a visit,
                        so no review here carries a verified badge.
                      </p>
                      {review.ownerReply?.status === 'published' && (
                        <div className="notice small" style={{ marginTop: 8 }}>
                          <strong>Reply from the gym:</strong> {review.ownerReply.body}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* --- Contributions ---------------------------------------------- */}
          <GymContributions
            gymId={location.id}
            gymName={location.name}
            slug={location.slug}
            offers={record.offers.map((offer) => ({ id: offer.id, label: offer.label }))}
            equipmentTypes={EQUIPMENT_TYPES.map((type) => ({ id: type.id, label: type.label }))}
            reviews={allReviews.map((review) => ({
              id: review.id,
              status: review.status,
              overall: review.overall,
              authorDisplayName: review.authorDisplayName,
              hasOwnerReply: review.ownerReply !== null,
            }))}
            user={{
              id: user.id,
              role: user.role,
              displayName: user.displayName,
              ownedGymIds: user.ownedGymIds,
              blocked: user.blocked,
              createdAt: user.createdAt,
            }}
            authEnabled={config.authAdapter === 'local-dev'}
          />

          {auditTrail.length > 0 && (
            <section aria-labelledby="audit">
              <h2 id="audit">Change history</h2>
              <p className="small muted">
                Moderation decisions about this listing. Reasons are public; the evidence behind an
                ownership claim is not.
              </p>
              <ul className="limitation-list">
                {auditTrail.map((event) => (
                  <li key={event.id}>
                    {event.createdAt.slice(0, 10)} — {MODERATION_ACTION_LABELS[event.action]}: {event.reason}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {gym.annotations.length > 0 && (
            <section aria-labelledby="annotations">
              <h2 id="annotations">Approved corrections</h2>
              <ul className="limitation-list">
                {gym.annotations.map((annotation, index) => (
                  <li key={index}>
                    {annotation.appliedAt.slice(0, 10)} — {titleCase(annotation.targetKind)}:{' '}
                    {annotation.text}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* --- Sidebar ------------------------------------------------------ */}
        <aside className="stack">
          <div className="card">
            <h2 style={{ fontSize: 17 }}>Take action</h2>
            <PrimaryActions
              isDemo={location.isDemoData}
              name={location.name}
              address={`${location.address.line1}, ${location.address.suburb} ${location.address.state} ${location.address.postcode}`}
              phone={location.phone}
              website={location.website}
            />
            <div className="row" style={{ marginTop: 10 }}>
              <SaveButton gymId={location.id} slug={location.slug} name={location.name} small />
              <Link className="button button--small" href={`/compare?ids=${location.id}`}>
                Compare
              </Link>
            </div>
            <p className="meta-line" style={{ marginTop: 8 }}>
              Saving keeps this gym in this browser only. No account needed and nothing is sent to
              us.
            </p>
          </div>

          <div className="card card--muted">
            <h3>How we label facts</h3>
            <ul className="limitation-list">
              <li>
                <strong>Confirmed by the gym</strong> — the operator told us.
              </li>
              <li>
                <strong>Checked by us</strong> — someone from our team saw it.
              </li>
              <li>
                <strong>Reported by a user</strong> — a contributor told us.
              </li>
              <li>
                <strong>Sources disagree</strong> — we have two answers and have not resolved them.
              </li>
              <li>
                <strong>Not established</strong> — nobody has answered this either way.
              </li>
            </ul>
            <p className="meta-line" style={{ marginTop: 8 }}>
              Pilot recheck targets: visitor prices and access every {PILOT_FRESHNESS.visitorPriceAccessDays}{' '}
              days, equipment every {PILOT_FRESHNESS.equipmentDays} days.{' '}
              <Link href="/about/data">More about our data</Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function triLabel(value: 'yes' | 'no' | 'unknown'): string {
  if (value === 'yes') return 'required';
  if (value === 'no') return 'not required';
  return 'not established';
}
