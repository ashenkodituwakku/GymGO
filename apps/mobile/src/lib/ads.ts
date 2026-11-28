/**
 * Which ad unit a place asks Google AdMob for (docs/ADS.md).
 *
 * - A development build (the Xcode route, `gymgo --xcode`, running from the
 *   bundler) always asks Google's own test units: test ads only, labelled
 *   "Test Ad" by Google, never paid, never counted against an account.
 * - A release build asks the owner's units (OWNER_AD_UNITS, or
 *   EXPO_PUBLIC_ADMOB_* in their place), but only once ADS_LIVE is on, which
 *   waits for the legal pages to say GymGO has ads; until then, no ad at all
 *   and GymGO's own Pro card stands in. Real ads in a development build
 *   would be the owner seeing (and maybe tapping) their own: AdMob counts
 *   that as invalid traffic, so a development build never asks for them.
 * - Expo Go and the website have no ads either way (AdCard.tsx).
 *
 * No React Native here, so it's unit-tested in Node.
 */

export type AdPlace = 'home' | 'results';

/** Google's sample native advanced units, which only ever serve test ads. */
export const TEST_AD_UNITS = {
  ios: 'ca-app-pub-3940256099942544/3986624511',
  android: 'ca-app-pub-3940256099942544/2247696110',
} as const;

/** The owner's units for each place, as AdMob gives them ("ca-app-pub-123…/456…"). */
export type OwnerAdUnits = Record<'ios' | 'android', Partial<Record<AdPlace, string>>>;

/**
 * The owner's AdMob ad units. Not secret: every copy of the app carries
 * them. iOS: one native advanced unit, made on 18 November 2026, for both
 * places. Android: none yet (no Android app in AdMob).
 */
export const OWNER_AD_UNITS: OwnerAdUnits = {
  ios: { home: 'ca-app-pub-7227955677859980/5564520466', results: 'ca-app-pub-7227955677859980/5564520466' },
  android: {},
};

/**
 * Real ads in release builds. Off until the Privacy Policy and Terms say
 * GymGO has ads (today they promise none) and the owner has said go:
 * docs/ADS.md. Turning it on is the one change that makes ads real.
 */
export const ADS_LIVE = false;

/** The unit to ask for, or null for no ad (the website, a release before ads are live, or one without a unit). */
export function adUnitFor(place: AdPlace, platform: string, development: boolean, owner: OwnerAdUnits, live: boolean = ADS_LIVE): string | null {
  if (platform !== 'ios' && platform !== 'android') return null;
  if (development) return TEST_AD_UNITS[platform];
  if (!live) return null;
  const id = owner[platform][place]?.trim();
  return id && /^ca-app-pub-\d+\/\d+$/.test(id) ? id : null;
}

/** The owner's units: OWNER_AD_UNITS, each replaceable by an EXPO_PUBLIC_ADMOB_* setting (named in full, or the bundler can't write it in). */
export function ownerAdUnits(): OwnerAdUnits {
  const or = (setting: string | undefined, kept: string | undefined) => setting?.trim() || kept;
  return {
    ios: { home: or(process.env.EXPO_PUBLIC_ADMOB_IOS_HOME, OWNER_AD_UNITS.ios.home), results: or(process.env.EXPO_PUBLIC_ADMOB_IOS_RESULTS, OWNER_AD_UNITS.ios.results) },
    android: { home: or(process.env.EXPO_PUBLIC_ADMOB_ANDROID_HOME, OWNER_AD_UNITS.android.home), results: or(process.env.EXPO_PUBLIC_ADMOB_ANDROID_RESULTS, OWNER_AD_UNITS.android.results) },
  };
}
