import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getPositionZoneDisplayForResident,
  type PositionFreshnessLevel,
  type PositionPriorityReasonCode,
  type PositionRiskLevel,
  type PositionResidentViewModel,
  type PositionSurfaceState,
  type PositionTruthState
} from '../../adapters/position-command-center';

type PositionSummaryBarProps = {
  resident: PositionResidentViewModel | null;
  fetchedAt: string | null;
  surfaceState: PositionSurfaceState;
  recordError: string | null;
  variant?: 'standalone' | 'sidebar';
};

const truthLabelKey: Record<PositionTruthState, string> = {
  online: 'position.truth.online',
  stale: 'position.truth.stale',
  offline: 'position.truth.offline'
};

const truthDefaultLabel: Record<PositionTruthState, string> = {
  online: 'Online',
  stale: 'Stale',
  offline: 'Offline'
};

const freshnessLabelKey: Record<PositionFreshnessLevel, string> = {
  live: 'position.freshness.live',
  delayed: 'position.freshness.delayed',
  stale: 'position.freshness.stale'
};

const freshnessDefaultLabel: Record<PositionFreshnessLevel, string> = {
  live: 'Live',
  delayed: 'Delayed',
  stale: 'Stale'
};

const riskLabelKey: Record<PositionRiskLevel, string> = {
  stable: 'position.risk.stable',
  warning: 'position.risk.warning',
  critical: 'position.risk.critical'
};

const riskDefaultLabel: Record<PositionRiskLevel, string> = {
  stable: 'Stable',
  warning: 'Warning',
  critical: 'Critical'
};

const priorityReasonLabelKey: Record<PositionPriorityReasonCode, string> = {
  'critical-sos': 'position.priorityReason.criticalSos',
  'critical-fall': 'position.priorityReason.criticalFall',
  'warning-vitals': 'position.priorityReason.warningVitals',
  'warning-offline': 'position.priorityReason.warningOffline',
  'stale-data': 'position.priorityReason.staleData',
  'stable-monitoring': 'position.priorityReason.stableMonitoring'
};

const priorityReasonDefaultLabel: Record<PositionPriorityReasonCode, string> = {
  'critical-sos': 'SOS needs response',
  'critical-fall': 'Confirmed fall needs response',
  'warning-vitals': 'Vitals need review',
  'warning-offline': 'Device link needs review',
  'stale-data': 'Data is stale',
  'stable-monitoring': 'Stable monitoring'
};

function formatTimestamp(timestamp: string | null, locale: string): string {
  if (!timestamp) return 'Unknown';
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return 'Unknown';

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  }).format(new Date(parsed));
}

function formatMetric(value: number | null, suffix: string): string {
  if (value == null) return 'No data';
  return `${value}${suffix}`;
}

function getZoneLabel(
  resident: PositionResidentViewModel | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!resident) return t('position.noSelection', { defaultValue: 'No resident selected' });
  return getPositionZoneDisplayForResident(resident, t);
}

function getOperatorError(
  error: string | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!error || error.toLowerCase().includes('not found')) {
    return t('position.selectedResidentUnavailable', {
      defaultValue: 'Selected resident snapshot unavailable.'
    });
  }
  return error;
}

