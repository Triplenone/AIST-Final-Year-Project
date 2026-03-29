import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/residents-admin.css';
import { useResidentLiveStore } from '../../shared/resident-live-store';
import { residentApi } from '../../services/api';
import type { Resident } from '../../sse/client';
import type { BackendResident, BackendResidentStatus } from '../../types/backend';

const STATUS_OPTIONS: BackendResidentStatus[] = ['stable', 'followUp', 'high', 'checked_out'];

type WorkspaceCopy = {
  eyebrow: string;
  note: string;
  totalLabel: string;
  visibleLabel: string;
  attentionLabel: string;
  deviceLinkedLabel: string;
  tableTitle: string;
  tableNote: string;
  allResidents: string;
  filterLabel: string;
  keywordLabel: string;
  demoSource: string;
  loadingTitle: string;
  loadingBody: string;
  emptyTitle: string;
  emptyBody: string;
  errorTitle: string;
};

const getWorkspaceCopy = (locale: string): WorkspaceCopy => {
  const language = locale.toLowerCase();

  if (language.startsWith('zh-cn')) {
    return {
      eyebrow: '居民工作台',
      note: '先看名册、状态与设备上下文，再决定下一步处理。',
      totalLabel: '总名册',
      visibleLabel: '当前筛选',
      attentionLabel: '需关注',
      deviceLinkedLabel: '已关联设备',
      tableTitle: '居民名册',
      tableNote: '把房间、最新活动和设备摘要压进同一张可扫描表。',
      allResidents: '全部居民',
      filterLabel: '当前筛选',
      keywordLabel: '关键词',
      demoSource: 'Demo mode resident stream',
      loadingTitle: '正在同步居民名册',
      loadingBody: '正在刷新最新房间、生命体征和设备上下文。',
      emptyTitle: '当前视图没有居民',
      emptyBody: '放宽关键词或状态筛选，即可恢复更多名册内容。',
      errorTitle: '居民名册暂不可用',
    };
  }

  if (language.startsWith('zh-hk') || language.startsWith('zh-tw')) {
    return {
      eyebrow: '住戶工作台',
      note: '先看名冊、狀態與裝置上下文，再決定下一步處理。',
      totalLabel: '總名冊',
      visibleLabel: '目前篩選',
      attentionLabel: '需關注',
      deviceLinkedLabel: '已連接裝置',
      tableTitle: '住戶名冊',
      tableNote: '把房間、最新活動和裝置摘要壓進同一張可掃描表。',
      allResidents: '全部住戶',
      filterLabel: '目前篩選',
      keywordLabel: '關鍵字',
      demoSource: 'Demo mode resident stream',
      loadingTitle: '正在同步住戶名冊',
      loadingBody: '正在刷新最新房間、生命體徵和裝置上下文。',
      emptyTitle: '目前檢視沒有住戶',
      emptyBody: '放寬關鍵字或狀態篩選，即可恢復更多名冊內容。',
      errorTitle: '住戶名冊暫時不可用',
    };
  }

  return {
    eyebrow: 'Resident workspace',
    note: 'Scan roster, status, and device context first, then decide the next handoff.',
    totalLabel: 'Total roster',
    visibleLabel: 'Visible after filters',
    attentionLabel: 'Needs attention',
    deviceLinkedLabel: 'Device linked',
    tableTitle: 'Resident roster',
    tableNote: 'Room, recent activity, and device context are compressed into one operator table.',
    allResidents: 'All residents',
    filterLabel: 'Active filter',
    keywordLabel: 'Keyword',
    demoSource: 'Demo mode resident stream',
    loadingTitle: 'Syncing resident directory',
    loadingBody: 'Refreshing recent room, vitals, and device context.',
    emptyTitle: 'No residents in view',
    emptyBody: 'Clear the keyword or status filter to reveal more of the roster.',
    errorTitle: 'Resident directory unavailable',
  };
};

const formatCount = (value: number) => value.toLocaleString('en-US');

