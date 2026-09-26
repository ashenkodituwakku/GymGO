/**
 * The browser tab's title while a screen is showing: "Equinox · GymGO".
 * Expo Router leaves the document title alone, and one title for every page
 * makes tabs, history and screen readers (which announce it on each page)
 * less useful. On a phone this does nothing.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Platform } from 'react-native';

export function pageTitle(title: string | null | undefined): string {
  if (!title) return 'GymGO';
  // "GymGO Pro", not "GymGO Pro · GymGO".
  return title.includes('GymGO') ? title : `${title} · GymGO`;
}

export function usePageTitle(title: string | null | undefined): void {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') return;
      document.title = pageTitle(title);
    }, [title]),
  );
}
