import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import mapImage from '../../img/ElderlyCare.png';
import {
  gridIndicesToPixelPercent,
  type PositionSurfaceState,
  type PositionResidentViewModel,
  type PositionZoneCommandState
} from '../../adapters/position-command-center';

type PositionMapStageProps = {
  resident: PositionResidentViewModel | null;
  mapResidents: PositionResidentViewModel[];
  showAllOnMap: boolean;
  surfaceState: PositionSurfaceState;
  recordError: string | null;
  pendingEventCountByResidentId?: Record<string, number>;
};

function formatPinTooltipAge(
  ageMs: number | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
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

const zoneCommandStateLabelKey: Record<PositionZoneCommandState, string> = {
  holding: 'position.zoneCommand.holding',
  'target-pending': 'position.zoneCommand.targetPending',
  'target-reached': 'position.zoneCommand.targetReached',
  'zone-unknown': 'position.zoneCommand.unknown'
};

const zoneCommandStateDefaultLabel: Record<PositionZoneCommandState, string> = {
  holding: 'Holding in current zone',
  'target-pending': 'Target zone pending',
  'target-reached': 'Target reached',
  'zone-unknown': 'Zone unknown'
};

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

export function PositionMapStage({
  resident,
  mapResidents,
  showAllOnMap,
  surfaceState,
  recordError,
  pendingEventCountByResidentId
}: PositionMapStageProps) {
  const { t } = useTranslation();
  const [hoveredResidentId, setHoveredResidentId] = useState<string | null>(null);
  const hasMapResidents = mapResidents.length > 0;
  const effectiveSurfaceState =
    showAllOnMap && hasMapResidents && (surfaceState === 'empty' || surfaceState === 'error' || surfaceState === 'partial-error')
      ? 'ready'
      : surfaceState;
  const residentPinRows = mapResidents
    .map((item) => {
      if (!item.currentCoords) return null;
      return {
        residentId: item.residentId,
        displayName: item.displayName,
        truthState: item.truthState,
        riskLevel: item.riskLevel,
        freshnessLevel: item.freshnessLevel,
        currentZoneName: item.currentZoneName,
        lastSeenAgeMs: item.lastSeenAgeMs,
        x: item.currentCoords.x,
        y: item.currentCoords.y,
        point: gridIndicesToPixelPercent(item.currentCoords)
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
  const clusteredPins = Array.from(
    residentPinRows.reduce<Map<string, typeof residentPinRows>>((acc, pin) => {
      const key = `${Math.round(pin.x)}:${Math.round(pin.y)}`;
      const list = acc.get(key) ?? [];
      list.push(pin);
      acc.set(key, list);
      return acc;
    }, new Map())
  ).map(([, members]) => {
    const anchor = members[0];
    return {
      key: `${Math.round(anchor.x)}:${Math.round(anchor.y)}`,
      point: anchor.point,
      members
    };
  });
  const mapEmptyCopy =
    showAllOnMap
      ? t('position.noOnlineResidentsOnMap', {
          defaultValue: 'No online residents with location data right now.'
        })
      : resident == null
      ? t('position.noSelectionHint', {
          defaultValue: 'Choose a resident from the rail to inspect Position context.'
        })
      : resident.hasData
        ? t('position.zoneResolutionUnavailable', {
            defaultValue: 'Zone resolution is unavailable for the current snapshot.'
          })
        : t('position.noDeviceData', { defaultValue: 'No device upstream data yet' });

  return (
    <section className="position-command-center__surface position-map-stage">
      <header className="position-map-stage__header">
        <div>
          <p className="position-command-center__eyebrow">
            {t('position.mapStageEyebrow', { defaultValue: 'Map Stage' })}
          </p>
          <h2>{t('layout.nav.position', { defaultValue: 'Position' })}</h2>
        </div>
        <p className="position-command-center__muted">
          {effectiveSurfaceState === 'loading'
            ? t('position.loadingMapContext', { defaultValue: 'Loading map context...' })
            : showAllOnMap
              ? t('position.viewAllOnMap', { defaultValue: 'View everyone' })
              : t('position.currentLocation', { defaultValue: 'Current location' })}
        </p>
      </header>

      {effectiveSurfaceState === 'error' ? (
        <p className="position-command-center__error">{getOperatorError(recordError, t)}</p>
      ) : null}

      <div className="position-map-stage__frame">
        <div className="position-map-stage__canvas">
          <img
            src={mapImage}
            alt={t('layout.nav.position', { defaultValue: 'Position map' })}
            className="position-map-stage__image"
          />

          {clusteredPins.map((cluster) => {
            if (cluster.members.length <= 1) {
              const pin = cluster.members[0];
              const pendingCount = pendingEventCountByResidentId?.[pin.residentId] ?? 0;
              const isHovered = hoveredResidentId === pin.residentId;
              const ariaSummary = `${pin.displayName}${pin.currentZoneName ? ` · ${pin.currentZoneName}` : ''}`;
              return (
                <div
                  key={pin.residentId}
                  className="position-map-stage__pin position-map-stage__pin--current"
                  style={{ left: `${pin.point.leftPercent}%`, top: `${pin.point.topPercent}%` }}
                  role="button"
                  tabIndex={0}
                  aria-label={ariaSummary}
                  onMouseEnter={() => setHoveredResidentId(pin.residentId)}
                  onMouseLeave={() =>
                    setHoveredResidentId((current) => (current === pin.residentId ? null : current))
                  }
                  onFocus={() => setHoveredResidentId(pin.residentId)}
                  onBlur={() =>
                    setHoveredResidentId((current) => (current === pin.residentId ? null : current))
                  }
                >
                  <span className="position-map-stage__pin-label">{pin.displayName}</span>
                  <span className={`position-map-stage__pin-dot position-map-stage__pin-dot--${pin.truthState}`} />
                  {isHovered ? (
                    <div className="position-map-stage__pin-tooltip" role="tooltip">
                      <strong>{pin.displayName}</strong>
                      <p>
                        {pin.currentZoneName ?? t('position.zoneUnknown', { defaultValue: 'Unknown zone' })}
                      </p>
                      <div className="position-map-stage__pin-tooltip-badges">
                        <span
                          className={
                            pin.riskLevel === 'critical'
                              ? 'position-map-stage__pin-tooltip-badge--critical'
                              : pin.riskLevel === 'warning'
                                ? 'position-map-stage__pin-tooltip-badge--warning'
                                : ''
                          }
                        >
                          {t(`position.risk.${pin.riskLevel}`, { defaultValue: pin.riskLevel })}
                        </span>
                        <span
                          className={
                            pin.freshnessLevel === 'stale'
                              ? 'position-map-stage__pin-tooltip-badge--stale'
                              : ''
                          }
                        >
                          {t(`position.freshness.${pin.freshnessLevel}`, {
                            defaultValue: pin.freshnessLevel
                          })}
                        </span>
                        <span>
                          {t(`position.truth.${pin.truthState}`, { defaultValue: pin.truthState })}
                        </span>
                      </div>
                      <p>{formatPinTooltipAge(pin.lastSeenAgeMs, t)}</p>
                      {pendingCount > 0 ? (
                        <p className="position-map-stage__pin-tooltip-pending">
                          {t('position.tooltip.pendingEvents', {
                            count: pendingCount,
                            defaultValue: `${pendingCount} pending event(s)`
                          })}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            }

            const memberNames = cluster.members.map((item) => item.displayName).join(' / ');
            return (
              <div
                key={cluster.key}
                className="position-map-stage__pin position-map-stage__pin--cluster"
                style={{ left: `${cluster.point.leftPercent}%`, top: `${cluster.point.topPercent}%` }}
                aria-hidden
                title={memberNames}
              >
                <span className="position-map-stage__pin-cluster-count">+{cluster.members.length}</span>
              </div>
            );
          })}

          {effectiveSurfaceState !== 'ready' ? (
            <div className={`position-map-stage__empty position-map-stage__empty--${effectiveSurfaceState}`}>
              <p>
                {effectiveSurfaceState === 'loading'
                  ? t('position.loadingMapContext', { defaultValue: 'Loading map context...' })
                  : effectiveSurfaceState === 'error'
                    ? getOperatorError(recordError, t)
                    : mapEmptyCopy}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="position-map-stage__command">
        {effectiveSurfaceState === 'loading' ? (
          <div className="position-command-center__state-card position-command-center__state-card--loading">
            <strong>{t('position.loadingMapContext', { defaultValue: 'Loading map context...' })}</strong>
            <p>{t('position.loadingMapContextHint', { defaultValue: 'Current zone and map pin are pending from upstream.' })}</p>
          </div>
        ) : null}

        {effectiveSurfaceState === 'empty' ? (
          <div className="position-command-center__state-card">
            <strong>{resident ? t('position.zoneResolutionUnavailable', { defaultValue: 'Zone resolution unavailable.' }) : t('position.noSelection', { defaultValue: 'No resident selected' })}</strong>
            <p>{mapEmptyCopy}</p>
          </div>
        ) : null}

        {resident && effectiveSurfaceState !== 'loading' ? (
          <>
            <div className="position-map-stage__command-row">
              <span className={`position-state-pill position-state-pill--${resident.truthState}`}>
                {t(`position.truth.${resident.truthState}`, { defaultValue: resident.truthState })}
              </span>
              <span className={`position-risk-pill position-risk-pill--${resident.riskLevel}`}>
                {t(`position.risk.${resident.riskLevel}`, { defaultValue: resident.riskLevel })}
              </span>
              <span className={`position-freshness-pill position-freshness-pill--${resident.freshnessLevel}`}>
                {t(`position.freshness.${resident.freshnessLevel}`, { defaultValue: resident.freshnessLevel })}
              </span>
            </div>
            <dl className="position-map-stage__command-grid">
              <div>
                <dt>{t('position.currentLocation', { defaultValue: 'Current zone' })}</dt>
                <dd>{resident.currentZoneName ?? t('position.zoneUnknown', { defaultValue: 'Unknown zone' })}</dd>
              </div>
              <div>
                <dt>{t('position.zoneCommandLabel', { defaultValue: 'Zone command' })}</dt>
                <dd>
                  {t(zoneCommandStateLabelKey[resident.zoneCommandState], {
                    defaultValue: zoneCommandStateDefaultLabel[resident.zoneCommandState]
                  })}
                </dd>
              </div>
            </dl>
          </>
        ) : null}
      </div>

      <div className="position-map-stage__legend" role="list" aria-label={t('position.mapLegend', { defaultValue: 'Map legend' })}>
        <span className="position-map-stage__legend-item" role="listitem">
          <span className="position-map-stage__legend-dot position-map-stage__legend-dot--current" />
          {t('position.currentLocation', { defaultValue: 'Current location' })}
        </span>
      </div>
    </section>
  );
}
