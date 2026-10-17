/**
 * The workout you're doing right now: what's planned, what you've typed,
 * and the rest timer. Kept on this device as you go, so closing the app (or
 * the browser tab) between sets loses nothing. Sent to your account only
 * when you finish.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { DraftSet, WeightUnit } from './training';
import type { Muscle } from './workout';

const KEY = 'gymgo.training.active.v1';

export interface ActiveItem {
  exerciseId: string;
  /** The plan: sets, reps ("8–10") and rest, for the placeholders and the timer. */
  planned: number;
  reps: string;
  restSeconds: number;
  sets: DraftSet[];
  /** The muscle this place in the plan is for, once it's been swapped (see swapFor). */
  muscle?: Muscle;
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

/** What a screen pointing back to the workout shows: its name and how many sets are done. */
export interface SessionGlance {
  name: string;
  setsDone: number;
}

let glanceCache: { key: string | null; value: SessionGlance | null } = { key: null, value: null };

/** The same glance object until its name or sets done change, so React can tell nothing changed. */
export function sessionGlance(session: ActiveSession | null): SessionGlance | null {
  if (!session) {
    if (glanceCache.key !== null) glanceCache = { key: null, value: null };
    return null;
  }
  const setsDone = session.items.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0);
  const key = `${setsDone}|${session.name}`;
  if (key !== glanceCache.key) glanceCache = { key, value: { name: session.name, setsDone } };
  return glanceCache.value;
}

/**
 * For the screens that only point back to the workout (Home, Progress,
 * Templates, My workouts, a workout's page): drawn again when it starts,
 * ends, is renamed or a set is ticked, not with every number typed. They
 * stay open under the workout, and each redrew with every key pressed in it.
 */
export function useActiveSessionGlance(): SessionGlance | null {
  return useSyncExternalStore(subscribe, () => sessionGlance(current), () => null);
}
