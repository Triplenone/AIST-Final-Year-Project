import { useTranslation } from 'react-i18next';

import airportImage from '../../img/FlyCare.png';
import {
  buildFlyCareRoute,
  flyCareGridIndicesToPixelPercent,
  getFlyCareZoneDisplay,
  getFlyCareZoneFromCoords,
  getFlyCareZoneLabelKey
} from '../../adapters/flycare-map';
import {
  getPositionZoneDisplayForResident,
  type PositionSurfaceState,
  type PositionResidentViewModel,
  type PositionZoneCommandState
} from '../../adapters/position-command-center';
import { POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID } from '../../adapters/position-command-center';
import type { BackendEvent, EventStatus } from '../../types/backend';
import type { FlightInfo } from './FlyCareFlightPanel';

type FlyCareAlertKind = 'sos' | 'fall';

export type FlyCareLinkedAlertEvent = {
  eventId: number;
  eventType: FlyCareAlertKind;
  eventStatus: EventStatus;
  eventTimestamp: string | null;
  deviceId: string | null;
  residentId: string | null;
};

export type FlyCareMarkerTooltipState = {
  isAlertActive: boolean;
  alertKinds: FlyCareAlertKind[];
  areaLabel: string;
  eventLabel: string;
  eventTimeLabel: string;
  handlingStatusLabel: string;
  hasUnhandledEvent: boolean;
  latestAlertTime: string | null;
  ariaLabel: string;
};

type FlyCareMapStageProps = {
  resident: PositionResidentViewModel | null;
  mapResidents: PositionResidentViewModel[];
  showAllOnMap: boolean;
  surfaceState: PositionSurfaceState;
  recordError: string | null;
  flightInfo: FlightInfo | null;
  alertEvents: readonly BackendEvent[];
};

const ALERT_FRESHNESS_MS = 300_000;

function toFlyCareAlertKind(value: unknown): FlyCareAlertKind | null {
  return value === 'sos' || value === 'fall' ? value : null;
}

export function normalizeFlyCareAlertEvents(events: readonly BackendEvent[]): FlyCareLinkedAlertEvent[] {
  return events
    .map((event) => {
      const eventType = toFlyCareAlertKind(event.event_type);
      if (!eventType) return null;
      return {
        eventId: event.event_id,
        eventType,
        eventStatus: event.event_status,
        eventTimestamp: event.event_timestamp ?? null,
        deviceId: POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[event.trigger_device_id] ?? null,
        residentId: event.related_user_id != null ? String(event.related_user_id) : null
      };
    })
    .filter((event): event is FlyCareLinkedAlertEvent => event != null);
}

export function shouldFlashFlyCareMarker(
  resident: PositionResidentViewModel,
  activeAlertDeviceIds: ReadonlySet<string>,
  activeAlertResidentIds: ReadonlySet<string>
): boolean {
  const freshMongoAlert =
    (resident.sosState || resident.fallConfirmed) &&
    resident.lastSeenAgeMs != null &&
    resident.lastSeenAgeMs <= ALERT_FRESHNESS_MS;
  return freshMongoAlert || activeAlertDeviceIds.has(resident.deviceId) || activeAlertResidentIds.has(resident.residentId);
}

function isFreshMongoAlert(resident: PositionResidentViewModel): boolean {
  return Boolean(
    (resident.sosState || resident.fallConfirmed) &&
      resident.lastSeenAgeMs != null &&
      resident.lastSeenAgeMs <= ALERT_FRESHNESS_MS
  );
}

function getMongoAlertKinds(resident: PositionResidentViewModel): FlyCareAlertKind[] {
  if (!isFreshMongoAlert(resident)) return [];
  const kinds: FlyCareAlertKind[] = [];
  if (resident.sosState) kinds.push('sos');
  if (resident.fallConfirmed) kinds.push('fall');
  return kinds;
}

function getLinkedEventsForResident(
  resident: PositionResidentViewModel,
  events: readonly FlyCareLinkedAlertEvent[]
): FlyCareLinkedAlertEvent[] {
  return events.filter(
    (event) =>
      (event.deviceId != null && event.deviceId === resident.deviceId) ||
      (event.residentId != null && event.residentId === resident.residentId)
  );
}

