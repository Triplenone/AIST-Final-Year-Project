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

type CampusBeacon = {
  mac: string;
  name: string;
  zone: string;
  rssi: number | null;
  x?: number;
  y?: number;
  xPercent?: number;
  yPercent?: number;
  detected?: boolean;
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
  dataAgeLabel: string;
  beacons: CampusBeacon[];
  beaconDetailsMissing: boolean;
  nearestBeacon: CampusBeacon | null;
  recentEvents: string[];
};

type CampusViewData = CampusData & {
  dataSource: 'fallback' | 'live' | 'stale';
  lastSeenMs: number | null;
};

type CampusMongoCandidate = MongoUpstreamLatest & {
  data_type?: string;
  mysql_device_id?: string | number;
  raw_payload?: Record<string, unknown>;
};

type MongoUpstreamListResponse = {
  items?: unknown[];
};

type MarkerStyle = CSSProperties & {
  '--marker-x'?: string;
  '--marker-y'?: string;
};

type BeaconMarkerStyle = CSSProperties & {
  '--beacon-x'?: string;
  '--beacon-y'?: string;
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
  dataAgeLabel: 'Demo fallback data',
  beacons: [],
  beaconDetailsMissing: false,
  nearestBeacon: null,
  recentEvents: [
    'Location updated near Computer Lab',
    'BLE beacon signal quality: Good',
    'SOS state: Normal',
    'Dashboard updated from live Mongo upstream'
  ]
} satisfies CampusData;

const protocolBadges = ['BLE Beacon', 'Wi-Fi', 'MQTT', 'Dashboard'];
const CAMPUS_PRIMARY_DEVICE_ID = 'ESP32_0000E03948D4DB1C';
const CAMPUS_DEVICE_IDS = [CAMPUS_PRIMARY_DEVICE_ID, 'ESP32_000040FA7AD4DB1C'] as const;
const CAMPUS_MAP_WIDTH = 12;
const CAMPUS_MAP_HEIGHT = 16;
const CAMPUS_POLL_INTERVAL_MS = 5000;
const STALE_AFTER_MS = 30000;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const CAMPUS_BEACON_REFERENCES: Array<CampusBeacon & Required<Pick<CampusBeacon, 'x' | 'y' | 'xPercent' | 'yPercent'>>> = [
  {
    mac: '20:a7:16:61:02:42',
    name: 'Campus Beacon A',
    zone: 'Classroom A',
    x: 2,
    y: 14,
    xPercent: clampPercent((2 / CAMPUS_MAP_WIDTH) * 100),
    yPercent: clampPercent((14 / CAMPUS_MAP_HEIGHT) * 100),
    rssi: null
  },
  {
    mac: '20:a7:16:61:02:2a',
    name: 'Campus Beacon B',
    zone: 'Library / Study Area',
    x: 10,
    y: 14,
    xPercent: clampPercent((10 / CAMPUS_MAP_WIDTH) * 100),
    yPercent: clampPercent((14 / CAMPUS_MAP_HEIGHT) * 100),
    rssi: null
  },
  {
    mac: '20:a7:16:61:02:03',
    name: 'Campus Beacon C',
    zone: 'Main Entrance',
    x: 6,
    y: 2,
    xPercent: clampPercent((6 / CAMPUS_MAP_WIDTH) * 100),
    yPercent: clampPercent((2 / CAMPUS_MAP_HEIGHT) * 100),
    rssi: null
  }
];

const normalizeMac = (mac: string | null | undefined) => mac?.trim().toLowerCase() ?? '';

const CAMPUS_BEACON_BY_MAC = new Map(CAMPUS_BEACON_REFERENCES.map((beacon) => [normalizeMac(beacon.mac), beacon]));

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

const readArray = (source: unknown, paths: string[][]): unknown[] | null => {
  for (const path of paths) {
    const value = getNested(source, path);
    if (Array.isArray(value)) return value;
  }
  return null;
};

