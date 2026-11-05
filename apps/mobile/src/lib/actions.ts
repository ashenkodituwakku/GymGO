/**
 * Things you can do with a gym from anywhere in the app: share it, or get
 * directions. Each says whether it worked, so the caller can explain when
 * it didn't. Invented demo gyms can't be shared or routed to.
 */

import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, Share } from 'react-native';
import type { GymRecord } from '@gymgo/domain';
import { googleMapsSearchUrl } from './present';

export async function shareGym(record: GymRecord): Promise<ShareOutcome> {
  const { name, address, website, isDemoData } = record.location;
  if (isDemoData) return 'failed';
  const where = [address.line1, address.suburb].filter(Boolean).join(', ');
  const link = website ?? googleMapsSearchUrl(record);
  try {
    await Share.share(
      Platform.OS === 'ios' ? { message: `${name}, ${where}`, url: link } : { message: `${name}, ${where}\n${link}`, title: name },
    );
    return 'shared';
  } catch {
    // A browser with no share sheet (most on a computer): copied, to paste anywhere.
    return (await copyOnWeb(`${name}, ${where}\n${link}`)) ? 'copied' : 'failed';
  }
}

/** The page last opened, and when: a double tap opens it once. */
const lastOpened = { url: '', at: 0 };
/** Taps on the same link closer together than this are one tap. */
const DOUBLE_TAP_MS = 1000;

/**
 * Opens a web page in the in-app browser (Safari's sheet on iPhone, a Chrome
 * tab on Android), or in the phone's own browser when that can't open (an
 * Android phone with no browser that does custom tabs). A double tap opens
 * it once. Unanswered, a second tap while the first was opening, or no
 * custom tabs, failed with an unhandled rejection: a warning over the app in
 * Expo Go, and nothing opened. (A browser opened the page twice.)
 */
export function openPage(url: string): void {
  const now = Date.now();
  if (url === lastOpened.url && now - lastOpened.at < DOUBLE_TAP_MS) return;
  lastOpened.url = url;
  lastOpened.at = now;
  WebBrowser.openBrowserAsync(url).catch((error: unknown) => {
    if (error instanceof Error && /already/i.test(error.message)) return;
    return Linking.openURL(url).catch(() => undefined);
  });
}

export async function openDirections(record: GymRecord): Promise<boolean> {
  const { name, position, isDemoData } = record.location;
  if (isDemoData) return false;
  const { lat, lng } = position;
  const label = encodeURIComponent(name);
  const url = Platform.select({
    ios: `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  });
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/** What sharing did: handed to a share sheet, copied for pasting, or neither. */
export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * Copies text in a browser: the clipboard API where the page may use it,
 * else the older copy command (an address without https, older Safari).
 */
async function copyOnWeb(message: string): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(message);
      return true;
    }
  } catch {
    // Not allowed here: the older way below.
  }
  try {
    const box = document.createElement('textarea');
    box.value = message;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    const done = document.execCommand('copy');
    box.remove();
    return done;
  } catch {
    return false;
  }
}

/**
 * Hands some text to the phone's share sheet. A browser without one copies
 * it instead. Says what happened: shared, copied, or neither.
 */
export async function shareText(message: string, title: string): Promise<ShareOutcome> {
  try {
    await Share.share(Platform.OS === 'ios' ? { message } : { message, title });
    return 'shared';
  } catch {
    return (await copyOnWeb(message)) ? 'copied' : 'failed';
  }
}

/** What to say after sharing, if anything. */
export function shareLine(outcome: ShareOutcome): string | null {
  if (outcome === 'copied') return 'Copied, ready to paste.';
  if (outcome === 'failed') return 'Sharing isn’t available here.';
  return null;
}
