/**
 * Google AdMob's ads, where a build can show them (AdBanner.native.tsx).
 * This is the website's version: no ads, so nothing here loads or tracks
 * anything, and AdSlot shows GymGO's own Pro card instead.
 */

import type { AdPlace } from '@/lib/ads';

/** The ads' state: whether consent is settled, whether ads may be asked for, and whether Google's privacy choices must be offered. */
export interface AdsState {
  settled: boolean;
  ready: boolean;
  privacyChoices: boolean;
}

/** Whether this build can show an ad in a place at all. */
export function adsPossible(_place: AdPlace): boolean {
  return false;
}

/** Ask for consent where the law needs it, then start the ads: nothing to do here. */
export function startAds(): Promise<void> {
  return Promise.resolve();
}

const NONE: AdsState = { settled: true, ready: false, privacyChoices: false };
export function useAdsState(): AdsState {
  return NONE;
}

/** Reopen Google's consent form (Profile → Privacy choices): never offered here. */
export function openPrivacyChoices(): Promise<void> {
  return Promise.resolve();
}

export function AdBanner(_props: { place: AdPlace; width: number; onLoaded: () => void; onFailed: () => void }) {
  return null;
}
