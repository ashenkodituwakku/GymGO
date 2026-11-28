/**
 * Set up GymGO Pro in your PayPal business account: the product "GymGO Pro"
 * and a plan for each price GymGO sells (Pro and Max, monthly and
 * yearly, in A$ and US$; and monthly Pro again with the free trial). The
 * server finds them by the product and each plan's description, and reads
 * the prices back from PayPal (paypal.ts).
 *
 *   npx pnpm@10 --filter @gymgo/server paypal:setup           PayPal's sandbox
 *   npx pnpm@10 --filter @gymgo/server paypal:setup --live    your live account (PAYPAL_MODE=live)
 *
 * It reads PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_MODE from the
 * environment or apps/server/.env.local. It makes things in PayPal but
 * charges nobody. Run it again any time: what's there is left alone. If a
 * price in @gymgo/domain's plans has changed, it makes a new plan and
 * retires the old one, so new subscribers pay the new price and existing
 * ones keep theirs.
 */

import { formatPlanPrice } from '@gymgo/domain';
import { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE } from './config';
import { PAYPAL_PRODUCT_ID, createPayPal, planBody, planTag, plannedPlans, priceFromPlan } from './paypal';

async function main() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error('No PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET. Put your sandbox app’s keys in apps/server/.env.local (docs/PAYMENTS.md).');
    process.exit(1);
  }
  if (PAYPAL_MODE === 'live' && !process.argv.includes('--live')) {
    console.error('PAYPAL_MODE is live. Run with --live if you really mean to set up your live PayPal account.');
    process.exit(1);
  }
  const paypal = createPayPal({ clientId: PAYPAL_CLIENT_ID, secret: PAYPAL_CLIENT_SECRET, mode: PAYPAL_MODE });
  console.log(`PayPal ${PAYPAL_MODE === 'live' ? 'LIVE account' : 'sandbox'}`);

  if (await paypal.getProduct(PAYPAL_PRODUCT_ID)) {
    console.log(`Product ${PAYPAL_PRODUCT_ID}: already there`);
  } else {
    await paypal.createProduct({ id: PAYPAL_PRODUCT_ID, name: 'GymGO Pro', description: 'GymGO Pro: gyms in every country, more saved gyms and comparisons, and the workout library.' });
    console.log(`Product ${PAYPAL_PRODUCT_ID}: made`);
  }

  const existing = await paypal.listPlans(PAYPAL_PRODUCT_ID);
  const details = await Promise.all(existing.filter((plan) => plan.status === 'ACTIVE').map((plan) => paypal.getPlan(plan.id)));
  for (const { price, trial } of plannedPlans()) {
    const tag = planTag(price.lookupKey, trial);
    const label = `${tag} (${formatPlanPrice(price.amountMinor, price.currency)} a ${price.interval})`;
    const same = details.filter((plan) => plan.description === tag);
    const current = same.find((plan) => priceFromPlan(plan)?.amountMinor === price.amountMinor);
    if (current) {
      console.log(`Plan ${label}: already there (${current.id})`);
      continue;
    }
    const made = await paypal.createPlan(planBody(price, trial));
    console.log(`Plan ${label}: made (${made.id})`);
    // An old price for the same plan: retired, its subscribers keep it.
    for (const old of same) {
      await paypal.deactivatePlan(old.id);
      console.log(`  retired the old plan ${old.id}`);
    }
  }
  console.log('Done. Restart the GymGO server: the PayPal button shows on the Pro page once it reads these plans.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