function getLatestEvent(events: readonly FlyCareLinkedAlertEvent[]): FlyCareLinkedAlertEvent | null {
  return [...events].sort((a, b) => {
    const aTime = a.eventTimestamp ? Date.parse(a.eventTimestamp) : Number.NEGATIVE_INFINITY;
    const bTime = b.eventTimestamp ? Date.parse(b.eventTimestamp) : Number.NEGATIVE_INFINITY;
    return bTime - aTime;
  })[0] ?? null;
}

function formatTooltipTime(value: string | null, unknownLabel: string): string {
  if (!value) return unknownLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function uniqueKinds(kinds: readonly FlyCareAlertKind[]): FlyCareAlertKind[] {
  const next: FlyCareAlertKind[] = [];
  for (const kind of kinds) {
    if (!next.includes(kind)) next.push(kind);
  }
  return next;
}

function getEventLabel(
  kinds: readonly FlyCareAlertKind[],
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const unique = uniqueKinds(kinds);
  if (unique.includes('sos') && unique.includes('fall')) {
    return t('flyCare.markerTooltip.sosFall', { defaultValue: 'SOS + Fall' });
  }
  if (unique.includes('sos')) return t('flyCare.markerTooltip.sos', { defaultValue: 'SOS' });
  if (unique.includes('fall')) return t('flyCare.markerTooltip.fall', { defaultValue: 'Fall' });
  return t('flyCare.markerTooltip.normal', { defaultValue: 'Normal' });
}

function getMarkerAreaLabel(
  resident: PositionResidentViewModel,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const namedArea = resident.currentZoneName?.trim();
  if (namedArea) return namedArea;
  if (resident.currentCoords) {
    const zoneId = getFlyCareZoneFromCoords(resident.currentCoords);
    const zoneLabelKey = getFlyCareZoneLabelKey(zoneId);
    if (zoneId || zoneLabelKey) {
      return getFlyCareZoneDisplay(zoneId, zoneLabelKey, null, t);
    }
  }
  const display = getPositionZoneDisplayForResident(resident, t, 'flycare');
  if (display && display !== t('position.zoneUnknown', { defaultValue: 'Unknown zone' })) return display;
  return t('flyCare.markerTooltip.unknownArea', { defaultValue: 'Unknown area' });
}

export function buildFlyCareMarkerTooltipState(
  resident: PositionResidentViewModel,
  linkedEvents: readonly FlyCareLinkedAlertEvent[],
  t: (key: string, options?: Record<string, unknown>) => string
): FlyCareMarkerTooltipState {
  const unhandledEvents = linkedEvents.filter((event) => event.eventStatus === 'unhandled');
  const mongoKinds = getMongoAlertKinds(resident);
  const eventKinds = unhandledEvents.map((event) => event.eventType);
  const alertKinds = uniqueKinds([...mongoKinds, ...eventKinds]);
  const isAlertActive = alertKinds.length > 0;
  const latestEvent = getLatestEvent(linkedEvents);
  const latestUnhandledEvent = getLatestEvent(unhandledEvents);
  const unknownTime = t('flyCare.markerTooltip.unknownTime', { defaultValue: 'Unknown' });
  const latestAlertTime = latestUnhandledEvent?.eventTimestamp ?? (mongoKinds.length > 0 ? resident.lastSeenAt : null);
  const eventTimeLabel = formatTooltipTime(latestAlertTime ?? latestEvent?.eventTimestamp ?? resident.lastSeenAt, unknownTime);
  const handlingStatusLabel =
    latestUnhandledEvent?.eventStatus ??
    (mongoKinds.length > 0
      ? latestEvent?.eventStatus ?? t('flyCare.markerTooltip.activeNotLinked', { defaultValue: 'Active, not linked' })
      : t('flyCare.markerTooltip.noActiveEvent', { defaultValue: 'No active event' }));
  const areaLabel = getMarkerAreaLabel(resident, t);
  const eventLabel = getEventLabel(alertKinds, t);
  const ariaLabel = `${resident.displayName}. ${t('flyCare.markerTooltip.area', { defaultValue: 'Area' })}: ${areaLabel}. ${t('flyCare.markerTooltip.event', { defaultValue: 'Event' })}: ${eventLabel}. ${t('flyCare.markerTooltip.eventTime', { defaultValue: 'Event time' })}: ${eventTimeLabel}. ${t('flyCare.markerTooltip.handlingStatus', { defaultValue: 'Handling status' })}: ${handlingStatusLabel}.`;
  return {
    isAlertActive,
    alertKinds,
    areaLabel,
    eventLabel,
    eventTimeLabel,
    handlingStatusLabel,
    hasUnhandledEvent: unhandledEvents.length > 0,
    latestAlertTime,
    ariaLabel
  };
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

function MarkerTooltip({ state }: { state: FlyCareMarkerTooltipState }) {
  const { t } = useTranslation();
  return (
    <span className="position-map-stage__pin-tooltip" role="tooltip">
      <span>
        <strong>{t('flyCare.markerTooltip.area', { defaultValue: 'Area' })}</strong>
        {state.areaLabel}
      </span>
      <span>
        <strong>{t('flyCare.markerTooltip.event', { defaultValue: 'Event' })}</strong>
        {state.eventLabel}
      </span>
      <span>
        <strong>{t('flyCare.markerTooltip.eventTime', { defaultValue: 'Event time' })}</strong>
        {state.eventTimeLabel}
      </span>
      <span>
        <strong>{t('flyCare.markerTooltip.handlingStatus', { defaultValue: 'Handling status' })}</strong>
        {state.handlingStatusLabel}
      </span>
    </span>
  );
}

export function FlyCareMapStage({
  resident,
  mapResidents,
  showAllOnMap,
  surfaceState,
  recordError,
  flightInfo,
  alertEvents
}: FlyCareMapStageProps) {
  const { t } = useTranslation();
  const normalizedAlertEvents = normalizeFlyCareAlertEvents(alertEvents);
  const activeDeviceIdSet = new Set(
    normalizedAlertEvents
      .filter((event) => event.eventStatus === 'unhandled' && event.deviceId != null)
      .map((event) => String(event.deviceId))
  );
  const activeResidentIdSet = new Set(
    normalizedAlertEvents
      .filter((event) => event.eventStatus === 'unhandled' && event.residentId != null)
      .map((event) => String(event.residentId))
  );
  const route = buildFlyCareRoute(resident?.currentCoords ?? null, flightInfo?.gate);
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
        sosState: item.sosState,
        fallConfirmed: item.fallConfirmed,
        tooltipState: buildFlyCareMarkerTooltipState(item, getLinkedEventsForResident(item, normalizedAlertEvents), t),
        hasAlert: shouldFlashFlyCareMarker(item, activeDeviceIdSet, activeResidentIdSet),
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
      members,
      hasAlert: members.some((member) => member.hasAlert),
      tooltipState: {
        isAlertActive: members.some((member) => member.tooltipState.isAlertActive),
        alertKinds: uniqueKinds(members.flatMap((member) => member.tooltipState.alertKinds)),
        areaLabel: members.map((member) => member.displayName).join(' / '),
        eventLabel: getEventLabel(members.flatMap((member) => member.tooltipState.alertKinds), t),
        eventTimeLabel:
          members.find((member) => member.tooltipState.latestAlertTime)?.tooltipState.eventTimeLabel ??
          members[0]?.tooltipState.eventTimeLabel ??
          t('flyCare.markerTooltip.unknownTime', { defaultValue: 'Unknown' }),
        handlingStatusLabel: members.some((member) => member.tooltipState.hasUnhandledEvent)
          ? 'unhandled'
          : members.find((member) => member.tooltipState.isAlertActive)?.tooltipState.handlingStatusLabel ??
            t('flyCare.markerTooltip.noActiveEvent', { defaultValue: 'No active event' }),
        hasUnhandledEvent: members.some((member) => member.tooltipState.hasUnhandledEvent),
        latestAlertTime: members.find((member) => member.tooltipState.latestAlertTime)?.tooltipState.latestAlertTime ?? null,
        ariaLabel: `${members.map((member) => member.displayName).join(' / ')}. ${t('flyCare.markerTooltip.activeAlertCount', { defaultValue: 'Active alerts' })}: ${members.filter((member) => member.tooltipState.isAlertActive).length}.`
      } satisfies FlyCareMarkerTooltipState
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

          {route ? (
            <svg className="flycare-map-stage__route-overlay" viewBox="0 0 100 100" aria-hidden>
              <polyline
                className="flycare-map-stage__route-line"
                points={route.waypoints
                  .map((waypoint) => {
                    const point = flyCareGridIndicesToPixelPercent(waypoint.point);
                    return `${point.leftPercent.toFixed(2)},${point.topPercent.toFixed(2)}`;
                  })
                  .join(' ')}
              />
              {route.waypoints.map((waypoint, index) => {
                const point = flyCareGridIndicesToPixelPercent(waypoint.point);
                return (
                  <g key={`${waypoint.id}-${index}`} className="flycare-map-stage__waypoint">
                    <circle
                      className={`flycare-map-stage__waypoint-dot flycare-map-stage__waypoint-dot--${waypoint.id}`}
                      cx={point.leftPercent}
                      cy={point.topPercent}
                      r={1.35}
                    />
                    <text
                      className="flycare-map-stage__waypoint-label"
                      x={point.leftPercent}
                      y={Math.max(4, point.topPercent - 2)}
                      textAnchor="middle"
                    >
                      {t(waypoint.labelKey, { defaultValue: waypoint.id === 'current' ? 'Current' : waypoint.id })}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : null}

          {clusteredPins.map((cluster) => {
            if (cluster.members.length <= 1) {
              const pin = cluster.members[0];
              const hasAlert = pin.hasAlert;
              const alertKind = pin.tooltipState.alertKinds.includes('sos') ? 'sos' : pin.tooltipState.alertKinds.includes('fall') ? 'fall' : 'event';
              return (
                <div
                  key={pin.residentId}
                  className={`position-map-stage__pin position-map-stage__pin--current flycare-map-stage__pin${hasAlert ? ` position-map-stage__pin--alert position-map-stage__pin--alert-${alertKind}` : ''}`}
                  style={{ left: `${pin.point.leftPercent}%`, top: `${pin.point.topPercent}%` }}
                  aria-label={pin.tooltipState.ariaLabel}
                  role="button"
                  tabIndex={0}
                >
                  <span className="position-map-stage__pin-label">{pin.displayName}</span>
                  <span className={`position-map-stage__pin-dot position-map-stage__pin-dot--${pin.truthState} ${hasAlert ? 'position-map-stage__pin-dot--alert' : 'position-map-stage__pin-dot--normal'}`} />
                  <MarkerTooltip state={pin.tooltipState} />
                </div>
              );
            }

            const memberNames = cluster.members.map((item) => item.displayName).join(' / ');
            return (
              <div
                key={cluster.key}
                className={`position-map-stage__pin position-map-stage__pin--cluster flycare-map-stage__pin ${cluster.hasAlert ? 'position-map-stage__pin--alert position-map-stage__cluster--alert' : 'position-map-stage__cluster--normal'}`}
                style={{ left: `${cluster.point.leftPercent}%`, top: `${cluster.point.topPercent}%` }}
                aria-label={`${memberNames}. ${t('flyCare.markerTooltip.activeAlertCount', { defaultValue: 'Active alerts' })}: ${cluster.members.filter((member) => member.tooltipState.isAlertActive).length}. ${t('flyCare.markerTooltip.event', { defaultValue: 'Event' })}: ${cluster.tooltipState.eventLabel}. ${t('flyCare.markerTooltip.handlingStatus', { defaultValue: 'Handling status' })}: ${cluster.tooltipState.handlingStatusLabel}.`}
                role="button"
                tabIndex={0}
                title={memberNames}
              >
                <span className="position-map-stage__pin-cluster-count">+{cluster.members.length}</span>
                <MarkerTooltip state={cluster.tooltipState} />
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
              <div>
                <dt>{t('flyCare.route.status', { defaultValue: 'Route' })}</dt>
                <dd>
                  {route
                    ? t('flyCare.route.available', { defaultValue: 'Security -> Immigration -> Gate' })
                    : flightInfo?.gate
                      ? t('flyCare.route.unavailable', { defaultValue: 'Route unavailable' })
                      : t('flyCare.route.noFlight', { defaultValue: 'No flight gate selected' })}
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
