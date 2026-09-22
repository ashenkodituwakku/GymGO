import type { Metadata } from 'next';
import Link from 'next/link';
import { can } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { loadQueue } from '@/server/moderation';
import { loadGyms } from '@/server/gyms';
import { readStore } from '@/server/store';
import { titleCase } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Moderation',
  robots: { index: false, follow: false },
};

/**
 * The moderation queue.
 *
 * Deliberately not hidden behind a future TODO: a pilot whose data is meant to
 * be trustworthy needs someone able to approve, reject and see why. Two
 * separations are enforced rather than described:
 *
 *  - A moderator handles content. Ownership claims, which carry personal
 *    evidence, are an administrator's job and are not even listed otherwise.
 *  - Approving a claim confirms who someone is. It does not mark any fact
 *    about their gym as verified.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!can(user, 'moderation.view_queue')) {
    return (
      <div className="page page--narrow">
        <h1>Moderation</h1>
        <p className="notice notice--warning">
          You do not have permission to see the moderation queue. This page checks on the server,
          and so does every action on it.
        </p>
        <p>
          <Link href="/account">Switch account</Link>
        </p>
      </div>
    );
  }

  const queue = await loadQueue(user);
  const gyms = await loadGyms();
  const store = await readStore();
  const gymName = (id: string) =>
    gyms.find((gym) => gym.record.location.id === id)?.record.location.name ?? id;

  const flash = typeof params.done === 'string' ? params.done : null;
  const error = typeof params.error === 'string' ? params.error : null;
  const canSeeClaims = can(user, 'claim.moderate');

  return (
    <div className="page">
      <h1>Moderation queue</h1>
      <p className="muted">
        Signed in as {user.displayName} ({user.role}).
        {canSeeClaims
          ? ' You can decide ownership claims and see the evidence attached to them.'
          : ' Ownership claims are not shown to moderators because the evidence can contain personal information.'}
      </p>

      {flash && <p className="notice notice--success">{flash}</p>}
      {error && <p className="notice notice--error">{error}</p>}

      <section style={{ marginTop: 24 }}>
        <h2>Corrections ({queue.corrections.length})</h2>
        {queue.corrections.length === 0 && <p className="muted small">Nothing waiting.</p>}
        <div className="stack">
          {queue.corrections.map((correction) => {
            const structured = store.pendingStructured?.[correction.id];
            return (
              <div className="card" key={correction.id}>
                <div className="row row--between">
                  <strong>
                    <Link href={`/gym/${correction.gymId}`}>{gymName(correction.gymId)}</Link> —{' '}
                    {titleCase(correction.targetKind)}
                  </strong>
                  <span className="meta-line">{correction.submittedAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <p style={{ marginTop: 8 }}>
                  <strong>Proposed:</strong> {correction.proposedValue}
                </p>
                <p className="small muted">
                  <strong>Contributor&rsquo;s evidence:</strong> {correction.evidenceNote}
                  {correction.evidenceUrl ? ` — ${correction.evidenceUrl}` : ''}
                </p>
                <p className="meta-line">
                  {structured
                    ? `Approving applies a structured change (${structured.kind}) with fresh provenance naming this correction.`
                    : 'No machine-readable value supplied, so approving publishes this beside the fact rather than overwriting it.'}
                </p>
                <DecisionForm action="/api/v1/moderation/corrections" id={correction.id} returnTo="/admin" />
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Reviews ({queue.reviews.length})</h2>
        {queue.reviews.length === 0 && <p className="muted small">Nothing waiting.</p>}
        <div className="stack">
          {queue.reviews.map((review) => (
            <div className="card" key={review.id}>
              <div className="row row--between">
                <strong>
                  <Link href={`/gym/${review.gymId}`}>{gymName(review.gymId)}</Link> — {review.overall}/5
                </strong>
                <span className="meta-line">
                  {review.authorDisplayName} · {review.createdAt.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
              <p style={{ marginTop: 8 }}>{review.body}</p>
              {review.visitedOn && (
                <p className="meta-line">
                  Author says they visited {review.visitedOn}. This is a claim, not evidence, and
                  publishing it does not mark the visit verified.
                </p>
              )}
              <DecisionForm action="/api/v1/moderation/reviews" id={review.id} returnTo="/admin" />
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Owner replies ({queue.pendingOwnerReplies.length})</h2>
        {queue.pendingOwnerReplies.length === 0 && <p className="muted small">Nothing waiting.</p>}
        <div className="stack">
          {queue.pendingOwnerReplies.map((review) => (
            <div className="card" key={review.id}>
              <strong>{gymName(review.gymId)}</strong>
              <p className="small muted" style={{ marginTop: 6 }}>
                Replying to a {review.overall}/5 review from {review.authorDisplayName}.
              </p>
              <p>{review.ownerReply?.body}</p>
              <DecisionForm action="/api/v1/moderation/replies" id={review.id} returnTo="/admin" />
            </div>
          ))}
        </div>
      </section>

      {canSeeClaims && (
        <section style={{ marginTop: 24 }}>
          <h2>Ownership claims ({queue.claims.length})</h2>
          <p className="small muted">
            Confirming who someone is. It does not verify anything they have told us about their
            gym, and it grants control of the named branch only.
          </p>
          {queue.claims.length === 0 && <p className="muted small">Nothing waiting.</p>}
          <div className="stack">
            {queue.claims.map((claim) => (
              <div className="card" key={claim.id}>
                <div className="row row--between">
                  <strong>{gymName(claim.gymId)}</strong>
                  <span className="meta-line">{claim.submittedAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <p className="small" style={{ marginTop: 8 }}>
                  {claim.claimantName} — {claim.claimantRole}. Account: {claim.userId}.
                </p>
                <p className="small muted">
                  Check by {titleCase(claim.evidenceType)}:{' '}
                  <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{claim.evidenceRef}</span>
                </p>
                <p className="meta-line">
                  This evidence is private. It is never included in a public API response and is
                  deleted with the claim.
                </p>
                <DecisionForm action="/api/v1/moderation/claims" id={claim.id} returnTo="/admin" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <h2>Reports ({queue.reports.length})</h2>
        {queue.reports.length === 0 && <p className="muted small">Nothing waiting.</p>}
        <ul className="limitation-list">
          {queue.reports.map((report) => (
            <li key={report.id}>
              {report.createdAt.slice(0, 10)} — {report.subjectType} {report.subjectId}: {report.reason}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Recent decisions</h2>
        <p className="small muted">
          Every decision writes an audit entry with a public-safe reason. The reason appears in the
          gym&rsquo;s change history; the evidence does not.
        </p>
        <ul className="limitation-list">
          {store.moderationEvents
            .slice()
            .reverse()
            .slice(0, 15)
            .map((event) => (
              <li key={event.id}>
                {event.createdAt.slice(0, 16).replace('T', ' ')} — {event.actorId} — {event.action} —{' '}
                {event.reason}
              </li>
            ))}
          {store.moderationEvents.length === 0 && <li>No decisions recorded yet.</li>}
        </ul>
      </section>
    </div>
  );
}

/**
 * Approve or reject, with a reason.
 *
 * A plain form so it works without JavaScript. The reason is required: an
 * audit trail of unexplained decisions is not much of an audit trail.
 */
function DecisionForm({ action, id, returnTo }: { action: string; id: string; returnTo: string }) {
  return (
    <form action={action} method="post" className="row" style={{ marginTop: 10 }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="visually-hidden" htmlFor={`reason-${id}`}>
        Reason for this decision
      </label>
      <input
        id={`reason-${id}`}
        name="reason"
        type="text"
        required
        maxLength={300}
        placeholder="Reason (published in the change history)"
        style={{ flex: 1, minWidth: 220 }}
      />
      <button className="button button--small button--primary" type="submit" name="decision" value="approve">
        Approve
      </button>
      <button className="button button--small" type="submit" name="decision" value="reject">
        Reject
      </button>
    </form>
  );
}
