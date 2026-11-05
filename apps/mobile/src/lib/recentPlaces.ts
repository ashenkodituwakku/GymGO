/**
 * The last places you searched (a suburb, a town, a city), offered when you
 * tap into the search box with nothing typed, so going back is one tap.
 * Kept on this device only, never sent anywhere, and cleared with Clear.
 * "Near me" is never one of them: where you are isn't kept.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { Whereabouts } from './query';

export type RecentPlace = Whereabouts;

const KEY = 'gymgo.recent-places.v1';
export const MAX_RECENT_PLACES = 5;

/** The list with this place first: once only (by name and country), newest first, five at most. */
export function rememberPlace(list: readonly RecentPlace[], place: RecentPlace): RecentPlace[] {
  const same = (other: RecentPlace) => other.placeName.toLowerCase() === place.placeName.toLowerCase() && other.countryCode === place.countryCode;
  return [place, ...list.filter((other) => !same(other))].slice(0, MAX_RECENT_PLACES);
}

/** What was kept, if it still reads as a list of places (anything else is dropped). */
export function readPlaces(raw: string | null): RecentPlace[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentPlace =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.placeName === 'string' &&
          item.placeName.length > 0 &&
          typeof item.timezone === 'string' &&
          typeof item.countryCode === 'string' &&
          typeof item.centre?.lat === 'number' &&
          typeof item.centre?.lng === 'number',
      )
      .slice(0, MAX_RECENT_PLACES);
  } catch {
    return [];
  }
}

export function useRecentPlaces() {
  const [places, setPlaces] = useState<RecentPlace[]>([]);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (live) setPlaces(readPlaces(raw));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const remember = useCallback((where: Whereabouts) => {
    if (!where.placeName) return;
    setPlaces((current) => {
      const next = rememberPlace(current, where);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);
  const clear = useCallback(() => {
    setPlaces([]);
    AsyncStorage.removeItem(KEY).catch(() => undefined);
  }, []);
  return { places, remember, clear };
}
