/**
 * The weather where you're searching, for Home's weather widgets and the
 * map's circle (components/Weather.tsx): MET Norway's forecast through the
 * GymGO server (packages/domain/src/weather.ts, apps/server/src/weather.ts).
 *
 * Asked for by the same block of map squares the gym lookup sends
 * (lib/query.ts `tilesAround`), never your position: anyone in the same
 * square gets the same forecast, for the middle of that square. So it's
 * your area's weather, and the widgets say so.
 *
 * Kept in memory for 15 minutes per square and asked again after that
 * while something shows it; a failed ask is tried again after two minutes.
 * When there's no forecast, it says why (signed out, no server behind the
 * website, switched off on the server, or unavailable just now), so the
 * map's circle can stay and say so, rather than show a guess.
 */

import type { Weather } from '@gymgo/domain';
import { useEffect, useState } from 'react';
import { ApiError, OfflineError, api } from './api';
import { useApp } from './app-state';
import { LIMITED } from './limited';
import { tileKey, tilesAround } from './query';

const FRESH_MS = 15 * 60_000;
const RETRY_MS = 2 * 60_000;
const kept = new Map<string, { weather: Weather; at: number }>();
const tried = new Map<string, number>();
const asking = new Map<string, Promise<Weather | null>>();
/** Switched off on this server: not asked again while the app is open. */
let switchedOff = false;

export type WeatherOff = 'signedOut' | 'noServer' | 'switchedOff';
/** Why the last ask got no forecast: GymGO's server didn't answer, MET Norway didn't, or something else. */
export type WeatherMissing = 'server' | 'met' | 'other';
export type WeatherState = { status: 'off'; why: WeatherOff } | { status: 'loading' } | { status: 'none'; cause: WeatherMissing } | { status: 'ready'; weather: Weather };
const missed = new Map<string, WeatherMissing>();

async function fetchFor(token: string, key: string, block: { south: number; west: number }): Promise<Weather | null> {
  const already = asking.get(key);
  if (already) return already;
  tried.set(key, Date.now());
  const ask = api
    .weather(token, block)
    .then(({ weather }) => {
      kept.set(key, { weather, at: Date.now() });
      return weather;
    })
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.code === 'weather_off') switchedOff = true;
      // Said truly: with GymGO's own server down, it isn't MET Norway that couldn't be reached.
      missed.set(key, error instanceof OfflineError ? 'server' : error instanceof ApiError && error.code === 'weather_unavailable' ? 'met' : 'other');
      return null;
    })
    .finally(() => asking.delete(key));
  asking.set(key, ask);
  return ask;
}

/** Why there's nothing to ask, if there's nothing to ask. */
function offWhy(token: string | null): WeatherOff | null {
  if (LIMITED) return 'noServer';
  if (switchedOff) return 'switchedOff';
  if (!token) return 'signedOut';
  return null;
}

/** The forecast for the square around `point` (where you're searching), as it arrives. */
export function useWeather(point: { lat: number; lng: number } | null): WeatherState {
  const { account } = useApp();
  const token = account.token;
  const block = point ? tilesAround(point) : null;
  const key = block ? tileKey(block) : null;
  const [state, setState] = useState<WeatherState>(() => {
    const why = offWhy(token);
    if (why) return { status: 'off', why };
    const held = key ? kept.get(key) : undefined;
    return held ? { status: 'ready', weather: held.weather } : { status: 'loading' };
  });

  useEffect(() => {
    const why = offWhy(token);
    if (why || !key || !block || !token) {
      setState({ status: 'off', why: why ?? 'signedOut' });
      return;
    }
    let live = true;
    const refresh = () => {
      const held = kept.get(key);
      if (held) setState({ status: 'ready', weather: held.weather });
      if (held && Date.now() - held.at < FRESH_MS) return;
      // Failed a moment ago: wait a little before asking again.
      if (!held && Date.now() - (tried.get(key) ?? 0) < RETRY_MS && !asking.has(key)) {
        setState({ status: 'none', cause: missed.get(key) ?? 'other' });
        return;
      }
      if (!held) setState((now) => (now.status === 'none' ? now : { status: 'loading' }));
      void fetchFor(token, key, block).then((weather) => {
        if (!live) return;
        if (weather) setState({ status: 'ready', weather });
        // Kept from before, still shown (it says when it was made); none at all: say so.
        else if (!kept.get(key)) setState(switchedOff ? { status: 'off', why: 'switchedOff' } : { status: 'none', cause: missed.get(key) ?? 'other' });
      });
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
    // The block is the key's: one change, one ask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, token]);

  return state;
}
