/**
 * GymGO's two plans, Free and Pro, in one place: what each includes, the
 * limits the server enforces, and what Pro costs.
 *
 * The rule that decides what goes where: nothing that tells you the truth
 * about a gym is ever behind Pro. In your own country (you choose it when
 * the app first opens) every gym, the answer and why, the source behind each
 * fact, published prices and hours, reviews, photos, members' reports and
 * the workout builder are free for everyone, and a gym page opened from a
 * link or your saved list opens wherever the gym is. Pro is for going
 * further and keeping more: finding gyms in every other country (the owner's
 * call, for people who travel), more saved gyms, bigger comparisons, a
 * library of your own workouts, and charts and targets drawn from your own
 * training log (logging itself, with your records, is free).
 *
 * Prices are what you pay, tax included. Stripe holds the real prices; these
 * are what the setup script creates there, and what the app shows when
 * payments aren't connected yet (marked as not on sale).
 */

export type PlanId = 'free' | 'pro';
export type BillingInterval = 'month' | 'year';
export type BillingCurrency = 'aud' | 'usd';

export interface PlanLimits {
  savedGyms: number;
  /** Gyms side by side on the Compare screen. */
  compare: number;
  /** Workouts kept in your account. */
  savedWorkouts: number;
}

/**
 * Pro's saved gyms and workouts are "unlimited" to a person; the caps only
 * stop a runaway script filling the database.
 */
export const LIMITS: Record<PlanId, PlanLimits> = {
  free: { savedGyms: 10, compare: 2, savedWorkouts: 0 },
  pro: { savedGyms: 1000, compare: 4, savedWorkouts: 200 },
};

/** Above this, a limit reads as "unlimited". */
export const UNLIMITED_FROM = 1000;

export interface ProPrice {
  /** Stripe's lookup key for this price, so the server never needs a price id. */
  lookupKey: string;
  interval: BillingInterval;
  currency: BillingCurrency;
  /** Cents, tax included. */
  amountMinor: number;
}

export const PRO_PRICES: ProPrice[] = [
  { lookupKey: 'gymgo_pro_month_aud', interval: 'month', currency: 'aud', amountMinor: 399 },
  { lookupKey: 'gymgo_pro_year_aud', interval: 'year', currency: 'aud', amountMinor: 2999 },
  { lookupKey: 'gymgo_pro_month_usd', interval: 'month', currency: 'usd', amountMinor: 299 },
  { lookupKey: 'gymgo_pro_year_usd', interval: 'year', currency: 'usd', amountMinor: 1999 },
];

export const PRO_PRODUCT = {
  name: 'GymGO Pro',
  description: 'Gyms in every country, unlimited saved gyms, compare up to 4 gyms, and a library of your workouts on every device.',
} as const;

/** What Pro adds, with what Free gets instead. */
export const PRO_FEATURES: Array<{ emoji: string; title: string; free: string; pro: string }> = [
  { emoji: '🌍', title: 'Gyms worldwide', free: 'Your country', pro: 'Every country, wherever you travel' },
  { emoji: '🔖', title: 'Saved gyms', free: `Up to ${LIMITS.free.savedGyms}`, pro: 'Unlimited' },
  { emoji: '⚖️', title: 'Compare side by side', free: `${LIMITS.free.compare} gyms`, pro: `${LIMITS.pro.compare} gyms` },
  { emoji: '💪', title: 'Workout library', free: 'Build and share', pro: 'Save them, reopen on any device' },
  { emoji: '📈', title: 'Progress charts', free: 'Your records and history', pro: 'A chart for every exercise' },
  { emoji: '🎯', title: 'Next-session targets', free: 'Last time’s numbers', pro: 'What to lift next, worked out for you' },
  { emoji: '🎨', title: 'Colour themes', free: 'Indigo, light or dark', pro: 'Five accents, light or dark' },
];

/** Free for everyone, always. Listed on the Pro screen so nobody wonders. */
export const ALWAYS_FREE = [
  'Every gym in your country, on the map and in the list',
  'A gym’s page from a link or your saved list, wherever it is',
  'The answer for your visit, and exactly why',
  'The source and date behind every fact',
  'Published prices, guest hours and machines',
  'Reviews, photos and members’ machine reports',
  'The workout builder',
  'Logging your workouts, with a rest timer, a plate calculator and your records',
  'Dark mode',
] as const;

/**
 * Stripe subscription statuses that count as Pro. `past_due` stays Pro while
 * Stripe retries the card; Stripe ends the subscription if it never goes
 * through, and then it's Free.
 */
export const PRO_STATUSES = ['active', 'trialing', 'past_due'] as const;

export function isProStatus(status: string | null | undefined): boolean {
  return status !== null && status !== undefined && (PRO_STATUSES as readonly string[]).includes(status);
}

export function proPrice(interval: BillingInterval, currency: BillingCurrency, prices: ProPrice[] = PRO_PRICES): ProPrice | null {
  return prices.find((price) => price.interval === interval && price.currency === currency) ?? null;
}

/** "Save 37%": the annual price against twelve months. Null if there's no saving. */
export function annualSaving(monthlyMinor: number, yearlyMinor: number): number | null {
  const full = monthlyMinor * 12;
  if (full <= 0 || yearlyMinor >= full) return null;
  return Math.floor(((full - yearlyMinor) / full) * 100);
}

/** "A$3.99", "$19.99". */
export function formatPlanPrice(amountMinor: number, currency: BillingCurrency): string {
  const symbol = currency === 'aud' ? 'A$' : '$';
  return `${symbol}${(amountMinor / 100).toFixed(2)}`;
}
