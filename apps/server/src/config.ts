import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { MELBOURNE_ATTRIBUTION, MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { AU_GYMS } from '@gymgo/au-data';
import { US_GYMS } from '@gymgo/usa-data';
import { EU_GYMS } from '@gymgo/eu-data';
import { DEFAULT_OPERATOR, type LegalOperator } from '@gymgo/domain';

const here = dirname(fileURLToPath(import.meta.url));

// Settings can live in apps/server/.env.local (git-ignored) instead of the
// shell. Anything already set in the shell wins.
const envFile = join(here, '..', '.env.local');
if (existsSync(envFile)) {
  const before = { ...process.env };
  process.loadEnvFile(envFile);
  Object.assign(process.env, before);
}

export const DB_PATH = process.env.GYMGO_DB ?? join(here, '..', 'data', 'gymgo.db');
export const PORT = Number(process.env.PORT ?? 4000);
export const HOST = process.env.HOST ?? '0.0.0.0';
export const PHOTO_DIR = process.env.GYMGO_PHOTOS ?? join(here, '..', 'data', 'photos');
/**
 * Optional. The owner's own Google Places API key, from their Google Cloud
 * project (billing enabled). Without it, the Google section stays off.
 */
export const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
/**
 * Optional. Stripe, for GymGO Pro. Use test-mode keys (sk_test_…) until
 * you're ready to take real money. Without a key, Pro shows as "not on sale".
 */
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() || null;
/** Optional. The signing secret of the webhook pointed at /api/billing/webhook. */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
/**
 * Optional. This server's public address (https://…) once it's hosted, used
 * for the page Stripe returns people to. Locally it's worked out per request.
 */
export const PUBLIC_URL = process.env.GYMGO_PUBLIC_URL?.trim().replace(/\/+$/, '') || null;
/**
 * Optional. The Overpass API servers "Search this area" reads OpenStreetMap
 * through, comma-separated, tried in turn. By default the main public one,
 * then two public mirrors.
 */
export const OVERPASS_URLS = (process.env.GYMGO_OVERPASS_URL ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
/** Optional. The Photon geocoder to find towns by name through. Photon's public server is the default. */
export const GEOCODER_URL = process.env.GYMGO_GEOCODER_URL?.trim() || undefined;
/**
 * Gyms' own website icons, shown beside their names. On by default; set
 * GYMGO_SITE_ICONS=off to never fetch from gyms' websites.
 */
export const SITE_ICONS = (process.env.GYMGO_SITE_ICONS ?? 'on').trim().toLowerCase() !== 'off';
/**
 * Local testing only: a ready-made Pro account (see devAccount.ts). The
 * launcher (scripts/gymgo.ps1) turns it on; a hosted server never makes it.
 */
/**
 * Optional. Sign in with Google: the OAuth client ids from the owner's own
 * Google Cloud project (free), one per platform the app runs on. Client ids
 * are public identifiers, not secrets. Without them, Google sign-in is off.
 */
export const GOOGLE_SIGN_IN = {
  web: process.env.GYMGO_GOOGLE_CLIENT_ID_WEB?.trim() || null,
  ios: process.env.GYMGO_GOOGLE_CLIENT_ID_IOS?.trim() || null,
  android: process.env.GYMGO_GOOGLE_CLIENT_ID_ANDROID?.trim() || null,
};
/**
 * Optional. Sign in with Apple: the iPhone app's bundle id(s), comma-separated.
 * Needs a paid Apple Developer account (a free Personal Team can't use it).
 * Without it, Apple sign-in is off.
 */
export const APPLE_SIGN_IN_IDS = (process.env.GYMGO_APPLE_CLIENT_IDS ?? '').split(',').map((item) => item.trim()).filter(Boolean);
export const DEV_PRO_ACCOUNT = (process.env.GYMGO_DEV_PRO ?? '').trim().toLowerCase() === 'on';
/**
 * Optional. The SMTP account bug reports are emailed through, as one address:
 * smtps://you%40gmail.com:app-password@smtp.gmail.com:465 for Gmail (an app
 * password, from your Google account's security settings, not your own
 * password). This holds a password: keep it in .env.local, never in git.
 * Without it, reports are kept on this server only.
 */
export const SMTP_URL = process.env.GYMGO_SMTP_URL?.trim() || null;
/** Optional. Who the report emails say they're from; by default the SMTP account itself. */
export const MAIL_FROM = process.env.GYMGO_MAIL_FROM?.trim() || null;
/**
 * Optional, and needed before members' photos go public in the US: GymGO's
 * designated copyright (DMCA) agent, as registered with the US Copyright
 * Office (README says how). The app shows these so people know where to send
 * a takedown notice. Without them, notices come in through Report a problem.
 */
export const COPYRIGHT_AGENT = process.env.GYMGO_DMCA_AGENT_NAME?.trim()
  ? {
      name: process.env.GYMGO_DMCA_AGENT_NAME.trim(),
      address: process.env.GYMGO_DMCA_AGENT_ADDRESS?.trim() || null,
      email: process.env.GYMGO_DMCA_AGENT_EMAIL?.trim() || null,
    }
  : null;
/**
 * Who runs GymGO, named in the Terms of Service, Privacy Policy and the
 * other legal pages (/terms, /privacy, /refunds, /community). Set these
 * before GymGO is public: a contact email especially, which privacy law
 * expects. Without them the pages say "the GymGO team" and point people to
 * Report a bug.
 */
export const LEGAL_OPERATOR: LegalOperator = {
  name: process.env.GYMGO_LEGAL_NAME?.trim() || DEFAULT_OPERATOR.name,
  email: process.env.GYMGO_CONTACT_EMAIL?.trim() || null,
  address: process.env.GYMGO_LEGAL_ADDRESS?.trim() || null,
  governingLaw: process.env.GYMGO_GOVERNING_LAW?.trim() || DEFAULT_OPERATOR.governingLaw,
  hostedIn: process.env.GYMGO_HOSTED_IN?.trim() || null,
};
/** Where bug reports are emailed, comma-separated. By default, the GymGO team. */
export const BUG_REPORT_TO = (process.env.GYMGO_BUG_REPORT_TO ?? 'ashenkodit@gmail.com, mahogany.81926@gmail.com')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
/**
 * On only behind a reverse proxy (the hosting setup's Caddy): rate limits
 * then use the caller's address as the proxy passes it on, instead of the
 * proxy's own, which every request would share. Never on without a proxy,
 * or anyone could claim any address.
 */
export const TRUST_PROXY = (process.env.GYMGO_TRUST_PROXY ?? '').trim().toLowerCase() === 'on';
export const ALLOWED_ORIGINS = (process.env.GYMGO_ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean);

/**
 * Real Melbourne gyms first, then the map-only Australian, US and European
 * cities; the invented Sydney set stays, clearly flagged, for testing.
 */
export const GYM_RECORDS = [...MELBOURNE_GYMS, ...AU_GYMS, ...US_GYMS, ...EU_GYMS, ...DEMO_GYMS];
/** Covers every real set: every location, in every city and every searched area, is OpenStreetMap data. */
export const ATTRIBUTION = MELBOURNE_ATTRIBUTION;
