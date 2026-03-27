import { useTranslation } from 'react-i18next';

import type { PositionNextActionCode, PositionResidentViewModel } from '../../adapters/position-command-center';

type PositionDecisionPanelProps = {
  resident: PositionResidentViewModel | null;
  loadError: string | null;
  loading: boolean;
  onRefresh: () => void;
};

const nextActionLabelKey: Record<PositionNextActionCode, string> = {
  'continue-monitoring': 'position.nextAction.continueMonitoring',
  'verify-upstream': 'position.nextAction.verifyUpstream',
  'verify-device-link': 'position.nextAction.verifyDeviceLink',
  'escalate-care': 'position.nextAction.escalateCare'
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

const nextActionDefaultLabel: Record<PositionNextActionCode, string> = {
  'continue-monitoring': 'Continue monitoring',
  'verify-upstream': 'Verify upstream freshness',
  'verify-device-link': 'Verify device link',
  'escalate-care': 'Escalate to care team'
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

export function PositionDecisionPanel({
  resident,
  loadError,
  loading,
  onRefresh
}: PositionDecisionPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  const formattedLastUpdate = resident?.lastSeenAt
    ? new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      }).format(new Date(resident.lastSeenAt))
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
                {formatZoneLabel(resident.currentZoneLabelKey, resident.currentZoneName, t)}
              </p>
            </div>
            <div className="position-decision-panel__hero-badges">
              <span className={`position-state-pill position-state-pill--${resident.truthState}`}>
                {t(`position.truth.${resident.truthState}`, { defaultValue: truthDefaultLabel[resident.truthState] })}
              </span>
              <span className={`position-risk-pill position-risk-pill--${resident.riskLevel}`}>
                {t(`position.risk.${resident.riskLevel}`, { defaultValue: riskDefaultLabel[resident.riskLevel] })}
              </span>
            </div>
          </div>

          <section className="position-decision-panel__section">
            <h4>{t('position.liveSummary', { defaultValue: 'Live summary' })}</h4>
            <dl className="position-decision-panel__metrics">
              <div>
                <dt>{t('position.liveStatus', { defaultValue: 'Live status' })}</dt>
                <dd>{t(`position.truth.${resident.truthState}`, { defaultValue: truthDefaultLabel[resident.truthState] })}</dd>
              </div>
              <div>
                <dt>{t('position.currentLocation', { defaultValue: 'Current zone' })}</dt>
                <dd>{formatZoneLabel(resident.currentZoneLabelKey, resident.currentZoneName, t)}</dd>
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
                <dt>{t('position.targetZone', { defaultValue: 'Target zone' })}</dt>
                <dd>{formatZoneLabel(resident.targetZoneLabelKey, resident.targetZoneName, t)}</dd>
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
                <dt>{t('position.nextStep', { defaultValue: 'Next step' })}</dt>
                <dd>
                  {t(nextActionLabelKey[resident.nextActionCode], {
                    defaultValue: nextActionDefaultLabel[resident.nextActionCode]
                  })}
                </dd>
              </div>
            </dl>
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
