/**
 * Exercises and splits of your own (Pro), from your account: read from this
 * device first, so their names show at once and with the server away, then
 * from the server once signed in; kept here for next time. Each change made
 * in the app goes to the server first and lands here when it's kept there.
 *
 * Signed out, or someone else signed in, the lists empty: one person's
 * exercises never show on another's account.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import type { OwnExercise, OwnExerciseFields, Split, SplitFields } from '@gymgo/domain';
import { api } from './api';
import { registerOwnTraining } from './ownRegistry';

const KEY = 'gymgo.own-training.v1';

interface OwnState {
  accountId: string | null;
  exercises: OwnExercise[];
  splits: Split[];
  /** From the server this time, not only this device's copy. */
  fresh: boolean;
}

const EMPTY: OwnState = { accountId: null, exercises: [], splits: [], fresh: false };
let state: OwnState = EMPTY;
const listeners = new Set<() => void>();

function apply(next: OwnState, keep = true): void {
  state = next;
  registerOwnTraining(next.exercises, next.splits);
  for (const listener of listeners) listener();
  if (keep && next.accountId) {
    AsyncStorage.setItem(KEY, JSON.stringify({ accountId: next.accountId, exercises: next.exercises, splits: next.splits })).catch(() => undefined);
  }
}

/** Kept in step with whoever is signed in (from AppProvider). */
export function useOwnTrainingSync(token: string | null, accountId: string | null): void {
  useEffect(() => {
    if (!accountId) {
      if (state.accountId) apply(EMPTY, false);
      return;
    }
    let live = true;
    if (state.accountId !== accountId) {
      apply({ ...EMPTY, accountId }, false);
      // This device's copy first, if it's this account's.
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (!live || !raw || state.fresh || state.accountId !== accountId) return;
          const kept = JSON.parse(raw) as { accountId?: unknown; exercises?: unknown; splits?: unknown };
          if (kept.accountId === accountId && Array.isArray(kept.exercises) && Array.isArray(kept.splits)) {
            apply({ accountId, exercises: kept.exercises as OwnExercise[], splits: kept.splits as Split[], fresh: false }, false);
          }
        })
        .catch(() => undefined);
    }
    if (token) {
      Promise.all([api.ownExercises(token), api.splits(token)])
        .then(([{ exercises }, { splits }]) => {
          if (live && state.accountId === accountId) apply({ accountId, exercises, splits, fresh: true });
        })
        // The server away: this device's copy stands until it's back.
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [token, accountId]);
}

/** Your exercises (deleted ones too, marked) and splits, redrawing whoever reads them when they change. */
export function useOwnTraining(): { exercises: OwnExercise[]; splits: Split[]; fresh: boolean } {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

export async function addOwnExercise(token: string, fields: OwnExerciseFields): Promise<OwnExercise> {
  const { exercise } = await api.addOwnExercise(token, fields);
  apply({ ...state, exercises: [...state.exercises.filter((each) => each.id !== exercise.id), exercise] });
  return exercise;
}

export async function changeOwnExercise(token: string, id: string, fields: OwnExerciseFields): Promise<OwnExercise> {
  const { exercise } = await api.changeOwnExercise(token, id, fields);
  apply({ ...state, exercises: state.exercises.map((each) => (each.id === id ? exercise : each)) });
  return exercise;
}

/** Deleted on the server; kept here, marked, so what you logged with it still says its name. */
export async function deleteOwnExercise(token: string, id: string): Promise<void> {
  await api.deleteOwnExercise(token, id);
  apply({ ...state, exercises: state.exercises.map((each) => (each.id === id ? { ...each, archived: true } : each)) });
}

export async function addSplit(token: string, fields: SplitFields): Promise<Split> {
  const { split } = await api.addSplit(token, fields);
  apply({ ...state, splits: [...state.splits.filter((each) => each.id !== split.id), split] });
  return split;
}

export async function changeSplit(token: string, id: string, fields: SplitFields): Promise<Split> {
  const { split } = await api.changeSplit(token, id, fields);
  apply({ ...state, splits: state.splits.map((each) => (each.id === id ? split : each)) });
  return split;
}

export async function deleteSplit(token: string, id: string): Promise<void> {
  await api.deleteSplit(token, id);
  apply({ ...state, splits: state.splits.filter((each) => each.id !== id) });
}
