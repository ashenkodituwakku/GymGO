/**
 * The workout you're doing right now: what's planned, what you've typed,
 * and the rest timer. Kept on this device as you go, so closing the app (or
 * the browser tab) between sets loses nothing. Sent to your account only
 * when you finish.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { DraftSet, WeightUnit } from './training';

const KEY = 'gymgo.training.active.v1';

export interface ActiveItem {
  exerciseId: string;
  /** The plan: sets, reps ("8–10") and rest, for the placeholders and the timer. */
  planned: number;
  reps: string;
  restSeconds: number;
  sets: DraftSet[];
}

export interface ActiveSession {
  name: string;
  workoutId: string | null;
  gymId: string | null;
  gymName: string | null;
  unit: WeightUnit;
  startedAt: string;
  items: ActiveItem[];
  /** When the rest you're on ends (ms since 1970), and how long it was. */
  restEndsAt: number | null;
  restTotal: number;
  /** When you last changed anything (a set, a weight, the rest), for when it ended. */
  lastActiveAt?: string;
}

let current: ActiveSession | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  const write = current ? AsyncStorage.setItem(KEY, JSON.stringify(current)) : AsyncStorage.removeItem(KEY);
  write.catch(() => undefined);
}

/** Read what was left in progress last time, once. */
export async function loadActiveSession(): Promise<ActiveSession | null> {
  if (loaded) return current;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as ActiveSession) : null;
    // Something started meanwhile wins over what was on disk.
    if (!current && saved && Array.isArray(saved.items)) {
      current = saved;
      emit();
    }
  } catch {
    // Unreadable: start clean.
  }
  return current;
}

export function startSession(plan: {
  name: string;
  workoutId: string | null;
  gymId: string | null;
  gymName: string | null;
  unit: WeightUnit;
  items: Array<{ exerciseId: string; sets: number; reps: string; restSeconds: number }>;
}): void {
  loaded = true;
  current = {
    name: plan.name,
    workoutId: plan.workoutId,
    gymId: plan.gymId,
    gymName: plan.gymName,
    unit: plan.unit,
    startedAt: new Date().toISOString(),
    items: plan.items.map((item) => ({
      exerciseId: item.exerciseId,
      planned: item.sets,
      reps: item.reps,
      restSeconds: item.restSeconds,
      sets: Array.from({ length: Math.max(1, item.sets) }, () => ({ weight: '', reps: '', done: false })),
    })),
    restEndsAt: null,
    restTotal: 0,
  };
  persist();
  emit();
}

/** `activity: false` for changes GymGO makes itself (a rest running out), not you. */
export function updateSession(change: (session: ActiveSession) => ActiveSession, { activity = true }: { activity?: boolean } = {}): void {
  if (!current) return;
  current = change(current);
  if (activity) current = { ...current, lastActiveAt: new Date().toISOString() };
  persist();
  emit();
}

export function endSession(): void {
  current = null;
  persist();
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!loaded) void loadActiveSession();
  return () => listeners.delete(listener);
};

/** The session in progress, or null. */
export function useActiveSession(): ActiveSession | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
