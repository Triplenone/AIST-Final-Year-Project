import { useTranslation } from 'react-i18next';

import mapImage from '../../img/ElderlyCare.png';
import {
  POSITION_GRID_COLUMNS,
  POSITION_GRID_ROWS,
  POSITION_GRID_TO_ZONE,
  POSITION_ZONES,
  gridIndicesToPixelPercent,
  type PositionResidentViewModel,
  type PositionZoneId
} from '../../adapters/position-command-center';

type PositionMapStageProps = {
  resident: PositionResidentViewModel | null;
  highlightedZoneId: PositionZoneId | null;
  onHighlightZone: (zoneId: PositionZoneId | null) => void;
};

function getZoneLabel(
  zoneId: PositionZoneId | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!zoneId) {
    return t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
  }

  const zone = POSITION_ZONES.find((item) => item.id === zoneId);
  if (!zone) {
    return t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
  }

  return t(zone.labelKey, { defaultValue: zone.id });
}

export function PositionMapStage({ resident, highlightedZoneId, onHighlightZone }: PositionMapStageProps) {
  const { t } = useTranslation();
  const currentPin = resident?.currentCoords ? gridIndicesToPixelPercent(resident.currentCoords) : null;
  const targetPin = resident?.targetCoords ? gridIndicesToPixelPercent(resident.targetCoords) : null;

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
          {highlightedZoneId
            ? t('position.mapFocus', {
                defaultValue: `Focused zone: ${getZoneLabel(highlightedZoneId, t)}`
              })
            : t('position.zoneListHint', { defaultValue: 'Click the map to inspect a zone' })}
        </p>
      </header>

      <div className="position-map-stage__frame">
        <div className="position-map-stage__canvas">
          <img
            src={mapImage}
            alt={t('layout.nav.position', { defaultValue: 'Position map' })}
            className="position-map-stage__image"
          />

          <div className="position-map-stage__grid" role="img" aria-label={t('layout.nav.position', { defaultValue: 'Position map' })}>
            {Array.from({ length: POSITION_GRID_ROWS }, (_, row) =>
              Array.from({ length: POSITION_GRID_COLUMNS }, (_, col) => {
                const rawZoneId = POSITION_GRID_TO_ZONE[row]?.[col] ?? '';
                const zoneId = rawZoneId && rawZoneId.trim() !== '' ? (rawZoneId as PositionZoneId) : null;
                const isHighlighted = zoneId != null && zoneId === highlightedZoneId;
                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    className={`position-map-stage__cell${isHighlighted ? ' position-map-stage__cell--highlighted' : ''}`}
                    title={zoneId ? getZoneLabel(zoneId, t) : undefined}
                    onClick={() => onHighlightZone(zoneId)}
                  />
                );
              })
            ).flat()}
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

          {targetPin ? (
            <div
              className="position-map-stage__pin position-map-stage__pin--target"
              style={{ left: `${targetPin.leftPercent}%`, top: `${targetPin.topPercent}%` }}
              aria-hidden
            >
              <span className="position-map-stage__target-dot" />
            </div>
          ) : null}

          {!resident?.currentCoords ? (
            <div className="position-map-stage__empty">
              <p>{t('position.noDeviceData', { defaultValue: 'No device upstream data yet' })}</p>
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
          <span className="position-map-stage__legend-dot position-map-stage__legend-dot--target" />
          {t('position.targetZone', { defaultValue: 'Target zone' })}
        </span>
        <span className="position-map-stage__legend-item" role="listitem">
          <span className="position-map-stage__legend-zone">
            {highlightedZoneId ? getZoneLabel(highlightedZoneId, t) : t('position.mapTapHint', { defaultValue: 'Tap any grid cell' })}
          </span>
        </span>
      </div>
    </section>
  );
}
