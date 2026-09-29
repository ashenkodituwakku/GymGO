/**
 * Your gym collection, shared by every screen that shows it (a gym's page,
 * the collection, Profile), so collecting on one shows on the others at once.
 *
 * It's kept on this device, and signed in, on your account too: each copy is
 * merged into the other, never overwritten (packages/domain/src/collection.ts),
 * so a check-in made offline or on another device is never lost. A check-in
 * made while the server can't be reached is sent the next time it can be.
 *
 * Resetting clears both. So that a device that was offline at the time
 * can't bring the old cards back, the account remembers when it was reset:
 * such a device keeps only its visits from later days before it sends them.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { mergeCollections, visitsAfter } from '@gymgo/domain';
import { api, ApiError, OfflineError, type CollectionAnswer } from './api';
import { collect as addToCollection, localDay, type CollectedGym, type Collection } from './collection';

const KEY = 'gymgo.collection.v1';
/** Whose account this device last synced with, the reset it knows of, and whether it has visits the account hasn't. */
const SYNC_KEY = 'gymgo.collection.sync.v1';
/** Gyms per request: what the server takes at once. */
const BATCH = 200;

interface SyncMeta {
  userId: string | null;
  resetAt: string | null;
  dirty: boolean;
}

export type SyncStatus = 'signed-out' | 'syncing' | 'synced' | 'offline' | 'failed';

type State = { loaded: boolean; gyms: Collection; sync: SyncStatus };

let state: State = { loaded: false, gyms: {}, sync: 'signed-out' };
let meta: SyncMeta = { userId: null, resetAt: null, dirty: false };
let auth: { token: string; userId: string } | null = null;
let loading: Promise<void> | null = null;
let running: Promise<void> | null = null;
let again = false;
/** Moves on with each reset, so a sync that started before one doesn't bring the old cards back. */
let generation = 0;
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};

const store = (gyms: Collection) => AsyncStorage.setItem(KEY, JSON.stringify(gyms)).catch(() => undefined);
const storeMeta = (next: SyncMeta) => {
  meta = next;
  AsyncStorage.setItem(SYNC_KEY, JSON.stringify(next)).catch(() => undefined);
};

function load(): Promise<void> {
  loading ??= Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(SYNC_KEY)])
    .then(([raw, rawMeta]) => {
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      const gyms: Collection = {};
      if (parsed && typeof parsed === 'object') {
        for (const [id, entry] of Object.entries(parsed as Record<string, CollectedGym>)) {
          if (entry && typeof entry.name === 'string' && Array.isArray(entry.days) && entry.days.length > 0) gyms[id] = entry;
        }
      }
      const saved = (rawMeta ? JSON.parse(rawMeta) : null) as Partial<SyncMeta> | null;
      meta = {
        userId: typeof saved?.userId === 'string' ? saved.userId : null,
        resetAt: typeof saved?.resetAt === 'string' ? saved.resetAt : null,
        dirty: saved?.dirty === true,
      };
      set({ loaded: true, gyms });
    })
    .catch(() => set({ loaded: true, gyms: {} }));
  return loading;
}

/**
 * The card seed written into each entry. A gym collected before cards had
 * seeds takes one from its id and first visit; merging can move that first
 * visit earlier, so the seed is fixed now and the card keeps its looks.
 */
function withSeeds(gyms: Collection): Collection {
  let changed = false;
  const out: Collection = {};
  for (const [id, entry] of Object.entries(gyms)) {
    if (entry.seed) out[id] = entry;
    else {
      out[id] = { ...entry, seed: `${entry.id}|${entry.firstAt}` };
      changed = true;
    }
  }
  return changed ? out : gyms;
}

const asCollection = (answer: CollectionAnswer): Collection => Object.fromEntries(answer.gyms.map((entry) => [entry.id, entry]));

/** Whether the account's copy has every gym and visit this one has. */
function covered(account: Collection, local: Collection): boolean {
  return Object.values(local).every((entry) => {
    const kept = account[entry.id];
    return kept !== undefined && entry.days.every((day) => kept.days.includes(day));
  });
}

/** Send this device's collection to the account, in batches, and take back the merged whole. */
async function push(token: string, gyms: Collection, resetAt: string | null): Promise<CollectionAnswer> {
  const entries = Object.values(gyms);
  if (entries.length === 0) return api.collection(token);
  let answer: CollectionAnswer | null = null;
  for (let at = 0; at < entries.length; at += BATCH) answer = await api.syncCollection(token, entries.slice(at, at + BATCH), resetAt);
  return answer!;
}

