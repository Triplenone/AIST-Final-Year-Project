import { useCallback, useEffect, useMemo, useState } from 'react';

import { VitalsHistoryModal } from '../family/VitalsHistoryModal';
import '../../styles/residents-admin.css';
import { useResidentLiveStore } from '../../shared/resident-live-store';
import { residentApi } from '../../services/api';
import type { Resident } from '../../sse/client';
import type { BackendResident, BackendResidentStatus } from '../../types/backend';

const STATUS_OPTIONS: BackendResidentStatus[] = ['stable', 'followUp', 'high', 'checked_out'];

const statusLabels: Record<BackendResidentStatus | 'all', string> = {
  all: 'All passengers',
  stable: 'Stable',
  followUp: 'Follow-up',
  high: 'Needs attention',
  checked_out: 'Inactive'
};

const roleLabels: Record<string, string> = {
  elderly: 'passenger',
  caregiver: 'assistant',
  administrator: 'administrator'
};

const formatCount = (value: number) => value.toLocaleString('en-US');

export const ResidentsAdmin = () => {
  const [residents, setResidents] = useState<BackendResident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BackendResidentStatus | 'all'>('all');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedResident, setSelectedResident] = useState<{ id: string; name: string } | null>(null);
  const { residents: liveResidents, demoMode } = useResidentLiveStore();

  const formatDateTime = useCallback((input?: string | null) => {
    if (!input) return 'Unknown';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const describeDevicePrimary = useCallback((resident: BackendResident) => {
    if (resident.device_id) {
      return `#${resident.device_id}`;
    }
    return 'unassigned';
  }, []);

  const describeDeviceSecondary = useCallback((resident: BackendResident) => {
    const parts: string[] = [];
    if (typeof resident.device_battery_level === 'number') {
      parts.push(`${resident.device_battery_level}%`);
    }
    if (resident.device_current_status) {
      parts.push(resident.device_current_status);
    }

    return parts.length ? parts.join(' / ') : 'unassigned';
  }, []);

  const load = useCallback(async () => {
    if (demoMode) return;
    setLoading(true);
    setError(null);
    try {
      const data = await residentApi.list({ limit: 500 });
      // `api` interceptor returns response.data directly; keep a fallback for mixed typings.
      const rows = Array.isArray(data) ? data : (data as { data?: BackendResident[] }).data ?? [];
      setResidents(rows);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? `Passenger directory unavailable (${err.message})` : 'Passenger directory unavailable';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) return;
    void load();
  }, [demoMode, load]);

  const demoResidentList = useMemo(() => {
    if (!demoMode) return [];
    return Object.values(liveResidents).map(
      (resident: Resident): BackendResident => ({
        id: resident.id,
        name: resident.name,
        room: resident.room,
        status: resident.status,
        role_type: resident.roleType,
        last_seen_at: resident.lastSeenAt ?? null,
        last_seen_location: resident.lastSeenLocation ?? null,
        vitals: {
          hr: resident.vitals?.hr ?? null,
          bp_systolic: resident.vitals?.bpSystolic ?? null,
          bp_diastolic: resident.vitals?.bpDiastolic ?? null,
          spo2: resident.vitals?.spo2 ?? null,
          temperature: resident.vitals?.temperature ?? null
        },
        checked_out: resident.checkedOut,
        created_at: resident.createdAt,
        updated_at: resident.updatedAt
      })
    );
  }, [demoMode, liveResidents]);

  useEffect(() => {
    if (!demoMode) return;
    setLastUpdated(new Date().toISOString());
  }, [demoMode, demoResidentList]);

  const dataset = demoMode ? demoResidentList : residents;
  const trimmedKeyword = keyword.trim();

  const filtered = useMemo(() => {
    const keywordLower = trimmedKeyword.toLowerCase();
    return dataset.filter((resident) => {
      const matchesKeyword =
        !keywordLower ||
        resident.name.toLowerCase().includes(keywordLower) ||
        (resident.room ?? '').toLowerCase().includes(keywordLower);
      const matchesStatus = statusFilter === 'all' || resident.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [dataset, statusFilter, trimmedKeyword]);

  const passengerMetrics = useMemo(() => {
    const attentionCount = dataset.filter((resident) => resident.status === 'high' || resident.status === 'followUp').length;
    const deviceLinkedCount = dataset.filter(
      (resident) =>
        resident.device_id !== null &&
        resident.device_id !== undefined &&
        resident.device_id !== 0
    ).length;

    return [
      { label: 'Total roster', value: formatCount(dataset.length), tone: 'neutral' },
      { label: 'Visible after filters', value: formatCount(filtered.length), tone: trimmedKeyword || statusFilter !== 'all' ? 'accent' : 'neutral' },
      { label: 'Needs attention', value: formatCount(attentionCount), tone: attentionCount > 0 ? 'warning' : 'neutral' },
      { label: 'Device linked', value: formatCount(deviceLinkedCount), tone: deviceLinkedCount > 0 ? 'success' : 'neutral' }
    ] as const;
  }, [dataset, filtered.length, statusFilter, trimmedKeyword]);

  const openVitalsModal = useCallback((resident: BackendResident) => {
    setSelectedResident({ id: resident.id, name: resident.name });
  }, []);

  const closeVitalsModal = useCallback(() => {
    setSelectedResident(null);
  }, []);

  return (
    <>
      <section className="admin-card residents-workspace">
        <header className="residents-workspace__header">
          <div className="residents-workspace__intro">
            <p className="residents-workspace__eyebrow">Passenger workspace</p>
            <div className="residents-workspace__title-block">
              <div>
                <h3>Passenger roster</h3>
                <p className="residents-workspace__note">
                  Scan roster, status, and device context first, then decide the next assistance handoff.
                </p>
              </div>
              <div className="residents-workspace__meta">
                <span className="residents-workspace__source">
                  {demoMode ? 'Demo mode passenger stream' : 'Mapped to /api/v1/residents'}
                </span>
                {lastUpdated ? (
                  <span className="residents-workspace__source">
                    Last updated {formatDateTime(lastUpdated)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="admin-actions residents-workspace__controls">
            <input
              placeholder="Search name or zone"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="admin-actions__search"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as BackendResidentStatus | 'all')}
              className="admin-actions__filter"
              aria-label="Filter by passenger status"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </header>

        <dl className="residents-workspace__summary" aria-label="Passenger roster">
          {passengerMetrics.map((metric) => (
            <div
              key={metric.label}
              className={`residents-workspace__metric residents-workspace__metric--${metric.tone}`}
            >
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>

        {error ? (
          <div className="residents-workspace__banner residents-workspace__banner--error" role="alert">
            <strong>Passenger directory unavailable</strong>
            <p>{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="residents-workspace__banner residents-workspace__banner--loading" aria-live="polite">
            <strong>Syncing passenger directory</strong>
            <p>Refreshing recent zone, vitals, and device context.</p>
          </div>
        ) : null}

        {!loading && !error && filtered.length === 0 ? (
          <div className="residents-workspace__banner residents-workspace__banner--empty" aria-live="polite">
            <strong>No passengers in view</strong>
            <p>Clear the keyword or status filter to reveal more of the roster.</p>
          </div>
        ) : null}

        <section className="residents-workspace__table-shell" aria-label="Passenger roster">
          <div className="residents-workspace__table-header">
            <div>
              <p className="residents-workspace__table-eyebrow">Passenger roster</p>
              <p className="residents-workspace__table-note">
                Zone, recent activity, and device context are compressed into one operator table.
              </p>
            </div>
            <div className="residents-workspace__chips" aria-live="polite">
              <span className="residents-workspace__chip">
                Active filter: {statusLabels[statusFilter]}
              </span>
              {trimmedKeyword ? (
                <span className="residents-workspace__chip">
                  Keyword: {trimmedKeyword}
                </span>
              ) : null}
            </div>
          </div>

          <div className="residents-workspace__table-scroll">
            <table className="admin-table residents-workspace__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Zone</th>
                  <th>Status</th>
                  <th>Last seen</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-placeholder">
                      No passenger data.
                    </td>
                  </tr>
                ) : (
                  filtered.map((resident) => (
                    <tr key={resident.id}>
                      <td>
                        <span className="residents-workspace__id">#{resident.id}</span>
                      </td>
                      <td>
                        <div className="residents-workspace__stack">
                          <span className="residents-workspace__cell-main">{resident.name}</span>
                          {resident.role_type ? (
                            <span className="residents-workspace__cell-sub">
                              {roleLabels[resident.role_type] ?? resident.role_type}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className="residents-workspace__room-chip">
                          {resident.room ?? 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <span className={`status status-${resident.status}`}>
                          {statusLabels[resident.status]}
                        </span>
                      </td>
                      <td>
                        <div className="residents-workspace__stack">
                          <span className="residents-workspace__cell-main">
                            {formatDateTime(resident.last_seen_at)}
                          </span>
                          <span className="residents-workspace__cell-sub">
                            {resident.last_seen_location ?? 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="residents-workspace__stack">
                          <span className="residents-workspace__cell-main">
                            {describeDevicePrimary(resident)}
                          </span>
                          <span className="residents-workspace__cell-sub">
                            {describeDeviceSecondary(resident)}
                          </span>
                          <button
                            type="button"
                            className="secondary residents-workspace__modal-trigger"
                            onClick={() => openVitalsModal(resident)}
                          >
                            View vitals
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <VitalsHistoryModal
        residentId={selectedResident?.id ?? null}
        residentName={selectedResident?.name ?? null}
        isOpen={selectedResident !== null}
        onClose={closeVitalsModal}
      />
    </>
  );
};
