import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CRS } from 'leaflet';
import { CircleMarker, ImageOverlay, MapContainer, Polygon, Tooltip, useMap } from 'react-leaflet';

import type { BackendLocation } from '../types/backend';
import { locationApi } from '../services/api';
import { useResidentLiveStore } from '../shared/resident-live-store';
import type { Resident } from '../sse/client';
import {
  getPolygonBoundsTuple,
  getPolygonCentroidTuple,
  parseGeofenceCoordinates,
  toLatLngTuple,
  type LatLng,
  type LatLngTuple
} from '../utils/geo';

import '../styles/location-map.css';

type ZoneShape = {
  location: BackendLocation;
  polygon: LatLng[];
  centroid: LatLngTuple;
  bounds: [LatLngTuple, LatLngTuple];
};

const FLOORPLAN_URL = '/indoor-nursing-home-map.png';

const ZONE_COLORS: Record<string, { stroke: string; fill: string }> = {
  'Bedroom 1': { stroke: '#3b82f6', fill: '#bfdbfe' },
  'Bedroom 2': { stroke: '#0f766e', fill: '#99f6e4' },
  Bathroom: { stroke: '#8b5cf6', fill: '#ddd6fe' },
  'Common Lounge': { stroke: '#16a34a', fill: '#bbf7d0' }
};

const ZONE_SWATCH_CLASSES: Record<string, string> = {
  'Bedroom 1': 'location-legend__swatch--bedroom1',
  'Bedroom 2': 'location-legend__swatch--bedroom2',
  Bathroom: 'location-legend__swatch--bathroom',
  'Common Lounge': 'location-legend__swatch--common'
};

const ZONE_LABEL_KEYS: Record<string, string> = {
  'Bedroom 1': 'location.zones.bedroom1',
  'Bedroom 2': 'location.zones.bedroom2',
  Bathroom: 'location.zones.bathroom',
  'Common Lounge': 'location.zones.commonLounge'
};

const ALLOWED_ZONE_NAMES = ['Bedroom 1', 'Bedroom 2', 'Bathroom', 'Common Lounge'];

const MARKER_MIN_DISTANCE = 16;
const MARKER_MAX_ATTEMPTS = 60;

const mergeBounds = (a: [LatLngTuple, LatLngTuple], b: [LatLngTuple, LatLngTuple]): [LatLngTuple, LatLngTuple] => {
  const [[aMinLat, aMinLng], [aMaxLat, aMaxLng]] = a;
  const [[bMinLat, bMinLng], [bMaxLat, bMaxLng]] = b;
  return [
    [Math.min(aMinLat, bMinLat), Math.min(aMinLng, bMinLng)],
    [Math.max(aMaxLat, bMaxLat), Math.max(aMaxLng, bMaxLng)]
  ];
};

