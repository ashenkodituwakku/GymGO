import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and privacy',
  description: 'How GymGO handles your data during the pilot.',
  alternates: { canonical: '/legal/terms' },
};

/**
 * Pilot-stage privacy and terms.
 *
 * Written as a description of what the software actually does, not as a
 * template. Anything it promises is enforced somewhere in the code.
 */
export default function TermsPage() {
  return (
    <div className="page page--narrow">
      <h1>Terms and privacy</h1>
      <p className="notice">
        This is a pilot. These terms describe what the software currently does. They have not been
        reviewed by a lawyer and are not a substitute for legal advice before a public launch.
      </p>

      <section>
        <h2>Location</h2>
        <p>
          We ask for your device location only when you press &ldquo;Near me&rdquo;, and if you
          decline, everything works through suburb search instead. When you do use it, the
          coordinates are rounded to roughly 100 metres, used for that search, and not stored. We do
          not track movement, we do not keep location history, and precise location is never sent to
          analytics.
        </p>
      </section>

      <section>
        <h2>What we store</h2>
        <ul>
          <li>Gyms you save are kept in your browser only. They never reach our servers.</li>
          <li>
            Contributions — reviews, corrections and reports — are stored with the account that made
            them so a moderator can act on them.
          </li>
          <li>
            Evidence attached to an ownership claim is kept in a separate private store, shown only
            to administrators deciding that claim, and never included in any public response.
          </li>
        </ul>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          Ownership evidence is kept while a claim is open and for 90 days after a decision, then
          deleted with the claim. Account deletion is available now, before public registration
          exists, from the <a href="/account">account page</a>. Deleting your account removes it and
          any ownership evidence attached to it, and removes your name from contributions you made.
        </p>
        <p>
          Published contributions themselves stay, with authorship removed, so a gym&rsquo;s
          correction history does not develop holes that would make the record less trustworthy for
          everyone else.
        </p>
      </section>

      <section>
        <h2>What we do not do</h2>
        <ul>
          <li>We do not sell rankings. No payment changes where a gym appears in results.</li>
          <li>We do not sell verification. Paying us cannot mark a fact as checked.</li>
          <li>We do not send precise location, review evidence or personal details to analytics.</li>
          <li>We do not take payments, so we hold no payment details.</li>
        </ul>
      </section>

      <section>
        <h2>Accuracy</h2>
        <p>
          We work hard to keep this accurate and we show you where each fact came from and when it
          was checked, but gyms change their prices, hours and equipment without telling anyone. We
          do not guarantee admission or price. Check anything that matters before you travel, and
          tell us when we are wrong.
        </p>
      </section>
    </div>
  );
}
