/**
 * Where you are, as precisely as the phone can tell.
 *
 * High-accuracy GPS, not rounded, so distances and the "you are here" dot are
 * right. It is used on this device only, for this search: it is never saved
 * and never sent to the GymGO server or anyone else. (Outside the cities
 * GymGO carries, the server is asked for the gyms in the whole map tiles
 * around you, the same box for everyone in a tile: see tilesAround().)
 *
 * If you've only allowed approximate location (Android's "Approximate", or
 * iOS's "Precise: Off"), GymGO says so, because distances will be off by a
 * kilometre or more.
 */

import * as Location from 'expo-location';
import type { LatLng } from '@gymgo/domain';

export interface Fix {
  position: LatLng;
  /** How far off the fix may be, in metres, when the phone says. */
  accuracyM: number | null;
  /** The person allowed only approximate location. */
  approximate: boolean;
}

export type FixResult = Fix | 'denied' | 'unavailable';

/**
 * `ask`: show the permission prompt if it hasn't been answered. Without it,
 * this only works when location was already allowed (used at start-up, so
 * GymGO never prompts before you've asked for anything).
 *
 * `fresh`: a new fix only, never a position the phone already had. For
 * trying again after being told you're not at the gym yet: the earlier
 * position is the one that said so, and you've likely walked in since.
 */
export async function currentFix(ask: boolean, fresh = false): Promise<FixResult> {
  let permission: Location.LocationPermissionResponse;
  try {
    permission = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
  } catch {
    return 'unavailable';
  }
  if (!permission.granted) return 'denied';
  const approximate = permission.android?.accuracy === 'coarse';
  const toFix = (found: Location.LocationObject): Fix => ({
    position: { lat: found.coords.latitude, lng: found.coords.longitude },
    accuracyM: found.coords.accuracy ?? null,
    approximate: approximate || (found.coords.accuracy ?? 0) > 1000,
  });

  // A good position the phone worked out a moment ago: at once.
  const recent = fresh ? null : await Location.getLastKnownPositionAsync({ maxAge: RECENT_MS, requiredAccuracy: 100 }).catch(() => null);
  if (recent) return toFix(recent);

  try {
    // Precise GPS first. Indoors it can take a long while or never come, so
    // after a few seconds the phone is also asked for its Wi-Fi and cell
    // tower position (tens of metres, and it works indoors), and whichever
    // answers first is used.
    const maxAge = fresh ? 0 : RECENT_MS;
    const precise = Location.getCurrentPositionAsync(notOlderThan(maxAge, { accuracy: Location.Accuracy.Highest }));
    const rough = pause(PRECISE_ALONE_MS).then(() => Location.getCurrentPositionAsync(notOlderThan(maxAge, { accuracy: Location.Accuracy.Balanced })));
    return toFix(await withTimeout(firstOf([precise, rough]), FIX_TIMEOUT_MS));
  } catch {
    // Location off, or no answer at all: the last position the phone knew, if not too old.
    const last = fresh ? null : await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MS }).catch(() => null);
    return last ? toFix(last) : 'unavailable';
  }
}

/** A position the phone already has, this recent and this good, is used without asking again. */
const RECENT_MS = 2 * 60_000;
/** How long precise GPS is asked alone before Wi-Fi and cell towers are asked too. */
export const PRECISE_ALONE_MS = 4_000;
/** How long to wait for any fix once location is allowed. */
export const FIX_TIMEOUT_MS = 15_000;
/** With no fix at all, the phone's last known position is used if it's no older than this. */
const LAST_KNOWN_MS = 30 * 60_000;

/**
 * On the web, expo-location takes any position the browser has kept, however
 * old, so a phone's browser would keep saying you're where GymGO was first
 * opened. This says how old is too old; on a phone app it's ignored, as each
 * fix there is new anyway.
 */
const notOlderThan = (maximumAge: number, options: Location.LocationOptions) => ({ ...options, maximumAge }) as Location.LocationOptions;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The first of these to succeed; fails only when all of them have. */
export function firstOf<T>(promises: Array<Promise<T>>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let failed = 0;
    for (const promise of promises) {
      promise.then(resolve, (error: unknown) => {
        failed += 1;
        if (failed === promises.length) reject(error);
      });
    }
  });
}

/** The promise's value, or a rejection once `ms` have passed without one. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
