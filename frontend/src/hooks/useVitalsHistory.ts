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
  /** 住民 id 不是正整数 MySQL user_id 时无法请求 /vitals/user/{id}/history */
  invalidResidentId: boolean;
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
  const payload = pickRecord(item.payload ?? item.raw_payload);
  const payloadSensors = pickRecord(payload?.sensors);
  const payloadVitals = pickRecord(payload?.vitals);
  const hrNested = pickRecord(sensors?.heart_rate);
  const spo2Nested = pickRecord(sensors?.spo2);
  const payloadHrNested = pickRecord(payloadSensors?.heart_rate);
  const payloadSpo2Nested = pickRecord(payloadSensors?.spo2);

  const timestampValue = readNumber(item.timestamp);
  /** Device `timestamp` is often not epoch ms; only use it when it looks like ms. */
  const timestampLooksLikeEpochMs =
    timestampValue !== null && timestampValue >= 1_000_000_000_000;
  const recordedAt =
    (typeof item.server_received_at === 'string' && item.server_received_at.trim()
      ? item.server_received_at
      : null) ??
    (timestampLooksLikeEpochMs ? new Date(timestampValue).toISOString() : null);

  return {
    id: item._id ?? `${item.device_id ?? 'device'}-${item.timestamp ?? item.server_received_at ?? 'reading'}`,
    recordedAt,
    heartRate: readNumber(
      hrNested?.bpm,
      payloadHrNested?.bpm,
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
      spo2Nested?.percentage,
      payloadSpo2Nested?.percentage,
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
  const invalidResidentId = Boolean(residentId && userId === null);

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

  return { data, loading, error, isUnavailable, invalidResidentId, refresh };
}
