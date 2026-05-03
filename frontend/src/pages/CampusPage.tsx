import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import campusMapUrl from '../assets/campus-map.png';
import { mongoUpstreamApi, type MongoUpstreamLatest } from '../services/api';
import '../styles/campus-page.css';

type CampusLocation = {
  xPercent: number;
  yPercent: number;
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
  dataSource: 'fallback' | 'live';
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

const timestampToIso = (timestamp: unknown): string | null => {
  const numeric = typeof timestamp === 'number' ? timestamp : typeof timestamp === 'string' ? Number(timestamp) : NaN;
  if (!Number.isFinite(numeric)) return null;
  const milliseconds = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  const parsed = new Date(milliseconds);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const readCampusLocation = (location: Record<string, unknown> | null): CampusLocation | null => {
  if (!location) return null;

  const x =
    readNumber(location, [
      ['current', 'xPercent'],
      ['current', 'x_percent'],
      ['xPercent'],
      ['x_percent'],
      ['current', 'x'],
      ['x']
    ]) ?? null;
  const y =
    readNumber(location, [
      ['current', 'yPercent'],
      ['current', 'y_percent'],
      ['yPercent'],
      ['y_percent'],
      ['current', 'y'],
      ['y']
    ]) ?? null;

  if (x == null || y == null) return null;
  return { xPercent: clampPercent(x), yPercent: clampPercent(y) };
};

const buildCampusDataFromLive = (latest: MongoUpstreamLatest): CampusViewData | null => {
  if (!isRecord(latest) || (latest.device_id == null && latest._id == null)) return null;

  const location = getSectionData(latest, 'location');
  const sos = getSectionData(latest, 'sos');
  const system = getSectionData(latest, 'system');
  const beaconList = getNested(location, ['beacons']);
  const beaconCount =
    readNumber(location, [
      ['beaconCount'],
      ['beacon_count'],
      ['beacons_detected'],
      ['ble_beacon_count']
    ]) ?? (Array.isArray(beaconList) ? beaconList.length : campusFallback.beaconCount);
  const signalQuality =
    readString(location, [
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
    ]) ?? campusFallback.currentZone;
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
    ]) ?? campusFallback.sosActive;
  const status =
    readString(system, [
      ['connection_status'],
      ['connectionStatus'],
      ['status']
    ]) ?? campusFallback.status;
  const sosState = sosActive ? 'SOS Active' : 'Normal';
  const lastSeen = latest.server_received_at ?? timestampToIso(latest.timestamp) ?? new Date().toISOString();

  return {
    deviceId: latest.device_id != null ? String(latest.device_id) : campusFallback.deviceId,
    status,
    currentZone,
    battery,
    sosActive,
    lastSeen,
    location: readCampusLocation(location),
    beaconCount,
    signalQuality,
    connectionStatus: 'Live Mongo upstream',
    recentEvents: [
      `Location updated near ${currentZone}`,
      `BLE beacon signal quality: ${signalQuality}`,
      `SOS state: ${sosState}`,
      'Dashboard updated from live Mongo upstream'
    ],
    dataSource: 'live'
  };
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
      try {
        const latest = (await mongoUpstreamApi.getLatest({ exclude_data_type: 'flight' })) as MongoUpstreamLatest;
        const liveData = buildCampusDataFromLive(latest);
        if (!cancelled && liveData) {
          setCampusData(liveData);
        }
      } catch {
        if (!cancelled) {
          setCampusData(createCampusFallback());
        }
      }
    };

    void loadLatest();

    return () => {
      cancelled = true;
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