const scaleIndoorPolygon = (polygon: LatLng[], mapSize: { width: number; height: number } | null): LatLng[] => {
  if (!mapSize) return polygon;
  const maxLat = Math.max(...polygon.map((point) => point.lat));
  const maxLng = Math.max(...polygon.map((point) => point.lng));

  let scaled = polygon;

  if (maxLat <= 1 && maxLng <= 1) {
    scaled = polygon.map((point) => ({
      lat: point.lat * mapSize.height,
      lng: point.lng * mapSize.width
    }));
  } else if (maxLat <= 100 && maxLng <= 100) {
    scaled = polygon.map((point) => ({
      lat: (point.lat / 100) * mapSize.height,
      lng: (point.lng / 100) * mapSize.width
    }));
  }

  return scaled.map((point) => ({
    lat: mapSize.height - point.lat,
    lng: point.lng
  }));
};

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const isPointInPolygon = (point: LatLng, polygon: LatLng[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const isTooClose = (point: LatLng, others: LatLng[], minDistance: number): boolean => {
  const minDistanceSq = minDistance * minDistance;
  return others.some((other) => {
    const dx = point.lng - other.lng;
    const dy = point.lat - other.lat;
    return dx * dx + dy * dy < minDistanceSq;
  });
};

const computeShapes = (
  locations: BackendLocation[],
  mapSize: { width: number; height: number } | null
): ZoneShape[] => {
  const shapes: ZoneShape[] = [];
  for (const location of locations) {
    const polygon = parseGeofenceCoordinates(location.geofence_coordinates, 'indoor');
    if (!polygon) continue;
    const scaledPolygon = scaleIndoorPolygon(polygon, mapSize);
    const centroid = getPolygonCentroidTuple(scaledPolygon);
    const bounds = getPolygonBoundsTuple(scaledPolygon);
    shapes.push({ location, polygon: scaledPolygon, centroid, bounds });
  }
  return shapes;
};

const sampleMarkerPosition = (
  zone: ZoneShape,
  rng: () => number,
  existing: LatLng[],
  minDistance: number
): LatLngTuple => {
  const [[minLat, minLng], [maxLat, maxLng]] = zone.bounds;
  const boundsWidth = Math.max(1, maxLng - minLng);
  const boundsHeight = Math.max(1, maxLat - minLat);

  for (let attempt = 0; attempt < MARKER_MAX_ATTEMPTS; attempt += 1) {
    const candidate: LatLng = {
      lat: minLat + rng() * boundsHeight,
      lng: minLng + rng() * boundsWidth
    };
    if (!isPointInPolygon(candidate, zone.polygon)) continue;
    if (isTooClose(candidate, existing, minDistance)) continue;
    return toLatLngTuple(candidate);
  }

  const jitterRadius = Math.min(boundsWidth, boundsHeight) * 0.18;
  const angle = rng() * Math.PI * 2;
  const fallback: LatLng = {
    lat: zone.centroid[0] + Math.sin(angle) * jitterRadius,
    lng: zone.centroid[1] + Math.cos(angle) * jitterRadius
  };
  return isPointInPolygon(fallback, zone.polygon) ? toLatLngTuple(fallback) : zone.centroid;
};

const statusColor = (status: Resident['status']): string => {
  switch (status) {
    case 'high':
      return '#d64545';
    case 'followUp':
      return '#f0b429';
    case 'checked_out':
      return '#64748b';
    case 'stable':
    default:
      return '#1f7a47';
  }
};

const roleStrokeColor = (roleType?: Resident['roleType']): string => {
  if (roleType === 'caregiver') {
    return '#f59e0b';
  }
  return '#1e293b';
};

const zoneColor = (zone: BackendLocation): { stroke: string; fill: string; opacity: number } => {
  const name = (zone.name ?? '').trim();
  const palette = ZONE_COLORS[name] ?? { stroke: '#64748b', fill: '#cbd5f5' };
  return { ...palette, opacity: 0.2 };
};

 

const AutoFit = ({ bounds }: { bounds: [LatLngTuple, LatLngTuple] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [18, 18] });
  }, [bounds, map]);
  return null;
};

const resolveResidentZoneName = (resident: Resident): string | null => {
  const name = resident.lastSeenLocation?.trim() || resident.room?.trim();
  return name ? name : null;
};

type LocationWorkspaceCopy = {
  eyebrow: string;
  note: string;
  syncPending: string;
  syncedLabel: string;
  summaryResidents: string;
  summaryMapped: string;
  summaryZones: string;
  summarySync: string;
  stageEyebrow: string;
  stageNote: string;
  stageZones: string;
  stageMarkers: string;
  panelEyebrow: string;
  panelLegendNote: string;
  occupancyEyebrow: string;
  occupancyNote: string;
  loadingTitle: string;
  loadingBody: string;
  errorTitle: string;
};

