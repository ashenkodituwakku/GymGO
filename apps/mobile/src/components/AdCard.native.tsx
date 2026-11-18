/**
 * Google AdMob's ads on an iPhone or Android phone (docs/ADS.md): a native
 * advanced ad, which hands over its words and pictures for GymGO to set in
 * a card of its own, in GymGO's type and colours, marked "Ad".
 * Non-personalised (no tracking across apps, so no Apple tracking prompt),
 * rated for teens at most.
 *
 * Google's consent message comes first, where the law needs it (Europe, the
 * UK, some US states): `startAds` gathers it through Google's own form
 * (UMP) before any ad is asked for, and Profile offers Privacy choices to
 * change it later wherever Google says that must be offered.
 *
 * Expo Go can't hold Google's ad library (it isn't in Expo Go's own build),
 * so there the library is never loaded and there are no ads; nor wherever
 * it fails to load. Which unit is asked for (Google's test units in a
 * development build, none in a release until ads are live) is lib/ads.ts.
 *
 * What Google's rules for native ads ask, and where it's done here:
 * - "Ad" where it's seen first, beside the headline (the badge).
 * - Google's AdChoices mark, which the library draws, in the top corner
 *   kept clear for it (adChoicesPlacement, the headline's right margin).
 * - The headline always; the main picture or video only in Google's own
 *   media view, at least 120 points each way; every word or picture shown
 *   registered with Google (NativeAsset), so a tap on it is counted.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import type * as GoogleAds from 'react-native-google-mobile-ads';
import { adUnitFor, ownerAdUnits, type AdPlace } from '@/lib/ads';
import { color, face, radius, shadow, space, themed, type } from '@/lib/theme';
import type { AdsState } from './AdCard';

export type { AdsState } from './AdCard';

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

/**
 * One native ad in GymGO's card, once consent allows: asked for when it's
 * mounted, let go (destroyed) when it isn't. `onLoaded` when an ad came,
 * `onFailed` when none did, so AdSlot can show the Pro card instead.
 */
export function AdCard({ place, onLoaded, onFailed }: { place: AdPlace; onLoaded: () => void; onFailed: () => void }) {
  const { ready } = useAdsState();
  const ads = library();
  const unit = adUnitFor(place, Platform.OS, __DEV__, ownerAdUnits());
  const [nativeAd, setNativeAd] = useState<GoogleAds.NativeAd | null>(null);
  useEffect(() => {
    if (!ads || !unit || !ready) return;
    let mounted = true;
    let got: GoogleAds.NativeAd | null = null;
    ads.NativeAd.createForAdRequest(unit, {
      requestNonPersonalizedAdsOnly: true,
      // A wide picture keeps the card about the height of a gym card.
      aspectRatio: ads.NativeMediaAspectRatio.LANDSCAPE,
      adChoicesPlacement: ads.NativeAdChoicesPlacement.TOP_RIGHT,
      startVideoMuted: true,
    })
      .then((loaded) => {
        got = loaded;
        if (!mounted) return loaded.destroy();
        setNativeAd(loaded);
        onLoaded();
      })
      .catch(() => {
        if (mounted) onFailed();
      });
    return () => {
      mounted = false;
      got?.destroy();
      setNativeAd(null);
    };
    // One ask per card (onLoaded and onFailed are new each time AdSlot draws, and needn't ask again).
  }, [ads, unit, ready]);
  if (!ads || !nativeAd) return null;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = ads;
  const byline = nativeAd.advertiser || nativeAd.store;
  return (
    <NativeAdView nativeAd={nativeAd} style={styles.card}>
      <View style={styles.top}>
        {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} accessibilityIgnoresInvertColors />
          </NativeAsset>
        )}
        <View style={styles.words}>
          <View style={styles.byline}>
            <View style={styles.badge}>
              <Text style={[type.caption, styles.badgeText]} maxFontSizeMultiplier={1.4}>
                Ad
              </Text>
            </View>
            {byline ? (
              <NativeAsset assetType={nativeAd.advertiser ? NativeAssetType.ADVERTISER : NativeAssetType.STORE}>
                <Text style={[type.footnote, styles.secondary]} numberOfLines={1}>
                  {byline}
                </Text>
              </NativeAsset>
            ) : null}
          </View>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={[type.headline, styles.label]} numberOfLines={2}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
        </View>
      </View>
      {nativeAd.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={[type.footnote, styles.secondary]} numberOfLines={3}>
            {nativeAd.body}
          </Text>
        </NativeAsset>
      ) : null}
      {nativeAd.mediaContent && <NativeMediaView resizeMode="cover" style={styles.media} />}
      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={[type.subhead, face('semibold'), styles.action]} numberOfLines={1}>
            {nativeAd.callToAction}
          </Text>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[3], padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.card },
    // The right margin keeps the top corner clear for Google's AdChoices mark.
    top: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingRight: space[5] },
    icon: { width: 40, height: 40, borderRadius: 10, backgroundColor: color.fill },
    words: { flex: 1, minWidth: 0, gap: 2 },
    byline: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: color.brandTint },
    badgeText: { color: color.brandOnTint, ...face('bold') },
    label: { color: color.label },
    secondary: { flexShrink: 1, color: color.labelSecondary },
    // Google's least: 120 points each way; the width is the card's.
    media: { width: '100%', minWidth: 120, minHeight: 120, maxHeight: 240, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: color.fill },
    action: {
      alignSelf: 'stretch',
      textAlign: 'center',
      overflow: 'hidden',
      paddingVertical: space[2],
      borderRadius: radius.md,
      borderCurve: 'continuous',
      color: color.onBrand,
      backgroundColor: color.brandFill,
    },
  }),
);
