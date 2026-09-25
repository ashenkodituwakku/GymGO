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
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LIMITS, haversineKm } from '@gymgo/domain';
import { ApiError } from './api';
import { FOCUS_COUNTRY, canSearchIn, openingPlace } from './country';
import { setHapticsEnabled } from './haptics';
import { currentFix, type Fix } from './location';
import { DEFAULT_PLACE, cityNear, cityPlace, homePlace, nearestCity, setDemoMode, type City } from './places';
import { locatedNotice } from './copy';
import { YOUR_LOCATION, atPlace, defaultVisit, initialFilters, moveTo, reachFor, tilesAround, type Filters } from './query';
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
  /** Outside the cities GymGO carries, but in AU or the US: the map around you was searched. */
  | { kind: 'area'; fix: Fix; gyms: number; radiusKm: number; countryCode: string }
  /** Outside every city GymGO covers: the search went to the nearest one. */
  | { kind: 'nearest'; fix: Fix; city: City; km: number }
  /** The map around you couldn't be searched: the search went to your country's opening place. */
  | { kind: 'home'; fix: Fix; placeName: string }
  /** In another country than the one you chose, without Pro: the search stays at home. */
  | { kind: 'abroad'; fix: Fix; countryCode: string; home: string }
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
  /**
   * The country you chose (ISO 3166-1): GymGO Free covers it, Pro every
   * country. Null until chosen, and until then nothing is shut.
   */
  country: string | null;
}

const RECENTS_KEY = 'gymgo.recents.v1';
const PREFS_KEY = 'gymgo.prefs.v1';
/** Only that GymGO has asked for location once, never where you were. */
const ASKED_KEY = 'gymgo.location-asked.v1';
const MAX_RECENTS = 10;

