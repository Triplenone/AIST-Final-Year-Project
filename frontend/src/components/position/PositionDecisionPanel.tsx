import { useTranslation } from 'react-i18next';

import type {
  PositionActivityItem,
  PositionNextActionCode,
  PositionPriorityReasonCode,
  PositionResidentViewModel,
  PositionZoneCommandState
} from '../../adapters/position-command-center';

type PositionDecisionPanelProps = {
  resident: PositionResidentViewModel | null;
  loadError: string | null;
  loading: boolean;
  activityLoading: boolean;
  onRefresh: () => void;
};

const nextActionLabelKey: Record<PositionNextActionCode, string> = {
  'continue-monitoring': 'position.nextAction.continueMonitoring',
  'verify-upstream': 'position.nextAction.verifyUpstream',
  'verify-device-link': 'position.nextAction.verifyDeviceLink',
  'escalate-care': 'position.nextAction.escalateCare'
};

const priorityReasonLabelKey: Record<PositionPriorityReasonCode, string> = {
  'critical-sos': 'position.priorityReason.criticalSos',
  'critical-fall': 'position.priorityReason.criticalFall',
  'warning-vitals': 'position.priorityReason.warningVitals',
  'warning-offline': 'position.priorityReason.warningOffline',
  'stale-data': 'position.priorityReason.staleData',
  'stable-monitoring': 'position.priorityReason.stableMonitoring'
};

const zoneCommandLabelKey: Record<PositionZoneCommandState, string> = {
  holding: 'position.zoneCommand.holding',
  'target-pending': 'position.zoneCommand.targetPending',
  'target-reached': 'position.zoneCommand.targetReached',
  'zone-unknown': 'position.zoneCommand.unknown'
};

const truthDefaultLabel: Record<PositionResidentViewModel['truthState'], string> = {
  online: 'Online',
  stale: 'Stale',
  offline: 'Offline'
};

const riskDefaultLabel: Record<PositionResidentViewModel['riskLevel'], string> = {
  stable: 'Stable',
  warning: 'Warning',
  critical: 'Critical'
};

const freshnessDefaultLabel: Record<PositionResidentViewModel['freshnessLevel'], string> = {
  live: 'Live',
  delayed: 'Delayed',
  stale: 'Stale'
};

const nextActionDefaultLabel: Record<PositionNextActionCode, string> = {
  'continue-monitoring': 'Continue monitoring',
  'verify-upstream': 'Verify upstream freshness',
  'verify-device-link': 'Verify device link',
  'escalate-care': 'Escalate to care team'
};

const priorityReasonDefaultLabel: Record<PositionPriorityReasonCode, string> = {
  'critical-sos': 'SOS needs response',
  'critical-fall': 'Confirmed fall needs response',
  'warning-vitals': 'Vitals need review',
  'warning-offline': 'Device link needs review',
  'stale-data': 'Data is stale',
  'stable-monitoring': 'Stable monitoring'
};

const zoneCommandDefaultLabel: Record<PositionZoneCommandState, string> = {
  holding: 'Holding in current zone',
  'target-pending': 'Target zone pending',
  'target-reached': 'Target reached',
  'zone-unknown': 'Zone unknown'
};

function formatMetric(value: number | null, suffix: string): string {
  if (value == null) return 'No data';
  return `${value}${suffix}`;
}

function formatCoords(resident: PositionResidentViewModel | null): string {
  if (!resident?.currentCoords) return 'No data';
  return `${resident.currentCoords.x}, ${resident.currentCoords.y}`;
}

function formatZoneLabel(
  labelKey: string | null,
  name: string | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (labelKey) {
    return t(labelKey, { defaultValue: name ?? 'Unknown zone' });
  }

  return name ?? t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
}

