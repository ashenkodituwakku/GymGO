/**
 * Google AdMob's ads on an iPhone or Android phone (docs/ADS.md): an inline
 * banner as wide as AdSlot's card, non-personalised (no tracking across
 * apps, so no Apple tracking prompt), rated for teens at most.
 *
 * Google's consent message comes first, where the law needs it (Europe, the
 * UK, some US states): `startAds` gathers it through Google's own form
 * (UMP) before any ad is asked for, and Profile offers Privacy choices to
 * change it later wherever Google says that must be offered.
 *
 * Expo Go can't hold Google's ad library (it isn't in Expo Go's own build),
 * so there the library is never loaded and there are no ads; nor wherever
 * it fails to load. Which unit is asked for (Google's test units in a
 * development build) is lib/ads.ts.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import type * as GoogleAds from 'react-native-google-mobile-ads';
import { adUnitFor, ownerAdUnits, type AdPlace } from '@/lib/ads';
import type { AdsState } from './AdBanner';

export type { AdsState } from './AdBanner';

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let loaded: typeof GoogleAds | null | undefined;
/** Google's library, loaded the first time it's needed; null in Expo Go or if it isn't in this build. */
function library(): typeof GoogleAds | null {
  if (loaded !== undefined) return loaded;
  if (inExpoGo) return (loaded = null);
  try {
    loaded = require('react-native-google-mobile-ads') as typeof GoogleAds;
  } catch {
    loaded = null;
  }
  return loaded;
}

let state: AdsState = { settled: false, ready: false, privacyChoices: false };
const listeners = new Set<() => void>();
function set(next: Partial<AdsState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function adsPossible(place: AdPlace): boolean {
  return adUnitFor(place, Platform.OS, __DEV__, ownerAdUnits()) !== null && library() !== null;
}

let started: Promise<void> | null = null;
/**
 * Google's consent message where the law needs it, then the ads' settings
 * and start, once per launch. Only for someone who'd see ads (AdSlot calls
 * it for a free account), so Pro members never get the consent form.
 */
export function startAds(): Promise<void> {
  started ??= (async () => {
    const ads = library();
    if (!ads) return set({ settled: true });
    let info: GoogleAds.AdsConsentInfo | null = null;
    try {
      info = await ads.AdsConsent.gatherConsent();
    } catch {
      // Offline, say: what was agreed last time still holds.
      info = await ads.AdsConsent.getConsentInfo().catch(() => null);
    }
    if (!info?.canRequestAds) return set({ settled: true, privacyChoices: needsChoices(ads, info) });
    try {
      await ads.default().setRequestConfiguration({
        // GymGO takes members from 13: ads rated for teens at most.
        maxAdContentRating: ads.MaxAdContentRating.T,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await ads.default().initialize();
      set({ settled: true, ready: true, privacyChoices: needsChoices(ads, info) });
    } catch {
      set({ settled: true, privacyChoices: needsChoices(ads, info) });
    }
  })();
  return started;
}

const needsChoices = (ads: typeof GoogleAds, info: GoogleAds.AdsConsentInfo | null) =>
  info?.privacyOptionsRequirementStatus === ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;

export function useAdsState(): AdsState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Google's form for changing the consent given (Profile → Privacy choices). */
export async function openPrivacyChoices(): Promise<void> {
  const ads = library();
  if (!ads) return;
  const info = await ads.AdsConsent.showPrivacyOptionsForm().catch(() => null);
  if (info) set({ ready: info.canRequestAds, privacyChoices: needsChoices(ads, info) });
}

/** The banner itself, once consent allows: `onLoaded` when an ad came, `onFailed` when none did. */
export function AdBanner({ place, width, onLoaded, onFailed }: { place: AdPlace; width: number; onLoaded: () => void; onFailed: () => void }) {
  const { ready } = useAdsState();
  const ads = library();
  const unit = adUnitFor(place, Platform.OS, __DEV__, ownerAdUnits());
  if (!ads || !unit || !ready || width <= 0) return null;
  return (
    <ads.BannerAd
      unitId={unit}
      size={ads.BannerAdSize.INLINE_ADAPTIVE_BANNER}
      width={Math.floor(width)}
      // A card's height at most, so it never takes over the screen.
      maxHeight={250}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onAdLoaded={onLoaded}
      onAdFailedToLoad={onFailed}
    />
  );
}
