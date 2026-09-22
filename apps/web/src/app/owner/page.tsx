import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/server/auth';
import { loadGyms } from '@/server/gyms';
import { readStore } from '@/server/store';
import { titleCase } from '@/lib/format';

export const metadata: Metadata = {
  title: 'For gym operators',
  robots: { index: false, follow: false },
};

/**
 * The operator view.
 *
 * Shows exactly what an approved claim does and does not give you. Listing a
 * gym costs nothing, nothing here can be bought, and nothing here changes
 * where a gym appears in results.
 */
export default async function OwnerPage() {
  const user = await getCurrentUser();
  const gyms = await loadGyms();
  const store = await readStore();

  const owned = gyms.filter((gym) => user.ownedGymIds.includes(gym.record.location.id));
  const claims = store.claims.filter((claim) => claim.userId === user.id);
  const submissions = store.corrections.filter((correction) => correction.submittedBy === user.id);

  return (
    <div className="page page--narrow">
      <h1>For gym operators</h1>

      {user.role === 'anonymous' ? (
        <p className="notice">
          <Link href="/account">Sign in</Link> to claim a branch.
        </p>
      ) : (
        <p className="muted">Signed in as {user.displayName}.</p>
      )}

      <div className="card card--muted" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 17 }}>What a claim gives you, and what it does not</h2>
        <ul className="limitation-list">
          <li>You can submit updates for that branch. They still go to moderation.</li>
          <li>You can reply to reviews of that branch, once a moderator approves the reply.</li>
          <li>
            You cannot remove or edit a review about your gym, including a negative one. Reporting
            it for a rule breach is the route, and a moderator decides.
          </li>
          <li>You cannot see or change anything about another branch or operator.</li>
          <li>
            Approving your claim confirms who you are. It does not mark your prices, hours or
            equipment as verified — those are checked on their own evidence.
          </li>
          <li>
            Nothing here is for sale. There is no paid verification and no paid placement, so
            nothing you pay for could move your gym up the results.
          </li>
        </ul>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2>Branches you manage</h2>
        {owned.length === 0 ? (
          <p className="muted small">
            None yet. Open a gym&rsquo;s page and use &ldquo;Do you run this gym?&rdquo; to submit a
            claim.
          </p>
        ) : (
          <ul className="result-list">
            {owned.map((gym) => (
              <li key={gym.record.location.id}>
                <div className="card">
                  <strong>
                    <Link href={`/gym/${gym.record.location.slug}`}>{gym.record.location.name}</Link>
                  </strong>
                  <p className="meta-line" style={{ marginBottom: 0 }}>
                    {gym.record.location.address.suburb} · submit updates and reply to reviews from
                    the gym&rsquo;s page.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Your claims</h2>
        {claims.length === 0 ? (
          <p className="muted small">No claims submitted.</p>
        ) : (
          <ul className="limitation-list">
            {claims.map((claim) => (
              <li key={claim.id}>
                {claim.gymId} — {titleCase(claim.status)}
                {claim.decisionReason ? `: ${claim.decisionReason}` : ' — waiting for an administrator'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Your submitted changes</h2>
        {submissions.length === 0 ? (
          <p className="muted small">No changes submitted.</p>
        ) : (
          <ul className="limitation-list">
            {submissions.map((correction) => (
              <li key={correction.id}>
                {correction.submittedAt.slice(0, 10)} — {correction.gymId} —{' '}
                {titleCase(correction.targetKind)} — {titleCase(correction.status)}
                {correction.decisionReason ? `: ${correction.decisionReason}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