/** One round of syncing with the signed-in account. */
async function syncOnce(): Promise<void> {
  await load();
  const signedIn = auth;
  if (!signedIn) return;
  const started = generation;
  set({ sync: 'syncing' });
  // A reset this device knows of counts only for the account it came from.
  let resetAt = meta.userId === signedIn.userId ? meta.resetAt : null;
  let resetDay: string | null = null;
  let local = withSeeds(state.gyms);
  if (local !== state.gyms) {
    set({ gyms: local });
    void store(local);
  }
  try {
    let answer: CollectionAnswer;
    try {
      answer = await push(signedIn.token, local, resetAt);
    } catch (error) {
      if (!(error instanceof ApiError && error.code === 'collection_reset' && typeof error.detail.resetAt === 'string')) throw error;
      // Reset on another device since this one last heard: keep only what was collected after.
      resetAt = error.detail.resetAt;
      resetDay = localDay(new Date(resetAt));
      local = visitsAfter(local, resetDay);
      answer = await push(signedIn.token, local, resetAt);
    }
    if (auth?.token !== signedIn.token) return;
    if (generation !== started) {
      again = true;
      return;
    }
    // Anything collected while that was on its way is kept too.
    const now = resetDay ? visitsAfter(state.gyms, resetDay) : state.gyms;
    const merged = mergeCollections(asCollection(answer), now);
    set({ gyms: merged, sync: 'synced' });
    void store(merged);
    const behind = !covered(asCollection(answer), now);
    storeMeta({ userId: signedIn.userId, resetAt: answer.resetAt, dirty: behind });
    if (behind) again = true;
  } catch (error) {
    if (auth?.token !== signedIn.token || generation !== started) return;
    storeMeta({ ...meta, dirty: true });
    set({ sync: error instanceof OfflineError ? 'offline' : 'failed' });
  }
}

/** Sync with the account, once at a time; asked again while one runs, it runs once more after. */
function sync(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again && auth);
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Who's signed in, for syncing; null when no one is. Resolves when the first sync with them is done. */
export function setCollectionAccount(token: string | null, userId: string | null): Promise<void> {
  if (!token || !userId) {
    auth = null;
    if (state.sync !== 'signed-out') set({ sync: 'signed-out' });
    return Promise.resolve();
  }
  if (auth?.token === token && auth.userId === userId) return running ?? Promise.resolve();
  auth = { token, userId };
  return sync();
}

/** Sync with the account now, if signed in (after it couldn't reach the server, say). */
export function syncCollection(): Promise<void> {
  return auth ? sync() : Promise.resolve();
}

/** Check in at a gym: added to the collection, or a visit added; sent to the account when signed in. */
export function collectGym(gym: Parameters<typeof addToCollection>[1]) {
  const result = addToCollection(state.gyms, gym);
  if (result.fresh !== 'again-today') {
    set({ gyms: result.collection });
    void store(result.collection);
    storeMeta({ ...meta, dirty: true });
    if (auth) void sync();
  }
  return result;
}

/**
 * Every card and visit gone: on this device, and signed in, on the account.
 * Throws when signed in and the server can't be reached; then nothing is
 * reset, so the account and this device never disagree about it.
 */
export async function resetCollection(): Promise<void> {
  await load();
  const signedIn = auth;
  if (signedIn) {
    const answer = await api.resetCollection(signedIn.token);
    generation += 1;
    storeMeta({ userId: signedIn.userId, resetAt: answer.resetAt, dirty: false });
    set({ gyms: {}, sync: 'synced' });
  } else {
    generation += 1;
    storeMeta({ ...meta, dirty: false });
    set({ gyms: {} });
  }
  await store({});
}

/** The collection as it stands (loading it first if need be). */
export async function currentCollection(): Promise<{ gyms: Collection; sync: SyncStatus }> {
  await load();
  return { gyms: state.gyms, sync: state.sync };
}

/**
 * Keeps the collection in step with the signed-in account: on signing in,
 * when the app comes back to the front with visits the account hasn't got,
 * and after each check-in. Used once, where the account is known.
 */
export function useCollectionSync(token: string | null, userId: string | null) {
  useEffect(() => {
    void setCollectionAccount(token, userId);
  }, [token, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && auth && (meta.dirty || state.sync === 'offline' || state.sync === 'failed')) void sync();
    });
    return () => subscription.remove();
  }, []);
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

  return {
    loaded: snapshot.loaded,
    gyms: snapshot.gyms,
    sync: snapshot.sync,
    collect: collectGym,
    reset: resetCollection,
    retry: syncCollection,
  };
}