/** Why the Pro screen opened, so it can say so. */
export type ProReason = 'saved' | 'compare' | 'workouts' | 'worldwide';

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
  /** Whether gyms in this country can be searched: yours, or any with Pro. */
  mayExplore: (countryCode: string) => boolean;
  /** Make this country yours, and take the search there. */
  chooseCountry: (code: string) => void;
  /** Prefs have been read from the device (so a missing country really is missing). */
  prefsReady: boolean;
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
  const [prefs, setPrefs] = useState<Prefs>({ haptics: true, demo: false, country: null });
  const [prefsReady, setPrefsReady] = useState(false);
  // Place search reads the mode, so it must match before anything renders.
  setDemoMode(prefs.demo);
  const [here, setHere] = useState<Fix | null>(null);

  useEffect(() => {
    void loadJson<unknown>(RECENTS_KEY, []).then((value) => {
      if (Array.isArray(value)) setRecents(value.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENTS));
    });
    void loadJson<Partial<Prefs>>(PREFS_KEY, {}).then((value) => {
      const country = typeof value.country === 'string' && /^[A-Z]{2}$/.test(value.country) ? value.country : null;
      const next = { haptics: value.haptics !== false, demo: value.demo === true, country };
      setHapticsEnabled(next.haptics);
      setDemoMode(next.demo);
      setPrefs(next);
      setPrefsReady(true);
      if (next.demo) setFilters((current) => moveTo(current, atPlace(homePlace())));
      else {
        // Open in your country (the US, GymGO's main market, until you've
        // chosen), unless a place was already picked.
        const opening = openingPlace(country ?? FOCUS_COUNTRY);
        if (opening) setFilters((current) => (current.placeName === DEFAULT_PLACE.name ? moveTo(current, opening) : current));
      }
    });
  }, []);

  // A saved or recent gym outside the bundled cities (found by searching an
  // area, maybe on another device) is fetched by id, so its row isn't blank.
  const { ensureGyms } = data;
  useEffect(() => {
    void ensureGyms([...accountApi.saved, ...recents, ...compare]);
  }, [ensureGyms, accountApi.saved, recents, compare, data.status]);

  // What finding you needs to know, read when it runs rather than making it anew each change.
  const reachRef = useRef({ home: prefs.country, pro: billing.isPro, token: accountApi.token });
  reachRef.current = { home: prefs.country, pro: billing.isPro, token: accountApi.token };

  const { searchArea } = data;
  const findMe = useCallback(async (ask: boolean, onlyIfUntouched: boolean): Promise<Located> => {
    const fix = await currentFix(ask);
    if (fix === 'denied' || fix === 'unavailable') return { kind: fix };
    setHere(fix);
    const { home, pro, token } = reachRef.current;
    const city = cityNear(fix.position);
    // In a built-in city in another country, without Pro: stay at home.
    if (city && home && !canSearchIn(city.country, home, pro)) return { kind: 'abroad', fix, countryCode: city.country, home };
    // Outside the cities GymGO carries: search the map around you, anywhere
    // in the world, and only failing that (no server, or out at sea), go to
    // the nearest city it carries.
    let around: { timezone: string; countryCode: string; gyms: number; radiusKm: number } | null = null;
    if (!city && home) {
      // Whole map tiles around you, never your position: see tilesAround().
      const box = tilesAround(fix.position);
      try {
        const answer = await searchArea(box, home, token);
        if (answer.where) {
          // Distances are worked out here, on the device, from your real position.
          const reach = reachFor(answer.gyms.map((gym) => haversineKm(fix.position, gym.location.position)));
          around = { ...answer.where, gyms: reach.count, radiusKm: reach.radiusKm };
        }
      } catch (error) {
        // Abroad without Pro: say so, and stay at home. Unreachable: see below.
        if (error instanceof ApiError && error.code === 'pro_required' && typeof error.detail.countryCode === 'string') {
          return { kind: 'abroad', fix, countryCode: error.detail.countryCode, home };
        }
      }
    }
    // Failing that: your country's opening place, or (no country chosen) the nearest built-in city.
    const fallback = city || around || !home ? null : openingPlace(home);
    const nearest = city || around || fallback ? null : nearestCity(fix.position);
    const where = city
      ? { centre: fix.position, placeName: YOUR_LOCATION, timezone: city.timezone, countryCode: city.country }
      : around
        ? { centre: fix.position, placeName: YOUR_LOCATION, timezone: around.timezone, countryCode: around.countryCode }
        : (fallback ?? atPlace(cityPlace(nearest!.city)));
    const reach = (next: Filters) => (around ? { ...next, radiusKm: around.radiusKm } : next);
    setFilters((current) => {
      if (!onlyIfUntouched) return reach(moveTo(current, where));
      // At start-up, never undo a place someone already picked; and the
      // visit time, never chosen yet, becomes the next hour on local time.
      if (current.placeName !== DEFAULT_PLACE.name) return current;
      const visit = defaultVisit(new Date(), where.timezone);
      return reach({ ...current, ...where, visitDate: visit.date, visitMinuteOfDay: visit.minute });
    });
    if (city) return { kind: 'here', fix, city };
    if (around) return { kind: 'area', fix, gyms: around.gyms, radiusKm: around.radiusKm, countryCode: around.countryCode };
    if (fallback) return { kind: 'home', fix, placeName: fallback.placeName };
    return { kind: 'nearest', fix, city: nearest!.city, km: nearest!.km };
  }, [searchArea]);

  const locate = useCallback((ask: boolean) => findMe(ask, false), [findMe]);

  // Open where you are. The first launch asks once; after that, only if
  // you've allowed it. The fix itself is never stored. It waits for your
  // country, which the first launch asks for first.
  const openedHere = useRef(false);
  useEffect(() => {
    if (!prefsReady || !prefs.country || openedHere.current) return;
    openedHere.current = true;
    let cancelled = false;
    void (async () => {
      const asked = await loadJson<boolean>(ASKED_KEY, false);
      if (cancelled) return;
      if (!asked) storeJson(ASKED_KEY, true);
      const result = await findMe(!asked, true);
      if (!cancelled && result.kind !== 'denied' && result.kind !== 'unavailable') {
        const notice = locatedNotice(result, reachRef.current.home) ?? undefined;
        setExploreRequest((current) => ({ recentre: true, notice, nonce: (current?.nonce ?? 0) + 1 }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [findMe, prefsReady, prefs.country]);

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

  // The demo's gyms are invented, so where they are isn't part of Pro.
  const mayExplore = useCallback(
    (countryCode: string) => prefs.demo || canSearchIn(countryCode, prefs.country, billing.isPro),
    [prefs.demo, prefs.country, billing.isPro],
  );

  const chooseCountry = useCallback((code: string) => {
    setPrefs((current) => {
      const next = { ...current, country: code };
      storeJson(PREFS_KEY, next);
      return next;
    });
    const opening = openingPlace(code);
    if (opening && !prefs.demo) setFilters((current) => moveTo(current, opening));
    setExploreRequest((current) => ({ recentre: true, nonce: (current?.nonce ?? 0) + 1 }));
  }, [prefs.demo]);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      if (key === 'haptics') setHapticsEnabled(Boolean(value));
      storeJson(PREFS_KEY, next);
      return next;
    });
    if (key === 'demo') {
      // Switching worlds: search from the new one's home (the demo's, or
      // your country's), and let go of gyms picked in the other.
      setDemoMode(Boolean(value));
      const opening = value ? null : openingPlace(reachRef.current.home ?? FOCUS_COUNTRY);
      setFilters((current) => moveTo(current, opening ?? atPlace(homePlace())));
      setExploreRequest((current) => ({ recentre: true, nonce: (current?.nonce ?? 0) + 1 }));
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
      mayExplore,
      chooseCountry,
      prefsReady,
      here,
      locate,
    }),
    [visibleData, account, filters, recents, addRecent, clearRecents, compare, toggleCompare, clearCompare, exploreRequest, requestExplore, prefs, setPref, billing, openPro, mayExplore, chooseCountry, prefsReady, here, locate],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error('useApp must be used inside AppProvider');
  return state;
}
