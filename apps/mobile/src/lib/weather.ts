/**
 * The weather where you're searching, for Home's card and the map's circle
 * (components/Weather.tsx): MET Norway's forecast through the GymGO server
 * (packages/domain/src/weather.ts, apps/server/src/weather.ts).
 *
 * Asked for by the same block of map squares the gym lookup sends
 * (lib/query.ts `tilesAround`), never your position: anyone in the same
 * square gets the same forecast, for the middle of that square. So it's
 * your area's weather, and the card says so.
 *
 * Kept in memory for 15 minutes per square, and asked again after that
 * while a screen shows it. Nothing without an account or a server (the
 * limited website), or when the server has it switched off; a forecast that
 * can't be had shows nothing rather than a guess.
 */

import type { Weather } from '@gymgo/domain';
import { useEffect, useState } from 'react';
import { ApiError, api } from './api';
import { useApp } from './app-state';
import { LIMITED } from './limited';
import { tileKey, tilesAround } from './query';

const FRESH_MS = 15 * 60_000;
const kept = new Map<string, { weather: Weather; at: number }>();
const asking = new Map<string, Promise<Weather | null>>();
/** Switched off on this server: not asked again while the app is open. */
let switchedOff = false;

export type WeatherState = { status: 'off' } | { status: 'loading' } | { status: 'none' } | { status: 'ready'; weather: Weather };

async function fetchFor(token: string, key: string, block: { south: number; west: number }): Promise<Weather | null> {
  const already = asking.get(key);
  if (already) return already;
  const ask = api
    .weather(token, block)
    .then(({ weather }) => {
      kept.set(key, { weather, at: Date.now() });
      return weather;
    })
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.code === 'weather_off') switchedOff = true;
      return null;
    })
    .finally(() => asking.delete(key));
  asking.set(key, ask);
  return ask;
}

/** The forecast for the square around `point` (where you're searching), as it arrives. */
export function useWeather(point: { lat: number; lng: number } | null): WeatherState {
  const { account } = useApp();
  const token = account.token;
  const block = point ? tilesAround(point) : null;
  const key = block ? tileKey(block) : null;
  const [state, setState] = useState<WeatherState>(() => {
    if (!key) return { status: 'off' };
    const held = kept.get(key);
    return held ? { status: 'ready', weather: held.weather } : { status: 'loading' };
  });

  useEffect(() => {
    if (LIMITED || !token || !key || !block || switchedOff) {
      setState({ status: 'off' });
      return;
    }
    let live = true;
    const refresh = () => {
      const held = kept.get(key);
      if (held) setState({ status: 'ready', weather: held.weather });
      if (held && Date.now() - held.at < FRESH_MS) return;
      if (!held) setState({ status: 'loading' });
      void fetchFor(token, key, block).then((weather) => {
        if (!live) return;
        if (weather) setState({ status: 'ready', weather });
        // Kept from before, still shown (it says when it was made); none at all, nothing to show.
        else if (!kept.get(key)) setState(switchedOff ? { status: 'off' } : { status: 'none' });
      });
    };
    refresh();
    const timer = setInterval(refresh, FRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
    // The block is the key's: one change, one ask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, token]);

  return state;
}
