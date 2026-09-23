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

  const refresh = useCallback(async () => {
    try {
      const data = await api.gyms();
      setRecords(data.gyms);
      setStatus('live');
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { records, status, refresh };
}