const getLocationWorkspaceCopy = (locale: string): LocationWorkspaceCopy => {
  const language = locale.toLowerCase();

  if (language.startsWith('zh-cn')) {
    return {
      eyebrow: '空间工作台',
      note: '把室内地图放回第一视点，图层与占用情况只保留决策所需信息。',
      syncPending: '等待首次同步',
      syncedLabel: '最近同步',
      summaryResidents: '在线住户',
      summaryMapped: '地图标记',
      summaryZones: '占用分区',
      summarySync: '数据新鲜度',
      stageEyebrow: '地图主舞台',
      stageNote: '安全区、房间和住户标记在同一张平面图上对齐展示。',
      stageZones: '监测分区',
      stageMarkers: '可见标记',
      panelEyebrow: '空间图例',
      panelLegendNote: '用最少的颜色和数量提示解释地图上的空间分层。',
      occupancyEyebrow: '占用简报',
      occupancyNote: '按分区查看当前住户分布，方便快速确认巡视重点。',
      loadingTitle: '正在同步室内地图',
      loadingBody: '正在刷新房间边界和最新住户分布。',
      errorTitle: '室内地图暂不可用',
    };
  }

  if (language.startsWith('zh-hk') || language.startsWith('zh-tw')) {
    return {
      eyebrow: '空間工作台',
      note: '把室內地圖放回第一視點，圖層與佔用情況只保留決策所需資訊。',
      syncPending: '等待首次同步',
      syncedLabel: '最近同步',
      summaryResidents: '在線住戶',
      summaryMapped: '地圖標記',
      summaryZones: '佔用分區',
      summarySync: '資料新鮮度',
      stageEyebrow: '地圖主舞台',
      stageNote: '安全區、房間和住戶標記在同一張平面圖上對齊展示。',
      stageZones: '監測分區',
      stageMarkers: '可見標記',
      panelEyebrow: '空間圖例',
      panelLegendNote: '用最少的顏色和數量提示解釋地圖上的空間分層。',
      occupancyEyebrow: '佔用簡報',
      occupancyNote: '按分區查看目前住戶分布，方便快速確認巡視重點。',
      loadingTitle: '正在同步室內地圖',
      loadingBody: '正在刷新房間邊界和最新住戶分布。',
      errorTitle: '室內地圖暫時不可用',
    };
  }

  return {
    eyebrow: 'Location workspace',
    note: 'The indoor map returns to the first visual plane, with only the context needed for quick routing decisions.',
    syncPending: 'Waiting for first sync',
    syncedLabel: 'Last synced',
    summaryResidents: 'Active residents',
    summaryMapped: 'Visible markers',
    summaryZones: 'Occupied zones',
    summarySync: 'Data freshness',
    stageEyebrow: 'Map stage',
    stageNote: 'Safe zones, rooms, and resident markers align on one operational floorplan.',
    stageZones: 'Monitored zones',
    stageMarkers: 'Visible markers',
    panelEyebrow: 'Spatial legend',
    panelLegendNote: 'Use a restrained legend to decode the floorplan without competing with the map.',
    occupancyEyebrow: 'Occupancy briefing',
    occupancyNote: 'Review resident distribution by zone before deciding where the next walk-through should start.',
    loadingTitle: 'Syncing indoor floorplan',
    loadingBody: 'Refreshing room bounds and the latest resident distribution.',
    errorTitle: 'Indoor floorplan unavailable',
  };
};

