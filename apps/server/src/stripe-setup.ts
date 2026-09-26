/**
 * Set up GymGO Pro in your Stripe account: the product, its four prices
 * (monthly and yearly, in A$ and US$), and the settings for Stripe's page
 * where subscribers manage or cancel.
 *
 *   npx pnpm@10 --filter @gymgo/server stripe:setup           test mode
 *   npx pnpm@10 --filter @gymgo/server stripe:setup --live    your live account
 *
 * It reads STRIPE_SECRET_KEY from the environment or apps/server/.env.local.
 * It creates things in Stripe but charges nobody. Run it again any time: what
 * already exists is left alone. If a price in @gymgo/domain's plans has
 * changed, it makes a new Stripe price and moves the lookup key to it, so new
 * subscribers pay the new price and existing ones keep theirs.
 */

import Stripe from 'stripe';
import { PRO_PRICES, PRO_PRODUCT, formatPlanPrice } from '@gymgo/domain';
import { STRIPE_SECRET_KEY } from './config';

async function main() {
  const key = STRIPE_SECRET_KEY;
  if (!key) {
    console.error('No STRIPE_SECRET_KEY. Put your test key (sk_test_…) in apps/server/.env.local — see README.');
    process.exit(1);
  }
  const live = /^(sk|rk)_live_/.test(key);
  if (live && !process.argv.includes('--live')) {
    console.error('That is a LIVE key. Run with --live if you really mean to set up your live account.');
    process.exit(1);
  }
  const stripe = new Stripe(key, { appInfo: { name: 'GymGO setup' } });
  console.log(`Setting up GymGO Pro in Stripe (${live ? 'LIVE' : 'test'} mode)…`);

  // The product: found by its metadata, made if missing.
  const existing = await stripe.products.list({ active: true, limit: 100 });
  let product = existing.data.find((item) => item.metadata?.gymgo === 'pro');
  if (!product) {
    product = await stripe.products.create({ name: PRO_PRODUCT.name, description: PRO_PRODUCT.description, metadata: { gymgo: 'pro' } });
    console.log(`  created product ${product.id}`);
  } else {
    console.log(`  product ${product.id} already there`);
  }

  // The prices, by lookup key.
  const current = await stripe.prices.list({ lookup_keys: PRO_PRICES.map((price) => price.lookupKey), active: true, limit: 10 });
  for (const planned of PRO_PRICES) {
    const found = current.data.find((price) => price.lookup_key === planned.lookupKey);
    const label = `${formatPlanPrice(planned.amountMinor, planned.currency)} a ${planned.interval}`;
    if (found && found.unit_amount === planned.amountMinor && found.currency === planned.currency && found.recurring?.interval === planned.interval) {
      console.log(`  ${planned.lookupKey}: ${label} already there`);
      continue;
    }
    const price = await stripe.prices.create({
      product: product.id,
      currency: planned.currency,
      unit_amount: planned.amountMinor,
      recurring: { interval: planned.interval },
      // The price shown is the price paid.
      tax_behavior: 'inclusive',
      lookup_key: planned.lookupKey,
      transfer_lookup_key: Boolean(found),
      metadata: { gymgo: 'pro' },
    });
    console.log(`  ${planned.lookupKey}: ${found ? 'changed to' : 'created'} ${label} (${price.id})`);
  }

  // The page where subscribers update their card, see invoices or cancel.
  const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 20 });
  const portal = configurations.data.find((item) => item.metadata?.gymgo === 'pro');
  if (portal) {
    console.log(`  customer portal settings ${portal.id} already there`);
  } else {
    const created = await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'Manage your GymGO Pro subscription' },
      features: {
        customer_update: { enabled: true, allowed_updates: ['email'] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        // Cancelling keeps Pro to the end of what's been paid for.
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
      },
      metadata: { gymgo: 'pro' },
    });
    console.log(`  created customer portal settings ${created.id}`);
  }

  console.log('\nDone. Restart GymGO and Pro is on sale.');
  console.log('Webhooks (recommended, so renewals, failed payments and cancellations arrive by themselves):');
  console.log('  on your computer:  stripe listen --forward-to localhost:4000/api/billing/webhook');
  console.log('                     then put the whsec_… it prints in STRIPE_WEBHOOK_SECRET');
  console.log('  once hosted:       add an endpoint at https://<your server>/api/billing/webhook in Stripe,');
  console.log('                     for checkout.session.completed and customer.subscription.*');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
