/**
 * What every tab shares: the gyms, your account and saved gyms, the search
 * (where, when, what you need), what you looked at recently, the gyms picked
 * for comparing, and your settings.
 *
 * Tabs ask the Explore tab to do things (show a gym, focus the search, find
 * where you are) through `requestExplore`, which carries a counter so the
 * same request twice still counts as two.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LIMITS } from '@gymgo/domain';
import { setHapticsEnabled } from './haptics';
import { currentFix, type Fix } from './location';
import { DEFAULT_PLACE, cityNear, cityPlace, homePlace, nearestCity, setDemoMode, type City } from './places';
import { locatedNotice } from './copy';
import { YOUR_LOCATION, atPlace, defaultVisit, initialFilters, moveTo, type Filters } from './query';
import { useAccount } from './useAccount';
import { useBilling } from './useBilling';
import { useGymData } from './useGymData';

export interface ExploreRequest {
  nonce: number;
  /** Open this gym's card on the map. */
  gymId?: string;
  /** Put the cursor in the search box. */
  focusSearch?: boolean;
  /** Find where the person is. */
  locate?: boolean;
  /** Move the map to the search's (new) centre. */
  recentre?: boolean;
  /** Something to say above the results, e.g. why the search moved. */
  notice?: string;
}

/** What finding you produced. */
export type Located =
  | { kind: 'here'; fix: Fix; city: City }
  /** Outside every city GymGO covers: the search went to the nearest one. */
  | { kind: 'nearest'; fix: Fix; city: City; km: number }
  | { kind: 'denied' }
  | { kind: 'unavailable' };

export interface Prefs {
  haptics: boolean;
  /**
   * Demo mode: only the invented demo gyms, for trying every edge case.
   * Off, only real gyms show. Never both, since the demo sits on real
   * Sydney streets.
   */
  demo: boolean;
}

const RECENTS_KEY = 'gymgo.recents.v1';
const PREFS_KEY = 'gymgo.prefs.v1';
/** Only that GymGO has asked for location once, never where you were. */
const ASKED_KEY = 'gymgo.location-asked.v1';
const MAX_RECENTS = 10;

/** Why the Pro screen opened, so it can say so. */
export type ProReason = 'saved' | 'compare' | 'workouts';

type AppState = {
  data: ReturnType<typeof useGymData>;
  account: ReturnType<typeof useAccount>;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  recents: string[];
  addRecent: (gymId: string) => void;
  clearRecents: () => void;
  compare: string[];
  toggleCompare: (gymId: string) => void;
  clearCompare: () => void;
  exploreRequest: ExploreRequest | null;
  requestExplore: (request: Omit<ExploreRequest, 'nonce'>) => void;
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  /** Free or Pro, and what Pro costs. */
  billing: ReturnType<typeof useBilling>;
  /** Show the Pro screen, e.g. when a Free limit is reached. */
  openPro: (reason?: ProReason) => void;
  /** Where you are, from this session's last fix. Memory only. */
  here: Fix | null;
  /** Find you and move the search there (or to the nearest city covered). */
  locate: (ask: boolean) => Promise<Located>;
};

