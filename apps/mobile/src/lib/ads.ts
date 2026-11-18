/**
 * Which ad unit a place asks Google AdMob for (docs/ADS.md).
 *
 * - A development build (the Xcode route, `gymgo --xcode`, running from the
 *   bundler) always asks Google's own test units: test ads only, labelled
 *   "Test Ad" by Google, never paid, never counted against an account.
 * - A release build asks the owner's units, from EXPO_PUBLIC_ADMOB_* (set
 *   once AdMob is set up and the legal pages say there are ads); without
 *   them, no ad at all and GymGO's own Pro card stands in.
 * - Expo Go and the website have no ads either way (AdBanner.tsx).
 *
 * No React Native here, so it's unit-tested in Node.
 */

export type AdPlace = 'home' | 'results';

/** Google's sample inline adaptive banner units, which only ever serve test ads. */
export const TEST_AD_UNITS = {
  ios: 'ca-app-pub-3940256099942544/2435281174',
  android: 'ca-app-pub-3940256099942544/9214589741',
} as const;

/** The owner's units for each place, as AdMob gives them ("ca-app-pub-123…/456…"). */
export type OwnerAdUnits = Record<'ios' | 'android', Partial<Record<AdPlace, string>>>;

/** The unit to ask for, or null for no ad (the website, or a release without the owner's units). */
export function adUnitFor(place: AdPlace, platform: string, development: boolean, owner: OwnerAdUnits): string | null {
  if (platform !== 'ios' && platform !== 'android') return null;
  if (development) return TEST_AD_UNITS[platform];
  const id = owner[platform][place]?.trim();
  return id && /^ca-app-pub-\d+\/\d+$/.test(id) ? id : null;
}

/** The owner's units, read as the bundler writes them in (each named in full, or it can't). */
export function ownerAdUnits(): OwnerAdUnits {
  return {
    ios: { home: process.env.EXPO_PUBLIC_ADMOB_IOS_HOME, results: process.env.EXPO_PUBLIC_ADMOB_IOS_RESULTS },
    android: { home: process.env.EXPO_PUBLIC_ADMOB_ANDROID_HOME, results: process.env.EXPO_PUBLIC_ADMOB_ANDROID_RESULTS },
  };
}
