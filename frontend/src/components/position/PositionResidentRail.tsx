import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  PositionFreshnessLevel,
  PositionPriorityReasonCode,
  PositionSurfaceState,
  PositionResidentViewModel
} from '../../adapters/position-command-center';

type PositionResidentRailProps = {
  residents: PositionResidentViewModel[];
  selectedResidentId: string | null;
  counts: {
    total: number;
    online: number;
    stale: number;
    offline: number;
  };
  surfaceState: PositionSurfaceState;
  loadError: string | null;
  partialFailureCount: number;
  onSelectResident: (residentId: string) => void;
};

const truthLabelKey: Record<PositionResidentViewModel['truthState'], string> = {
  online: 'position.truth.online',
  stale: 'position.truth.stale',
  offline: 'position.truth.offline'
};

const truthDefaultLabel: Record<PositionResidentViewModel['truthState'], string> = {
  online: 'Online',
  stale: 'Stale',
  offline: 'Offline'
};

const riskLabelKey: Record<PositionResidentViewModel['riskLevel'], string> = {
  stable: 'position.risk.stable',
  warning: 'position.risk.warning',
  critical: 'position.risk.critical'
};

const riskDefaultLabel: Record<PositionResidentViewModel['riskLevel'], string> = {
  stable: 'Stable',
  warning: 'Warning',
  critical: 'Critical'
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

function formatAgeLabel(ageMs: number | null, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (ageMs == null) {
    return t('position.lastUpdateUnknown', { defaultValue: 'Last update unknown' });
  }

  const totalMinutes = Math.floor(ageMs / 60_000);
  if (totalMinutes <= 0) {
    return t('position.lastUpdateNow', { defaultValue: 'Updated just now' });
  }

  if (totalMinutes < 60) {
    return t('position.lastUpdateMinutes', {
      count: totalMinutes,
      defaultValue: `Updated ${totalMinutes}m ago`
    });
  }

  const hours = Math.floor(totalMinutes / 60);
  return t('position.lastUpdateHours', {
    count: hours,
    defaultValue: `Updated ${hours}h ago`
  });
}

function getZoneLabel(
  resident: PositionResidentViewModel,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (resident.currentZoneLabelKey) {
    return t(resident.currentZoneLabelKey, {
      defaultValue: resident.currentZoneName ?? 'Unknown zone'
    });
  }

  if (resident.currentZoneName) {
    return resident.currentZoneName;
  }

  return t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
}

function getOperatorError(
  error: string | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!error) {
    return t('position.snapshotUnavailable', {
      defaultValue: 'Resident snapshot unavailable.'
    });
  }

  if (error.toLowerCase().includes('not found')) {
    return t('position.snapshotUnavailable', {
      defaultValue: 'Resident snapshot unavailable.'
    });
  }

  return error;
}

