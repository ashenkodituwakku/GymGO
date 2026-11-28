/**
 * The training programme you're on, kept on this device (lib/programmes.ts).
 * Its workouts go to your account's log like any other; the programme
 * itself (goal, days, weeks, when it started, your swaps) stays here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { PROGRAMME_DAYS, PROGRAMME_GOALS, PROGRAMME_WEEKS, type Programme } from './programmes';

const KEY = 'gymgo.programme.v1';

let current: Programme | null = null;
let loaded = false;
const listeners = new Set<() => void>();

/** A stored programme, checked field by field: anything else is no programme. */
export function readProgramme(raw: string | null): Programme | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Programme>;
    if (!PROGRAMME_GOALS.some((goal) => goal.id === value.goal)) return null;
    if (!PROGRAMME_DAYS.includes(value.days as never) || !PROGRAMME_WEEKS.includes(value.weeks as never)) return null;
    if (typeof value.startedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.startedOn)) return null;
    const swaps = value.swaps && typeof value.swaps === 'object' ? value.swaps : {};
    const clean = Object.fromEntries(Object.entries(swaps).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    return { goal: value.goal!, days: value.days!, weeks: value.weeks!, startedOn: value.startedOn, swaps: clean };
  } catch {
    return null;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const stored = readProgramme(await AsyncStorage.getItem(KEY));
    if (!current && stored) {
      current = stored;
      emit();
    }
  } catch {
    // Unreadable: no programme.
  }
}

/** Starts, changes or (null) ends the programme. */
export function setProgramme(next: Programme | null): void {
  loaded = true;
  current = next;
  (next ? AsyncStorage.setItem(KEY, JSON.stringify(next)) : AsyncStorage.removeItem(KEY)).catch(() => undefined);
  emit();
}

export function useProgramme(): Programme | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void load();
      return () => listeners.delete(listener);
    },
    () => current,
    () => current,
  );
}
