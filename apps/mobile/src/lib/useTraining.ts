/**
 * Your training log, read from your account once and kept for the session,
 * so the workout screen and Progress share one copy.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { api, OfflineError } from './api';
import type { TrainingSession } from './training';

type LogState =
  | { status: 'signed-out' }
  | { status: 'loading'; token: string }
  | { status: 'ready'; token: string; sessions: TrainingSession[] }
  | { status: 'error'; token: string; message: string };

let state: LogState = { status: 'signed-out' };
const listeners = new Set<() => void>();
const set = (next: LogState) => {
  state = next;
  for (const listener of listeners) listener();
};

async function load(token: string) {
  set({ status: 'loading', token });
  try {
    const { sessions } = await api.training(token);
    if (state.status !== 'signed-out' && state.token === token) set({ status: 'ready', token, sessions });
  } catch (error) {
    if (state.status !== 'signed-out' && state.token === token) {
      set({
        status: 'error',
        token,
        message: error instanceof OfflineError ? 'Couldn’t reach the GymGO server for your log.' : 'Couldn’t load your log just now.',
      });
    }
  }
}

export function useTrainingLog(token: string | null) {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );

  useEffect(() => {
    if (!token) {
      if (state.status !== 'signed-out') set({ status: 'signed-out' });
      return;
    }
    if (state.status === 'signed-out' || state.token !== token) void load(token);
  }, [token]);

  const add = useCallback((session: TrainingSession) => {
    if (state.status === 'ready') set({ ...state, sessions: [session, ...state.sessions] });
  }, []);
  const remove = useCallback((id: string) => {
    if (state.status === 'ready') set({ ...state, sessions: state.sessions.filter((session) => session.id !== id) });
  }, []);
  const reload = useCallback(() => {
    if (token) void load(token);
  }, [token]);

  const current = snapshot.status !== 'signed-out' && snapshot.token === token ? snapshot : null;
  return {
    sessions: current?.status === 'ready' ? current.sessions : [],
    status: !token ? 'signed-out' : (current?.status ?? 'loading'),
    error: current?.status === 'error' ? current.message : null,
    add,
    remove,
    reload,
  } as const;
}