export function PositionResidentRail({
  residents,
  selectedResidentId,
  counts,
  surfaceState,
  loadError,
  partialFailureCount,
  onSelectResident
}: PositionResidentRailProps) {
  const { t } = useTranslation();
  const summaryItems = useMemo(
    () => [
      { key: 'total', label: t('position.summary.total', { defaultValue: 'Total' }), value: counts.total },
      {
        key: 'online',
        label: t('position.summary.online', { defaultValue: 'Online' }),
        value: surfaceState === 'loading' ? '—' : counts.online
      },
      {
        key: 'stale',
        label: t('position.summary.stale', { defaultValue: 'Stale' }),
        value: surfaceState === 'loading' ? '—' : counts.stale
      },
      {
        key: 'offline',
        label: t('position.summary.offline', { defaultValue: 'Offline' }),
        value: surfaceState === 'loading' ? '—' : counts.offline
      }
    ],
    [counts.offline, counts.online, counts.stale, counts.total, surfaceState, t]
  );

  return (
    <section className="position-command-center__surface position-resident-rail">
      <header className="position-resident-rail__header">
        <div>
          <p className="position-command-center__eyebrow">
            {t('position.railEyebrow', { defaultValue: 'Resident Rail' })}
          </p>
          <h2>{t('position.userList', { defaultValue: 'Resident list' })}</h2>
          <p className="position-command-center__muted">
            {surfaceState === 'loading'
              ? t('position.loadingResidents', {
                  defaultValue: 'Loading resident snapshot...'
                })
              : surfaceState === 'empty'
                ? t('position.noResidentsConfigured', {
                    defaultValue: 'No resident configured for Position.'
                  })
                : t('position.usersOnline', {
                    count: counts.online,
                    defaultValue: `${counts.online} user(s) online`
                  })}
          </p>
        </div>
      </header>

      {surfaceState === 'error' ? (
        <p className="position-command-center__error">
          {getOperatorError(loadError, t)}
        </p>
      ) : null}

      {surfaceState === 'partial-error' ? (
        <p className="position-command-center__notice position-command-center__notice--warning">
          {t('position.partialResidentFailure', {
            defaultValue: `${partialFailureCount} resident snapshot(s) failed to refresh.`
          })}
        </p>
      ) : null}

      <dl className="position-resident-rail__summary" aria-label={t('position.railSummary', { defaultValue: 'Resident state summary' })}>
        {summaryItems.map((item) => (
          <div key={item.key} className="position-resident-rail__summary-item">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="position-resident-rail__list" role="list" aria-label={t('position.userList', { defaultValue: 'Resident list' })}>
        {surfaceState === 'loading' ? (
          <li className="position-command-center__state-card position-command-center__state-card--loading">
            <strong>{t('position.loadingResidents', { defaultValue: 'Loading resident snapshot...' })}</strong>
            <p>{t('position.loadingResidentsHint', { defaultValue: 'Resident state is pending from upstream.' })}</p>
          </li>
        ) : null}

        {surfaceState === 'empty' ? (
          <li className="position-command-center__state-card">
            <strong>{t('position.noResidentsConfigured', { defaultValue: 'No resident configured for Position.' })}</strong>
            <p>{t('position.noResidentsConfiguredHint', { defaultValue: 'Add a registry entry before using the command center.' })}</p>
          </li>
        ) : null}

        {surfaceState !== 'loading' && surfaceState !== 'empty'
          ? residents.map((resident) => {
              const isSelected = resident.residentId === selectedResidentId;
              const selectedToneClass = isSelected
                ? resident.riskLevel === 'critical'
                  ? ' position-resident-rail__item--selected-critical'
                  : resident.truthState === 'offline' || resident.freshnessLevel === 'stale' || resident.riskLevel === 'warning'
                    ? ' position-resident-rail__item--selected-warning'
                    : ' position-resident-rail__item--selected-stable'
                : '';

              return (
                <li key={resident.residentId}>
                  <button
                    type="button"
                    className={`position-resident-rail__item${isSelected ? ' position-resident-rail__item--selected' : ''}${selectedToneClass}`}
                    aria-pressed={isSelected}
                    onClick={() => onSelectResident(resident.residentId)}
                  >
                    <div className="position-resident-rail__item-top">
                      <span className="position-resident-rail__name">{resident.displayName}</span>
                      <span className={`position-state-pill position-state-pill--${resident.truthState}`}>
                        {t(truthLabelKey[resident.truthState], {
                          defaultValue: truthDefaultLabel[resident.truthState]
                        })}
                      </span>
                    </div>

                    <p className="position-resident-rail__zone">{getZoneLabel(resident, t)}</p>

                    <div className="position-resident-rail__signals">
                      <span className={`position-risk-pill position-risk-pill--${resident.riskLevel}`}>
                        {t(riskLabelKey[resident.riskLevel], {
                          defaultValue: riskDefaultLabel[resident.riskLevel]
                        })}
                      </span>
                      <span className={`position-freshness-pill position-freshness-pill--${resident.freshnessLevel}`}>
                        {t(freshnessLabelKey[resident.freshnessLevel], {
                          defaultValue: freshnessDefaultLabel[resident.freshnessLevel]
                        })}
                      </span>
                    </div>

                    <p className="position-resident-rail__reason">
                      {t(priorityReasonLabelKey[resident.priorityReasonCode], {
                        defaultValue: priorityReasonDefaultLabel[resident.priorityReasonCode]
                      })}
                    </p>

                    {resident.recordError ? (
                      <p className="position-resident-rail__error">
                        {getOperatorError(resident.recordError, t)}
                      </p>
                    ) : null}

                    <div className="position-resident-rail__item-bottom">
                      <span className="position-resident-rail__meta">
                        {formatAgeLabel(resident.lastSeenAgeMs, t)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })
          : null}
      </ul>
    </section>
  );
}
