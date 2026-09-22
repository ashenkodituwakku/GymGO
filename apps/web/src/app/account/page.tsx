import type { Metadata } from 'next';
import Link from 'next/link';
import { PERSONAS, authEnabled, getCurrentUser } from '@/server/auth';
import { config } from '@/server/config';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
};

/**
 * The local development account switcher.
 *
 * This is not a sign-in page in any real sense — it exists so the permission
 * rules can be exercised. It is refused outright when the adapter is disabled,
 * which is the default in a production build.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const enabled = authEnabled();
  const flash = typeof params.done === 'string' ? params.done : null;
  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <div className="page page--narrow">
      <h1>Account</h1>

      {flash && <p className="notice notice--success">{flash}</p>}
      {error && <p className="notice notice--error">{error}</p>}

      {!enabled ? (
        <p className="notice notice--warning">
          Sign-in is not available in this environment. Browsing, filtering, comparing and saving
          all work without an account; contributing does not. A production deployment needs a real
          identity provider — see docs/ARCHITECTURE.md.
        </p>
      ) : (
        <>
          <p className="notice">
            <strong>This is a development sign-in.</strong> It has no passwords and no identity
            checks: it exists so the permission rules can be exercised locally. Do not treat it as
            authentication.
            {config.devAuthInProduction && ' It is currently enabled in a production build, which it should not be.'}
          </p>

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 17 }}>Signed in as</h2>
            <p style={{ marginBottom: 8 }}>
              <strong>{user.displayName}</strong> — role: {user.role}
              {user.ownedGymIds.length > 0 && ` · owns ${user.ownedGymIds.join(', ')}`}
            </p>
            {user.role !== 'anonymous' && (
              <form action="/api/v1/account" method="post" className="row">
                <input type="hidden" name="returnTo" value="/account" />
                <input type="hidden" name="intent" value="sign-out" />
                <button className="button button--small" type="submit">
                  Sign out
                </button>
              </form>
            )}
          </div>

          <h2>Switch account</h2>
          <div className="stack">
            {PERSONAS.map((persona) => (
              <form
                key={persona.id}
                action="/api/v1/auth/session"
                method="post"
                className="card card--muted"
              >
                <input type="hidden" name="returnTo" value="/account" />
                <input type="hidden" name="persona" value={persona.id} />
                <div className="row row--between">
                  <div>
                    <strong>{persona.displayName}</strong>
                    <p className="small muted" style={{ margin: 0 }}>
                      {persona.description}
                    </p>
                  </div>
                  <button className="button button--small button--primary" type="submit">
                    Use this account
                  </button>
                </div>
              </form>
            ))}
          </div>

          {user.role !== 'anonymous' && (
            <section style={{ marginTop: 32 }}>
              <h2>Delete this account</h2>
              <p className="small muted">
                Deletes the account and any ownership evidence attached to it. Contributions you
                made stay, with your name removed, so a gym&rsquo;s correction history does not
                develop holes. This exists now rather than after launch because account deletion
                should never be the thing that ships later.
              </p>
              <form action="/api/v1/account" method="post">
                <input type="hidden" name="returnTo" value="/account" />
                <button className="button button--small button--danger" type="submit">
                  Delete my account and evidence
                </button>
              </form>
            </section>
          )}
        </>
      )}

      <p style={{ marginTop: 32 }}>
        <Link href="/legal/terms">How we handle your data</Link>
      </p>
    </div>
  );
}
