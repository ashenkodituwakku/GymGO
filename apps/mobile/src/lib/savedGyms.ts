/**
 * Saved gyms on this device: the list shown, and the changes made here that
 * the account hasn't had yet (saved or removed signed out, or while the
 * server was away).
 *
 * Only those changes go to the account, never the whole list: the list is
 * a copy of the account's, and sending it back would undo a gym removed on
 * another device, or removed here while offline, the next time the app
 * started.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, OfflineError } from './api';

const SAVED_KEY = 'gymgo.saved.v1';
const CHANGES_KEY = 'gymgo.saved.changes.v1';

export type SavedChange = 'save' | 'unsave';
export type SavedChanges = Record<string, SavedChange>;

/** The account's list with this device's changes on top. */
export function withChanges(account: string[], changes: SavedChanges): string[] {
  const out = account.filter((id) => changes[id] !== 'unsave');
  for (const [id, change] of Object.entries(changes)) if (change === 'save' && !out.includes(id)) out.push(id);
  return out;
}

let changes: SavedChanges = {};
/** From before changes were kept: the first sync takes what's here and not on the account as saved here. */
let legacy = false;
/** Moves on with each change to a gym, so an answer to an earlier one doesn't settle a later one. */
const versions = new Map<string, number>();
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  loading ??= AsyncStorage.getItem(CHANGES_KEY)
    .then((raw) => {
      if (raw === null) {
        legacy = true;
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      const stored: SavedChanges = {};
      if (parsed && typeof parsed === 'object') {
        for (const [id, change] of Object.entries(parsed)) if (change === 'save' || change === 'unsave') stored[id] = change;
      }
      // Any change made while this loaded is newer.
      changes = { ...stored, ...changes };
    })
    .catch(() => undefined);
  return loading;
}

const storeChanges = () => AsyncStorage.setItem(CHANGES_KEY, JSON.stringify(changes)).catch(() => undefined);

/** The list kept on this device. */
export async function loadSaved(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function storeSaved(ids: string[]) {
  AsyncStorage.setItem(SAVED_KEY, JSON.stringify(ids)).catch(() => undefined);
}

/** A gym saved or removed here: kept until the account has it. Returns the change's version, to settle it by. */
export function noteChange(gymId: string, change: SavedChange): number {
  const version = (versions.get(gymId) ?? 0) + 1;
  versions.set(gymId, version);
  changes = { ...changes, [gymId]: change };
  void load().then(storeChanges);
  return version;
}

/** The account has that change, or refused it: it's no longer waiting, unless a later one replaced it. Returns whether it was still the latest. */
export function settleChange(gymId: string, version: number): boolean {
  if ((versions.get(gymId) ?? 0) !== version) return false;
  if (gymId in changes) {
    const { [gymId]: _settled, ...rest } = changes;
    changes = rest;
    void storeChanges();
  }
  return true;
}

/** Whether changes other than this gym's are waiting for the account. */
export function othersWaiting(gymId: string): boolean {
  return Object.keys(changes).some((id) => id !== gymId);
}

/** Signed out, or the account deleted: its unsent changes go with it. */
export function forgetChanges() {
  changes = {};
  legacy = false;
  void storeChanges();
}

/**
 * Sends the account the changes it hasn't had, and returns its list with
 * this device's standing changes on top (sent, or waiting for the server).
 * A change the account refuses (a gym no longer listed, say) is dropped.
 */
export async function syncSaved(token: string): Promise<string[]> {
  await load();
  const account = (await api.saved(token)).gymIds;
  if (legacy) {
    const here = await loadSaved();
    changes = { ...Object.fromEntries(here.filter((id) => !account.includes(id)).map((id) => [id, 'save' as const])), ...changes };
    legacy = false;
  }
  const standing: SavedChanges = {};
  for (const [id, change] of Object.entries(changes)) {
    const version = versions.get(id) ?? 0;
    try {
      await (change === 'save' ? api.save(token, id) : api.unsave(token, id));
      standing[id] = change;
      settleChange(id, version);
    } catch (error) {
      if (error instanceof OfflineError) standing[id] = change;
      else settleChange(id, version);
    }
  }
  await storeChanges();
  // Anything changed while that was on its way counts too.
  return withChanges(account, { ...standing, ...changes });
}
