import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { MELBOURNE_ATTRIBUTION, MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { AU_GYMS } from '@gymgo/au-data';
import { US_GYMS } from '@gymgo/usa-data';
import { EU_GYMS } from '@gymgo/eu-data';

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
export const ALLOWED_ORIGINS = (process.env.GYMGO_ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean);

/**
 * Real Melbourne gyms first, then the map-only Australian, US and European
 * cities; the invented Sydney set stays, clearly flagged, for testing.
 */
export const GYM_RECORDS = [...MELBOURNE_GYMS, ...AU_GYMS, ...US_GYMS, ...EU_GYMS, ...DEMO_GYMS];
/** Covers every real set: every location, in every city and every searched area, is OpenStreetMap data. */
export const ATTRIBUTION = MELBOURNE_ATTRIBUTION;
