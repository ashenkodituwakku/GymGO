/**
 * Evidence display.
 *
 * Every material fact on a page is accompanied by where it came from and when
 * it was last checked. These components are the only way that information is
 * rendered, so the labelling cannot drift between pages.
 */

import {
  assessFreshness,
  describeFreshness,
  describeStatus,
  type FreshnessClass,
  type Provenance,
} from '@gymgo/domain';
import { PILOT_FRESHNESS } from '@/server/config';

const SOURCE_LABELS: Record<string, string> = {
  owner_submission: 'Submitted by the gym',
  operator_website: "From the operator's website",
  independent_check: 'Checked by us in person',
  community_report: 'Reported by a user',
  licensed_dataset: 'From a licensed dataset',
};

function badgeClass(status: Provenance['status'], stale: boolean): string {
  if (status === 'unknown') return 'badge badge--neutral';
  if (status === 'conflicting') return 'badge badge--unconfirmed';
  if (stale) return 'badge badge--unconfirmed';
  return status === 'community_reported' ? 'badge badge--neutral' : 'badge badge--confirmed';
}

export function EvidenceLabel({
  provenance,
  freshnessClass,
  asOf,
}: {
  provenance: Provenance;
  freshnessClass: FreshnessClass;
  asOf: Date;
}) {
  const freshness = assessFreshness(provenance, freshnessClass, asOf, PILOT_FRESHNESS);
  const stale = freshness.state === 'stale';

  return (
    <span className="row" style={{ gap: 6 }}>
      <span className={badgeClass(provenance.status, stale)}>{describeStatus(provenance)}</span>
      <span className="meta-line">{describeFreshness(freshness)}</span>
    </span>
  );
}

/** The sources themselves, for people who want to see the working. */
export function SourceList({ provenance }: { provenance: Provenance }) {
  if (provenance.sources.length === 0) {
    return <p className="meta-line">No source recorded. This fact has not been established.</p>;
  }

  return (
    <ul className="limitation-list">
      {provenance.sources.map((source) => (
        <li key={source.id}>
          {SOURCE_LABELS[source.sourceType] ?? source.sourceType} — {source.label}. Observed{' '}
          {source.observedAt.slice(0, 10)}, last checked {source.checkedAt.slice(0, 10)}
          {source.reviewerId ? ` by ${source.reviewerId}` : ''}.
        </li>
      ))}
    </ul>
  );
}

/** Shown when two sources disagree and nobody has resolved it. */
export function ConflictNote({ provenance }: { provenance: Provenance }) {
  if (provenance.status !== 'conflicting') return null;
  return (
    <p className="notice notice--warning small" style={{ marginTop: 6 }}>
      <strong>Sources disagree.</strong> {provenance.conflictNote} We have not chosen between them —
      check with the gym before you rely on this.
    </p>
  );
}

/**
 * The image slot.
 *
 * These are invented venues, so no photograph of them exists. Generating a
 * picture and presenting it as this gym would be a fabrication, and a
 * coloured rectangle is not a photo either, so the slot says what is true.
 */
export function PhotoSlot({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? 'no-photo no-photo--large' : 'no-photo'}>
      No photo supplied. We only show photographs we have permission to use.
    </div>
  );
}
