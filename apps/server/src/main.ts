import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createApp } from './app';
import { createStripe } from './billing';
import {
  ALLOWED_ORIGINS,
  ATTRIBUTION,
  DB_PATH,
  GEOCODER_URL,
  GOOGLE_PLACES_API_KEY,
  GYM_RECORDS,
  HOST,
  OVERPASS_URLS,
  PHOTO_DIR,
  PORT,
  PUBLIC_URL,
  SITE_ICONS,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  DEV_PRO_ACCOUNT,
  APPLE_SIGN_IN_IDS,
  GOOGLE_SIGN_IN,
  BUG_REPORT_TO,
  COPYRIGHT_AGENT,
  LEGAL_OPERATOR,
  TRUST_PROXY,
  BACKUP_DIR,
  MAIL_FROM,
  SMTP_URL,
} from './config';
import { senderFor, smtpMailer } from './mail';
import { scheduleBackups } from './backup';
import { openDb, seedGyms } from './db';
import { devAccountRefusal, ensureDevProAccount } from './devAccount';

const db = openDb(DB_PATH);
seedGyms(db, GYM_RECORDS);

// A ready-made Pro account for trying GymGO on this computer; never on a hosted one.
let devAccountLine: string | null = null;
let devAccountMade = false;
if (DEV_PRO_ACCOUNT) {
  const refusal = devAccountRefusal({ publicUrl: PUBLIC_URL, stripeKey: STRIPE_SECRET_KEY });
  if (refusal) {
    devAccountLine = `[server] Dev Pro account: not made, because ${refusal}.`;
  } else {
    const dev = ensureDevProAccount(db);
    devAccountMade = true;
    devAccountLine = `[server] Dev Pro account (this computer only): sign in as ${dev.email} with password ${dev.password}`;
  }
}

// Bug reports are emailed through the owner's own SMTP account, when there is one.
const mailFrom = SMTP_URL ? senderFor(SMTP_URL, MAIL_FROM) : null;
const bugMail = SMTP_URL && mailFrom ? smtpMailer(SMTP_URL, mailFrom) : null;

const server = createServer(
  createApp({
    db,
    attribution: ATTRIBUTION,
    // The hosted web app, at the server's own address, may call it and be returned to from Stripe.
    allowedOrigins: [...ALLOWED_ORIGINS, ...(PUBLIC_URL ? [new URL(PUBLIC_URL).origin] : [])],
    photoDir: PHOTO_DIR,
    googleKey: GOOGLE_PLACES_API_KEY,
    billing: { stripe: STRIPE_SECRET_KEY ? createStripe(STRIPE_SECRET_KEY) : null, webhookSecret: STRIPE_WEBHOOK_SECRET },
    publicUrl: PUBLIC_URL,
    area: { endpoints: OVERPASS_URLS },
    places: { endpoint: GEOCODER_URL },
    siteIcons: { enabled: SITE_ICONS },
    signIn: { google: GOOGLE_SIGN_IN, apple: APPLE_SIGN_IN_IDS },
    bugReports: { send: bugMail, to: BUG_REPORT_TO, retryEveryMs: 15 * 60_000 },
    legal: { copyrightAgent: COPYRIGHT_AGENT, operator: LEGAL_OPERATOR },
    devAccount: devAccountMade,
    trustProxy: TRUST_PROXY,
    // Password reset links go out through the same email account as bug reports.
    mail: bugMail,
  }),
);
// A caller has 30 seconds to send its headers and two minutes for the whole
// request (a photo on a slow connection), so slow, half-sent requests can't
// tie the server up.
server.headersTimeout = 30_000;
if (BACKUP_DIR) scheduleBackups(db, BACKUP_DIR);
server.requestTimeout = 120_000;

