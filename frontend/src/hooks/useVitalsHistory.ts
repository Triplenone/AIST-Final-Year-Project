import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  mongoUpstreamApi,
  type MongoVitalsHistoryItem,
  type MongoVitalsHistoryQuery,
} from '../services/api';

export type VitalsHistoryRange = '1h' | '6h' | '24h' | '7d';

export type VitalsHistoryReading = {
  id: string;
  recordedAt: string | null;
  heartRate: number | null;
  spo2: number | null;
  temperature: number | null;
};

type UseVitalsHistoryResult = {
  data: VitalsHistoryReading[];
  loading: boolean;
  error: string | null;
  isUnavailable: boolean;
  refresh: () => Promise<void>;
};

const RANGE_MS: Record<VitalsHistoryRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const toResidentUserId = (residentId: string | null) => {
  if (!residentId) return null;

  const parsed = Number(residentId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const readNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
};

const pickRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const normalizeVitalsHistoryItem = (item: MongoVitalsHistoryItem): VitalsHistoryReading => {
  const sensors = pickRecord(item.sensors);
  const vitals = pickRecord(item.vitals);
  const payload = pickRecord(item.payload);
  const payloadSensors = pickRecord(payload?.sensors);
  const payloadVitals = pickRecord(payload?.vitals);

  const timestampValue = readNumber(item.timestamp);
  const recordedAt =
    item.server_received_at ??
    (timestampValue ? new Date(timestampValue).toISOString() : null);

  return {
    id: item._id ?? `${item.device_id ?? 'device'}-${item.timestamp ?? item.server_received_at ?? 'reading'}`,
    recordedAt,
    heartRate: readNumber(
      sensors?.heart_rate,
      sensors?.heartRate,
      payloadSensors?.heart_rate,
      payloadSensors?.heartRate,
      vitals?.heart_rate,
      vitals?.hr,
      payloadVitals?.heart_rate,
      payloadVitals?.hr
    ),
    spo2: readNumber(
      sensors?.spo2,
      sensors?.SpO2,
      payloadSensors?.spo2,
      payloadSensors?.SpO2,
      vitals?.spo2,
      payloadVitals?.spo2
    ),
    temperature: readNumber(
      sensors?.temperature,
      sensors?.body_temperature,
      payloadSensors?.temperature,
      payloadSensors?.body_temperature,
      vitals?.temperature,
      payloadVitals?.temperature
    ),
  };
};

const buildQuery = (range: VitalsHistoryRange): MongoVitalsHistoryQuery => {
  const end_ts = Date.now();
  const start_ts = end_ts - RANGE_MS[range];

  return {
    end_ts,
    start_ts,
    page: 1,
    page_size: 12,
  };
};

export function useVitalsHistory(
  residentId: string | null,
  timeRange: VitalsHistoryRange
): UseVitalsHistoryResult {
  const [data, setData] = useState<VitalsHistoryReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const userId = useMemo(() => toResidentUserId(residentId), [residentId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      setError(null);
      setIsUnavailable(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsUnavailable(false);

    try {
      const response = await mongoUpstreamApi.getVitalsHistoryByUser(userId, buildQuery(timeRange));
      setData(Array.isArray(response.items) ? response.items.map(normalizeVitalsHistoryItem) : []);
    } catch (err) {
      setData([]);

      if (err instanceof ApiError && (err.status === 404 || err.status === 503)) {
        setIsUnavailable(true);
        return;
      }

      setError(err instanceof Error ? err.message : 'Unable to load vitals history');
    } finally {
      setLoading(false);
    }
  }, [timeRange, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, isUnavailable, refresh };
}
