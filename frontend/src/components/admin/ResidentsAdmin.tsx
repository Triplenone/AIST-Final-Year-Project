import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { residentApi } from '../../services/api';
import type { BackendResident, BackendResidentStatus } from '../../types/backend';

const STATUS_OPTIONS: BackendResidentStatus[] = ['stable', 'followUp', 'high', 'checked_out'];

export const ResidentsAdmin = () => {
  const { t, i18n } = useTranslation();
  const [residents, setResidents] = useState<BackendResident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BackendResidentStatus | 'all'>('all');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  const formatDateTime = useCallback(
    (input?: string | null) => {
      if (!input) return t('admin.residents.lastSeenUnknown');
      const date = new Date(input);
      if (Number.isNaN(date.getTime())) return input;
      try {
        return date.toLocaleString(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return date.toISOString();
      }
    },
    [locale, t]
  );

  const describeLastSeen = useCallback(
    (resident: BackendResident) => {
      if (!resident.last_seen_at) {
        return t('admin.residents.lastSeenUnknown');
      }
      const formatted = formatDateTime(resident.last_seen_at);
      return resident.last_seen_location ? `${formatted} | ${resident.last_seen_location}` : formatted;
    },
    [formatDateTime, t]
  );

  const describeVitals = useCallback(
    (resident: BackendResident) => {
      const hr = resident.vitals?.hr ?? resident.heart_rate;
      const spo2 = resident.vitals?.spo2 ?? resident.blood_oxygen;
      const temperature = resident.vitals?.temperature ?? resident.body_temperature;
      const bpSystolic = resident.vitals?.bp_systolic;
      const bpDiastolic = resident.vitals?.bp_diastolic;
      const parts: string[] = [];

      if (hr !== null && hr !== undefined) {
        parts.push(t('residents.vitals.hr', { value: hr }));
      }
      if (spo2 !== null && spo2 !== undefined) {
        parts.push(t('residents.vitals.spo2', { value: spo2 }));
      }
      if (temperature !== null && temperature !== undefined) {
        parts.push(t('residents.vitals.temp', { value: Number(temperature).toFixed(1) }));
      }
      if (bpSystolic !== null && bpSystolic !== undefined && bpDiastolic !== null && bpDiastolic !== undefined) {
        parts.push(t('residents.vitals.bp', { systolic: bpSystolic, diastolic: bpDiastolic }));
      }

      return parts.length ? parts.join(' | ') : t('admin.residents.vitalsUnknown');
    },
    [t]
  );

  const describeDevice = useCallback(
    (resident: BackendResident) => {
      const parts: string[] = [];
      if (resident.device_id) {
        parts.push(`#${resident.device_id}`);
      }
      if (typeof resident.device_battery_level === 'number') {
        parts.push(`${resident.device_battery_level}%`);
      }
      if (resident.device_current_status) {
        parts.push(resident.device_current_status);
      }

      return parts.length ? parts.join(' | ') : t('admin.residents.deviceUnknown');
    },
    [t]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await residentApi.list({ limit: 500 });
      setResidents(data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const fallback = t('admin.residents.error');
      const message = err instanceof Error ? `${fallback} (${err.message})` : fallback;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase();
    return residents.filter((resident) => {
      const matchesKeyword =
        !keywordLower ||
        resident.name.toLowerCase().includes(keywordLower) ||
        (resident.room ?? '').toLowerCase().includes(keywordLower);
      const matchesStatus = statusFilter === 'all' || resident.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, residents, statusFilter]);

  return (
    <div className="admin-card">
      <header className="admin-card__header">
        <div>
          <h3>{t('admin.residents.title')}</h3>
          <p className="muted">{t('admin.residents.subtitle')}</p>
          {lastUpdated ? (
            <p className="muted" aria-live="polite">
              {t('admin.residents.lastUpdated', { time: formatDateTime(lastUpdated) })}
            </p>
          ) : null}
        </div>
        <div className="admin-actions">
          <input
            placeholder={t('admin.residents.searchPlaceholder')}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="admin-actions__search"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as BackendResidentStatus | 'all')}
            className="admin-actions__filter"
            aria-label={t('admin.residents.statusFilterLabel')}
          >
            <option value="all">{t('admin.residents.allStatuses')}</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {t(`residents.status.${status}`)}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? t('common.loading') : t('admin.residents.refresh')}
          </button>
        </div>
      </header>

      {error ? <div className="admin-error">{error}</div> : null}
      {loading ? <div className="admin-loading">{t('common.loading')}</div> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>{t('admin.residents.columns.id')}</th>
            <th>{t('admin.residents.columns.name')}</th>
            <th>{t('admin.residents.columns.room')}</th>
            <th>{t('admin.residents.columns.status')}</th>
            <th>{t('admin.residents.columns.lastSeen')}</th>
            <th>{t('admin.residents.columns.vitals')}</th>
            <th>{t('admin.residents.columns.device')}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7} className="empty-placeholder">
                {t('admin.residents.noData')}
              </td>
            </tr>
          ) : (
            filtered.map((resident) => (
              <tr key={resident.id}>
                <td>{resident.id}</td>
                <td>{resident.name}</td>
                <td>{resident.room ?? t('admin.residents.lastSeenUnknown')}</td>
                <td>
                  <span className={`status status-${resident.status}`}>
                    {t(`residents.status.${resident.status}`)}
                  </span>
                </td>
                <td>{describeLastSeen(resident)}</td>
                <td>{describeVitals(resident)}</td>
                <td>{describeDevice(resident)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
