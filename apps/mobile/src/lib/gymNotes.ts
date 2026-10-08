/**
 * Your own notes on a gym (a door code, which locker, who to ask for), a
 * GymGO Pro feature. Kept on this device only: never sent to the server,
 * never shown to anyone else.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'gymgo.notes.v1';
/** Long enough for a few lines, short enough to stay a note. */
export const NOTE_LIMIT = 500;

let cache: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;

function loadAll(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      const notes: Record<string, string> = {};
      if (parsed && typeof parsed === 'object') {
        for (const [id, text] of Object.entries(parsed)) if (typeof text === 'string' && text.trim()) notes[id] = text.slice(0, NOTE_LIMIT);
      }
      cache = notes;
      return notes;
    })
    .catch(() => (cache = {}));
  return loading;
}

function saveAll(notes: Record<string, string>) {
  AsyncStorage.setItem(KEY, JSON.stringify(notes)).catch(() => undefined);
}

/** The note for one gym, and a setter that saves it a moment after you stop typing. */
export function useGymNote(gymId: string): { text: string; loaded: boolean; setText: (text: string) => void } {
  const [text, setLocal] = useState('');
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current === null || !cache) return;
    const next = { ...cache };
    if (pending.current.trim()) next[gymId] = pending.current;
    else delete next[gymId];
    cache = next;
    pending.current = null;
    saveAll(next);
  }, [gymId]);

  useEffect(() => {
    let live = true;
    setLoaded(false);
    void loadAll().then((notes) => {
      if (!live) return;
      setLocal(notes[gymId] ?? '');
      setLoaded(true);
    });
    return () => {
      live = false;
      flush();
    };
  }, [gymId, flush]);

  const setText = useCallback(
    (value: string) => {
      const clipped = value.slice(0, NOTE_LIMIT);
      setLocal(clipped);
      pending.current = clipped;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 600);
    },
    [flush],
  );

  return { text, loaded, setText };
}
