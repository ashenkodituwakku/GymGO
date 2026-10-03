import Link from 'next/link';
import {
  equipmentLabel,
  equipmentMatchStateLabel,
  formatDistanceKm,
  describeRating,
  type GymSearchResult,
} from '@gymgo/domain';
import { SaveButton } from './SaveButton';
import { CompareToggle } from './CompareToggle';
import { StateGlyph, glyphFor } from './StateGlyph';
import {
  TIER_BADGE_CLASS,
  TIER_LABEL,
  accessBadgeClass,
  accessVerdictLabel,
  cashNeededNote,
  priceSummary,
} from '@/lib/format';

/**
 * One result.
 *
 * The card leads with the three things the search was about — can I get in,
 * what does it cost, does it have my equipment — and states the reasons it is
 * not a confirmed match rather than leaving the reader to infer them.
 */
export function GymCard({ result, searchQuery }: { result: GymSearchResult; searchQuery: string }) {
  const { record, offers, access, equipment, rating, distanceKm, tier } = result;
  const location = record.location;
  const cost = offers.bestAvailable?.cost ?? null;
  const price = priceSummary(offers);
  const cashNote = cashNeededNote(cost);
  const href = `/gym/${location.slug}${searchQuery ? `?${searchQuery}` : ''}`;

  return (
    <article className="card">
      <div className="row row--between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="gym-card__title">
            <Link href={href}>
              {location.name}
              {location.branch ? ` — ${location.branch}` : ''}
            </Link>
          </h3>
          <p className="meta-line" style={{ margin: 0 }}>
            {location.address.suburb} {location.address.postcode}
            {distanceKm !== null ? ` · ${formatDistanceKm(distanceKm)}` : ''}
          </p>
        </div>
        <div className="gym-card__pricing">
          <div className="gym-card__price">{price.headline}</div>
          <div className="meta-line">{price.sublabel}</div>
        </div>
      </div>

      {cashNote && (
        <p className="meta-line" style={{ marginTop: 6 }}>
          {cashNote}
        </p>
      )}

      <div className="row" style={{ marginTop: 10 }}>
        <span className={TIER_BADGE_CLASS[tier]}>{TIER_LABEL[tier]}</span>
        <span className={accessBadgeClass(access.verdict)}>{accessVerdictLabel(access.verdict)}</span>
        <span className="meta-line">{describeRating(rating)}</span>
      </div>

      {equipment.matches.length > 0 && (
        <ul className="spec-list" style={{ marginTop: 12 }} aria-label="Your equipment">
          {equipment.matches.map((match) => (
            <li key={match.requirement.equipmentTypeId}>
              <StateGlyph state={glyphFor(match.state)} />
              <span>
                {equipmentLabel(match.requirement.equipmentTypeId)}
                {match.requirement.minMaxWeightKg ? ` ${match.requirement.minMaxWeightKg} kg` : ''}
                {match.state === 'confirmed' ? (
                  // Confirmed is the quiet case, so the word is for screen
                  // readers only; anything else is said out loud.
                  <span className="visually-hidden">: {equipmentMatchStateLabel(match.state)}</span>
                ) : (
                  <span className="spec__state"> · {equipmentMatchStateLabel(match.state)}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {result.limitations.length > 0 && (
        <ul className="limitation-list" style={{ marginTop: 10 }}>
          {result.limitations.slice(0, 3).map((limitation, index) => (
            <li key={`${limitation.code}-${index}`}>{limitation.message}</li>
          ))}
          {result.limitations.length > 3 && (
            <li>
              <Link href={href}>{result.limitations.length - 3} more on the gym page</Link>
            </li>
          )}
        </ul>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <Link className="button button--small button--primary" href={href}>
          See details
        </Link>
        <CompareToggle gymId={location.id} name={location.name} />
        <SaveButton gymId={location.id} slug={location.slug} name={location.name} small />
      </div>
    </article>
  );
}
