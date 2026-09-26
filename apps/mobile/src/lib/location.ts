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
 */
export async function currentFix(ask: boolean): Promise<FixResult> {
  let permission: Location.LocationPermissionResponse;
  try {
    permission = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
  } catch {
    return 'unavailable';
  }
  if (!permission.granted) return 'denied';
  const approximate = permission.android?.accuracy === 'coarse';

  try {
    // Indoors a precise fix can take a long while, or never come: past
    // FIX_TIMEOUT_MS, the last known position is used, or none.
    const fix = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }), FIX_TIMEOUT_MS);
    return {
      position: { lat: fix.coords.latitude, lng: fix.coords.longitude },
      accuracyM: fix.coords.accuracy ?? null,
      approximate: approximate || (fix.coords.accuracy ?? 0) > 1000,
    };
  } catch {
    // Indoors or GPS switched off: the last position the phone knew, if recent.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 }).catch(() => null);
    if (!last) return 'unavailable';
    return {
      position: { lat: last.coords.latitude, lng: last.coords.longitude },
      accuracyM: last.coords.accuracy ?? null,
      approximate: approximate || (last.coords.accuracy ?? 0) > 1000,
    };
  }
}

/** How long to wait for a precise fix once location is allowed. */
export const FIX_TIMEOUT_MS = 12_000;

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
