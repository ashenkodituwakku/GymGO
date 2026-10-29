import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support',
  description: 'How to get help, report a problem or ask about your data on GymGO.',
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return (
    <div className="page page--narrow">
      <h1>Support</h1>

      <p className="notice notice--warning">
        <strong>No support channel is connected in this build.</strong> The addresses below are
        placeholders, and nothing on this page sends a message anywhere. A working contact route has
        to exist before contributions open to the public — it is listed as an outstanding
        dependency in the project&rsquo;s status report rather than quietly stubbed.
      </p>

      <section>
        <h2>Something on a gym page is wrong</h2>
        <p>
          Use <strong>Suggest a correction</strong> on that gym&rsquo;s page. It reaches a moderator,
          it is free, and it works whether or not the gym has anything to do with us.
        </p>
      </section>

      <section>
        <h2>A review or listing breaks the rules</h2>
        <p>
          Use <strong>Report this listing</strong> on the gym&rsquo;s page. You do not need an
          account to report something. See the{' '}
          <Link href="/legal/community">community guidelines</Link> for what we act on.
        </p>
      </section>

      <section>
        <h2>You run a gym</h2>
        <p>
          Claim your branch from its page. An administrator checks the evidence before your account
          can submit changes. See <Link href="/owner">the operator page</Link> for exactly what a
          claim does and does not give you.
        </p>
      </section>

      <section>
        <h2>Your personal data</h2>
        <p>
          You can delete your account and any ownership evidence attached to it from the{' '}
          <Link href="/account">account page</Link>. What we store and for how long is set out in{' '}
          <Link href="/legal/terms">terms and privacy</Link>.
        </p>
      </section>
    </div>
  );
}
