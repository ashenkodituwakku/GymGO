/**
 * Where the sign-in token is kept: the phone's secure keychain/keystore, or
 * the browser's local storage on the web (which has no keychain).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'gymgo.session.v1';
/** Not secret: only that someone has signed in on this device. */
const BEFORE = 'gymgo.signed-in-before.v1';

export async function loadToken(): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? await AsyncStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function storeToken(token: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (token) await AsyncStorage.setItem(KEY, token);
      else await AsyncStorage.removeItem(KEY);
    } else if (token) {
      await SecureStore.setItemAsync(KEY, token);
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    // Storage refused: the session simply won't survive a restart.
  }
}

/** Whether anyone has signed in on this device before. Someone new is shown Create account first. */
export async function signedInBefore(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(BEFORE)) === '1';
  } catch {
    return true;
  }
}

export async function noteSignedIn(): Promise<void> {
  try {
    await AsyncStorage.setItem(BEFORE, '1');
  } catch {
    // Then it's Sign in first next time, which is only a tap away from Create account.
  }
}

/** Your name and picture as last seen, so the app can show them while the server can't be reached. */
export type Face = { displayName: string; avatarUrl?: string | null };
const FACE = 'gymgo.face.v1';

/** Only what's shown on screen is kept: never the email, role or anything that grants access. */
export async function loadFace(): Promise<Face | null> {
  try {
    const raw = await AsyncStorage.getItem(FACE);
    if (!raw) return null;
    const face = JSON.parse(raw) as Partial<Face>;
    return typeof face.displayName === 'string' ? { displayName: face.displayName, avatarUrl: typeof face.avatarUrl === 'string' ? face.avatarUrl : null } : null;
  } catch {
    return null;
  }
}

export async function storeFace(face: Face | null): Promise<void> {
  try {
    if (face) await AsyncStorage.setItem(FACE, JSON.stringify({ displayName: face.displayName, avatarUrl: face.avatarUrl ?? null }));
    else await AsyncStorage.removeItem(FACE);
  } catch {
    // Then offline it's the plain profile icon, as before.
  }
}