/** Which kind of Stripe key, never the key itself. */
function stripeMode(key: string | null): string {
  if (!key) return 'off (no STRIPE_SECRET_KEY set; Pro shows as not on sale; see README)';
  const live = /^(sk|rk)_live_/.test(key);
  return live ? 'on, LIVE mode: real cards are charged' : 'on, test mode (no real money)';
}

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} is already in use. Is GymGO already running?`);
  } else {
    console.error('[server]', error);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => `http://${net!.address}:${PORT}`);
  console.log(`[server] GymGO API on http://localhost:${PORT} (database: ${DB_PATH})`);
  if (lan.length > 0) console.log(`[server] Phones on your Wi-Fi reach it at ${lan.join(' or ')}`);
  console.log(`[server] GymGO Pro payments (Stripe): ${stripeMode(STRIPE_SECRET_KEY)}`);
  if (devAccountLine) console.log(devAccountLine);
  if (STRIPE_SECRET_KEY) {
    console.log(
      STRIPE_WEBHOOK_SECRET
        ? '[server] Stripe webhooks: on (/api/billing/webhook)'
        : '[server] Stripe webhooks: off. Pro still turns on after checkout; changes made in Stripe show up when the app re-checks.',
    );
  }
  const googleIds = Object.entries(GOOGLE_SIGN_IN).filter(([, id]) => id).map(([platform]) => platform);
  console.log(
    googleIds.length
      ? `[server] Sign in with Google: on (${googleIds.join(', ')})`
      : '[server] Sign in with Google: off (no GYMGO_GOOGLE_CLIENT_ID_* set; see README)',
  );
  console.log(
    APPLE_SIGN_IN_IDS.length
      ? `[server] Sign in with Apple: on (${APPLE_SIGN_IN_IDS.join(', ')})`
      : '[server] Sign in with Apple: off (no GYMGO_APPLE_CLIENT_IDS set; see README)',
  );
  console.log(
    bugMail
      ? `[server] Bug reports: kept here and emailed to ${BUG_REPORT_TO.join(', ')}`
      : SMTP_URL
        ? '[server] Bug reports: kept here only. GYMGO_SMTP_URL has no email address to send from; set GYMGO_MAIL_FROM (see README)'
        : '[server] Bug reports: kept here only (no GYMGO_SMTP_URL set, so nothing is emailed; see README)',
  );
  console.log(
    bugMail && PUBLIC_URL
      ? '[server] Forgot password: on (reset links are emailed)'
      : `[server] Forgot password: off (needs ${[bugMail ? null : 'GYMGO_SMTP_URL', PUBLIC_URL ? null : 'GYMGO_PUBLIC_URL'].filter(Boolean).join(' and ')}; see README)`,
  );
  console.log(BACKUP_DIR ? `[server] Backups: a copy of the database every day in ${BACKUP_DIR}, kept 14 days` : '[server] Backups: off (no GYMGO_BACKUP_DIR set)');
  if (TRUST_PROXY) console.log('[server] Behind a proxy: rate limits use the address in X-Forwarded-For (GYMGO_TRUST_PROXY=on)');
  console.log(
    LEGAL_OPERATOR.email
      ? `[server] Legal pages: /terms, /privacy, /refunds, /community (run by ${LEGAL_OPERATOR.name}, contact ${LEGAL_OPERATOR.email})`
      : PUBLIC_URL
        ? '[server] Legal pages: /terms, /privacy, /refunds, /community. Set GYMGO_CONTACT_EMAIL (and GYMGO_LEGAL_NAME) before GymGO is public; see README'
        : '[server] Legal pages: /terms, /privacy, /refunds, /community (no GYMGO_CONTACT_EMAIL set; they point to Report a bug)',
  );
  console.log(
    GOOGLE_PLACES_API_KEY
      ? '[server] Google Maps details: on (using your GOOGLE_PLACES_API_KEY; Google may bill your account)'
      : '[server] Google Maps details: off (no GOOGLE_PLACES_API_KEY set; see README)',
  );
});

const stop = () => {
  server.close();
  db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