export const LocationDashboard = () => {
  const { t, i18n } = useTranslation();
  const { residents: residentMap } = useResidentLiveStore();

  const [locations, setLocations] = useState<BackendLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapSize, setMapSize] = useState<{ width: number; height: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const workspaceCopy = useMemo(() => getLocationWorkspaceCopy(locale), [locale]);

  const formatDateTime = useCallback(
    (input?: string | null) => {
      if (!input) return workspaceCopy.syncPending;
      const date = new Date(input);
      if (Number.isNaN(date.getTime())) return input;
      try {
        return date.toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return date.toISOString();
      }
    },
    [locale, workspaceCopy.syncPending]
  );

  const loadLocations = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await locationApi.list({ limit: 1000 });
      setLocations(data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to fetch locations';
      setError(msg);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadLocations({ silent: true });
    }, 15000);
    return () => {
      window.clearInterval(interval);
    };
  }, [loadLocations]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setMapSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = FLOORPLAN_URL;
  }, []);

  const zoneShapes = useMemo(() => {
    const allowed = new Set(ALLOWED_ZONE_NAMES);
    return computeShapes(locations, mapSize).filter((shape) => allowed.has((shape.location.name ?? '').trim()));
  }, [locations, mapSize]);

  const orderedZoneShapes = useMemo(() => {
    const order = ['Common Lounge', 'Bedroom 1', 'Bedroom 2', 'Bathroom'];
    return [...zoneShapes].sort((a, b) => {
      const aIndex = order.indexOf(a.location.name ?? '');
      const bIndex = order.indexOf(b.location.name ?? '');
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }, [zoneShapes]);

  const zoneByName = useMemo(() => {
    const map = new Map<string, ZoneShape>();
    zoneShapes.forEach((shape) => {
      const key = (shape.location.name ?? '').trim();
      if (key) map.set(key, shape);
    });
    return map;
  }, [zoneShapes]);

  const zoneBounds = useMemo<[LatLngTuple, LatLngTuple] | null>(() => {
    if (zoneShapes.length === 0) return null;
    return zoneShapes.map((s) => s.bounds).reduce((acc, next) => mergeBounds(acc, next));
  }, [zoneShapes]);

  const mapBounds = useMemo<[LatLngTuple, LatLngTuple] | null>(() => {
    if (!mapSize) return null;
    return [
      [0, 0],
      [mapSize.height, mapSize.width]
    ];
  }, [mapSize]);

  const residentList = useMemo<Resident[]>(() => {
    const values = Object.values(residentMap);
    return values
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [residentMap]);

  const residentMarkers = useMemo(() => {
    const zones = new Map<string, { zone: ZoneShape; residents: Resident[] }>();
    residentList.forEach((resident) => {
      const zoneName = resolveResidentZoneName(resident);
      if (!zoneName) return;
      const zone = zoneByName.get(zoneName);
      if (!zone) return;
      const bucket = zones.get(zoneName) ?? { zone, residents: [] };
      bucket.residents.push(resident);
      zones.set(zoneName, bucket);
    });

    const markers: { resident: Resident; position: LatLngTuple }[] = [];
    zones.forEach(({ zone, residents }) => {
      const placed: LatLng[] = [];
      const ordered = [...residents].sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const minDistance = ordered.length > 6 ? MARKER_MIN_DISTANCE * 0.8 : MARKER_MIN_DISTANCE;
      ordered.forEach((resident, index) => {
        const seed = hashString(`${zone.location.location_zone_id}-${resident.id}-${index}`);
        const rng = createSeededRandom(seed);
        const position = sampleMarkerPosition(zone, rng, placed, minDistance);
        placed.push({ lat: position[0], lng: position[1] });
        markers.push({ resident, position });
      });
    });

    return markers;
  }, [residentList, zoneByName]);

  const fitBounds = mapBounds ?? zoneBounds;
  const mapCenter = fitBounds
    ? ([(fitBounds[0][0] + fitBounds[1][0]) / 2, (fitBounds[0][1] + fitBounds[1][1]) / 2] as LatLngTuple)
    : ([0, 0] as LatLngTuple);

  const zoneLabel = useCallback(
    (name?: string | null) => {
      if (!name) return t('location.zones.unknown');
      const key = ZONE_LABEL_KEYS[name];
      return key ? t(key) : name;
    },
    [t]
  );

  const occupancy = useMemo(() => {
    const byZone = new Map<string, Resident[]>();
    residentList.forEach((resident) => {
      const zoneName = resolveResidentZoneName(resident);
      if (!zoneName) return;
      const current = byZone.get(zoneName) ?? [];
      current.push(resident);
      byZone.set(zoneName, current);
    });
    return orderedZoneShapes.map((shape) => {
      const name = shape.location.name ?? `#${shape.location.location_zone_id}`;
      const residents = byZone.get(name) ?? [];
      return {
        name,
        label: zoneLabel(name),
        residents
      };
    });
  }, [residentList, orderedZoneShapes, zoneLabel]);

  const activeResidentsCount = useMemo(
    () => residentList.filter((resident) => !resident.checkedOut).length,
    [residentList]
  );

  const occupiedZonesCount = useMemo(
    () => occupancy.filter((item) => item.residents.length > 0).length,
    [occupancy]
  );

  const summaryMetrics = useMemo(
    () => [
      { label: workspaceCopy.summaryResidents, value: String(activeResidentsCount), tone: 'accent' },
      { label: workspaceCopy.summaryMapped, value: String(residentMarkers.length), tone: 'neutral' },
      { label: workspaceCopy.summaryZones, value: String(occupiedZonesCount), tone: occupiedZonesCount > 0 ? 'success' : 'neutral' },
      { label: workspaceCopy.summarySync, value: formatDateTime(lastUpdated), tone: lastUpdated ? 'neutral' : 'warning' },
    ],
    [activeResidentsCount, formatDateTime, lastUpdated, occupiedZonesCount, residentMarkers.length, workspaceCopy]
  );

  return (
    <section id="location" className="section">
      <div className="location-dashboard">
        <header className="location-dashboard__header">
          <div className="location-dashboard__intro">
            <p className="location-dashboard__eyebrow">{workspaceCopy.eyebrow}</p>
            <div className="location-dashboard__title-row">
              <div>
                <h2>{t('location.title')}</h2>
                <p className="location-dashboard__note">{workspaceCopy.note}</p>
              </div>
              <div className="location-dashboard__status-group">
                <span className="location-dashboard__status-pill">{workspaceCopy.syncedLabel}</span>
                <span className="location-dashboard__status-text">{formatDateTime(lastUpdated)}</span>
              </div>
            </div>
          </div>
          <div className="location-dashboard__actions">
            <button
              type="button"
              className="auth-menu__button location-dashboard__refresh"
              onClick={() => void loadLocations()}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('location.refresh')}
            </button>
          </div>
        </header>

        <dl className="location-dashboard__summary" aria-label={workspaceCopy.occupancyEyebrow}>
          {summaryMetrics.map((metric) => (
            <div
              key={metric.label}
              className={`location-dashboard__metric location-dashboard__metric--${metric.tone}`}
            >
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>

        {error ? (
          <div className="location-dashboard__banner location-dashboard__banner--error" role="alert">
            <strong>{workspaceCopy.errorTitle}</strong>
            <p>{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="location-dashboard__banner location-dashboard__banner--loading" aria-live="polite">
            <strong>{workspaceCopy.loadingTitle}</strong>
            <p>{workspaceCopy.loadingBody}</p>
          </div>
        ) : null}

        <div className="location-dashboard__grid">
          <section className="location-dashboard__stage">
            <div className="location-dashboard__stage-header">
              <div>
                <p className="location-dashboard__stage-eyebrow">{workspaceCopy.stageEyebrow}</p>
                <h3>{t('location.title')}</h3>
                <p className="location-dashboard__stage-note">{workspaceCopy.stageNote}</p>
              </div>
              <div className="location-dashboard__stage-chips">
                <span className="location-dashboard__stage-chip">
                  {workspaceCopy.stageZones}: {orderedZoneShapes.length}
                </span>
                <span className="location-dashboard__stage-chip">
                  {workspaceCopy.stageMarkers}: {residentMarkers.length}
                </span>
              </div>
            </div>

            <div className="location-dashboard__map" aria-label={t('location.map.aria')}>
              <MapContainer
                center={mapCenter}
                zoom={0}
                minZoom={-1}
                crs={CRS.Simple}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
                dragging={false}
                boxZoom={false}
                keyboard={false}
                zoomControl={false}
                maxBounds={mapBounds ?? undefined}
              >
                {mapBounds ? <ImageOverlay url={FLOORPLAN_URL} bounds={mapBounds} /> : null}
                {fitBounds ? <AutoFit bounds={fitBounds} /> : null}

                {orderedZoneShapes.map((shape) => {
                  const style = zoneColor(shape.location);
                  return (
                    <Polygon
                      key={shape.location.location_zone_id}
                      positions={shape.polygon.map(toLatLngTuple)}
                      pathOptions={{
                        color: style.stroke,
                        weight: 2,
                        fillColor: style.fill,
                        fillOpacity: style.opacity
                      }}
                    >
                      <Tooltip sticky>
                        {zoneLabel(shape.location.name ?? `#${shape.location.location_zone_id}`)}
                      </Tooltip>
                    </Polygon>
                  );
                })}

                {residentMarkers.map(({ resident, position }) => (
                  <CircleMarker
                    key={`resident-${resident.id}`}
                    center={position}
                    radius={6}
                    pathOptions={{
                      color: roleStrokeColor(resident.roleType),
                      weight: 2,
                      fillColor: statusColor(resident.status),
                      fillOpacity: 0.8
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={0.98}>
                      <strong>{resident.name}</strong>
                      <div>
                        {t('location.map.status')}: {t(`residents.status.${resident.status}`)}
                      </div>
                      <div>
                        {t('location.map.zone')}: {zoneLabel(resolveResidentZoneName(resident))}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            <div className="location-dashboard__zone-strip">
              {occupancy.map((item) => (
                <div key={item.name} className="location-dashboard__zone-card">
                  <span className="location-dashboard__zone-name">{item.label}</span>
                  <span className="location-dashboard__zone-count">{item.residents.length}</span>
                </div>
              ))}
            </div>
          </section>

          <aside className="location-dashboard__panel">
            <section className="location-dashboard__panel-section">
              <p className="location-dashboard__panel-eyebrow">{workspaceCopy.panelEyebrow}</p>
              <p className="location-dashboard__panel-note">{workspaceCopy.panelLegendNote}</p>
              <div className="location-legend">
                {orderedZoneShapes.map((shape) => {
                  const name = shape.location.name ?? `#${shape.location.location_zone_id}`;
                  const swatchClass = ZONE_SWATCH_CLASSES[name] ?? 'location-legend__swatch--default';
                  return (
                    <div key={shape.location.location_zone_id} className="location-legend__row">
                      <span className="location-legend__pill">
                        <span className={`location-legend__swatch ${swatchClass}`} />
                        {zoneLabel(name)}
                      </span>
                      <span className="location-legend__count">
                        {occupancy.find((item) => item.name === name)?.residents.length ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="location-dashboard__panel-section">
              <p className="location-dashboard__panel-eyebrow">{workspaceCopy.occupancyEyebrow}</p>
              <p className="location-dashboard__panel-note">{workspaceCopy.occupancyNote}</p>
              <div className="location-occupancy" aria-label={t('location.occupancy.aria')}>
                {occupancy.map((item) => (
                  <div key={item.name} className="location-occupancy__item">
                    <div className="location-occupancy__header">
                      <span>{item.label}</span>
                      <span className="location-occupancy__count">{item.residents.length}</span>
                    </div>
                    {item.residents.length === 0 ? (
                      <p className="muted">{t('location.occupancy.empty')}</p>
                    ) : (
                      <div className="location-occupancy__names">
                        {item.residents.map((resident) => (
                          <span key={resident.id} className="location-occupancy__pill">
                            {resident.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
};