export const ResidentsAdmin = () => {
  const { t, i18n } = useTranslation();
  const [residents, setResidents] = useState<BackendResident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BackendResidentStatus | 'all'>('all');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { residents: liveResidents, demoMode } = useResidentLiveStore();

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const workspaceCopy = useMemo(() => getWorkspaceCopy(locale), [locale]);

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

      if (!parts.length) {
        return t('admin.residents.vitalsUnknown');
      }
      return parts.join(' · ');
    },
    [t]
  );

  const describeDevicePrimary = useCallback(
    (resident: BackendResident) => {
      if (resident.device_id) {
        return `#${resident.device_id}`;
      }
      return t('admin.residents.deviceUnknown');
    },
    [t]
  );

  const describeDeviceSecondary = useCallback(
    (resident: BackendResident) => {
      const parts: string[] = [];
      if (typeof resident.device_battery_level === 'number') {
        parts.push(`${resident.device_battery_level}%`);
      }
      if (resident.device_current_status) {
        parts.push(resident.device_current_status);
      }

      return parts.length ? parts.join(' · ') : t('admin.residents.deviceUnknown');
    },
    [t]
  );

  const load = useCallback(async () => {
    if (demoMode) return;
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
  }, [demoMode, t]);

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
          temperature: resident.vitals?.temperature ?? null,
        },
        checked_out: resident.checkedOut,
        created_at: resident.createdAt,
        updated_at: resident.updatedAt,
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

  const residentMetrics = useMemo(() => {
    const attentionCount = dataset.filter((resident) => resident.status === 'high' || resident.status === 'followUp').length;
    const deviceLinkedCount = dataset.filter(
      (resident) =>
        resident.device_id !== null &&
        resident.device_id !== undefined &&
        resident.device_id !== 0
    ).length;

    return [
      { label: workspaceCopy.totalLabel, value: formatCount(dataset.length), tone: 'neutral' },
      { label: workspaceCopy.visibleLabel, value: formatCount(filtered.length), tone: trimmedKeyword || statusFilter !== 'all' ? 'accent' : 'neutral' },
      { label: workspaceCopy.attentionLabel, value: formatCount(attentionCount), tone: attentionCount > 0 ? 'warning' : 'neutral' },
      { label: workspaceCopy.deviceLinkedLabel, value: formatCount(deviceLinkedCount), tone: deviceLinkedCount > 0 ? 'success' : 'neutral' },
    ] as const;
  }, [dataset, filtered.length, statusFilter, trimmedKeyword, workspaceCopy]);

  const activeStatusLabel =
    statusFilter === 'all' ? workspaceCopy.allResidents : t(`residents.status.${statusFilter}`);

  return (
    <section className="admin-card residents-workspace">
      <header className="residents-workspace__header">
        <div className="residents-workspace__intro">
          <p className="residents-workspace__eyebrow">{workspaceCopy.eyebrow}</p>
          <div className="residents-workspace__title-block">
            <div>
              <h3>{t('admin.residents.title')}</h3>
              <p className="residents-workspace__note">{workspaceCopy.note}</p>
            </div>
            <div className="residents-workspace__meta">
              <span className="residents-workspace__source">
                {demoMode ? workspaceCopy.demoSource : t('admin.residents.subtitle')}
              </span>
              {lastUpdated ? (
                <span className="residents-workspace__source">
                  {t('admin.residents.lastUpdated', { time: formatDateTime(lastUpdated) })}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="admin-actions residents-workspace__controls">
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

      <dl className="residents-workspace__summary" aria-label={workspaceCopy.tableTitle}>
        {residentMetrics.map((metric) => (
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
          <strong>{workspaceCopy.errorTitle}</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="residents-workspace__banner residents-workspace__banner--loading" aria-live="polite">
          <strong>{workspaceCopy.loadingTitle}</strong>
          <p>{workspaceCopy.loadingBody}</p>
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="residents-workspace__banner residents-workspace__banner--empty" aria-live="polite">
          <strong>{workspaceCopy.emptyTitle}</strong>
          <p>{workspaceCopy.emptyBody}</p>
        </div>
      ) : null}

      <section className="residents-workspace__table-shell" aria-label={workspaceCopy.tableTitle}>
        <div className="residents-workspace__table-header">
          <div>
            <p className="residents-workspace__table-eyebrow">{workspaceCopy.tableTitle}</p>
            <p className="residents-workspace__table-note">{workspaceCopy.tableNote}</p>
          </div>
          <div className="residents-workspace__chips" aria-live="polite">
            <span className="residents-workspace__chip">
              {workspaceCopy.filterLabel}: {activeStatusLabel}
            </span>
            {trimmedKeyword ? (
              <span className="residents-workspace__chip">
                {workspaceCopy.keywordLabel}: {trimmedKeyword}
              </span>
            ) : null}
          </div>
        </div>

        <div className="residents-workspace__table-scroll">
          <table className="admin-table residents-workspace__table">
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
                    <td>
                      <span className="residents-workspace__id">#{resident.id}</span>
                    </td>
                    <td>
                      <div className="residents-workspace__stack">
                        <span className="residents-workspace__cell-main">{resident.name}</span>
                        {resident.role_type ? (
                          <span className="residents-workspace__cell-sub">{resident.role_type}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className="residents-workspace__room-chip">
                        {resident.room ?? t('admin.residents.lastSeenUnknown')}
                      </span>
                    </td>
                    <td>
                      <span className={`status status-${resident.status}`}>
                        {t(`residents.status.${resident.status}`)}
                      </span>
                    </td>
                    <td>
                      <div className="residents-workspace__stack">
                        <span className="residents-workspace__cell-main">
                          {formatDateTime(resident.last_seen_at)}
                        </span>
                        <span className="residents-workspace__cell-sub">
                          {resident.last_seen_location ?? t('admin.residents.lastSeenUnknown')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="residents-workspace__cell-copy">{describeVitals(resident)}</span>
                    </td>
                    <td>
                      <div className="residents-workspace__stack">
                        <span className="residents-workspace__cell-main">
                          {describeDevicePrimary(resident)}
                        </span>
                        <span className="residents-workspace__cell-sub">
                          {describeDeviceSecondary(resident)}
                        </span>
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
  );
};
