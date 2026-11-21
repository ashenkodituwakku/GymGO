import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community guidelines',
  description: 'The rules for reviews, corrections and owner replies on GymGO.',
  alternates: { canonical: '/legal/community' },
};

export default function CommunityPage() {
  return (
    <div className="page page--narrow">
      <h1>Community guidelines</h1>
      <p className="muted">
        These are in place before contributions open, not after. A moderation queue that arrives
        later than the contributions is a queue that never catches up.
      </p>

      <section>
        <h2>Reviews</h2>
        <ul>
          <li>Write about training there. First-hand experience only.</li>
          <li>
            No personal attacks on staff or members, no content targeting someone as an individual,
            and nothing that identifies a private person.
          </li>
          <li>
            Telling us you visited is not proof that you did. No review here carries a verified
            badge, because we have no mechanism to verify a visit.
          </li>
          <li>One review per gym per account. Edit yours rather than posting again.</li>
        </ul>
      </section>

      <section>
        <h2>Corrections</h2>
        <ul>
          <li>Say what should change and how you know. Evidence gets a correction approved faster.</li>
          <li>
            Your evidence note is shown to moderators, not published. Do not include anything you
            would not want a stranger to read.
          </li>
          <li>
            Nothing you submit changes the page on its own. A pending correction never overwrites a
            fact we have confirmed.
          </li>
        </ul>
      </section>

      <section>
        <h2>If you run a gym</h2>
        <ul>
          <li>Claim your branch, and submit updates. They go to moderation like anyone else&rsquo;s.</li>
          <li>
            You may reply to reviews of your branch once a moderator approves the reply. You cannot
            remove or edit a review about your gym, including a negative one.
          </li>
          <li>
            If a review breaks these rules, report it. A moderator decides, and the decision and its
            reason go into the gym&rsquo;s public change history.
          </li>
          <li>
            Claiming a branch confirms who you are. It does not mark anything you have told us as
            verified, and it does not change where your gym appears in results.
          </li>
        </ul>
      </section>

      <section>
        <h2>Enforcement</h2>
        <p>
          Submissions are held until a moderator reads them. Accounts that repeatedly break these
          rules are blocked from contributing. Every moderation decision records who made it, when,
          and why; the reason is public, the evidence behind an ownership claim is not.
        </p>
        <p>
          Submission rates are capped per account per day. That is a blunt instrument, and it is
          there so a flood cannot bury the queue.
        </p>
      </section>

      <section>
        <h2>Reporting</h2>
        <p>
          Every gym page has a <strong>Report this listing</strong> control, and reports do not need
          an account: requiring one would leave the worst content up the longest. For anything
          urgent, see <a href="/support">support</a>.
        </p>
      </section>
    </div>
  );
}
