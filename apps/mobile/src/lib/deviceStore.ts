/**
 * A value kept on this device (AsyncStorage: the browser's storage on the
 * web), read once, checked by `read`, and shared by every screen that uses
 * it. For things that are yours and stay here: what you pay
 * (lib/visitCost.ts), the prices you've seen at saved gyms
 * (lib/priceWatch.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export interface DeviceStore<T> {
  get(): T;
  set(next: T): void;
  update(change: (now: T) => T): void;
  use(): T;
  /** Resolves once what was stored has been read. */
  ready(): Promise<void>;
}

export function deviceStore<T>(key: string, read: (stored: unknown) => T, empty: T): DeviceStore<T> {
  let current = empty;
  let loading: Promise<void> | null = null;
  let touched = false;
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const ready = () =>
    (loading ??= AsyncStorage.getItem(key)
      .then((raw) => {
        // Something set meanwhile wins over what was on disk.
        if (touched || raw === null) return;
        current = read(JSON.parse(raw));
        emit();
      })
      .catch(() => undefined));
  const set = (next: T) => {
    touched = true;
    current = next;
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => undefined);
    emit();
  };
  return {
    get: () => current,
    set,
    update: (change) => set(change(current)),
    ready,
    use: () =>
      useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          void ready();
          return () => listeners.delete(listener);
        },
        () => current,
        () => current,
      ),
  };
}
