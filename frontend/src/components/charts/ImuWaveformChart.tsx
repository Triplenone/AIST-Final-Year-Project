import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import '../../styles/charts.css';
import { deviceDataLogApi } from '../../services/api';
import type { BackendDeviceDataLog } from '../../types/backend';

type ImuPoint = {
  time: string;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
};

const SERIES = [
  { key: 'accel_x', label: 'Accel X', color: 'var(--chart-1)' },
  { key: 'accel_y', label: 'Accel Y', color: 'var(--chart-2)' },
  { key: 'accel_z', label: 'Accel Z', color: 'var(--chart-3)' },
  { key: 'gyro_x', label: 'Gyro X', color: 'var(--chart-4)' },
  { key: 'gyro_y', label: 'Gyro Y', color: '#f97316' },
  { key: 'gyro_z', label: 'Gyro Z', color: '#22c55e' }
] as const;

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-soft)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-soft)'
} as const;

const axisTick = { fill: 'var(--text-muted)', fontSize: 11 };

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
};

const toChartData = (logs: BackendDeviceDataLog[]): ImuPoint[] => {
  return logs
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((log) => ({
      time: formatTimestamp(log.timestamp),
      accel_x: Number(log.accel_x),
      accel_y: Number(log.accel_y),
      accel_z: Number(log.accel_z),
      gyro_x: Number(log.gyro_x),
      gyro_y: Number(log.gyro_y),
      gyro_z: Number(log.gyro_z)
    }));
};

const buildFallbackData = (points = 60): ImuPoint[] => {
  const baseTime = Math.floor(Date.now() / 1000);
  return Array.from({ length: points }, (_, index) => {
    const t = index / 6;
    return {
      time: formatTimestamp(baseTime - (points - index)),
      accel_x: Math.sin(t) * 2.4 + 0.4,
      accel_y: Math.cos(t) * 1.8 + 0.2,
      accel_z: Math.sin(t * 0.6) * 3.6 + 8.6,
      gyro_x: Math.cos(t * 0.9) * 10.4,
      gyro_y: Math.sin(t * 0.75) * 8.2,
      gyro_z: Math.cos(t * 0.5) * 6.4
    };
  });
};

export const ImuWaveformChart = () => {
  const [data, setData] = useState<ImuPoint[]>(() => buildFallbackData());
  const [sourceLabel, setSourceLabel] = useState('fallback');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const logs = await deviceDataLogApi.list({ limit: 120 });
      if (!logs.length) {
        setData(buildFallbackData());
        setSourceLabel('fallback');
        return;
      }
      setData(toChartData(logs));
      setSourceLabel('api');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load device logs';
      setError(msg);
      setData(buildFallbackData());
      setSourceLabel('fallback');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, 2000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const legendPayload = useMemo(
    () =>
      SERIES.map((series) => ({
        value: series.label,
        type: 'line',
        color: series.color
      })),
    []
  );

  return (
    <article className="chart-card chart-card--wide imu-chart">
      <header className="chart-card__header imu-chart__header">
        <div>
          <h3>6-axis motion waveform</h3>
          <p className="muted">
            Live IMU stream ({sourceLabel === 'api' ? 'device logs' : 'fallback signal'})
          </p>
        </div>
        <div className="imu-chart__actions">
          <button type="button" className="imu-chart__button" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>
      <div className="chart-card__body imu-chart__body">
        {error ? <div className="imu-chart__error">{error}</div> : null}
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend payload={legendPayload} />
            {SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};