const getPayloadRoot = (data: CampusMongoCandidate): Record<string, unknown> => {
  let root: Record<string, unknown> = data;
  const firstPayload = isRecord(data.payload)
    ? data.payload
    : isRecord(data.raw_payload)
      ? data.raw_payload
      : null;

  if (firstPayload) root = firstPayload;

  for (let i = 0; i < 2; i++) {
    const nested = root.payload;
    if (!isRecord(nested)) break;
    root = {
      ...root,
      ...nested,
      payload: nested.payload
    };
  }

  return root;
};

const getSectionData = (
  data: CampusMongoCandidate,
  key: 'location' | 'sos' | 'system'
): Record<string, unknown> | null => {
  const payload = getPayloadRoot(data);
  const payloadSection = payload[key];
  if (isRecord(payloadSection)) return payloadSection;

  const topLevel = data[key];
  if (isRecord(topLevel)) return topLevel;

  return null;
};

const createCampusFallback = (): CampusViewData => ({
  ...campusFallback,
  lastSeen: new Date().toISOString(),
  location: { ...campusFallback.location },
  beacons: [],
  nearestBeacon: null,
  recentEvents: [...campusFallback.recentEvents],
  dataSource: 'fallback',
  lastSeenMs: null
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

const formatDataAge = (lastSeenMs: number | null, dataSource: CampusViewData['dataSource']): string => {
  if (dataSource === 'fallback') return 'Demo fallback data';
  if (lastSeenMs == null) return 'Timestamp unavailable';

  const seconds = Math.max(0, Math.round((Date.now() - lastSeenMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
};

const inferCampusZone = (x?: number, y?: number): string => {
  if (x == null || y == null) return 'Campus Area';
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
      ['current', 'x']
    ]) ?? null;
  const y = readNumber(location, [
      ['current', 'y']
    ]) ?? null;
  const mapWidth =
    readNumber(location, [
      ['current', 'map_width'],
      ['current', 'mapWidth']
    ]) ?? CAMPUS_MAP_WIDTH;
  const mapHeight =
    readNumber(location, [
      ['current', 'map_height'],
      ['current', 'mapHeight']
    ]) ?? CAMPUS_MAP_HEIGHT;

  if (xPercent != null && yPercent != null) {
    return {
      xPercent: clampPercent(xPercent),
      yPercent: clampPercent(yPercent),
      x,
      y
    };
  }

  if (x == null || y == null || mapWidth <= 0 || mapHeight <= 0) return null;
  return {
    xPercent: clampPercent((x / mapWidth) * 100),
    yPercent: clampPercent((y / mapHeight) * 100),
    x,
    y
  };
};

const readBeaconDetails = (location: Record<string, unknown> | null): CampusBeacon[] => {
  const beacons = readArray(location, [['beacons']]);
  if (!beacons) return [];

  return beacons.flatMap((beacon): CampusBeacon[] => {
    if (!isRecord(beacon)) return [];
    const detected = readBoolean(beacon, [['detected']]);
    if (detected === false) return [];

    const mac = readString(beacon, [['mac'], ['address']]) ?? 'Unknown MAC';
    const reference = CAMPUS_BEACON_BY_MAC.get(normalizeMac(mac));
    const name = readString(beacon, [['name'], ['label']]) ?? reference?.name ?? 'BLE beacon';
    const zone = readString(beacon, [['zone'], ['zone_name'], ['location_name']]) ?? reference?.zone ?? 'Campus Area';
    const rssi = readNumber(beacon, [['rssi'], ['RSSI']]);
    const x = readNumber(beacon, [['x']]) ?? reference?.x;
    const y = readNumber(beacon, [['y']]) ?? reference?.y;
    const xPercent =
      readNumber(beacon, [['xPercent'], ['x_percent']]) ??
      (x != null ? clampPercent((x / CAMPUS_MAP_WIDTH) * 100) : reference?.xPercent);
    const yPercent =
      readNumber(beacon, [['yPercent'], ['y_percent']]) ??
      (y != null ? clampPercent((y / CAMPUS_MAP_HEIGHT) * 100) : reference?.yPercent);

    return [{ mac, name, zone, rssi, x, y, xPercent, yPercent, detected: true }];
  });
};

const readNearestBeacon = (
  location: Record<string, unknown> | null,
  beacons: CampusBeacon[]
): CampusBeacon | null => {
  const nearest = getNested(location, ['nearest_beacon']) ?? getNested(location, ['nearestBeacon']);
  if (isRecord(nearest)) {
    const mac = readString(nearest, [['mac'], ['address']]) ?? 'Unknown MAC';
    const reference = CAMPUS_BEACON_BY_MAC.get(normalizeMac(mac));
    const x = readNumber(nearest, [['x']]) ?? reference?.x;
    const y = readNumber(nearest, [['y']]) ?? reference?.y;
    return {
      mac,
      name: readString(nearest, [['name'], ['label']]) ?? reference?.name ?? 'Nearest beacon',
      zone: readString(nearest, [['zone'], ['zone_name'], ['location_name']]) ?? reference?.zone ?? 'Campus Area',
      rssi: readNumber(nearest, [['rssi'], ['RSSI']]),
      x,
      y,
      xPercent:
        readNumber(nearest, [['xPercent'], ['x_percent']]) ??
        (x != null ? clampPercent((x / CAMPUS_MAP_WIDTH) * 100) : reference?.xPercent),
      yPercent:
        readNumber(nearest, [['yPercent'], ['y_percent']]) ??
        (y != null ? clampPercent((y / CAMPUS_MAP_HEIGHT) * 100) : reference?.yPercent),
      detected: true
    };
  }

  if (!beacons.length) return null;
  return beacons.reduce((best, beacon) => {
    if (best.rssi == null) return beacon;
    if (beacon.rssi == null) return best;
    return beacon.rssi > best.rssi ? beacon : best;
  }, beacons[0]);
};

const getCandidateDeviceId = (latest: CampusMongoCandidate): string | null =>
  readString(getPayloadRoot(latest), [['device_id']]) ??
  readString(latest, [
    ['device_id'],
    ['payload', 'device_id'],
    ['payload', 'payload', 'device_id'],
    ['raw_payload', 'device_id']
  ]);

const getCandidateDataType = (latest: CampusMongoCandidate): string | null =>
  readString(getPayloadRoot(latest), [['data_type']]) ??
  readString(latest, [
    ['data_type'],
    ['payload', 'data_type'],
    ['payload', 'payload', 'data_type'],
    ['raw_payload', 'data_type']
  ]);

const isCampusDeviceId = (deviceId: string | null): deviceId is (typeof CAMPUS_DEVICE_IDS)[number] =>
  deviceId != null && CAMPUS_DEVICE_IDS.includes(deviceId as (typeof CAMPUS_DEVICE_IDS)[number]);

const buildCampusDataFromLive = (latest: CampusMongoCandidate): CampusViewData | null => {
  if (!isRecord(latest) || (latest.device_id == null && latest._id == null)) return null;

  const deviceId = getCandidateDeviceId(latest);
  if (!isCampusDeviceId(deviceId) || getCandidateDataType(latest) === 'flight') return null;

  const location = getSectionData(latest, 'location');
  const sos = getSectionData(latest, 'sos');
  const system = getSectionData(latest, 'system');
  const campusLocation = readCampusLocation(location);
  const beacons = readBeaconDetails(location);
  const nearestBeacon = readNearestBeacon(location, beacons);
  const beaconList = readArray(location, [['beacons']]);
  const beaconCount =
    readNumber(location, [
      ['current', 'beaconCount'],
      ['current', 'beacon_count'],
      ['current', 'beacons_detected'],
      ['beaconCount'],
      ['beacon_count'],
      ['beacons_detected'],
      ['ble_beacon_count']
    ]) ?? (beaconList ? beacons.length : 0);
  const signalQuality =
    readString(location, [
      ['current', 'quality'],
      ['current', 'signalQuality'],
      ['current', 'signal_quality'],
      ['quality'],
      ['signalQuality'],
      ['signal_quality'],
      ['rssi_quality']
    ]) ?? 'Unknown';
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
    ]) ??
    nearestBeacon?.zone ??
    inferCampusZone(campusLocation?.x, campusLocation?.y);
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
  if (!campusLocation && beaconCount <= 0 && !beacons.length && !sosActive) return null;

  const lastSeen = latest.server_received_at ?? timestampToIso(latest.timestamp) ?? new Date().toISOString();
  const lastSeenMs = timestampToMs(latest.server_received_at) ?? timestampToMs(latest.timestamp);
  const isStale = lastSeenMs == null || Date.now() - lastSeenMs > STALE_AFTER_MS;
  const connectionStatus = isStale ? 'Stale Mongo upstream' : 'Live Mongo upstream';
  const dataSource = isStale ? 'stale' : 'live';
  const nearestBeaconEvent = nearestBeacon
    ? `Nearest beacon: ${nearestBeacon.name} ${nearestBeacon.zone} RSSI=${nearestBeacon.rssi ?? 'unknown'}`
    : 'Nearest beacon: not provided by payload';

  return {
    deviceId,
    status,
    currentZone,
    battery,
    sosActive,
    lastSeen,
    location: campusLocation,
    beaconCount,
    signalQuality,
    connectionStatus,
    dataAgeLabel: formatDataAge(lastSeenMs, dataSource),
    beacons,
    beaconDetailsMissing: beaconCount > 0 && !beacons.length,
    nearestBeacon,
    recentEvents: [
      `Location updated near ${currentZone}`,
      `Detected ${beaconCount} BLE beacon${beaconCount === 1 ? '' : 's'}`,
      nearestBeaconEvent,
      `SOS state: ${sosState}`,
      `Dashboard updated from ${connectionStatus}`
    ],
    dataSource,
    lastSeenMs
  };
};

const fetchLatestCampusData = async (): Promise<CampusViewData | null> => {
  const settledGroups = await Promise.all(
    CAMPUS_DEVICE_IDS.map(async (deviceId) => {
      const [latestResult, listResult] = await Promise.allSettled([
        mongoUpstreamApi.getLatest({
          device_id: deviceId,
          exclude_data_type: 'flight'
        }) as Promise<CampusMongoCandidate>,
        mongoUpstreamApi.list({
          device_id: deviceId,
          data_type: 'status_update',
          page_size: 25
        }) as Promise<MongoUpstreamListResponse>
      ]);

      const candidates: CampusMongoCandidate[] = [];
      if (latestResult.status === 'fulfilled') candidates.push(latestResult.value);
      if (listResult.status === 'fulfilled' && Array.isArray(listResult.value.items)) {
        for (const item of listResult.value.items) {
          if (isRecord(item)) candidates.push(item as CampusMongoCandidate);
        }
      }
      return candidates;
    })
  );

  const deduped = new Map<string, CampusViewData>();
  for (const candidate of settledGroups.flat()) {
    const liveData = buildCampusDataFromLive(candidate);
    if (!liveData) continue;
    const key = `${liveData.deviceId}:${candidate._id ?? liveData.lastSeen}`;
    const previous = deduped.get(key);
    if (!previous || (liveData.lastSeenMs ?? 0) > (previous.lastSeenMs ?? 0)) {
      deduped.set(key, liveData);
    }
  }

  const candidates = [...deduped.values()].sort((a, b) => (b.lastSeenMs ?? 0) - (a.lastSeenMs ?? 0));
  const hasBeaconSignal = (candidate: CampusViewData) =>
    candidate.beaconCount > 0 || candidate.beacons.length > 0 || candidate.nearestBeacon != null;
  const freshPrimaryWithBeacon = candidates.find(
    (candidate) =>
      candidate.deviceId === CAMPUS_PRIMARY_DEVICE_ID && candidate.dataSource === 'live' && hasBeaconSignal(candidate)
  );
  const freshPrimary = candidates.find(
    (candidate) => candidate.deviceId === CAMPUS_PRIMARY_DEVICE_ID && candidate.dataSource === 'live'
  );
  const freshestWithBeacon = candidates.find(
    (candidate) => candidate.dataSource === 'live' && hasBeaconSignal(candidate)
  );
  const selected = freshPrimaryWithBeacon ?? freshPrimary ?? freshestWithBeacon ?? candidates[0] ?? null;

  if (import.meta.env.DEV) {
    console.debug('[campus] upstream selection', {
      selectedDeviceId: selected?.deviceId ?? null,
      serverReceivedAt: selected?.lastSeen ?? null,
      dataAge: selected?.dataAgeLabel ?? null,
      payloadRootKeys: selected ? Object.keys(getPayloadRoot(settledGroups.flat()[0] ?? {})) : [],
      beaconCount: selected?.beaconCount ?? null,
      beaconArrayLength: selected?.beacons.length ?? null,
      location: selected?.location ?? null
    });
  }

  return selected;
};

const getBeaconShortLabel = (beacon: CampusBeacon, index: number) => {
  const match = beacon.name.match(/Beacon\s+([A-Z0-9]+)/i);
  return match?.[1] ?? String(index + 1);
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
  const beaconMarkers = useMemo(() => {
    const liveByMac = new Map(campusData.beacons.map((beacon) => [normalizeMac(beacon.mac), beacon]));
    const nearestMac = normalizeMac(campusData.nearestBeacon?.mac);
    const markers: CampusBeacon[] = CAMPUS_BEACON_REFERENCES.map((reference) => {
      const live = liveByMac.get(normalizeMac(reference.mac));
      const detected = Boolean(live) || nearestMac === normalizeMac(reference.mac);
      return {
        ...reference,
        ...live,
        x: reference.x,
        y: reference.y,
        xPercent: reference.xPercent,
        yPercent: reference.yPercent,
        detected
      };
    });

    for (const beacon of campusData.beacons) {
      if (CAMPUS_BEACON_BY_MAC.has(normalizeMac(beacon.mac))) continue;
      if (beacon.xPercent == null || beacon.yPercent == null) continue;
      markers.push(beacon);
    }

    return markers;
  }, [campusData.beacons, campusData.nearestBeacon?.mac]);

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
    ['Data Age', campusData.dataAgeLabel],
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
            <span>Watch and beacon markers are rendered as frontend overlays only.</span>
          </div>

          <div className="campus-map-frame" style={markerStyle}>
            <img className="campus-map-image" src={campusMapUrl} alt="Clean campus floor-plan map" />
            {beaconMarkers.map((beacon, index) => {
              const style: BeaconMarkerStyle = {
                '--beacon-x': `${beacon.xPercent}%`,
                '--beacon-y': `${beacon.yPercent}%`
              };
              const label = getBeaconShortLabel(beacon, index);
              return (
                <span
                  key={beacon.mac}
                  className={`campus-beacon-marker${beacon.detected ? ' campus-beacon-marker--detected' : ''}`}
                  style={style}
                  title={`${beacon.name} - ${beacon.zone} - ${beacon.mac}${
                    beacon.rssi != null ? ` - RSSI=${beacon.rssi}` : ''
                  }`}
                  aria-label={`${beacon.detected ? 'Detected' : 'Configured'} BLE beacon ${beacon.name} at ${
                    beacon.zone
                  }`}
                >
                  {label}
                </span>
              );
            })}
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

          <div className="campus-section-heading campus-section-heading--compact">
            <div>
              <p>BLE Beacon Positions</p>
              <h3>Beacon signals</h3>
            </div>
          </div>

          <ul className="campus-activity-list">
            {campusData.beacons.length > 0 ? (
              campusData.beacons.map((beacon) => (
                <li key={`${beacon.mac}-${beacon.rssi ?? 'unknown'}`}>
                  <strong>{beacon.name}</strong> - {beacon.mac} - {beacon.zone} - RSSI=
                  {beacon.rssi ?? 'unknown'}
                </li>
              ))
            ) : (
              <>
                <li>
                  {campusData.beaconDetailsMissing
                    ? `Detected ${campusData.beaconCount} beacon${campusData.beaconCount === 1 ? '' : 's'}, but beacon details were not included in the payload.`
                    : 'Configured beacon reference positions are shown on the map.'}
                </li>
                {CAMPUS_BEACON_REFERENCES.map((beacon) => (
                  <li key={beacon.mac}>
                    <strong>{beacon.name}</strong> - {beacon.mac} - {beacon.zone} - reference x={beacon.x}, y=
                    {beacon.y}
                  </li>
                ))}
              </>
            )}
          </ul>
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
