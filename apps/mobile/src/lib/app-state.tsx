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
import { AppState as NativeAppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LIMITS, haversineKm } from '@gymgo/domain';
import { ApiError, problemText } from './api';
import { FOCUS_COUNTRY, canSearchIn, deviceTimeZone, openingPlace } from './country';
import { setHapticsEnabled } from './haptics';
import { currentFix, type Fix } from './location';
import { DEFAULT_PLACE, cityNear, cityPlace, homePlace, nearestCity, setDemoMode, setReaderCountry, whereaboutsAt, type City } from './places';
import { locatedNotice } from './copy';
import { YOUR_LOCATION, atPlace, defaultVisit, initialFilters, moveTo, reachFor, refreshVisit, tileKey, tilesAround, wantsLookup, type Filters } from './query';
import { useAccount } from './useAccount';
import { useBilling } from './useBilling';
import { useGymData } from './useGymData';
import { useCountryPack } from './useCountryPack';
import { useCollectionSync } from './useCollection';
import { cleanPlates, type WeightUnit } from './training';
import { cleanTimers, type IntervalPlan } from './intervals';

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
  /** Outside the cities GymGO carries, anywhere in the world: the search is on you, and the map's gyms wait for Search this area. */
  | { kind: 'area'; fix: Fix }
  /** Outside every city GymGO covers, with no country chosen: the search went to the nearest one. */
  | { kind: 'nearest'; fix: Fix; city: City; km: number }
  /** Couldn't tell what time it is where you are: the search went to your country's opening place. */
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
  /** Workouts a week you're aiming for (1 to 7), kept on this device; null until you pick one. */
  weeklyGoal: number | null;
  /** The plates your gym has, per unit (Pro); missing means the standard set. */
  plates: Partial<Record<WeightUnit, number[]>>;
  /** Interval timers of your own (Pro), kept on this device. */
  timers: IntervalPlan[];
}

const RECENTS_KEY = 'gymgo.recents.v1';
const COMPARE_KEY = 'gymgo.compare.v1';
const PREFS_KEY = 'gymgo.prefs.v1';
/** Only that GymGO has asked for location once, never where you were. */
const ASKED_KEY = 'gymgo.location-asked.v1';
const MAX_RECENTS = 10;

/**
 * Reading the map around a place GymGO carries no city for (a country's
 * capital, a city picked on Home, where you are). Only ever when you tap
 * Search this area: until then it's `ready`, and the lists offer the button.
 */
export interface Lookup {
  /** The map tiles read: see tileKey(). */
  key: string;
  placeName: string;
  state: 'ready' | 'searching' | 'done' | 'failed';
  /** Gyms within reach of the place, once done. */
  gyms: number;
  /** Why it failed, in plain words. */
  problem?: string;
}

