import { useTranslation } from 'react-i18next';

import airportImage from '../../img/FlyCare.png';
import { flyCareGridIndicesToPixelPercent } from '../../adapters/flycare-map';
import {
  getPositionZoneDisplayForResident,
  type PositionSurfaceState,
  type PositionResidentViewModel,
  type PositionZoneCommandState
} from '../../adapters/position-command-center';

type FlyCareMapStageProps = {
  resident: PositionResidentViewModel | null;
  mapResidents: PositionResidentViewModel[];
  showAllOnMap: boolean;
  surfaceState: PositionSurfaceState;
  recordError: string | null;
};

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

export function FlyCareMapStage({
  resident,
  mapResidents,
  showAllOnMap,
  surfaceState,
  recordError
}: FlyCareMapStageProps) {
  const { t } = useTranslation();
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
        x: item.currentCoords.x,
        y: item.currentCoords.y,
        point: flyCareGridIndicesToPixelPercent(item.currentCoords)
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
    <section className="position-command-center__surface position-map-stage flycare-map-stage">
      <header className="position-map-stage__header">
        <div>
          <p className="position-command-center__eyebrow">
            {t('flyCare.mapStageEyebrow', { defaultValue: 'Airport map' })}
          </p>
        </div>
        <p className="position-command-center__muted">
          {effectiveSurfaceState === 'loading'
            ? t('position.loadingMapContext', { defaultValue: 'Loading map context...' })
            : showAllOnMap
              ? t('position.viewAllOnMap', { defaultValue: '查看所有人' })
              : t('position.currentLocation', { defaultValue: 'Current location' })}
        </p>
      </header>

      {effectiveSurfaceState === 'error' ? (
        <p className="position-command-center__error">{getOperatorError(recordError, t)}</p>
      ) : null}

      <div className="position-map-stage__frame">
        <div className="position-map-stage__canvas">
          <img
            src={airportImage}
            alt={t('flyCare.mapAlt', { defaultValue: 'Airport map' })}
            className="position-map-stage__image"
          />

          {clusteredPins.map((cluster) => {
            if (cluster.members.length <= 1) {
              const pin = cluster.members[0];
              return (
                <div
                  key={pin.residentId}
                  className="position-map-stage__pin position-map-stage__pin--current"
                  style={{ left: `${pin.point.leftPercent}%`, top: `${pin.point.topPercent}%` }}
                  aria-hidden
                >
                  <span className="position-map-stage__pin-label">{pin.displayName}</span>
                  <span className={`position-map-stage__pin-dot position-map-stage__pin-dot--${pin.truthState}`} />
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
                <dd>{getPositionZoneDisplayForResident(resident, t, 'flycare')}</dd>
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
