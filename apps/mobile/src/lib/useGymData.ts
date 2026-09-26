import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoundingBox, GymRecord, RatingSummary } from '@gymgo/domain';
import { ApiError, api } from './api';
import { BUNDLED_GYMS } from './query';

/**
 * `live`: the records came from the server just now.
 * `offline`: the server couldn't be reached, so the copy bundled with the app
 * is showing. Same sources and dates, just not refreshed.
 */
export type DataStatus = 'loading' | 'live' | 'offline';

/**
 * Gyms found by searching an area are kept on the device too (the newest
 * 250), so a saved or recent one still shows when the server can't be
 * reached. Each keeps the date it was read from the map.
 */
const FOUND_KEY = 'gymgo.found.v1';
const FOUND_KEPT = 250;

function isRecord(value: unknown): value is GymRecord {
  const location = (value as { location?: { id?: unknown; name?: unknown; position?: unknown } } | null)?.location;
  return typeof location?.id === 'string' && typeof location.name === 'string' && typeof location.position === 'object';
}

export function useGymData() {
  const [base, setBase] = useState<GymRecord[]>(BUNDLED_GYMS);
  /** Gyms found by "Search this area", or fetched one by one (a saved gym outside the bundled cities). */
  const [found, setFound] = useState<GymRecord[]>([]);
  const [status, setStatus] = useState<DataStatus>('loading');
  /** Each gym's newest member photo, for list thumbnails. */
  const [covers, setCovers] = useState<Record<string, string>>({});
  /** What members typically paid for a visit, by gym, for lists. */
  const [memberPrices, setMemberPrices] = useState<Record<string, { typicalMinor: number; count: number }>>({});
  /** Each gym's rating from its published reviews, for lists, cards and sorting. */
  const [ratings, setRatings] = useState<Record<string, RatingSummary>>({});

  const records = useMemo(() => {
    if (found.length === 0) return base;
    const known = new Set(base.map((record) => record.location.id));
    return [...base, ...found.filter((record) => !known.has(record.location.id))];
  }, [base, found]);

  const addFound = useCallback((more: GymRecord[]) => {
    if (more.length === 0) return;
    setFound((current) => {
      // Newest last, so the oldest are the ones dropped when there are too many to keep.
      const byId = new Map(current.map((record) => [record.location.id, record]));
      for (const record of more) {
        byId.delete(record.location.id);
        byId.set(record.location.id, record);
      }
      return [...byId.values()];
    });
  }, []);

  // Found gyms from earlier sessions, then keep what's found from now on.
  const restored = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(FOUND_KEY)
      .then((raw) => {
        restored.current = true;
        const kept = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(kept)) {
          // Anything found this session already is newer: it goes last and wins.
          setFound((current) => {
            const byId = new Map(kept.filter(isRecord).map((record) => [record.location.id, record]));
            for (const record of current) {
              byId.delete(record.location.id);
              byId.set(record.location.id, record);
            }
            return [...byId.values()];
          });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        restored.current = true;
      });
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(FOUND_KEY, JSON.stringify(found.slice(-FOUND_KEPT))).catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
  }, [found]);

  const refreshMemberPrices = useCallback(() => {
    api
      .typicalPrices()
      .then((result) => setMemberPrices(result.typical))
      .catch(() => undefined);
  }, []);

  const refreshRatings = useCallback(() => {
    api
      .reviewRatings()
      .then((result) => setRatings(result.ratings))
      .catch(() => undefined);
  }, []);

  const refreshCovers = useCallback(() => {
    api
      .covers()
      .then((result) => setCovers(result.covers))
      .catch(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.gyms();
      setBase(data.gyms);
      setStatus('live');
      refreshCovers();
      refreshMemberPrices();
      refreshRatings();
    } catch {
      setStatus('offline');
    }
  }, [refreshCovers, refreshMemberPrices, refreshRatings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Ask the server for the gyms on the map in this box; they join the
   * records. `home` is your country (elsewhere needs Pro, so `token` says
   * who's asking). Throws when it can't, `pro_required` included.
   */
  const searchArea = useCallback(
    async (box: BoundingBox, home: string, token: string | null) => {
      const answer = await api.area(box, home, token);
      addFound(answer.gyms);
      return answer;
    },
    [addFound],
  );

  // Gyms asked for by id that aren't loaded: fetched once each.
  const requested = useRef(new Set<string>());
  const latest = useRef(records);
  latest.current = records;
  /** Fetch any of these gyms that aren't loaded; resolves once they've arrived (or couldn't). */
  const ensureGyms = useCallback(
    (ids: string[]): Promise<void> => {
      const loaded = new Set(latest.current.map((record) => record.location.id));
      const missing = ids.filter((id) => !loaded.has(id) && !requested.current.has(id));
      for (const id of missing) requested.current.add(id);
      const fetchOne = (id: string) =>
        api
          .gym(id)
          .then((answer) => answer.gym)
          .catch((error: unknown) => {
            // Couldn't reach the server: try again next time. A gym that's gone stays asked.
            if (!(error instanceof ApiError)) requested.current.delete(id);
            return null;
          });
      return Promise.all(missing.map(fetchOne)).then((gyms) => addFound(gyms.filter((gym): gym is GymRecord => gym !== null)));
    },
    [addFound],
  );

  // One object while nothing in it changes, so what's built on it (the app's
  // shared state, callbacks that use it) doesn't change on every render.
  return useMemo(
    () => ({ records, status, covers, memberPrices, ratings, refresh, refreshCovers, refreshMemberPrices, refreshRatings, searchArea, ensureGyms }),
    [records, status, covers, memberPrices, ratings, refresh, refreshCovers, refreshMemberPrices, refreshRatings, searchArea, ensureGyms],
  );
}
