import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError, familySummaryApi, type FamilySummaryTodayResponse } from '../services/api';

type UseFamilySummaryResult = {
  summary: FamilySummaryTodayResponse | null;
  loading: boolean;
  error: string | null;
  isUnavailable: boolean;
  refresh: () => Promise<void>;
};

const toResidentUserId = (residentId: string | null) => {
  if (!residentId) return null;

  const parsed = Number(residentId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export function useFamilySummary(residentId: string | null): UseFamilySummaryResult {
  const [summary, setSummary] = useState<FamilySummaryTodayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const userId = useMemo(() => toResidentUserId(residentId), [residentId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSummary(null);
      setLoading(false);
      setError(null);
      setIsUnavailable(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsUnavailable(false);

    try {
      const nextSummary = await familySummaryApi.getToday(userId);

      if (!nextSummary.found || !nextSummary.summary_text?.trim()) {
        setSummary(null);
        return;
      }

      setSummary(nextSummary);
    } catch (err) {
      setSummary(null);

      if (err instanceof ApiError && (err.status === 404 || err.status === 503)) {
        setIsUnavailable(true);
        return;
      }

      setError(err instanceof Error ? err.message : 'Unable to load family summary');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, isUnavailable, refresh };
}
