import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoundingBox, GymRecord } from '@gymgo/domain';
import { ApiError, api } from './api';
import { BUNDLED_GYMS } from './query';

/**
 * `live`: the records came from the server just now.
 * `offline`: the server couldn't be reached, so the copy bundled with the app
 * is showing. Same sources and dates, just not refreshed.
 */
export type DataStatus = 'loading' | 'live' | 'offline';

export function useGymData() {
  const [base, setBase] = useState<GymRecord[]>(BUNDLED_GYMS);
  /** Gyms found by "Search this area", or fetched one by one (a saved gym outside the bundled cities). */
  const [found, setFound] = useState<GymRecord[]>([]);
  const [status, setStatus] = useState<DataStatus>('loading');
  /** Each gym's newest member photo, for list thumbnails. */
  const [covers, setCovers] = useState<Record<string, string>>({});
  /** What members typically paid for a visit, by gym, for lists. */
  const [memberPrices, setMemberPrices] = useState<Record<string, { typicalMinor: number; count: number }>>({});

  const records = useMemo(() => {
    if (found.length === 0) return base;
    const known = new Set(base.map((record) => record.location.id));
    return [...base, ...found.filter((record) => !known.has(record.location.id))];
  }, [base, found]);

  const addFound = useCallback((more: GymRecord[]) => {
    if (more.length === 0) return;
    setFound((current) => {
      const byId = new Map(current.map((record) => [record.location.id, record]));
      for (const record of more) byId.set(record.location.id, record);
      return [...byId.values()];
    });
  }, []);

  const refreshMemberPrices = useCallback(() => {
    api
      .typicalPrices()
      .then((result) => setMemberPrices(result.typical))
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
    } catch {
      setStatus('offline');
    }
  }, [refreshCovers, refreshMemberPrices]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Ask the server for the gyms on the map in this box; they join the records. Throws when it can't. */
  const searchArea = useCallback(
    async (box: BoundingBox) => {
      const answer = await api.area(box);
      addFound(answer.gyms);
      return answer;
    },
    [addFound],
  );

  // Gyms asked for by id that aren't loaded: fetched once each.
  const requested = useRef(new Set<string>());
  const latest = useRef(records);
  latest.current = records;
  const ensureGyms = useCallback(
    (ids: string[]) => {
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
      void Promise.all(missing.map(fetchOne)).then((gyms) =>
        addFound(gyms.filter((gym): gym is GymRecord => gym !== null)),
      );
    },
    [addFound],
  );

  return { records, status, covers, memberPrices, refresh, refreshCovers, refreshMemberPrices, searchArea, ensureGyms };
}
