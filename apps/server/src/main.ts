import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createApp } from './app';
import { createStripe } from './billing';
import {
  ALLOWED_ORIGINS,
  ATTRIBUTION,
  DB_PATH,
  GOOGLE_PLACES_API_KEY,
  GYM_RECORDS,
  HOST,
  PHOTO_DIR,
  PORT,
  PUBLIC_URL,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
} from './config';
import { openDb, seedGyms } from './db';

const db = openDb(DB_PATH);
seedGyms(db, GYM_RECORDS);

const server = createServer(
  createApp({
    db,
    attribution: ATTRIBUTION,
    allowedOrigins: ALLOWED_ORIGINS,
    photoDir: PHOTO_DIR,
    googleKey: GOOGLE_PLACES_API_KEY,
    billing: { stripe: STRIPE_SECRET_KEY ? createStripe(STRIPE_SECRET_KEY) : null, webhookSecret: STRIPE_WEBHOOK_SECRET },
    publicUrl: PUBLIC_URL,
  }),
);

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
  if (STRIPE_SECRET_KEY) {
    console.log(
      STRIPE_WEBHOOK_SECRET
        ? '[server] Stripe webhooks: on (/api/billing/webhook)'
        : '[server] Stripe webhooks: off. Pro still turns on after checkout; changes made in Stripe show up when the app re-checks.',
    );
  }
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
