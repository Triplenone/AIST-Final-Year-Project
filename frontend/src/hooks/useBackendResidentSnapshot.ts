import { useCallback, useEffect, useState } from 'react';
import { residentApi } from '../services/api';
import { mapBackendResidents } from '../adapters/residents';
import type { Resident } from '../sse/client';

type UseBackendResidentSnapshotResult = {
  residents: Resident[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<Resident[]>;
};

// 住民快照 hook：從後端 /api/v1/residents 取得資料
// Resident snapshot hook: fetches data from backend /api/v1/residents
export const useBackendResidentSnapshot = (): UseBackendResidentSnapshotResult => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const backendResidents = await residentApi.list();
      const mapped = mapBackendResidents(backendResidents);
      setResidents(mapped);
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch residents';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { residents, loading, error, refresh };
};
