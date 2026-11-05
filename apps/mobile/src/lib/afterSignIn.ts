/**
 * GymGO needs an account, so a link opened while signed out (a gym a friend
 * sent, say) lands on the sign-in screen first. This keeps where it was
 * going, and the sign-in screen goes there once you're in.
 */

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** Paths that don't need an account: never worth coming back to. */
const OPEN = /^\/(sign-in|legal\/)/;

let wanted: string | null = null;

/** Keep a path to come back to, if it's somewhere in the app that needs an account. */
export function rememberWanted(path: string | null | undefined): void {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path === '/' || OPEN.test(path)) return;
  wanted = path;
}

let fresh = false;

/** An account was just made here (or not, after all): the welcome tour shows once you're in. */
export function noteNewAccount(made = true): void {
  fresh = made;
}

/** Whether an account was just made (once only). */
export function takeNewAccount(): boolean {
  const made = fresh;
  fresh = false;
  return made;
}

/** Where to go after signing in (once only), or null for Home. */
export function takeWanted(): string | null {
  const path = wanted;
  wanted = null;
  return path;
}

/** The link the app was opened with: the page's address in a browser, the deep link on a phone. */
export async function rememberOpeningLink(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') rememberWanted(`${window.location.pathname}${window.location.search}`);
    return;
  }
  try {
    const url = await Linking.getInitialURL();
    if (!url) return;
    const { path, queryParams } = Linking.parse(url);
    if (!path) return;
    const query = Object.entries(queryParams ?? {})
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    rememberWanted(`/${path.replace(/^\/+/, '')}${query ? `?${query}` : ''}`);
  } catch {
    // No link to come back to: Home it is.
  }
}
