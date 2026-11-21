/**
 * Whether Google's content (Street View, Google's photos of a gym) may load
 * on a gym's page without asking.
 *
 * Anything loaded from Google shows Google your device's IP address, as any
 * website does, and a German court has held that sending it to Google
 * without asking breaks the GDPR (it ordered a site that loaded Google Fonts
 * to pay damages). So a gym's page shows nothing from Google until you tap Show, or
 * until you choose to always show it (on that card or in Profile). Opening
 * "See it on Google" is asking, so that page loads straight away.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const KEY = 'gymgo.googleContent.v1';

let always = false;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((value) => {
      if (value === 'always') setAlwaysShowGoogle(true, false);
    })
    .catch(() => undefined);
}

export function setAlwaysShowGoogle(next: boolean, persist = true): void {
  always = next;
  if (persist) {
    const write = next ? AsyncStorage.setItem(KEY, 'always') : AsyncStorage.removeItem(KEY);
    write.catch(() => undefined);
  }
  for (const listener of listeners) listener();
}

/** Whether you've chosen to always show Google's content. */
export function useAlwaysShowGoogle(): boolean {
  load();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => always,
    () => always,
  );
}
