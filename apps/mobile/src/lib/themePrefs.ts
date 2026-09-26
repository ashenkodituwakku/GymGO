/**
 * Your appearance and accent, kept on this device.
 *
 * Appearance (System, Light or Dark) is for everyone. Accents other than
 * Indigo are part of GymGO Pro; the choice is kept either way, and shows
 * whenever you have Pro (see ThemedStack in app/_layout.tsx).
 *
 * In a browser the choice is read synchronously before anything draws, so
 * a dark page never flashes white first. On a phone it's read while the
 * splash screen is still up.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';
import { ACCENT_IDS, FREE_ACCENT, applyTheme, type AccentId, type AppearanceChoice, type Scheme } from './theme';

const KEY = 'gymgo.theme.v1';

export interface ThemeChoice {
  appearance: AppearanceChoice;
  accent: AccentId;
}

export const DEFAULT_CHOICE: ThemeChoice = { appearance: 'system', accent: FREE_ACCENT };

/** What was stored, cleaned: anything unknown falls back to the default. */
export function parseChoice(raw: string | null | undefined): ThemeChoice {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<ThemeChoice>) : {};
    return {
      appearance: value.appearance === 'light' || value.appearance === 'dark' || value.appearance === 'system' ? value.appearance : 'system',
      accent: ACCENT_IDS.includes(value.accent as AccentId) ? (value.accent as AccentId) : FREE_ACCENT,
    };
  } catch {
    return DEFAULT_CHOICE;
  }
}

/** Light or dark, from your choice and (for System) the phone's. */
export function schemeFor(appearance: AppearanceChoice, system: string | null | undefined): Scheme {
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return system === 'dark' ? 'dark' : 'light';
}

/** The phone's own light or dark, ignoring GymGO's override. */
export function systemScheme(): Scheme {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

let choice: ThemeChoice = DEFAULT_CHOICE;
let loaded = false;
const listeners = new Set<() => void>();

// In a browser, storage can be read now: set the colours before the first frame.
if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
  try {
    choice = parseChoice(localStorage.getItem(KEY));
    loaded = true;
    applyTheme(schemeFor(choice.appearance, systemScheme()), choice.accent);
  } catch {
    // Storage blocked: the defaults stand.
  }
}

/** Read the stored choice (once), and set the colours from it. */
export async function loadThemeChoice(): Promise<ThemeChoice> {
  if (loaded) return choice;
  try {
    choice = parseChoice(await AsyncStorage.getItem(KEY));
  } catch {
    choice = DEFAULT_CHOICE;
  }
  loaded = true;
  applyTheme(schemeFor(choice.appearance, systemScheme()), choice.accent);
  for (const listener of listeners) listener();
  return choice;
}

export function setThemeChoice(patch: Partial<ThemeChoice>): void {
  choice = { ...choice, ...patch };
  AsyncStorage.setItem(KEY, JSON.stringify(choice)).catch(() => undefined);
  for (const listener of listeners) listener();
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => choice,
    () => choice,
  );
}

/**
 * The phone's (or browser's) own light or dark, kept current while GymGO is
 * open. Listened to directly: in a browser, the prefers-color-scheme media
 * query; on a phone, Appearance. `live` is false while you've picked Light
 * or Dark yourself, when GymGO's override is what Appearance reports.
 */
export function useSystemScheme(live: boolean): Scheme {
  const [scheme, setScheme] = useState<Scheme>(systemScheme);
  useEffect(() => {
    if (!live) return;
    setScheme(systemScheme());
    if (Platform.OS === 'web') {
      const query = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null;
      if (!query) return;
      const onChange = (event: MediaQueryListEvent) => setScheme(event.matches ? 'dark' : 'light');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    const subscription = Appearance.addChangeListener(({ colorScheme }) => setScheme(colorScheme === 'dark' ? 'dark' : 'light'));
    return () => subscription.remove();
  }, [live]);
  return scheme;
}
