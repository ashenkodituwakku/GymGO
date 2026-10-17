/**
 * Your appearance and accent, kept on this device.
 *
 * Appearance (System, Light or Dark) and Liquid Glass are for everyone. Accents other than
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
import { ACCENT_IDS, FREE_ACCENT, FREE_LOOK, GLASS_DEFAULT, LOOK_IDS, LOOKS, applyTheme, cleanGlass, type AccentId, type AppearanceChoice, type LookId, type Scheme } from './theme';
import { loadLookFonts } from './lookFonts';

const KEY = 'gymgo.theme.v1';

export interface ThemeChoice {
  appearance: AppearanceChoice;
  accent: AccentId;
  /** How the app is drawn (Pro, like the accents): see looks.ts. */
  look: LookId;
  /** Liquid Glass, 0 (solid) to 100 (clearest), for everyone: see GLASS_DEFAULT in theme.ts. */
  glass: number;
}

export const DEFAULT_CHOICE: ThemeChoice = { appearance: 'system', accent: FREE_ACCENT, look: FREE_LOOK, glass: GLASS_DEFAULT };

/** What was stored, cleaned: anything unknown falls back to the default. */
export function parseChoice(raw: string | null | undefined): ThemeChoice {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<ThemeChoice>) : {};
    return {
      appearance: value.appearance === 'light' || value.appearance === 'dark' || value.appearance === 'system' ? value.appearance : 'system',
      accent: ACCENT_IDS.includes(value.accent as AccentId) ? (value.accent as AccentId) : FREE_ACCENT,
      look: LOOK_IDS.includes(value.look as LookId) ? (value.look as LookId) : FREE_LOOK,
      glass: cleanGlass(value.glass),
    };
  } catch {
    return DEFAULT_CHOICE;
  }
}

/** Light or dark, from your choice and (for System) the phone's. */
export function schemeFor(appearance: AppearanceChoice, system: string | null | undefined, look: LookId = FREE_LOOK): Scheme {
  // A look that's only one way (Neon is always dark).
  const only = LOOKS[look].scheme;
  if (only) return only;
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

/**
 * Tell the phone, so its own parts (keyboards, menus, Liquid Glass, Apple's
 * map) match. Done the moment the choice is made, before anything reads the
 * phone's scheme: until it's lifted, GymGO's own Light or Dark is what the
 * phone reports, so going back to System read the old choice as the phone's.
 */
function tellPhone(appearance: AppearanceChoice) {
  if (Platform.OS === 'web') return;
  try {
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  } catch {
    // An older phone without the override: its own parts follow the system.
  }
}

let choice: ThemeChoice = DEFAULT_CHOICE;
let loaded = false;
const listeners = new Set<() => void>();

// In a browser, storage can be read now: set the colours before the first frame.
if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
  try {
    choice = parseChoice(localStorage.getItem(KEY));
    loaded = true;
    // The page falls back to the standard face until the look's own arrives.
    applyTheme(schemeFor(choice.appearance, systemScheme(), choice.look), choice.accent, choice.look, choice.glass);
    void loadLookFonts(choice.look);
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
  tellPhone(choice.appearance);
  // While the splash screen is up: the look's faces first, so nothing draws in a face that isn't there.
  await loadLookFonts(choice.look);
  applyTheme(schemeFor(choice.appearance, systemScheme(), choice.look), choice.accent, choice.look, choice.glass);
  for (const listener of listeners) listener();
  return choice;
}

export function setThemeChoice(patch: Partial<ThemeChoice>): void {
  if (patch.appearance && patch.appearance !== choice.appearance) tellPhone(patch.appearance);
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