const AppContext = createContext<AppState | null>(null);

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function storeJson(key: string, value: unknown) {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const data = useGymData();
  const accountApi = useAccount();
  const billing = useBilling(accountApi);
  const { limits } = billing;

  const openPro = useCallback((reason?: ProReason) => {
    router.push({ pathname: '/pro', params: reason ? { reason } : {} });
  }, []);

  // Saving past the Free limit opens the Pro screen instead. The server
  // checks too; this is only so nobody taps and sees nothing happen.
  const account = useMemo(
    () => ({
      ...accountApi,
      toggleSave: (gymId: string) => {
        if (!accountApi.saved.includes(gymId) && accountApi.saved.length >= limits.savedGyms) {
          openPro('saved');
          return;
        }
        accountApi.toggleSave(gymId);
      },
    }),
    [accountApi, limits.savedGyms, openPro],
  );
  const [filters, setFilters] = useState<Filters>(() => initialFilters());
  const [recents, setRecents] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [exploreRequest, setExploreRequest] = useState<ExploreRequest | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ haptics: true, demo: false });
  // Place search reads the mode, so it must match before anything renders.
  setDemoMode(prefs.demo);
  const [here, setHere] = useState<Fix | null>(null);

  useEffect(() => {
    void loadJson<unknown>(RECENTS_KEY, []).then((value) => {
      if (Array.isArray(value)) setRecents(value.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENTS));
    });
    void loadJson<Partial<Prefs>>(PREFS_KEY, {}).then((value) => {
      const next = { haptics: value.haptics !== false, demo: value.demo === true };
      setHapticsEnabled(next.haptics);
      setDemoMode(next.demo);
      setPrefs(next);
      if (next.demo) setFilters((current) => moveTo(current, atPlace(homePlace())));
    });
  }, []);

  // A saved or recent gym outside the bundled cities (found by searching an
  // area, maybe on another device) is fetched by id, so its row isn't blank.
  const { ensureGyms } = data;
  useEffect(() => {
    ensureGyms([...accountApi.saved, ...recents, ...compare]);
  }, [ensureGyms, accountApi.saved, recents, compare, data.status]);

  const findMe = useCallback(async (ask: boolean, onlyIfUntouched: boolean): Promise<Located> => {
    const fix = await currentFix(ask);
    if (fix === 'denied' || fix === 'unavailable') return { kind: fix };
    setHere(fix);
    const city = cityNear(fix.position);
    const nearest = city ? null : nearestCity(fix.position);
    const where = city
      ? { centre: fix.position, placeName: YOUR_LOCATION, timezone: city.timezone }
      : atPlace(cityPlace(nearest!.city));
    setFilters((current) => {
      if (!onlyIfUntouched) return moveTo(current, where);
      // At start-up, never undo a place someone already picked; and the
      // visit time, never chosen yet, becomes the next hour on local time.
      if (current.placeName !== DEFAULT_PLACE.name) return current;
      const visit = defaultVisit(new Date(), where.timezone);
      return { ...current, ...where, visitDate: visit.date, visitMinuteOfDay: visit.minute };
    });
    return city ? { kind: 'here', fix, city } : { kind: 'nearest', fix, city: nearest!.city, km: nearest!.km };
  }, []);

  const locate = useCallback((ask: boolean) => findMe(ask, false), [findMe]);

  // Open where you are. The first launch asks once; after that, only if
  // you've allowed it. The fix itself is never stored.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const asked = await loadJson<boolean>(ASKED_KEY, false);
      if (cancelled) return;
      if (!asked) storeJson(ASKED_KEY, true);
      const result = await findMe(!asked, true);
      if (!cancelled && (result.kind === 'here' || result.kind === 'nearest')) {
        const notice = locatedNotice(result) ?? undefined;
        setExploreRequest((current) => ({ recentre: true, notice, nonce: (current?.nonce ?? 0) + 1 }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [findMe]);

  const addRecent = useCallback((gymId: string) => {
    setRecents((current) => {
      const next = [gymId, ...current.filter((id) => id !== gymId)].slice(0, MAX_RECENTS);
      storeJson(RECENTS_KEY, next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    storeJson(RECENTS_KEY, []);
  }, []);

  const toggleCompare = useCallback(
    (gymId: string) => {
      if (!compare.includes(gymId) && compare.length >= limits.compare && limits.compare < LIMITS.pro.compare) {
        openPro('compare');
        return;
      }
      setCompare((current) =>
        current.includes(gymId) ? current.filter((id) => id !== gymId) : [...current, gymId].slice(-limits.compare),
      );
    },
    [compare, limits.compare, openPro],
  );

  const clearCompare = useCallback(() => setCompare([]), []);

  const requestExplore = useCallback((request: Omit<ExploreRequest, 'nonce'>) => {
    setExploreRequest((current) => ({ ...request, nonce: (current?.nonce ?? 0) + 1 }));
  }, []);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      if (key === 'haptics') setHapticsEnabled(Boolean(value));
      storeJson(PREFS_KEY, next);
      return next;
    });
    if (key === 'demo') {
      // Switching worlds: search from the new one's home, and let go of
      // gyms picked in the other.
      setDemoMode(Boolean(value));
      setFilters((current) => moveTo(current, atPlace(homePlace())));
      setCompare([]);
    }
  }, []);

  // Only the gyms of the current mode: real, or (in demo mode) invented.
  const visibleData = useMemo(
    () => ({ ...data, records: data.records.filter((record) => record.location.isDemoData === prefs.demo) }),
    [data, prefs.demo],
  );

  const value = useMemo<AppState>(
    () => ({
      data: visibleData,
      account,
      filters,
      setFilters,
      recents,
      addRecent,
      clearRecents,
      compare,
      toggleCompare,
      clearCompare,
      exploreRequest,
      requestExplore,
      prefs,
      setPref,
      billing,
      openPro,
      here,
      locate,
    }),
    [visibleData, account, filters, recents, addRecent, clearRecents, compare, toggleCompare, clearCompare, exploreRequest, requestExplore, prefs, setPref, billing, openPro, here, locate],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error('useApp must be used inside AppProvider');
  return state;
}