export function PositionSummaryBar({
  resident,
  fetchedAt,
  surfaceState,
  recordError,
  variant = 'standalone'
}: PositionSummaryBarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  const items = useMemo(
    () => [
      {
        key: 'truth',
        label: t('position.liveStatus', { defaultValue: 'Live status' }),
        value: resident
          ? t(truthLabelKey[resident.truthState], { defaultValue: truthDefaultLabel[resident.truthState] })
          : t('position.noSelection', { defaultValue: 'No resident selected' }),
        toneClass: resident ? `position-state-pill position-state-pill--${resident.truthState}` : 'position-state-pill position-state-pill--offline'
      },
      {
        key: 'risk',
        label: t('position.riskLabel', { defaultValue: 'Risk' }),
        value: resident
          ? t(riskLabelKey[resident.riskLevel], { defaultValue: riskDefaultLabel[resident.riskLevel] })
          : t('position.noDataShort', { defaultValue: 'No data' }),
        toneClass: resident ? `position-risk-pill position-risk-pill--${resident.riskLevel}` : 'position-risk-pill position-risk-pill--stable'
      },
      {
        key: 'freshness',
        label: t('position.freshness', { defaultValue: 'Freshness' }),
        value: resident
          ? t(freshnessLabelKey[resident.freshnessLevel], { defaultValue: freshnessDefaultLabel[resident.freshnessLevel] })
          : t('position.noDataShort', { defaultValue: 'No data' }),
        toneClass: resident
          ? `position-freshness-pill position-freshness-pill--${resident.freshnessLevel}`
          : 'position-freshness-pill position-freshness-pill--stale'
      },
      {
        key: 'current-zone',
        label: t('position.currentLocation', { defaultValue: 'Current zone' }),
        value: getZoneLabel(resident, t),
        toneClass: 'position-summary-bar__text'
      },
      {
        key: 'battery',
        label: t('position.batteryLevel', { defaultValue: 'Battery' }),
        value: resident ? formatMetric(resident.battery, '%') : t('position.noDataShort', { defaultValue: 'No data' }),
        toneClass: 'position-summary-bar__text'
      },
      {
        key: 'heart-rate',
        label: t('position.heartRateBpm', { defaultValue: 'Heart rate' }),
        value: resident ? formatMetric(resident.heartRate, ' bpm') : t('position.noDataShort', { defaultValue: 'No data' }),
        toneClass: 'position-summary-bar__text'
      },
      {
        key: 'spo2',
        label: t('position.spo2Percentage', { defaultValue: 'SpO2' }),
        value: resident ? formatMetric(resident.spo2, '%') : t('position.noDataShort', { defaultValue: 'No data' }),
        toneClass: 'position-summary-bar__text'
      },
      {
        key: 'last-update',
        label: t('position.lastUpdate', { defaultValue: 'Last update' }),
        value: resident ? formatTimestamp(resident.lastSeenAt, locale) : formatTimestamp(fetchedAt, locale),
        toneClass: 'position-summary-bar__text'
      }
    ],
    [fetchedAt, locale, resident, t]
  );

  const riskSupportText =
    resident != null
      ? t(priorityReasonLabelKey[resident.priorityReasonCode], {
          defaultValue: priorityReasonDefaultLabel[resident.priorityReasonCode]
        })
      : null;

  const surfaceToneClass =
    surfaceState === 'error'
      ? ' position-summary-bar--error'
      : resident?.riskLevel === 'critical'
        ? ' position-summary-bar--critical'
        : resident?.truthState === 'offline' || resident?.freshnessLevel === 'stale' || resident?.riskLevel === 'warning'
          ? ' position-summary-bar--attention'
          : '';

  return (
    <section
      className={
        variant === 'sidebar'
          ? `position-command-center__surface position-summary-bar position-summary-bar--sidebar${surfaceToneClass}`
          : `position-command-center__surface position-summary-bar${surfaceToneClass}`
      }
    >
      <div className="position-summary-bar__identity">
        <p className="position-command-center__eyebrow">
          {t('position.summaryEyebrow', { defaultValue: 'Selected resident' })}
        </p>
        <h1>{resident?.displayName ?? t('position.noSelection', { defaultValue: 'No resident selected' })}</h1>
        <p className="position-command-center__muted">
          {surfaceState === 'loading'
            ? t('position.loadingResidentContext', { defaultValue: 'Loading resident context...' })
            : t('position.snapshotFetchedAt', {
                defaultValue: `Snapshot fetched ${formatTimestamp(fetchedAt, locale)}`
              })}
        </p>
      </div>

      {surfaceState === 'partial-error' ? (
        <p className="position-command-center__notice position-command-center__notice--warning">
          {t('position.partialResidentFailure', {
            defaultValue: 'Some resident snapshots did not refresh.'
          })}
        </p>
      ) : null}

      {surfaceState === 'error' ? (
        <div className="position-command-center__state-card position-command-center__state-card--error">
          <strong>{t('position.selectedResidentUnavailable', { defaultValue: 'Selected resident snapshot unavailable.' })}</strong>
          <p>{getOperatorError(recordError, t)}</p>
        </div>
      ) : null}

      {surfaceState === 'loading' ? (
        <div className="position-command-center__state-card position-command-center__state-card--loading">
          <strong>{t('position.loadingResidentContext', { defaultValue: 'Loading resident context...' })}</strong>
          <p>{t('position.loadingResidentContextHint', { defaultValue: 'Status, risk, and freshness are pending from upstream.' })}</p>
        </div>
      ) : null}

      {surfaceState === 'empty' ? (
        <div className="position-command-center__state-card">
          <strong>{t('position.noSelection', { defaultValue: 'No resident selected' })}</strong>
          <p>{t('position.noSelectionHint', { defaultValue: 'Choose a resident from the rail to inspect Position context.' })}</p>
        </div>
      ) : null}

      {surfaceState !== 'loading' && surfaceState !== 'empty' && surfaceState !== 'error' ? (
        <dl className="position-summary-bar__grid">
          {items.map((item) => (
            <div key={item.key} className="position-summary-bar__item">
              <dt>{item.label}</dt>
              <dd className={item.toneClass}>{item.value}</dd>
              {item.key === 'risk' && riskSupportText ? (
                <p className="position-summary-bar__support">{riskSupportText}</p>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