/** Why the Pro screen opened, so it can say so. */
export type ProReason = 'saved' | 'compare' | 'workouts' | 'worldwide' | 'progress' | 'themes' | 'balance' | 'warmup' | 'notes' | 'plates' | 'timers' | 'strength' | 'freeze';

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
  /** Where the search is, if it has no gyms built in: waiting for Search this area, being read, or read. */
  lookup: Lookup | null;
  /** Search this area: read the map around the search for gyms (again, after a failure). */
  searchHere: () => void;
  /** Your country's gyms kept on this device: where that's at, and a way to ask again. */
  pack: ReturnType<typeof useCountryPack>;
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
  // Your gym collection follows the account: merged in on signing in, and each check-in sent.
  // Still signed in while the server is away: the collection waits for it rather than acting signed out.
  useCollectionSync(accountApi.state === 'signed_in' || accountApi.state === 'unreachable' ? accountApi.token : null, accountApi.account?.id ?? null);
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
  const compareLoaded = useRef(false);
  const [exploreRequest, setExploreRequest] = useState<ExploreRequest | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ haptics: true, demo: false, country: null, weeklyGoal: null, plates: {}, timers: [] });
  const [prefsReady, setPrefsReady] = useState(false);
  // Place search reads the mode, and distances your country's units, so
  // both must match before anything renders.
  setDemoMode(prefs.demo);
  setReaderCountry(prefs.country);
  const [here, setHere] = useState<Fix | null>(null);

  useEffect(() => {
    void loadJson<unknown>(RECENTS_KEY, []).then((value) => {
      if (Array.isArray(value)) setRecents(value.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENTS));
    });
    // Gyms picked to compare stay picked through a reload or a relaunch.
    void loadJson<unknown>(COMPARE_KEY, []).then((value) => {
      const stored = Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(-LIMITS.pro.compare) : [];
      setCompare((current) => (current.length ? current : stored));
      compareLoaded.current = true;
    });
    void loadJson<Partial<Prefs>>(PREFS_KEY, {}).then((value) => {
      const country = typeof value.country === 'string' && /^[A-Z]{2}$/.test(value.country) ? value.country : null;
      const goal = typeof value.weeklyGoal === 'number' && Number.isInteger(value.weeklyGoal) && value.weeklyGoal >= 1 && value.weeklyGoal <= 7 ? value.weeklyGoal : null;
      const kgPlates = cleanPlates(value.plates?.kg, 'kg');
      const lbPlates = cleanPlates(value.plates?.lb, 'lb');
      const plates = { ...(kgPlates ? { kg: kgPlates } : {}), ...(lbPlates ? { lb: lbPlates } : {}) };
      const next = { haptics: value.haptics !== false, demo: value.demo === true, country, weeklyGoal: goal, plates, timers: cleanTimers(value.timers) };
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

  useEffect(() => {
    if (compareLoaded.current) storeJson(COMPARE_KEY, compare);
  }, [compare]);
  // Back in front after a while (left open overnight, say): a visit that's
  // well past moves on, so the search isn't for yesterday.
  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', (next) => {
      if (next === 'active') setFilters((current) => refreshVisit(current));
    });
    return () => subscription.remove();
  }, []);

  // The server was away (not started yet, or the phone on another Wi-Fi):
  // keep trying, every 20 seconds and whenever GymGO comes back to the
  // front, until the gyms and your sign-in are live again.
  const serverAway = data.status === 'offline' || accountApi.state === 'unreachable';
  const { refresh: refreshData } = data;
  const { reconnect } = accountApi;
  useEffect(() => {
    if (!serverAway) return;
    const retry = () => {
      if (data.status === 'offline') void refreshData();
      if (accountApi.state === 'unreachable') void reconnect();
    };
    const timer = setInterval(retry, 20_000);
    const subscription = NativeAppState.addEventListener('change', (next) => {
      if (next === 'active') retry();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [serverAway, data.status, accountApi.state, refreshData, reconnect]);
  // Past the plan's limit (Pro ended, say): keep the most recent picks. Only
  // once the plan is known, so a Pro member's picks aren't cut while it loads.
  useEffect(() => {
    if (billing.planKnown) setCompare((current) => (current.length > limits.compare ? current.slice(-limits.compare) : current));
  }, [billing.planKnown, limits.compare]);

  // Your country's gyms, kept on this device: area searches there are answered at once.
  const pack = useCountryPack(prefs.country, prefsReady && !prefs.demo);
  const { setPack } = data;
  useEffect(() => setPack(pack.index), [setPack, pack.index]);

  // A saved or recent gym outside the bundled cities (found by searching an
  // area, maybe on another device) is fetched by id, so its row isn't blank.
  const { ensureGyms } = data;
  useEffect(() => {
    void ensureGyms([...accountApi.saved, ...recents, ...compare]);
  }, [ensureGyms, accountApi.saved, recents, compare, data.status]);

  // What finding you needs to know, read when it runs rather than making it anew each change.
  const reachRef = useRef({ home: prefs.country, pro: billing.isPro });
  reachRef.current = { home: prefs.country, pro: billing.isPro };

  const findMe = useCallback(async (ask: boolean, onlyIfUntouched: boolean): Promise<Located> => {
    const fix = await currentFix(ask);
    if (fix === 'denied' || fix === 'unavailable') return { kind: fix };
    setHere(fix);
    const { home, pro } = reachRef.current;
    const city = cityNear(fix.position);
    // In a built-in city in another country, without Pro: stay at home.
    if (city && home && !canSearchIn(city.country, home, pro)) return { kind: 'abroad', fix, countryCode: city.country, home };
    // Outside the cities GymGO carries, anywhere in the world: the search
    // centres on you, and the map's gyms wait for Search this area. Nothing
    // is asked of the server first: the country and clock are the phone's
    // own (see whereaboutsAt), and the search corrects them.
    let around: { timezone: string; countryCode: string } | null = null;
    if (!city && home) {
      const guess = whereaboutsAt(fix.position, home, deviceTimeZone());
      if (!canSearchIn(guess.countryCode, home, pro)) return { kind: 'abroad', fix, countryCode: guess.countryCode, home };
      const timezone = guess.timezone ?? openingPlace(guess.countryCode)?.timezone ?? openingPlace(home)?.timezone;
      if (timezone) around = { timezone, countryCode: guess.countryCode };
    }
    // Failing that: your country's opening place, or (no country chosen) the nearest built-in city.
    const fallback = city || around || !home ? null : openingPlace(home);
    const nearest = city || around || fallback ? null : nearestCity(fix.position);
    const where = city
      ? { centre: fix.position, placeName: YOUR_LOCATION, timezone: city.timezone, countryCode: city.country }
      : around
        ? { centre: fix.position, placeName: YOUR_LOCATION, ...around }
        : (fallback ?? atPlace(cityPlace(nearest!.city)));
    setFilters((current) => {
      if (!onlyIfUntouched) return moveTo(current, where);
      // At start-up, never undo a place someone already picked; and the
      // visit time, never chosen yet, becomes the next hour on local time.
      if (current.placeName !== DEFAULT_PLACE.name) return current;
      const visit = defaultVisit(new Date(), where.timezone);
      return { ...current, ...where, visitDate: visit.date, visitMinuteOfDay: visit.minute };
    });
    if (city) return { kind: 'here', fix, city };
    if (around) return { kind: 'area', fix };
    if (fallback) return { kind: 'home', fix, placeName: fallback.placeName };
    return { kind: 'nearest', fix, city: nearest!.city, km: nearest!.km };
  }, []);

  const locate = useCallback((ask: boolean) => findMe(ask, false), [findMe]);

  // Somewhere GymGO carries no city for (Tokyo, when you choose Japan, or
  // wherever you are): nothing is read from the map until you tap Search
  // this area, so moving around never loads gyms by itself. Until then the
  // lists offer the button; the server keeps what it reads for a month.
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const realRecords = useMemo(() => data.records.filter((record) => !record.location.isDemoData), [data.records]);
  const lookupKey = tileKey(tilesAround(filters.centre));
  const unsearched =
    prefsReady &&
    !prefs.demo &&
    prefs.country !== null &&
    canSearchIn(filters.countryCode, prefs.country, billing.isPro) &&
    wantsLookup(filters, realRecords, cityNear(filters.centre) !== null);
  // Only the look-up for where the search is now counts.
  const lookupHere = useMemo<Lookup | null>(() => {
    if (filters.bbox) return null;
    if (lookup && lookup.key === lookupKey) return { ...lookup, placeName: filters.placeName };
    return unsearched ? { key: lookupKey, placeName: filters.placeName, state: 'ready', gyms: 0 } : null;
  }, [filters.bbox, filters.placeName, lookup, lookupKey, unsearched]);

  const { searchArea } = data;
  const latestSearch = useRef({ filters, home: prefs.country, token: accountApi.token, lookup: lookupHere });
  latestSearch.current = { filters, home: prefs.country, token: accountApi.token, lookup: lookupHere };
  const searchHere = useCallback(() => {
    const { filters: search, home, token, lookup: current } = latestSearch.current;
    if (!home || !current || current.state === 'searching') return;
    const { key } = current;
    const { centre, placeName } = search;
    setLookup({ key, placeName, state: 'searching', gyms: 0 });
    // Whole map tiles around the search, never your exact position: see tilesAround().
    searchArea(tilesAround(centre), home, token)
      .then((answer) => {
        const reach = reachFor(answer.gyms.map((gym) => haversineKm(centre, gym.location.position)));
        setLookup({ key, placeName, state: 'done', gyms: reach.count });
        setFilters((latest) => {
          if (latest.centre !== centre) return latest;
          // Around you, the map's own country and clock replace the phone's guess.
          const where = answer.where;
          const placed =
            where && latest.placeName === YOUR_LOCATION && (where.countryCode !== latest.countryCode || where.timezone !== latest.timezone)
              ? moveTo(latest, { centre, placeName: YOUR_LOCATION, ...where })
              : latest;
          // Nothing within 5 km but something within 10: widen, as "Near you" does.
          return placed.radiusKm < reach.radiusKm ? { ...placed, radiusKm: reach.radiusKm } : placed;
        });
      })
      .catch((error: unknown) => {
        // Around you, abroad without Pro: the search takes that country, and the lists say what Pro adds.
        if (error instanceof ApiError && error.code === 'pro_required' && typeof error.detail.countryCode === 'string') {
          const countryCode = error.detail.countryCode;
          setLookup({ key, placeName, state: 'done', gyms: 0 });
          setFilters((latest) => (latest.centre === centre ? { ...latest, countryCode, budgetMinor: null } : latest));
          return;
        }
        // Tried again only when asked (Try again), so a map service that's down isn't asked on every change.
        setLookup({ key, placeName, state: 'failed', gyms: 0, problem: problemText(error, 'The map’s gym list didn’t answer.') });
      });
  }, [searchArea]);

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
    () => ({
      ...data,
      records: data.records.filter((record) => record.location.isDemoData === prefs.demo),
      listed: data.listed.filter((record) => record.location.isDemoData === prefs.demo),
    }),
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
      lookup: lookupHere,
      searchHere,
      pack,
    }),
    [visibleData, account, filters, recents, addRecent, clearRecents, compare, toggleCompare, clearCompare, exploreRequest, requestExplore, prefs, setPref, billing, openPro, mayExplore, chooseCountry, prefsReady, here, locate, lookupHere, searchHere, pack],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error('useApp must be used inside AppProvider');
  return state;
}
