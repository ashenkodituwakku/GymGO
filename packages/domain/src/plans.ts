/**
 * GymGO's two plans, Free and Pro, in one place: what each includes, the
 * limits the server enforces, and what Pro costs.
 *
 * The rule that decides what goes where: nothing that tells you the truth
 * about a gym is ever behind Pro. In your own country (you choose it when
 * the app first opens) every gym, the answer and why, the source behind
 * each fact, published prices and hours, reviews, photos, members' reports
 * and the workout builder are free for everyone with a (free) account, and
 * a gym page opened from a link or your saved list opens wherever the gym
 * is. Pro is for going further and keeping more: finding gyms in every
 * other country (the owner's call, for people who travel), more saved
 * gyms, bigger comparisons, a library of your own workouts, and charts and
 * targets drawn from your own training log (logging itself, with your
 * records, is free).
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

/**
 * The ways a GymGO server can take a payment right now, as its payment
 * settings say (docs/PAYMENTS.md): never a promise the checkout can't keep.
 *
 * Card, Apple Pay, Google Pay and Link are on Stripe's checkout page, each
 * there only when it's turned on in the Stripe Dashboard (Apple Pay and
 * Google Pay show on devices that have them). PayPal is either on Stripe's
 * page too ('stripe': Stripe offers it to businesses in Europe), or through
 * GymGO's own PayPal account, with its own button ('direct'), or not at all.
 */
export interface PayWith {
  card: boolean;
  applePay: boolean;
  googlePay: boolean;
  link: boolean;
  paypal: 'stripe' | 'direct' | null;
}

/**
 * What Stripe's checkout page takes, in words, for "Pay by …": only what's
 * really on. PayPal through GymGO's own account isn't on that page (it has
 * its own button), so it isn't named here.
 */
export function stripePageNames(payWith: PayWith | null | undefined): string[] {
  if (!payWith) return [];
  const names: string[] = [];
  if (payWith.card) names.push('card');
  if (payWith.applePay) names.push('Apple Pay');
  if (payWith.googlePay) names.push('Google Pay');
  if (payWith.paypal === 'stripe') names.push('PayPal');
  return names;
}

/** A list in words: "card", "card or Apple Pay", "card, Apple Pay or Google Pay". */
export function orList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/**
 * Apple Pay's and Google Pay's own buttons on the Pro page (Stripe's Express
 * Checkout), when the server has them set up: the publishable key Stripe.js
 * opens them with (public by design), and which of the two are on.
 */
export interface WalletButtons {
  publishableKey: string;
  applePay: boolean;
  googlePay: boolean;
}

export type Wallet = 'applePay' | 'googlePay';

/**
 * The wallet a device has: Apple Pay on an iPhone, iPad or Mac, Google Pay
 * on Android and everything else (Windows, Linux, ChromeOS, in Chrome). From
 * what the browser says about itself: `navigator.userAgentData.platform`
 * where there is one ("macOS", "iOS", "Android"), else `navigator.platform`
 * ("MacIntel", "iPhone"), else the user agent. An iPad asking for desktop
 * sites calls itself a Mac, which is still Apple.
 */
export function deviceWallet(device: { userAgent?: string; platform?: string; uaPlatform?: string }): Wallet {
  const ua = device.userAgent ?? '';
  const uaPlatform = (device.uaPlatform ?? '').trim();
  const platform = (device.platform ?? '').trim();
  if (/^android$/i.test(uaPlatform) || /android/i.test(ua)) return 'googlePay';
  if (/^(macos|ios|ipados)$/i.test(uaPlatform)) return 'applePay';
  if (uaPlatform === '' && /^(mac|iphone|ipad|ipod)/i.test(platform)) return 'applePay';
  if (uaPlatform === '' && /iPhone|iPad|iPod|Macintosh/.test(ua)) return 'applePay';
  return 'googlePay';
}

/** The wallet button to show on this device: its own wallet, when the server has that one on. */
export function walletButtonFor(wallets: WalletButtons | null, wallet: Wallet): Wallet | null {
  return wallets?.[wallet] ? wallet : null;
}

/** "Apple Pay", "Google Pay". */
export const WALLET_NAME: Record<Wallet, string> = { applePay: 'Apple Pay', googlePay: 'Google Pay' };

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

/**
 * GymGO Max: everything in Pro, with more from GymPal and a Max badge by
 * your name where friends see it. Its own subscription at its own price; a
 * Max subscriber is Pro as well, so every Pro feature is theirs.
 */
export const MAX_PRICES: ProPrice[] = [
  { lookupKey: 'gymgo_max_month_aud', interval: 'month', currency: 'aud', amountMinor: 999 },
  { lookupKey: 'gymgo_max_year_aud', interval: 'year', currency: 'aud', amountMinor: 7999 },
  { lookupKey: 'gymgo_max_month_usd', interval: 'month', currency: 'usd', amountMinor: 699 },
  { lookupKey: 'gymgo_max_year_usd', interval: 'year', currency: 'usd', amountMinor: 5499 },
];

export const MAX_PRODUCT = {
  name: 'GymGO Max',
  description: 'Everything in GymGO Pro, with more from GymPal and a Max badge by your name.',
} as const;

/** A price of Max's (not Pro's). */
export const isMaxLookupKey = (key: string | null | undefined): boolean => MAX_PRICES.some((price) => price.lookupKey === key);

