/**
 * Set up GymGO Pro in your Stripe account: the products (Pro, Max, and a
 * year of Pro as a gift), their prices (monthly and yearly in A$ and US$;
 * the gift paid once), GymGO's icon for the checkout page, and the settings
 * for Stripe's page where subscribers manage, switch between Pro and Max,
 * or cancel. Partner day passes need nothing here: each is priced
 * when it's booked.
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

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { GIFT_PRICES, GIFT_PRODUCT, MAX_PRICES, MAX_PRODUCT, PRO_PRICES, PRO_PRODUCT, formatPlanPrice, type ProPrice } from '@gymgo/domain';
import { CHECKOUT_ICON_NAME } from './billing';
import { STRIPE_SECRET_KEY } from './config';

/** The app's own icon (1024 px square, under Stripe's 512 KB), shown on GymGO's checkout pages. */
const ICON = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'mobile', 'assets', 'images', 'icon.png');

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

  const existing = await stripe.products.list({ active: true, limit: 100 });
  /** A product, found by its metadata, made if missing. */
  const productFor = async (tag: string, info: { name: string; description: string }) => {
    const found = existing.data.find((item) => item.metadata?.gymgo === tag);
    if (found) {
      console.log(`  product ${found.id} (${info.name}) already there`);
      return found;
    }
    const made = await stripe.products.create({ name: info.name, description: info.description, metadata: { gymgo: tag } });
    console.log(`  created product ${made.id} (${info.name})`);
    return made;
  };

  /** Prices, by lookup key: made, or moved to a new price when the planned amount changed. Returns their ids. */
  const pricesFor = async (productId: string, tag: string, planned: Array<{ lookupKey: string; currency: 'aud' | 'usd'; amountMinor: number; interval?: ProPrice['interval'] }>) => {
    const current = await stripe.prices.list({ lookup_keys: planned.map((price) => price.lookupKey), active: true, limit: 10 });
    const ids: string[] = [];
    for (const plan of planned) {
      const found = current.data.find((price) => price.lookup_key === plan.lookupKey);
      const label = `${formatPlanPrice(plan.amountMinor, plan.currency)}${plan.interval ? ` a ${plan.interval}` : ' once'}`;
      const same = found && found.unit_amount === plan.amountMinor && found.currency === plan.currency && (found.recurring?.interval ?? null) === (plan.interval ?? null);
      if (same) {
        console.log(`  ${plan.lookupKey}: ${label} already there`);
        ids.push(found.id);
        continue;
      }
      const price = await stripe.prices.create({
        product: productId,
        currency: plan.currency,
        unit_amount: plan.amountMinor,
        ...(plan.interval ? { recurring: { interval: plan.interval } } : {}),
        // The price shown is the price paid.
        tax_behavior: 'inclusive',
        lookup_key: plan.lookupKey,
        transfer_lookup_key: Boolean(found),
        metadata: { gymgo: tag },
      });
      console.log(`  ${plan.lookupKey}: ${found ? 'changed to' : 'created'} ${label} (${price.id})`);
      ids.push(price.id);
    }
    return ids;
  };

  const product = await productFor('pro', PRO_PRODUCT);
  const proPrices = await pricesFor(product.id, 'pro', PRO_PRICES);
  const max = await productFor('max', MAX_PRODUCT);
  const maxPrices = await pricesFor(max.id, 'max', MAX_PRICES);
  // Pro Duo was sold before Max; it's taken off sale (anyone already on it keeps it until they cancel).
  const duo = existing.data.find((item) => item.metadata?.gymgo === 'duo');
  if (duo) {
    await stripe.products.update(duo.id, { active: false });
    console.log(`  product ${duo.id} (${duo.name}) taken off sale`);
  }
  const gift = await productFor('gift', GIFT_PRODUCT);
  await pricesFor(gift.id, 'gift', GIFT_PRICES);

  // GymGO's icon for the checkout page; each checkout asks for it by name (billing.ts).
  try {
    const icons = await stripe.files.list({ purpose: 'business_icon', limit: 100 });
    const icon = icons.data.find((file) => file.filename === CHECKOUT_ICON_NAME);
    if (icon) {
      console.log(`  checkout icon ${icon.id} already there`);
    } else {
      const made = await stripe.files.create({ purpose: 'business_icon', file: { data: readFileSync(ICON), name: CHECKOUT_ICON_NAME, type: 'image/png' } });
      console.log(`  uploaded GymGO's icon for the checkout page (${made.id})`);
    }
  } catch (error) {
    console.log(`  couldn't upload the checkout icon (${error instanceof Error ? error.message : error}); checkout still shows GymGO's name and colours`);
  }

  // The page where subscribers update their card, see invoices, switch between Pro and Max, or cancel.
  const features = {
    customer_update: { enabled: true, allowed_updates: ['email' as const] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    // Cancelling keeps Pro to the end of what's been paid for.
    subscription_cancel: { enabled: true, mode: 'at_period_end' as const },
    // Pro to Max, Max to Pro, monthly to yearly: the difference is charged or credited for the days left.
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price' as const],
      proration_behavior: 'create_prorations' as const,
      products: [
        { product: product.id, prices: proPrices },
        { product: max.id, prices: maxPrices },
      ],
    },
  };
  const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 20 });
  const portal = configurations.data.find((item) => item.metadata?.gymgo === 'pro');
  if (portal) {
    await stripe.billingPortal.configurations.update(portal.id, { business_profile: { headline: 'Manage your GymGO subscription' }, features });
    console.log(`  customer portal settings ${portal.id} brought up to date (switching between Pro and Max)`);
  } else {
    const created = await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'Manage your GymGO subscription' },
      features,
      metadata: { gymgo: 'pro' },
    });
    console.log(`  created customer portal settings ${created.id}`);
  }

  console.log('\nDone. Restart GymGO and Pro and Max are on sale.');
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
