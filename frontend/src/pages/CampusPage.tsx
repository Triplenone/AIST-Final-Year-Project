import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import campusMapUrl from '../assets/campus-map.png';
import { mongoUpstreamApi, type MongoUpstreamLatest } from '../services/api';
import '../styles/campus-page.css';

type CampusLocation = {
  xPercent: number;
  yPercent: number;
  x?: number;
  y?: number;
};

type CampusData = {
  deviceId: string;
  status: string;
  currentZone: string;
  battery: number;
  sosActive: boolean;
  lastSeen: string;
  location: CampusLocation | null;
  beaconCount: number;
  signalQuality: string;
  connectionStatus: string;
  recentEvents: string[];
};

type CampusViewData = CampusData & {
  dataSource: 'fallback' | 'live' | 'stale';
};

type MarkerStyle = CSSProperties & {
  '--marker-x'?: string;
  '--marker-y'?: string;
};

const campusFallback = {
  deviceId: 'watch-01',
  status: 'online',
  currentZone: 'Computer Lab',
  battery: 78,
  sosActive: false,
  lastSeen: new Date().toISOString(),
  location: { xPercent: 48, yPercent: 34 },
  beaconCount: 4,
  signalQuality: 'Good',
  connectionStatus: 'Demo fallback',
  recentEvents: [
    'Location updated near Computer Lab',
    'BLE beacon signal quality: Good',
    'SOS state: Normal',
    'Dashboard updated from live Mongo upstream'
  ]
} satisfies CampusData;

const protocolBadges = ['BLE Beacon', 'Wi-Fi', 'MQTT', 'Dashboard'];
const CAMPUS_DEVICE_ID = 'ESP32_0000E03948D4DB1C';
const CAMPUS_DEVICE_ALIASES = [CAMPUS_DEVICE_ID, 'ESP32_000040FA7AD4DB1C'] as const;
const CAMPUS_MAP_WIDTH = 12;
const CAMPUS_MAP_HEIGHT = 16;
const CAMPUS_POLL_INTERVAL_MS = 5000;
const STALE_AFTER_MS = 30000;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getNested = (source: unknown, path: string[]): unknown => {
  let current: unknown = source;
  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
};

