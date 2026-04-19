import { useTranslation } from 'react-i18next';

import mapImage from '../../img/ElderlyCare.png';
import {
  POSITION_GRID_COLUMNS,
  POSITION_GRID_ROWS,
  POSITION_GRID_TO_ZONE,
  POSITION_ZONES,
  gridIndicesToPixelPercent,
  type PositionSurfaceState,
  type PositionResidentViewModel,
  type PositionZoneCommandState,
  type PositionZoneId
} from '../../adapters/position-command-center';

type PositionMapStageProps = {
  resident: PositionResidentViewModel | null;
  surfaceState: PositionSurfaceState;
  recordError: string | null;
  highlightedZoneId: PositionZoneId | null;
  onHighlightZone: (zoneId: PositionZoneId | null) => void;
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

function getZoneLabel(
  zoneId: PositionZoneId | null,
  zoneName: string | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const trimmed = zoneName?.trim();
  if (trimmed) return trimmed;
  if (zoneId) {
    const zone = POSITION_ZONES.find((item) => item.id === zoneId);
    if (zone) {
      return t(zone.labelKey, { defaultValue: zone.id });
    }
    return zoneId;
  }

  return t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
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

export function PositionMapStage({
  resident,
  surfaceState,
  recordError,
  highlightedZoneId,
  onHighlightZone
}: PositionMapStageProps) {
  const { t } = useTranslation();
  const currentPin = resident?.currentCoords ? gridIndicesToPixelPercent(resident.currentCoords) : null;
  const mapEmptyCopy =
    resident == null
      ? t('position.noSelectionHint', {
          defaultValue: 'Choose a resident from the rail to inspect Position context.'
        })
      : resident.hasData
        ? t('position.zoneResolutionUnavailable', {
            defaultValue: 'Zone resolution is unavailable for the current snapshot.'
          })
        : t('position.noDeviceData', { defaultValue: 'No device upstream data yet' });

  const renderedCells: JSX.Element[] = [];
  const tabbableZones = new Set<PositionZoneId>();

  for (let row = 0; row < POSITION_GRID_ROWS; row += 1) {
    for (let col = 0; col < POSITION_GRID_COLUMNS; col += 1) {
      const rawZoneId = POSITION_GRID_TO_ZONE[row]?.[col] ?? '';
      const zoneId = rawZoneId && rawZoneId.trim() !== '' ? (rawZoneId as PositionZoneId) : null;

      if (!zoneId) {
        renderedCells.push(
          <div key={`${row}-${col}`} className="position-map-stage__cell position-map-stage__cell--void" aria-hidden="true" />
        );
        continue;
      }

      const isInspected = zoneId === highlightedZoneId;
      const isCurrentZone = zoneId === resident?.currentZoneId;
      const isPrimaryTabStop = !tabbableZones.has(zoneId);

      if (isPrimaryTabStop) {
        tabbableZones.add(zoneId);
      }

      renderedCells.push(
        <button
          key={`${row}-${col}`}
          type="button"
          className={`position-map-stage__cell${isCurrentZone ? ' position-map-stage__cell--current' : ''}${isInspected ? ' position-map-stage__cell--inspected' : ''}`}
          aria-label={t('position.inspectZone', {
            defaultValue: `Inspect ${getZoneLabel(zoneId, null, t)} zone`
          })}
          aria-pressed={isInspected}
          tabIndex={isPrimaryTabStop ? 0 : -1}
          title={getZoneLabel(zoneId, null, t)}
          onClick={() => onHighlightZone(zoneId)}
        />
      );
    }
  }

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
          {surfaceState === 'loading'
            ? t('position.loadingMapContext', { defaultValue: 'Loading map context...' })
            : highlightedZoneId
              ? t('position.mapFocus', {
                  defaultValue: `Focused zone: ${getZoneLabel(highlightedZoneId, null, t)}`
                })
              : t('position.zoneListHint', { defaultValue: 'Click the map to inspect a zone' })}
        </p>
      </header>

      {surfaceState === 'error' ? (
        <p className="position-command-center__error">{getOperatorError(recordError, t)}</p>
      ) : null}

      <div className="position-map-stage__command">
        {surfaceState === 'loading' ? (
          <div className="position-command-center__state-card position-command-center__state-card--loading">
            <strong>{t('position.loadingMapContext', { defaultValue: 'Loading map context...' })}</strong>
            <p>{t('position.loadingMapContextHint', { defaultValue: 'Current zone and map pin are pending from upstream.' })}</p>
          </div>
        ) : null}

        {surfaceState === 'empty' ? (
          <div className="position-command-center__state-card">
            <strong>{resident ? t('position.zoneResolutionUnavailable', { defaultValue: 'Zone resolution unavailable.' }) : t('position.noSelection', { defaultValue: 'No resident selected' })}</strong>
            <p>{mapEmptyCopy}</p>
          </div>
        ) : null}

        {resident && surfaceState !== 'loading' ? (
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
                <dd>{getZoneLabel(resident.currentZoneId ?? null, resident.currentZoneName ?? null, t)}</dd>
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

      <div className="position-map-stage__frame">
        <div className="position-map-stage__canvas">
          <img
            src={mapImage}
            alt={t('layout.nav.position', { defaultValue: 'Position map' })}
            className="position-map-stage__image"
          />

          <div className="position-map-stage__grid" role="img" aria-label={t('layout.nav.position', { defaultValue: 'Position map' })}>
            {renderedCells}
          </div>

          {currentPin ? (
            <div
              className="position-map-stage__pin position-map-stage__pin--current"
              style={{ left: `${currentPin.leftPercent}%`, top: `${currentPin.topPercent}%` }}
              aria-hidden
            >
              <span className="position-map-stage__pin-label">{resident?.displayName ?? 'Resident'}</span>
              <span className="position-map-stage__pin-dot" />
            </div>
          ) : null}

          {surfaceState !== 'ready' ? (
            <div className={`position-map-stage__empty position-map-stage__empty--${surfaceState}`}>
              <p>
                {surfaceState === 'loading'
                  ? t('position.loadingMapContext', { defaultValue: 'Loading map context...' })
                  : surfaceState === 'error'
                    ? getOperatorError(recordError, t)
                    : mapEmptyCopy}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="position-map-stage__legend" role="list" aria-label={t('position.mapLegend', { defaultValue: 'Map legend' })}>
        <span className="position-map-stage__legend-item" role="listitem">
          <span className="position-map-stage__legend-dot position-map-stage__legend-dot--current" />
          {t('position.currentLocation', { defaultValue: 'Current location' })}
        </span>
        <span className="position-map-stage__legend-item" role="listitem">
          <span className="position-map-stage__legend-zone">
            {highlightedZoneId ? getZoneLabel(highlightedZoneId, null, t) : t('position.mapTapHint', { defaultValue: 'Tap any grid cell' })}
          </span>
        </span>
      </div>
    </section>
  );
}