/** What Max adds over Pro, for the Pro screen: only what's built. */
export const MAX_FEATURES: Array<{ title: string; pro: string; max: string }> = [
  { title: 'Workouts built for you', pro: 'Not included', max: 'Say what you’d like (“45 minutes, dumbbells only”) and GymPal builds it, ready to start' },
  { title: 'Coach’s notes', pro: 'Not included', max: 'After a workout, GymPal says what went well and what to aim for next' },
  { title: 'GymPal', pro: '100 questions a day', max: '300 a day, and he remembers twice as much of the chat' },
  { title: 'Max badge', pro: 'Not included', max: 'By your name in the feed, in comments and on your profile' },
];

/** The headings the Pro screen groups what Pro adds under. */
export const PRO_FEATURE_GROUPS = [
  { id: 'gyms', title: 'Finding gyms' },
  { id: 'training', title: 'Training' },
  { id: 'yours', title: 'Make it yours' },
] as const;

/** What Pro adds, with what Free gets instead (or "Not included"), in the Pro screen's groups and order. */
export const PRO_FEATURES: Array<{ title: string; free: string; pro: string; group: (typeof PRO_FEATURE_GROUPS)[number]['id'] }> = [
  { title: 'Gyms worldwide', free: 'Your country', pro: 'Every country', group: 'gyms' },
  { title: 'Saved gyms', free: `Up to ${LIMITS.free.savedGyms}`, pro: 'Unlimited', group: 'gyms' },
  { title: 'Compare side by side', free: `${LIMITS.free.compare} gyms`, pro: `${LIMITS.pro.compare} gyms`, group: 'gyms' },
  { title: 'Gym notes', free: 'Not included', pro: 'Your own, on each gym', group: 'gyms' },
  { title: 'Workout library', free: 'Build, make your own, share', pro: 'Saved to your account', group: 'training' },
  { title: 'Your own exercises', free: 'GymGO’s list', pro: 'Yours too, with records', group: 'training' },
  { title: 'Your own splits', free: 'GymGO’s templates', pro: 'Your days, taking turns', group: 'training' },
  { title: 'Progress charts', free: 'Records, rep records and history', pro: 'Charts per exercise: 1-rep max, heaviest, best set, volume, reps', group: 'training' },
  { title: 'Session targets', free: 'Last time’s numbers', pro: 'What to lift next', group: 'training' },
  { title: 'Muscle balance', free: 'Sets per workout', pro: 'Every muscle, last 4 weeks', group: 'training' },
  { title: 'Warm-up sets', free: 'Mark any set as a warm-up', pro: 'A ramp to your weight, added to your workout', group: 'training' },
  { title: 'Your plates', free: 'The usual set', pro: 'The ones your gym has', group: 'training' },
  { title: 'Interval timer', free: 'Tabata and EMOM', pro: 'Your own, up to 10', group: 'training' },
  { title: '1-rep max', free: 'Your max, and 3 percentages', pro: 'Every percentage, with plates', group: 'training' },
  { title: 'Streak freeze', free: 'Not included', pro: 'One missed week a month', group: 'training' },
  { title: 'Lifetime stats', free: 'Not included', pro: 'Every kilo, rep and hour, to share', group: 'training' },
  { title: 'Head to head', free: 'Your friends’ workouts, likes and comments', pro: 'Your best lifts beside a friend’s', group: 'training' },
  { title: 'GymPal', free: '20 questions a day', pro: '100 a day, and answers that know your training', group: 'training' },
  { title: 'Colour themes', free: 'Indigo; light, dark or Dim; text size', pro: 'Twelve accents or your own, ten looks, corner styles, map styles', group: 'yours' },
  { title: 'Profile ring', free: 'Your picture', pro: 'Ringed in your accent', group: 'yours' },
  { title: 'Celebrations', free: 'Confetti', pro: 'Fireworks, stars or emoji', group: 'yours' },
  { title: 'Arcade sounds', free: 'Marimba', pro: 'Marimba or chip tunes', group: 'yours' },
];

/** Free for everyone with a (free) account, always. Listed on the Pro screen so nobody wonders. */
export const ALWAYS_FREE = [
  'Every gym in your country, on the map and in the list',
  'A gym’s page from a link or your saved list, wherever it is',
  'The answer for your visit, and exactly why',
  'The source and date behind every fact',
  'Published prices, guest hours and machines',
  'Reviews, photos and members’ machine reports',
  'The workout builder',
  'Logging your workouts, with a rest timer, a plate calculator and your records',
  'A weekly goal, your training calendar and milestones',
  'Friends, and a feed of their workouts to like and comment on',
  'A profile picture, an interval timer and a 1-rep max calculator',
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

// --- The free trial ------------------------------------------------------------------

/** A free trial of monthly Pro: this many days, then the monthly price. */
export const TRIAL_DAYS = 3;
/** How long after making an account the trial is offered. */
export const TRIAL_OFFER_DAYS = 30;

const DAY_MS = 86_400_000;

/** The free trial an account is offered. */
export interface TrialOffer {
  days: number;
  /** When the offer to start one runs out: TRIAL_OFFER_DAYS after the account was made. */
  offerEndsAt: string;
}

/**
 * The free trial an account can start, or null. Monthly Pro only, in an
 * account's first 30 days, and once: an account that has ever subscribed
 * (a trial included) gets none.
 */
export function trialOffer(account: { createdAt: string; everSubscribed: boolean }, now: Date): TrialOffer | null {
  const made = Date.parse(account.createdAt);
  if (!Number.isFinite(made) || account.everSubscribed) return null;
  const ends = made + TRIAL_OFFER_DAYS * DAY_MS;
  if (now.getTime() >= ends) return null;
  return { days: TRIAL_DAYS, offerEndsAt: new Date(ends).toISOString() };
}

/** When a trial started at `start` ends, and the first payment is taken. */
export function trialEndsAt(start: Date, days: number = TRIAL_DAYS): Date {
  return new Date(start.getTime() + days * DAY_MS);
}
