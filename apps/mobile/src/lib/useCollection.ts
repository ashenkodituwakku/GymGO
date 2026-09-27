/**
 * Your gym collection, kept on this device and shared by every screen that
 * shows it (a gym's page, the collection, Profile), so collecting on one
 * shows on the others at once.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { collect as addToCollection, type CollectedGym, type Collection } from './collection';

const KEY = 'gymgo.collection.v1';

let state: { loaded: boolean; gyms: Collection } = { loaded: false, gyms: {} };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const set = (next: typeof state) => {
  state = next;
  for (const listener of listeners) listener();
};

function load(): Promise<void> {
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      const gyms: Collection = {};
      if (parsed && typeof parsed === 'object') {
        for (const [id, entry] of Object.entries(parsed as Record<string, CollectedGym>)) {
          if (entry && typeof entry.name === 'string' && Array.isArray(entry.days) && entry.days.length > 0) gyms[id] = entry;
        }
      }
      set({ loaded: true, gyms });
    })
    .catch(() => set({ loaded: true, gyms: {} }));
  return loading;
}

export function useCollection() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    void load();
  }, []);

  const collect = useCallback((gym: Parameters<typeof addToCollection>[1]) => {
    const result = addToCollection(state.gyms, gym);
    if (result.fresh !== 'again-today') {
      set({ loaded: true, gyms: result.collection });
      AsyncStorage.setItem(KEY, JSON.stringify(result.collection)).catch(() => undefined);
    }
    return result;
  }, []);

  return { loaded: snapshot.loaded, gyms: snapshot.gyms, collect };
}