const readString = (source: unknown, paths: string[][]): string | null => {
  for (const path of paths) {
    const value = getNested(source, path);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
};

const readNumber = (source: unknown, paths: string[][]): number | null => {
  for (const path of paths) {
    const value = getNested(source, path);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const readBoolean = (source: unknown, paths: string[][]): boolean | null => {
  for (const path of paths) {
    const value = getNested(source, path);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', 'yes', 'active', '1', 'confirmed'].includes(normalized)) return true;
      if (['false', 'no', 'inactive', '0', 'normal'].includes(normalized)) return false;
    }
  }
  return null;
};

const getSectionData = (
  data: MongoUpstreamLatest,
  key: 'location' | 'sos' | 'system'
): Record<string, unknown> | null => {
  const topLevel = data[key];
  if (isRecord(topLevel)) return topLevel;

  const payloadSection = isRecord(data.payload) ? data.payload[key] : undefined;
  if (isRecord(payloadSection)) return payloadSection;

  return null;
};

const createCampusFallback = (): CampusViewData => ({
  ...campusFallback,
  lastSeen: new Date().toISOString(),
  location: { ...campusFallback.location },
  recentEvents: [...campusFallback.recentEvents],
  dataSource: 'fallback'
});

const timestampToMs = (timestamp: unknown): number | null => {
  if (timestamp instanceof Date) {
    const parsedDate = timestamp.getTime();
    return Number.isNaN(parsedDate) ? null : parsedDate;
  }

  if (typeof timestamp === 'string' && timestamp.trim()) {
    const parsedDate = Date.parse(timestamp);
    if (Number.isFinite(parsedDate)) return parsedDate;
  }

  const numeric = typeof timestamp === 'number' ? timestamp : typeof timestamp === 'string' ? Number(timestamp) : NaN;
  if (!Number.isFinite(numeric)) return null;
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
};

const timestampToIso = (timestamp: unknown): string | null => {
  const milliseconds = timestampToMs(timestamp);
  if (milliseconds == null) return null;
  const parsed = new Date(milliseconds);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const inferCampusZone = (x?: number, y?: number): string => {
  if (x == null || y == null) return campusFallback.currentZone;
  if (y >= 10 && x < 4) return 'Classroom A';
  if (y >= 10 && x >= 4 && x < 8) return 'Computer Lab';
  if (y >= 10 && x >= 8) return 'Library / Study Area';
  if (y >= 5 && y < 10) return 'Central Corridor';
  if (y < 5 && x < 4) return 'Student Lounge';
  if (y < 5 && x >= 4 && x < 8) return 'Main Entrance';
  if (y < 5 && x >= 8) return 'Emergency Exit';
  return 'Campus Area';
};

const readCampusLocation = (location: Record<string, unknown> | null): CampusLocation | null => {
  if (!location) return null;

  const xPercent =
    readNumber(location, [
      ['current', 'xPercent'],
      ['current', 'x_percent'],
      ['xPercent'],
      ['x_percent']
    ]) ?? null;
  const yPercent =
    readNumber(location, [
      ['current', 'yPercent'],
      ['current', 'y_percent'],
      ['yPercent'],
      ['y_percent']
    ]) ?? null;
  const x = readNumber(location, [
      ['current', 'x'],
      ['x']
    ]) ?? null;
  const y = readNumber(location, [
      ['current', 'y'],
      ['y']
    ]) ?? null;

  if (xPercent != null && yPercent != null) {
    return {
      xPercent: clampPercent(xPercent),
      yPercent: clampPercent(yPercent),
      x,
      y
    };
  }

  if (x == null || y == null) return null;
  return {
    xPercent: clampPercent((x / CAMPUS_MAP_WIDTH) * 100),
    yPercent: clampPercent((y / CAMPUS_MAP_HEIGHT) * 100),
    x,
    y
  };
};

const buildCampusDataFromLive = (latest: MongoUpstreamLatest): CampusViewData | null => {
  if (!isRecord(latest) || (latest.device_id == null && latest._id == null)) return null;

  const location = getSectionData(latest, 'location');
  const sos = getSectionData(latest, 'sos');
  const system = getSectionData(latest, 'system');
  const campusLocation = readCampusLocation(location);
  const beaconList = getNested(location, ['beacons']);
  const beaconCount =
    readNumber(location, [
      ['current', 'beaconCount'],
      ['current', 'beacon_count'],
      ['current', 'beacons_detected'],
      ['beaconCount'],
      ['beacon_count'],
      ['beacons_detected'],
      ['ble_beacon_count']
    ]) ?? (Array.isArray(beaconList) ? beaconList.length : campusFallback.beaconCount);
  const signalQuality =
    readString(location, [
      ['current', 'quality'],
      ['current', 'signalQuality'],
      ['current', 'signal_quality'],
      ['quality'],
      ['signalQuality'],
      ['signal_quality'],
      ['rssi_quality']
    ]) ?? campusFallback.signalQuality;
  const currentZone =
    readString(location, [
      ['current', 'name'],
      ['current', 'zone'],
      ['current', 'zone_name'],
      ['current', 'location_name'],
      ['currentZone'],
      ['current_zone'],
      ['name'],
      ['zone'],
      ['zone_name'],
      ['location_name']
    ]) ?? inferCampusZone(campusLocation?.x, campusLocation?.y);
  const battery =
    readNumber(system, [
      ['battery', 'level'],
      ['battery_level'],
      ['batteryLevel'],
      ['battery']
    ]) ?? campusFallback.battery;
  const sosActive =
    readBoolean(sos, [
      ['active'],
      ['is_active'],
      ['sos_active'],
      ['pressed']
    ]) ??
    readBoolean(latest, [
      ['sos_active'],
      ['sosActive']
    ]) ?? campusFallback.sosActive;
  const status =
    readString(system, [
      ['connection_status'],
      ['connectionStatus'],
      ['status']
    ]) ?? campusFallback.status;
  const sosState = sosActive ? 'SOS Active' : 'Normal';
  const lastSeen = latest.server_received_at ?? timestampToIso(latest.timestamp) ?? new Date().toISOString();
  const lastSeenMs = timestampToMs(latest.server_received_at) ?? timestampToMs(latest.timestamp);
  const isStale = lastSeenMs == null || Date.now() - lastSeenMs > STALE_AFTER_MS;
  const connectionStatus = isStale ? 'Stale Mongo upstream' : 'Live Mongo upstream';

  return {
    deviceId: latest.device_id != null ? String(latest.device_id) : campusFallback.deviceId,
    status,
    currentZone,
    battery,
    sosActive,
    lastSeen,
    location: campusLocation,
    beaconCount,
    signalQuality,
    connectionStatus,
    recentEvents: [
      `Location updated near ${currentZone}`,
      `BLE beacon signal quality: ${signalQuality}`,
      `SOS state: ${sosState}`,
      isStale ? 'Dashboard showing stale Mongo upstream data' : 'Dashboard updated from live Mongo upstream'
    ],
    dataSource: isStale ? 'stale' : 'live'
  };
};

const fetchLatestCampusData = async (): Promise<CampusViewData | null> => {
  for (const deviceId of CAMPUS_DEVICE_ALIASES) {
    try {
      const latest = (await mongoUpstreamApi.getLatest({
        device_id: deviceId,
        exclude_data_type: 'flight'
      })) as MongoUpstreamLatest;
      const liveData = buildCampusDataFromLive(latest);
      if (liveData) return liveData;
    } catch {
      // Try the next known CampusWatch device ID before falling back to demo data.
    }
  }

  return null;
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Waiting for update';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed);
};

export function CampusPage() {
  const [campusData, setCampusData] = useState<CampusViewData>(() => createCampusFallback());

  useEffect(() => {
    let cancelled = false;

    const loadLatest = async () => {
      const liveData = await fetchLatestCampusData();
      if (!cancelled) {
        setCampusData(liveData ?? createCampusFallback());
      }
    };

    void loadLatest();
    const intervalId = window.setInterval(() => {
      void loadLatest();
    }, CAMPUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const markerStyle = useMemo<MarkerStyle | undefined>(() => {
    if (!campusData.location) return undefined;
    return {
      '--marker-x': `${campusData.location.xPercent}%`,
      '--marker-y': `${campusData.location.yPercent}%`
    };
  }, [campusData.location]);

  const statusCards = [
    { label: 'Device Status', value: campusData.status, detail: campusData.connectionStatus },
    { label: 'Current Zone', value: campusData.currentZone, detail: `${campusData.beaconCount} BLE beacons` },
    { label: 'Battery', value: `${Math.round(campusData.battery)}%`, detail: 'ESP32-S3 smartwatch' },
    {
      label: 'SOS State',
      value: campusData.sosActive ? 'SOS Active' : 'Normal',
      detail: campusData.sosActive ? 'Immediate attention required' : 'No active SOS request'
    }
  ];
  const infoRows = [
    ['Device ID', campusData.deviceId],
    ['Last Seen', formatDateTime(campusData.lastSeen)],
    ['Estimated Zone', campusData.currentZone],
    ['BLE Beacon Count', String(campusData.beaconCount)],
    ['Signal Quality', campusData.signalQuality],
    ['SOS State', campusData.sosActive ? 'Active' : 'Normal'],
    ['Battery', `${Math.round(campusData.battery)}%`],
    ['Connection Status', campusData.connectionStatus]
  ];
  const activityItems = campusData.recentEvents;

  return (
    <section className="campus-page" aria-labelledby="campus-page-title">
      <div className="campus-hero">
        <div className="campus-hero__copy">
          <p className="campus-hero__course">ITP4458 Wireless Technologies</p>
          <h2 id="campus-page-title">Smart Campus Indoor Navigation and Emergency Alert</h2>
          <p className="campus-hero__subtitle">BLE-assisted smartwatch demo for classroom and campus scenarios</p>
          <p className="campus-hero__description">
            A lightweight campus adaptation of the wearable safety and location system.
          </p>
        </div>
        <div className="campus-protocol-badges" aria-label="Wireless protocol and dashboard flow">
          {protocolBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>

      <div className="campus-summary-grid" role="list">
        {statusCards.map((card) => (
          <article key={card.label} className="campus-status-card" role="listitem">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="campus-main-grid">
        <section className="campus-map-card" aria-labelledby="campus-map-title">
          <div className="campus-section-heading">
            <div>
              <p>Campus floor plan</p>
              <h3 id="campus-map-title">Current BLE-estimated position</h3>
            </div>
            <span>Marker is rendered as frontend overlay only.</span>
          </div>

          <div className="campus-map-frame" style={markerStyle}>
            <img className="campus-map-image" src={campusMapUrl} alt="Clean campus floor-plan map" />
            {campusData.location ? (
              <span
                className="campus-live-marker"
                aria-label={`Beacon-based estimated position near ${campusData.currentZone}`}
              />
            ) : (
              <p className="campus-map-waiting">Waiting for live location data.</p>
            )}
          </div>
        </section>

        <aside className="campus-info-panel" aria-label="Campus smartwatch live information">
          <div className="campus-section-heading campus-section-heading--compact">
            <div>
              <p>Live / fallback data</p>
              <h3>Smartwatch signal</h3>
            </div>
          </div>

          <dl className="campus-info-list">
            {infoRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <section className="campus-activity-card" aria-labelledby="campus-activity-title">
        <div className="campus-section-heading campus-section-heading--compact">
          <div>
            <p>Recent activity</p>
            <h3 id="campus-activity-title">Wireless demo timeline</h3>
          </div>
        </div>
        <ul className="campus-activity-list">
          {activityItems.map((event) => (
            <li key={event}>{event}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
