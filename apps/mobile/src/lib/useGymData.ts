import { useCallback, useEffect, useState } from 'react';
import type { GymRecord } from '@gymgo/domain';
import { api } from './api';
import { BUNDLED_GYMS } from './query';

/**
 * `live`: the records came from the server just now.
 * `offline`: the server couldn't be reached, so the copy bundled with the app
 * is showing. Same sources and dates, just not refreshed.
 */
export type DataStatus = 'loading' | 'live' | 'offline';

export function useGymData() {
  const [records, setRecords] = useState<GymRecord[]>(BUNDLED_GYMS);
  const [status, setStatus] = useState<DataStatus>('loading');
  /** Each gym's newest member photo, for list thumbnails. */
  const [covers, setCovers] = useState<Record<string, string>>({});
  /** What members typically paid for a visit, by gym, for lists. */
  const [memberPrices, setMemberPrices] = useState<Record<string, { typicalMinor: number; count: number }>>({});

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
      setRecords(data.gyms);
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

  return { records, status, covers, memberPrices, refresh, refreshCovers, refreshMemberPrices };
}
