import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { config } from '@/server/config';
import { getCurrentUser } from '@/server/auth';
import { can } from '@gymgo/domain';

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: {
    default: 'GymGO — find a gym that fits your workout, budget and visit time',
    template: '%s — GymGO',
  },
  description:
    'Compare gyms by the equipment you need, what the visit really costs, and whether a visitor can get in at the time you want. Every fact shows where it came from and when it was checked.',
  openGraph: {
    siteName: 'GymGO',
    type: 'website',
    locale: 'en_AU',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const signedIn = user.role !== 'anonymous';

  return (
    <html lang="en-AU">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>

        {config.devAuthInProduction && (
          <div className="banner banner--warning" role="alert">
            <div className="banner__inner">
              Development sign-in is enabled in a production build. Anyone can select any role,
              including administrator. Set GYMGO_AUTH_ADAPTER=disabled before this is reachable by
              anyone else.
            </div>
          </div>
        )}

        {config.dataSource === 'demo' && (
          <div className="banner banner--demo">
            <div className="banner__inner">
              <strong>Demo data.</strong> Every gym, price, opening hour and review here is
              invented for testing. None of these venues exist.{' '}
              <Link href="/about/data">How this data works</Link>
            </div>
          </div>
        )}

        {config.dataSource === 'none' && (
          <div className="banner">
            <div className="banner__inner">
              No gym listings are loaded in this environment. Set GYMGO_DATA_SOURCE=demo to load
              the fictional pilot dataset.
            </div>
          </div>
        )}

        <header className="site-header">
          <Link className="site-header__brand" href="/">
            Gym<span>GO</span>
          </Link>
          <nav className="site-nav" aria-label="Main">
            <Link href="/search">Search</Link>
            <Link href="/saved">Saved</Link>
            <Link href="/about/data">Our data</Link>
            {can(user, 'moderation.view_queue') && <Link href="/admin">Moderation</Link>}
            {signedIn && <Link href="/owner">Gym owners</Link>}
            <Link href="/account">{signedIn ? user.displayName : 'Sign in'}</Link>
          </nav>
        </header>

        <main id="main">{children}</main>

        <footer className="site-footer">
          <div className="site-footer__inner">
            <span>GymGO pilot — {config.dataSource === 'demo' ? 'demo data' : 'no data loaded'}</span>
            <Link href="/about/data">How we check facts</Link>
            <Link href="/legal/community">Community guidelines</Link>
            <Link href="/legal/terms">Terms and privacy</Link>
            <Link href="/support">Support</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
