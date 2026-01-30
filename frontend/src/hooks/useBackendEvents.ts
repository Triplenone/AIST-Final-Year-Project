import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { BackendEvent, EventStatus, EventType } from '../types/backend';
import { eventApi } from '../services/api';

export type UseBackendEventsOptions = {
  pollIntervalMs?: number;
  limit?: number;
  activeStatuses?: EventStatus[];
  includeTypes?: EventType[];
};

export type UseBackendEventsResult = {
  events: BackendEvent[];
  activeEvents: BackendEvent[];
  loading: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
  refresh: () => Promise<BackendEvent[]>;
};

const DEFAULT_ACTIVE_STATUSES: EventStatus[] = ['unhandled', 'confirmed'];

export function useBackendEvents(options: UseBackendEventsOptions = {}): UseBackendEventsResult {
  const pollIntervalMs = options.pollIntervalMs ?? 5000;
  const limit = options.limit ?? 300;
  const activeStatuses = options.activeStatuses ?? DEFAULT_ACTIVE_STATUSES;
  const includeTypes = options.includeTypes ?? null;

  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const pollerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend supports filtering by single event_status, but not multiple in one request.
      // We fetch a recent slice and filter client-side.
      const data = await eventApi.list({ limit });
      setEvents(data);
      setLastUpdatedAt(new Date().toISOString());
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to fetch events';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
    if (pollIntervalMs <= 0) return undefined;

    pollerRef.current = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => {
      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [pollIntervalMs, refresh]);

  const activeEvents = useMemo(() => {
    const filtered = events.filter((event) => activeStatuses.includes(event.event_status));
    if (!includeTypes) return filtered;
    return filtered.filter((event) => includeTypes.includes(event.event_type));
  }, [activeStatuses, events, includeTypes]);

  return {
    events,
    activeEvents,
    loading,
    error,
    lastUpdatedAt,
    refresh
  };
}

