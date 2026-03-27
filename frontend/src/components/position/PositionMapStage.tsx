import { useTranslation } from 'react-i18next';

import mapImage from '../../img/ElderlyCare.png';
import {
  POSITION_GRID_COLUMNS,
  POSITION_GRID_ROWS,
  POSITION_GRID_TO_ZONE,
  POSITION_ZONES,
  gridIndicesToPixelPercent,
  type PositionResidentViewModel,
  type PositionZoneCommandState,
  type PositionZoneId
} from '../../adapters/position-command-center';

type PositionMapStageProps = {
  resident: PositionResidentViewModel | null;
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
  if (zoneId) {
    const zone = POSITION_ZONES.find((item) => item.id === zoneId);
    if (zone) {
      return t(zone.labelKey, { defaultValue: zoneName ?? zone.id });
    }
  }

  if (zoneName) {
    return zoneName;
  }

  return t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
}

export function PositionMapStage({
  resident,
  highlightedZoneId,
  onHighlightZone
}: PositionMapStageProps) {
  const { t } = useTranslation();
  const currentPin = resident?.currentCoords ? gridIndicesToPixelPercent(resident.currentCoords) : null;
  const targetPin =
    resident?.targetCoords &&
    (resident.zoneCommandState !== 'target-reached' || !resident.currentCoords)
      ? gridIndicesToPixelPercent(resident.targetCoords)
      : null;

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
                defaultValue: `Focused zone: ${getZoneLabel(highlightedZoneId, null, t)}`
              })
            : t('position.zoneListHint', { defaultValue: 'Click the map to inspect a zone' })}
        </p>
      </header>

      <div className="position-map-stage__command">
        <div className="position-map-stage__command-row">
          <span className={`position-state-pill position-state-pill--${resident?.truthState ?? 'offline'}`}>
            {resident
              ? t(`position.truth.${resident.truthState}`, { defaultValue: resident.truthState })
              : t('position.truth.offline', { defaultValue: 'Offline' })}
          </span>
          <span className={`position-risk-pill position-risk-pill--${resident?.riskLevel ?? 'stable'}`}>
            {resident
              ? t(`position.risk.${resident.riskLevel}`, { defaultValue: resident.riskLevel })
              : t('position.risk.stable', { defaultValue: 'Stable' })}
          </span>
          <span className={`position-freshness-pill position-freshness-pill--${resident?.freshnessLevel ?? 'stale'}`}>
            {resident
              ? t(`position.freshness.${resident.freshnessLevel}`, { defaultValue: resident.freshnessLevel })
              : t('position.freshness.stale', { defaultValue: 'Stale' })}
          </span>
        </div>
        <dl className="position-map-stage__command-grid">
          <div>
            <dt>{t('position.currentLocation', { defaultValue: 'Current zone' })}</dt>
            <dd>{getZoneLabel(resident?.currentZoneId ?? null, resident?.currentZoneName ?? null, t)}</dd>
          </div>
          <div>
            <dt>{t('position.targetZone', { defaultValue: 'Target zone' })}</dt>
            <dd>{getZoneLabel(resident?.targetZoneId ?? null, resident?.targetZoneName ?? null, t)}</dd>
          </div>
          <div>
            <dt>{t('position.zoneCommandLabel', { defaultValue: 'Zone command' })}</dt>
            <dd>
              {t(zoneCommandStateLabelKey[resident?.zoneCommandState ?? 'zone-unknown'], {
                defaultValue: zoneCommandStateDefaultLabel[resident?.zoneCommandState ?? 'zone-unknown']
              })}
            </dd>
          </div>
        </dl>
      </div>

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
                const isInspected = zoneId != null && zoneId === highlightedZoneId;
                const isCurrentZone = zoneId != null && zoneId === resident?.currentZoneId;
                const isTargetZone =
                  zoneId != null &&
                  zoneId === resident?.targetZoneId &&
                  resident?.zoneCommandState !== 'target-reached';

                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    className={`position-map-stage__cell${isCurrentZone ? ' position-map-stage__cell--current' : ''}${isTargetZone ? ' position-map-stage__cell--target' : ''}${isInspected ? ' position-map-stage__cell--inspected' : ''}`}
                    title={zoneId ? getZoneLabel(zoneId, null, t) : undefined}
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
              <span className="position-map-stage__pin-label position-map-stage__pin-label--target">
                {t('position.targetZone', { defaultValue: 'Target' })}
              </span>
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
            {highlightedZoneId ? getZoneLabel(highlightedZoneId, null, t) : t('position.mapTapHint', { defaultValue: 'Tap any grid cell' })}
          </span>
        </span>
      </div>
    </section>
  );
}
