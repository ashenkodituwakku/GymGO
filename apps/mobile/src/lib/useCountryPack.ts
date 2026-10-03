import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { apiBase } from './api';
import { PackIndex, parsePack } from './countryPack';
import { readPack, removePack, writePack } from './packStore';

/**
 * Your country's gyms, kept on this device (see lib/countryPack.ts).
 *
 * What's on the device is used at once; then the server is asked whether it
 * has a newer pack, and only then is it downloaded. While the server is
 * still building one (the first time anyone asks for a country, which can
 * take a few minutes), it asks again every 30 seconds while the app is open.
 */
export interface PackState {
  status: 'off' | 'loading' | 'building' | 'ready' | 'failed';
  country: string | null;
  gyms: number;
  /** How much room it takes on this device. */
  bytes: number;
  builtAt: string | null;
  /** While the server builds it: regions read so far, of how many. */
  progress: { done: number; total: number } | null;
  /** Why it isn't saved: the server couldn't be reached, or it was but the map it reads didn't answer. */
  failure: 'server' | 'map' | null;
}

const OFF: PackState = { status: 'off', country: null, gyms: 0, bytes: 0, builtAt: null, progress: null, failure: null };
const POLL_MS = 30_000;
const DOWNLOAD_MS = 120_000;

type ServerStatus =
  | { state: 'ready'; builtAt: string; gyms: number; bytes: number }
  | { state: 'building'; done: number; total: number }
  | { state: 'failed'; message: string };

async function getJson<T>(url: string, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function getText(url: string, ms: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/** `country`: your country (null until chosen); `active`: false in demo mode. */
export function useCountryPack(country: string | null, active: boolean) {
  const [index, setIndex] = useState<PackIndex | null>(null);
  const [state, setState] = useState<PackState>(OFF);
  const [nudge, setNudge] = useState(0);
  const current = useRef<PackIndex | null>(null);

  useEffect(() => {
    if (!country || !active) {
      current.current = null;
      setIndex(null);
      setState(OFF);
      return;
    }
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const use = (text: string) => {
      const pack = parsePack(text);
      if (!pack || pack.country !== country) return false;
      const made = new PackIndex(pack);
      current.current = made;
      setIndex(made);
      setState({ status: 'ready', country, gyms: made.size, bytes: text.length, builtAt: made.builtAt, progress: null, failure: null });
      return true;
    };

    const check = async () => {
      const base = apiBase();
      if (!base || !live) return;
      const q = `home=${encodeURIComponent(country)}`;
      try {
        const status = await getJson<ServerStatus>(`${base}/api/country/${country}/pack/status?${q}`, 15_000);
        if (!live) return;
        if (status.state === 'ready') {
          if (current.current?.builtAt === status.builtAt) return;
          const text = await getText(`${base}/api/country/${country}/pack?${q}`, DOWNLOAD_MS);
          if (!live) return;
          if (use(text)) await writePack(country, text);
          return;
        }
        if (status.state === 'building') {
          if (!current.current) setState({ ...OFF, status: 'building', country, progress: { done: status.done, total: status.total } });
          timer = setTimeout(() => void check(), POLL_MS);
          return;
        }
        if (!current.current) setState({ ...OFF, status: 'failed', country, failure: 'map' });
      } catch {
        // The server's away: what's on the device stands; tried again next launch or nudge.
        if (live && !current.current) setState({ ...OFF, status: 'failed', country, failure: 'server' });
      }
    };

    current.current = null;
    setIndex(null);
    setState({ ...OFF, status: 'loading', country });
    void readPack(country).then((text) => {
      if (!live) return;
      if (!(text && use(text))) setState({ ...OFF, status: 'loading', country });
      void check();
    });
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [country, active, nudge]);

  // Back in front after a while: see whether there's a newer one.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && current.current && Date.now() - Date.parse(current.current.builtAt) > 30 * 86_400_000) setNudge((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);

  /** Ask again now (after a failure, say). */
  const retry = useCallback(() => setNudge((n) => n + 1), []);
  /** Forget it on this device (it's downloaded again next launch). */
  const forget = useCallback(async () => {
    if (!country) return;
    await removePack(country);
    current.current = null;
    setIndex(null);
    setState({ ...OFF, status: 'failed', country });
  }, [country]);

  // One object while nothing in it changes, so the app's shared state doesn't change on every render.
  return useMemo(() => ({ index, state, retry, forget }), [index, state, retry, forget]);
}
