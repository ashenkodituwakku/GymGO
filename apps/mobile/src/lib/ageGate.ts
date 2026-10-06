/**
 * The age question asked before an account is made.
 *
 * GymGO accounts are for people 13 and over (in the US, collecting anything
 * from a younger child needs a parent's verified consent, which GymGO
 * doesn't have). GymGO can't be used without an account, so a younger child
 * can't use it at all.
 *
 * The question is neutral, as the FTC advises: it asks when you were born,
 * not "are you over 13?", and doesn't say which answers get in. After an
 * answer that's too young, this device won't offer account creation again
 * for a day, so the answer can't simply be changed. The server checks the
 * age too, and keeps only when the check was made, never the answer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCK_KEY = 'gymgo.ageLock.v1';
const LOCK_MS = 24 * 3_600_000;

/** "0 4 1 9 9 5" typed on a number pad, shown as "04 / 1995". */
export function formatBirthMonthInput(typed: string): string {
  const digits = typed.replace(/\D/g, '').slice(0, 6);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

/** "04 / 1995", "4/1995" → "1995-04", or null while it isn't a real month yet. */
export function parseBirthMonth(text: string, now = new Date()): string | null {
  const match = /^\s*(\d{1,2})\s*[/.\-\s]\s*(\d{4})\s*$/.exec(text);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  const thisYear = now.getFullYear();
  if (month < 1 || month > 12 || year < thisYear - 120 || year > thisYear) return null;
  if (year === thisYear && month > now.getMonth() + 1) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Whether this device answered too young in the last day. */
export async function accountCreationLocked(now = Date.now()): Promise<boolean> {
  try {
    const at = Number(await AsyncStorage.getItem(LOCK_KEY));
    return Number.isFinite(at) && at > 0 && now - at < LOCK_MS;
  } catch {
    return false;
  }
}

export async function lockAccountCreation(now = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCK_KEY, String(now));
  } catch {
    // Storage unavailable: the server still refuses the account.
  }
}

/**
 * A Google or Apple sign-in waiting on the age question: the server said it
 * would make a new account and asked first. Kept in memory only, and only
 * until the question is answered or the screen is left.
 */
export interface PendingSignIn {
  provider: 'google' | 'apple';
  idToken: string;
  nonce: string | null;
  name: string | null;
}

let pending: PendingSignIn | null = null;

export function holdPendingSignIn(next: PendingSignIn | null): void {
  pending = next;
}

export function takePendingSignIn(): PendingSignIn | null {
  const taken = pending;
  pending = null;
  return taken;
}