function formatActivityTimestamp(timestamp: string | null, locale: string): string {
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

function renderActivityList(
  activity: PositionActivityItem[],
  locale: string
): JSX.Element {
  return (
    <ul className="position-decision-panel__activity-list">
      {activity.map((item) => (
        <li key={item.id} className={`position-decision-panel__activity-item position-decision-panel__activity-item--${item.tone}`}>
          <div className="position-decision-panel__activity-top">
            <strong>{item.title}</strong>
            <span>{formatActivityTimestamp(item.timestamp, locale)}</span>
          </div>
          <p>{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function PositionDecisionPanel({
  resident,
  loadError,
  loading,
  activityLoading,
  onRefresh
}: PositionDecisionPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  const formattedLastUpdate = resident?.lastSeenAt
    ? formatActivityTimestamp(resident.lastSeenAt, locale)
    : t('position.lastUpdateUnknown', { defaultValue: 'Unknown' });

  return (
    <section className="position-command-center__surface position-decision-panel">
      <header className="position-decision-panel__header">
        <div>
          <p className="position-command-center__eyebrow">
            {t('position.panelEyebrow', { defaultValue: 'Decision panel' })}
          </p>
          <h2>{t('position.rightPanelTitle', { defaultValue: 'Decision panel' })}</h2>
        </div>
        <button type="button" className="position-decision-panel__refresh" onClick={onRefresh}>
          {t('position.refresh', { defaultValue: 'Refresh' })}
        </button>
      </header>

      {loadError ? <p className="position-command-center__error">{loadError}</p> : null}

      {loading && resident == null ? (
        <p className="position-command-center__muted">{t('common.loading', { defaultValue: 'Loading...' })}</p>
      ) : null}

      {!resident ? (
        <p className="position-command-center__muted">{t('position.noDeviceData', { defaultValue: 'No device upstream data yet' })}</p>
      ) : null}

      {resident ? (
        <>
          <div className="position-decision-panel__hero">
            <div>
              <h3>{resident.displayName}</h3>
              <p className="position-command-center__muted">
                {t(priorityReasonLabelKey[resident.priorityReasonCode], {
                  defaultValue: priorityReasonDefaultLabel[resident.priorityReasonCode]
                })}
              </p>
            </div>
            <div className="position-decision-panel__hero-badges">
              <span className={`position-state-pill position-state-pill--${resident.truthState}`}>
                {t(`position.truth.${resident.truthState}`, { defaultValue: truthDefaultLabel[resident.truthState] })}
              </span>
              <span className={`position-risk-pill position-risk-pill--${resident.riskLevel}`}>
                {t(`position.risk.${resident.riskLevel}`, { defaultValue: riskDefaultLabel[resident.riskLevel] })}
              </span>
              <span className={`position-freshness-pill position-freshness-pill--${resident.freshnessLevel}`}>
                {t(`position.freshness.${resident.freshnessLevel}`, { defaultValue: freshnessDefaultLabel[resident.freshnessLevel] })}
              </span>
            </div>
          </div>

          <section className="position-decision-panel__section">
            <h4>{t('position.liveSummary', { defaultValue: 'Live summary' })}</h4>
            <dl className="position-decision-panel__metrics">
              <div>
                <dt>{t('position.currentLocation', { defaultValue: 'Current zone' })}</dt>
                <dd>{formatZoneLabel(resident.currentZoneLabelKey, resident.currentZoneName, t)}</dd>
              </div>
              <div>
                <dt>{t('position.targetZone', { defaultValue: 'Target zone' })}</dt>
                <dd>{formatZoneLabel(resident.targetZoneLabelKey, resident.targetZoneName, t)}</dd>
              </div>
              <div>
                <dt>{t('position.zoneCommandLabel', { defaultValue: 'Zone command' })}</dt>
                <dd>
                  {t(zoneCommandLabelKey[resident.zoneCommandState], {
                    defaultValue: zoneCommandDefaultLabel[resident.zoneCommandState]
                  })}
                </dd>
              </div>
              <div>
                <dt>{t('position.batteryLevel', { defaultValue: 'Battery' })}</dt>
                <dd>{formatMetric(resident.battery, '%')}</dd>
              </div>
              <div>
                <dt>{t('position.heartRateBpm', { defaultValue: 'Heart rate' })}</dt>
                <dd>{formatMetric(resident.heartRate, ' bpm')}</dd>
              </div>
              <div>
                <dt>{t('position.spo2Percentage', { defaultValue: 'SpO2' })}</dt>
                <dd>{formatMetric(resident.spo2, '%')}</dd>
              </div>
            </dl>
          </section>

          <section className="position-decision-panel__section">
            <h4>{t('position.context', { defaultValue: 'Context' })}</h4>
            <dl className="position-decision-panel__facts">
              <div>
                <dt>{t('position.nextStep', { defaultValue: 'Next step' })}</dt>
                <dd>
                  {t(nextActionLabelKey[resident.nextActionCode], {
                    defaultValue: nextActionDefaultLabel[resident.nextActionCode]
                  })}
                </dd>
              </div>
              <div>
                <dt>{t('position.fallStateDescription', { defaultValue: 'Fall state' })}</dt>
                <dd>{resident.fallState ?? t('position.noDataShort', { defaultValue: 'No data' })}</dd>
              </div>
              <div>
                <dt>{t('position.sosStatus', { defaultValue: 'SOS state' })}</dt>
                <dd>{resident.sosState ? 'Active' : 'Normal'}</dd>
              </div>
              <div>
                <dt>{t('position.lastUpdate', { defaultValue: 'Last update' })}</dt>
                <dd>{formattedLastUpdate}</dd>
              </div>
            </dl>
          </section>

          <section className="position-decision-panel__section">
            <h4>{t('position.recentActivity', { defaultValue: 'Recent activity' })}</h4>
            {activityLoading ? (
              <p className="position-command-center__muted">{t('common.loading', { defaultValue: 'Loading...' })}</p>
            ) : resident.activityBlockedReason ? (
              <p className="position-command-center__error">
                {t('position.activityBlocked', {
                  defaultValue: `Recent activity blocked: ${resident.activityBlockedReason}`
                })}
              </p>
            ) : resident.recentActivity.length > 0 ? (
              renderActivityList(resident.recentActivity, locale)
            ) : (
              <p className="position-command-center__muted">
                {t('position.activityEmpty', { defaultValue: 'No recent activity yet.' })}
              </p>
            )}
          </section>

          <section className="position-decision-panel__section">
            <h4>{t('position.metadata', { defaultValue: 'Metadata' })}</h4>
            <dl className="position-decision-panel__facts">
              <div>
                <dt>{t('position.deviceId', { defaultValue: 'Device ID' })}</dt>
                <dd>{resident.deviceId}</dd>
              </div>
              <div>
                <dt>{t('position.coordinates', { defaultValue: 'Coordinates' })}</dt>
                <dd>{formatCoords(resident)}</dd>
              </div>
              <div>
                <dt>{t('position.lastUpdate', { defaultValue: 'Last update' })}</dt>
                <dd>{formattedLastUpdate}</dd>
              </div>
            </dl>
          </section>
        </>
      ) : null}
    </section>
  );
}
