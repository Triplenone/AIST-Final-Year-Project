import {
  deviceApi,
  locationApi,
  mongoUpstreamApi,
  type MongoLatestValidLocationResponse,
  type MongoUpstreamLatest
} from '../services/api';
import type { BackendDevice, BackendLocation } from '../types/backend';

export type PositionTruthState = 'online' | 'stale' | 'offline';
export type PositionFreshnessLevel = 'live' | 'delayed' | 'stale';
export type PositionRiskLevel = 'stable' | 'warning' | 'critical';
export type PositionPriorityBand = 'critical' | 'warning' | 'stale-only' | 'stable';
export type PositionPriorityReasonCode =
  | 'critical-sos'
  | 'critical-fall'
  | 'warning-vitals'
  | 'warning-offline'
  | 'stale-data'
  | 'stable-monitoring';
export type PositionZoneCommandState = 'holding' | 'target-pending' | 'target-reached' | 'zone-unknown';
export type PositionSurfaceState = 'loading' | 'ready' | 'empty' | 'error' | 'partial-error';
export type PositionActivityState = 'loading' | 'ready' | 'empty' | 'blocked';
export type PositionZoneId =
  | 'door1'
  | 'door2'
  | 'nurse_station'
  | 'activity_room'
  | 'rehabilitation_room'
  | 'central_common_area'
  | 'toilet'
  | 'bedroom';

export type PositionActionCode =
  | 'monitoring-stable'
  | 'sos-active'
  | 'fall-confirmed'
  | 'stale-upstream'
  | 'offline-upstream'
  | 'target-zone-set';

export type PositionNextActionCode =
  | 'continue-monitoring'
  | 'verify-upstream'
  | 'verify-device-link'
  | 'escalate-care';

export type PositionActivityTone = 'info' | 'warning' | 'critical';
export type PositionActivitySource = 'mongo-upstream';

export type PositionPoint = {
  x: number;
  y: number;
};

export type PositionResidentRegistryEntry = {
  residentId: string;
  displayName: string;
  deviceId: string;
  mysqlDeviceId?: number;
  deviceAliases?: readonly string[];
  deviceLabel?: string;
  roomLabel?: string;
};

export type PositionZoneDefinition = {
  id: PositionZoneId;
  labelKey: string;
};

export type PositionSnapshotRecord = {
  resident: PositionResidentRegistryEntry;
  latestStatus: MongoUpstreamLatest | null;
  error: string | null;
};

export type PositionCommandCenterSnapshot = {
  fetchedAt: string | null;
  records: PositionSnapshotRecord[];
  loadError: string | null;
};

export type PositionActivityItem = {
  id: string;
  timestamp: string | null;
  tone: PositionActivityTone;
  title: string;
  detail: string;
  source: PositionActivitySource;
};

export type PositionResidentActivitySnapshot = {
  deviceId: string;
  deviceIds?: readonly string[];
  fetchedAt: string | null;
  recentActivity: PositionActivityItem[];
  loadError: string | null;
};

export type PositionResidentViewModel = {
  residentId: string;
  displayName: string;
  deviceId: string;
  deviceAliases?: readonly string[];
  deviceLabel?: string;
  roomLabel?: string;
  recordError: string | null;
  isOnline: boolean;
  truthState: PositionTruthState;
  freshnessLevel: PositionFreshnessLevel;
  riskLevel: PositionRiskLevel;
  priorityBand: PositionPriorityBand;
  priorityReasonCode: PositionPriorityReasonCode;
  zoneCommandState: PositionZoneCommandState;
  currentZoneId: PositionZoneId | null;
  currentZoneLabelKey: string | null;
  currentZoneName: string | null;
  targetZoneId: PositionZoneId | null;
  targetZoneLabelKey: string | null;
  targetZoneName: string | null;
  currentCoords: PositionPoint | null;
  targetCoords: PositionPoint | null;
  heartRate: number | null;
  spo2: number | null;
  battery: number | null;
  fallState: string | null;
  fallConfirmed: boolean;
  sosState: boolean;
  lastSeenAt: string | null;
  lastSeenAgeMs: number | null;
  hasData: boolean;
  recentActions: PositionActionCode[];
  nextActionCode: PositionNextActionCode;
  recentActivity: PositionActivityItem[];
  activityBlockedReason: string | null;
  priorityTimestamp: string | null;
};

export type PositionCommandCenterViewModel = {
  residents: PositionResidentViewModel[];
  selectedResidentId: string | null;
  selectedResident: PositionResidentViewModel | null;
  selectedResidentRecordError: string | null;
  counts: {
    total: number;
    online: number;
    stale: number;
    offline: number;
  };
  surfaceStates: {
    rail: PositionSurfaceState;
    summary: PositionSurfaceState;
    map: PositionSurfaceState;
    decision: PositionSurfaceState;
  };
  activityState: PositionActivityState;
  hasPartialFailures: boolean;
  partialFailureCount: number;
  fetchedAt: string | null;
  loadError: string | null;
};

type PositionHistoryRecord = {
  id: string;
  timestamp: string | null;
  currentZoneId: PositionZoneId | null;
  currentZoneName: string | null;
  targetZoneId: PositionZoneId | null;
  targetZoneName: string | null;
  heartRate: number | null;
  spo2: number | null;
  sosState: boolean;
  fallConfirmed: boolean;
};

type PositionResolvedSelection = {
  selectedResidentId: string | null;
  selectedResident: PositionResidentViewModel | null;
};

type MongoUpstreamHistoryDocument = Partial<MongoUpstreamLatest> & {
  _id?: string;
  device_id?: string | number | null;
  data_type?: string | null;
  payload?: Record<string, unknown> | null;
  server_received_at?: unknown;
};

export const POSITION_ONLINE_TTL_MS = 300_000;
export const POSITION_DELAYED_TTL_MS = 600_000;
export const POSITION_GRID_COLUMNS = 12;
export const POSITION_GRID_ROWS = 16;
export const POSITION_MAP_REAL_WIDTH_M = 12;
export const POSITION_MAP_REAL_HEIGHT_M = 16;
export const POSITION_MAP_PIXEL_WIDTH = 1755;
export const POSITION_MAP_PIXEL_HEIGHT = 2309;
export const POSITION_ACTIVITY_PAGE_SIZE = 12;

export const POSITION_TRACKED_MYSQL_DEVICE_IDS: readonly number[] = [8, 3, 4, 6, 7, 9];

export const POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID: Readonly<Record<number, string>> = {
  3: 'ESP32_0000C8292A04A7AC',
  4: 'ESP32_0000A022A443CA48',
  6: 'ESP32_00008C292A04A7AC',
  7: 'ESP32_00009022A443CA48',
  8: 'ESP32_000048CA43A42298',
  9: 'ESP32_0000E03948D4DB1C'
};

export const POSITION_RESIDENT_REGISTRY: readonly PositionResidentRegistryEntry[] = [
  {
    residentId: 'elderly-demo-01',
    displayName: 'Resident 01',
    deviceId: 'ESP32_000048CA43A42298',
    mysqlDeviceId: 8,
    deviceAliases: ['ESP32_48CA43A42298'],
    deviceLabel: 'Wearable 01',
    roomLabel: 'Activity Room'
  },
  {
    residentId: 'elderly-demo-02',
    displayName: 'Resident 02',
    deviceId: 'ESP32_0000C8292A04A7AC',
    mysqlDeviceId: 3,
    deviceAliases: ['ESP32_00005CFA7AD4DB1C'],
    deviceLabel: 'Wearable 02',
    roomLabel: 'Nurse Station'
  },
  {
    residentId: 'elderly-demo-03',
    displayName: 'Resident 03',
    deviceId: 'ESP32_0000A022A443CA48',
    mysqlDeviceId: 4,
    deviceLabel: 'Wearable 03',
    roomLabel: 'Rehabilitation Room'
  },
  {
    residentId: 'elderly-demo-04',
    displayName: 'Resident 04',
    deviceId: 'ESP32_00008C292A04A7AC',
    mysqlDeviceId: 6,
    deviceLabel: 'Wearable 04',
    roomLabel: 'Bedroom'
  },
  {
    residentId: 'elderly-demo-05',
    displayName: 'Resident 05',
    deviceId: 'ESP32_00009022A443CA48',
    mysqlDeviceId: 7,
    deviceLabel: 'Wearable 05',
    roomLabel: 'Toilet'
  },
  {
    residentId: 'elderly-demo-06',
    displayName: 'Resident 06',
    deviceId: 'ESP32_0000E03948D4DB1C',
    mysqlDeviceId: 9,
    deviceAliases: ['ESP32_1CDBD44839E0'],
    deviceLabel: 'Wearable 06',
    roomLabel: 'Bedroom'
  }
];

function clonePositionRegistryFallback(): PositionResidentRegistryEntry[] {
  return POSITION_RESIDENT_REGISTRY.map((entry) => ({
    ...entry,
    deviceAliases: entry.deviceAliases ? [...entry.deviceAliases] : undefined
  }));
}

export async function resolvePositionResidentRegistry(): Promise<PositionResidentRegistryEntry[]> {
  const resolved = await Promise.all(
    POSITION_RESIDENT_REGISTRY.map(async (entry) => {
      if (entry.mysqlDeviceId == null) {
        return { ...entry, deviceAliases: entry.deviceAliases ? [...entry.deviceAliases] : undefined };
      }

      try {
        const device = (await deviceApi.get(entry.mysqlDeviceId)) as unknown as BackendDevice;
        const boundUserId = device?.elderly_user_id;
        return {
          ...entry,
          residentId: boundUserId != null && boundUserId > 0 ? String(boundUserId) : entry.residentId,
          deviceAliases: entry.deviceAliases ? [...entry.deviceAliases] : undefined
        };
      } catch {
        return { ...entry, deviceAliases: entry.deviceAliases ? [...entry.deviceAliases] : undefined };
      }
    })
  );

  return resolved.length > 0 ? resolved : clonePositionRegistryFallback();
}

export const POSITION_ZONES: readonly PositionZoneDefinition[] = [
  { id: 'door1', labelKey: 'position.zone.door1' },
  { id: 'door2', labelKey: 'position.zone.door2' },
  { id: 'nurse_station', labelKey: 'position.zone.nurse_station' },
  { id: 'activity_room', labelKey: 'position.zone.activity_room' },
  { id: 'rehabilitation_room', labelKey: 'position.zone.rehabilitation_room' },
  { id: 'central_common_area', labelKey: 'position.zone.central_common_area' },
  { id: 'toilet', labelKey: 'position.zone.toilet' },
  { id: 'bedroom', labelKey: 'position.zone.bedroom' }
];

export const POSITION_GRID_TO_ZONE: readonly (readonly string[])[] = Array.from({ length: POSITION_GRID_ROWS }, (_, row) =>
  Array.from({ length: POSITION_GRID_COLUMNS }, (_, col) =>
    resolveZoneFromMeters(col + 0.5, row + 0.5) ?? ''
  )
);

export const POSITION_ZONE_TO_MYSQL_LOCATION_ZONE_ID: Readonly<Partial<Record<PositionZoneId, number>>> = {
  door1: 1,
  door2: 2,
  nurse_station: 3,
  activity_room: 4,
  rehabilitation_room: 5,
  central_common_area: 6,
  toilet: 7,
  bedroom: 8
};

const MYSQL_LOCATION_ZONE_ID_TO_ZONE = new Map<number, PositionZoneId>(
  Object.entries(POSITION_ZONE_TO_MYSQL_LOCATION_ZONE_ID).map(([zone, id]) => [Number(id), zone as PositionZoneId])
);

const ZONE_NAME_ALIASES: Readonly<Record<string, PositionZoneId>> = {
  'door 1': 'door1',
  door1: 'door1',
  entrance: 'door1',
  'main entrance': 'door1',
  'door 2': 'door2',
  door2: 'door2',
  exit: 'door2',
  'nurse station': 'nurse_station',
  'customer services': 'nurse_station',
  'customer service': 'nurse_station',
  'activity room': 'activity_room',
  activity: 'activity_room',
  'check-in': 'activity_room',
  'check in': 'activity_room',
  checkin: 'activity_room',
  'rehabilitation room': 'rehabilitation_room',
  'rehabilitaion room': 'rehabilitation_room',
  rehabilitation: 'rehabilitation_room',
  'security check': 'rehabilitation_room',
  security: 'rehabilitation_room',
  'central common area': 'central_common_area',
  'common area': 'central_common_area',
  'public concourse': 'central_common_area',
  'immigration & customs': 'central_common_area',
  'immigration and customs': 'central_common_area',
  baggage: 'central_common_area',
  toilet: 'toilet',
  restroom: 'toilet',
  washroom: 'toilet',
  bedroom: 'bedroom',
  gate: 'bedroom',
  'gate 10': 'bedroom',
  'gate 11': 'bedroom',
  'boarding gate': 'bedroom'
};

const ZONE_DISPLAY_NAMES: Readonly<Record<PositionZoneId, string>> = {
  door1: 'Door 1',
  door2: 'Door 2',
  nurse_station: 'Nurse Station',
  activity_room: 'Activity Room',
  rehabilitation_room: 'Rehabilitation Room',
  central_common_area: 'Central Common Area',
  toilet: 'Toilet',
  bedroom: 'Bedroom'
};

let mysqlLocationZoneNamesById: ReadonlyMap<number, string> | null = null;
let mysqlLocationNamesLoadPromise: Promise<void> | null = null;

export async function ensurePositionMysqlLocationZoneNames(): Promise<void> {
  if (mysqlLocationZoneNamesById) return;
  if (mysqlLocationNamesLoadPromise) {
    await mysqlLocationNamesLoadPromise;
    return;
  }
  mysqlLocationNamesLoadPromise = (async () => {
    try {
      const raw = await locationApi.list({ limit: 1000 });
      const rows = Array.isArray(raw) ? (raw as BackendLocation[]) : [];
      const names = new Map<number, string>();
      for (const row of rows) {
        const id = row.location_zone_id;
        const name = row.name?.trim();
        if (id != null && name) names.set(id, normalizeElderlyZoneName(name) ?? name);
      }
      mysqlLocationZoneNamesById = names;
    } catch {
      mysqlLocationZoneNamesById = new Map();
    }
  })();
  await mysqlLocationNamesLoadPromise;
}

function getMysqlLocationZoneNamesMap(): ReadonlyMap<number, string> | null {
  return mysqlLocationZoneNamesById;
}

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function getSectionData(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  key: 'location' | 'position' | 'fall_detection' | 'sos' | 'sensors' | 'system'
): Record<string, unknown> | null {
  if (!data) return null;
  const topObj = asObjectRecord(data[key as keyof typeof data]);
  const payloadObj = asObjectRecord(data.payload);
  const nestedObj = payloadObj ? asObjectRecord(payloadObj[key]) : null;
  if (!topObj && !nestedObj) return null;
  if (!nestedObj) return topObj;
  if (!topObj) return nestedObj;
  return { ...nestedObj, ...topObj };
}

function getPayloadVitals(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null
): Record<string, unknown> | null {
  if (!data) return null;
  const topVitals = asObjectRecord((data as Record<string, unknown>).vitals);
  const payloadObj = asObjectRecord(data.payload);
  const nestedVitals = payloadObj ? asObjectRecord(payloadObj.vitals) : null;
  if (!topVitals && !nestedVitals) return null;
  if (!nestedVitals) return topVitals;
  if (!topVitals) return nestedVitals;
  return { ...nestedVitals, ...topVitals };
}

function getNestedValue(obj: Record<string, unknown> | null, path: string): unknown {
  if (!obj) return undefined;
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, obj);
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeDateValue(value: unknown): string | number | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const dateValue = record.$date ?? record.date ?? record.iso;
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      return dateValue;
    }
  }
  return null;
}

export function parsePositionTimestamp(value: unknown): number | null {
  const normalized = normalizeDateValue(value);
  if (normalized == null) return null;
  if (typeof normalized === 'number') {
    const parsedNumber = new Date(normalized).getTime();
    return Number.isFinite(parsedNumber) ? parsedNumber : null;
  }
  const text = String(normalized).trim();
  if (!text) return null;
  const isoText = text.includes('T') ? text : text.replace(' ', 'T');
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(isoText);
  const candidate = hasTimezone ? isoText : `${isoText}Z`;
  const parsed = new Date(candidate).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoTimestamp(value: unknown): string | null {
  const parsed = parsePositionTimestamp(value);
  return parsed == null ? null : new Date(parsed).toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readPointAxis(
  point: Record<string, unknown>,
  axis: 'x' | 'y',
  realSize: number,
  pixelSize: number
): number | null {
  const meters = toFiniteNumber(point[`${axis}_m`]);
  if (meters != null) return clamp(meters, 0, realSize);

  const ratio = toFiniteNumber(point[`${axis}_ratio`]);
  if (ratio != null) return clamp(ratio, 0, 1) * realSize;

  const pixels = toFiniteNumber(point[`${axis}_px`]);
  if (pixels != null) return (clamp(pixels, 0, pixelSize) / pixelSize) * realSize;

  const legacy = toFiniteNumber(point[axis]);
  if (legacy != null) return clamp(legacy, 0, realSize);

  return null;
}

function getPositionPoint(data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null, key: 'current' | 'target'): PositionPoint | null {
  const position = getSectionData(data, 'position');
  const point = asObjectRecord(getNestedValue(position, key));
  if (!point) return null;

  const x = readPointAxis(point, 'x', POSITION_MAP_REAL_WIDTH_M, POSITION_MAP_PIXEL_WIDTH);
  const y = readPointAxis(point, 'y', POSITION_MAP_REAL_HEIGHT_M, POSITION_MAP_PIXEL_HEIGHT);
  if (x == null || y == null) return null;
  return { x, y };
}

function getLegacyLocationPoint(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  key: 'current' | 'target'
): PositionPoint | null {
  const location = getSectionData(data, 'location');
  const point = asObjectRecord(getNestedValue(location, key));
  let x = point ? toFiniteNumber(point.x) ?? toFiniteNumber(point.x_m) : null;
  let y = point ? toFiniteNumber(point.y) ?? toFiniteNumber(point.y_m) : null;

  if (key === 'current' && (x == null || y == null)) {
    x = toFiniteNumber(getNestedValue(location, 'x'));
    y = toFiniteNumber(getNestedValue(location, 'y'));
  }

  if (x == null || y == null) return null;
  return {
    x: clamp(x, 0, POSITION_MAP_REAL_WIDTH_M),
    y: clamp(y, 0, POSITION_MAP_REAL_HEIGHT_M)
  };
}

function getCoords(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  key: 'current' | 'target'
): PositionPoint | null {
  return getPositionPoint(data, key) ?? getLegacyLocationPoint(data, key);
}

function resolveZoneFromMeters(x: number, y: number): PositionZoneId | null {
  if (y < 3.2 && x >= 4) return 'bedroom';
  if (y < 3.6 && x < 4) return 'toilet';
  if (y >= 12 && x < 4) return 'nurse_station';
  if (y >= 12 && x < 8) return 'activity_room';
  if (y >= 12) return 'rehabilitation_room';
  if (y >= 8 && x >= 8) return 'rehabilitation_room';
  if (y >= 3.2 && y < 8 && x >= 4 && x < 8) return 'nurse_station';
  if (x < 1.2 && y < 1.2) return 'door1';
  if (x < 1.2 && y > POSITION_MAP_REAL_HEIGHT_M - 1.2) return 'door2';
  return 'central_common_area';
}

export function getPositionZoneFromCoords(coords: PositionPoint | null): PositionZoneId | null {
  if (!coords) return null;
  return resolveZoneFromMeters(
    clamp(coords.x, 0, POSITION_MAP_REAL_WIDTH_M),
    clamp(coords.y, 0, POSITION_MAP_REAL_HEIGHT_M)
  );
}

export function getPositionZoneLabelKey(zoneId: PositionZoneId | null): string | null {
  if (!zoneId) return null;
  return POSITION_ZONES.find((zone) => zone.id === zoneId)?.labelKey ?? null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function zoneIdFromName(value: unknown): PositionZoneId | null {
  const text = normalizeText(value);
  if (!text) return null;
  const normalized = text.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalized in ZONE_NAME_ALIASES) return ZONE_NAME_ALIASES[normalized];
  for (const [token, zoneId] of Object.entries(ZONE_NAME_ALIASES)) {
    if (normalized.includes(token)) return zoneId;
  }
  return null;
}

function normalizeElderlyZoneName(value: unknown): string | null {
  const direct = normalizeText(value);
  const zoneId = zoneIdFromName(direct);
  if (zoneId) return ZONE_DISPLAY_NAMES[zoneId];
  return direct;
}

function getPositionPointRecord(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  key: 'current' | 'target'
): Record<string, unknown> | null {
  const position = getSectionData(data, 'position');
  return asObjectRecord(getNestedValue(position, key));
}

function getLocationPointRecord(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  key: 'current' | 'target'
): Record<string, unknown> | null {
  const location = getSectionData(data, 'location');
  return asObjectRecord(getNestedValue(location, key));
}

function getZoneNameFromPoint(point: Record<string, unknown> | null): string | null {
  return normalizeElderlyZoneName(point?.name ?? point?.zone_name ?? point?.zone_key);
}

function getCurrentZoneName(data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null): string | null {
  return (
    getZoneNameFromPoint(getPositionPointRecord(data, 'current')) ??
    getZoneNameFromPoint(getLocationPointRecord(data, 'current'))
  );
}

function getTargetZoneName(data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null): string | null {
  return (
    getZoneNameFromPoint(getPositionPointRecord(data, 'target')) ??
    getZoneNameFromPoint(getLocationPointRecord(data, 'target'))
  );
}

function parsePositiveIntLocation(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.round(value);
    return n > 0 ? n : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function getMysqlLocationZoneIdFromPoint(point: Record<string, unknown> | null): number | null {
  if (!point) return null;
  return (
    parsePositiveIntLocation(point.location_zone_id) ??
    parsePositiveIntLocation(point.zone_id) ??
    parsePositiveIntLocation(point.locationZoneId)
  );
}

function getMysqlLocationZoneIdFromUpstream(
  latestStatus: MongoUpstreamLatest | null,
  positionZoneId: PositionZoneId | null
): number | null {
  const fromPosition = getMysqlLocationZoneIdFromPoint(getPositionPointRecord(latestStatus, 'current'));
  if (fromPosition != null) return fromPosition;
  const fromLegacy = getMysqlLocationZoneIdFromPoint(getLocationPointRecord(latestStatus, 'current'));
  if (fromLegacy != null) return fromLegacy;
  if (positionZoneId) {
    const mapped = POSITION_ZONE_TO_MYSQL_LOCATION_ZONE_ID[positionZoneId];
    if (mapped != null) return mapped;
  }
  return null;
}

function applyMysqlNameToCurrentZoneName(
  latestStatus: MongoUpstreamLatest | null,
  positionZoneId: PositionZoneId | null,
  upstreamName: string | null
): string | null {
  const map = getMysqlLocationZoneNamesMap();
  const mysqlId = getMysqlLocationZoneIdFromUpstream(latestStatus, positionZoneId);
  if (mysqlId != null && map && map.has(mysqlId)) {
    return normalizeElderlyZoneName(map.get(mysqlId)) ?? null;
  }
  return upstreamName ?? (positionZoneId ? ZONE_DISPLAY_NAMES[positionZoneId] : null);
}

export function getPositionZoneDisplayForResident(
  resident: Pick<PositionResidentViewModel, 'currentZoneId' | 'currentZoneLabelKey' | 'currentZoneName'>,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const name = resident.currentZoneName?.trim();
  if (name) return name;
  if (resident.currentZoneLabelKey) {
    return t(resident.currentZoneLabelKey, {
      defaultValue: resident.currentZoneName ?? 'Unknown zone'
    });
  }
  if (resident.currentZoneId) {
    return t(getPositionZoneLabelKey(resident.currentZoneId) ?? '', {
      defaultValue: ZONE_DISPLAY_NAMES[resident.currentZoneId]
    });
  }
  return t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
}

function humanizeZoneId(zoneId: PositionZoneId | null): string | null {
  if (!zoneId) return null;
  return ZONE_DISPLAY_NAMES[zoneId];
}

function getZoneDisplayName(zoneId: PositionZoneId | null, zoneName: string | null): string | null {
  return zoneName ?? humanizeZoneId(zoneId);
}

export function gridIndicesToPixelPercent(coords: PositionPoint): { leftPercent: number; topPercent: number } {
  return {
    leftPercent: (clamp(coords.x, 0, POSITION_MAP_REAL_WIDTH_M) / POSITION_MAP_REAL_WIDTH_M) * 100,
    topPercent: (clamp(coords.y, 0, POSITION_MAP_REAL_HEIGHT_M) / POSITION_MAP_REAL_HEIGHT_M) * 100
  };
}

function isConfirmedFallDescription(description: string | null): boolean {
  if (!description) return false;
  const normalized = description.toLowerCase();
  return (
    normalized.includes('confirmed') ||
    normalized.includes('fall') ||
    description.includes('跌倒') ||
    description.includes('確認') ||
    description.includes('确认')
  );
}

function firstNonNegativeNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    const n = toFiniteNumber(candidate);
    if (n != null && n >= 0) return n;
  }
  return null;
}

function readHeartRateLikeBlock(block: unknown): number | null {
  if (block == null) return null;
  if (typeof block !== 'object' || Array.isArray(block)) {
    return firstNonNegativeNumber(block);
  }
  const o = block as Record<string, unknown>;
  return firstNonNegativeNumber(o.bpm, o.value, o.reading, o.hr, o.heart_rate);
}

function readSpo2LikeBlock(block: unknown): number | null {
  if (block == null) return null;
  if (typeof block !== 'object' || Array.isArray(block)) {
    return firstNonNegativeNumber(block);
  }
  const o = block as Record<string, unknown>;
  return firstNonNegativeNumber(o.percentage, o.percent, o.value, o.reading, o.spo2);
}

function getSensorMetric(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  sensorKey: 'heart_rate' | 'spo2',
  valueKey: 'bpm' | 'percentage'
): number | null {
  const sensors = getSectionData(data, 'sensors');
  const vitals = getPayloadVitals(data);

  if (sensorKey === 'heart_rate') {
    if (sensors) {
      const fromBlock = readHeartRateLikeBlock(sensors.heart_rate) ?? readHeartRateLikeBlock(sensors.heartRate);
      if (fromBlock != null) return Math.round(fromBlock);
      const legacy = toFiniteNumber(getNestedValue(sensors, `${sensorKey}.${valueKey}`));
      if (legacy != null && legacy >= 0) return Math.round(legacy);
    }
    if (vitals) {
      const fromVitals =
        readHeartRateLikeBlock(vitals.heart_rate) ??
        readHeartRateLikeBlock(vitals.HeartRate) ??
        firstNonNegativeNumber(vitals.hr, getNestedValue(vitals, 'heart_rate.bpm'));
      if (fromVitals != null) return Math.round(fromVitals);
    }
    return null;
  }

  if (sensors) {
    const fromBlock = readSpo2LikeBlock(sensors.spo2) ?? readSpo2LikeBlock(sensors.SpO2);
    if (fromBlock != null) return Math.round(fromBlock);
    const legacy = toFiniteNumber(getNestedValue(sensors, `${sensorKey}.${valueKey}`));
    if (legacy != null && legacy >= 0) return Math.round(legacy);
  }
  if (vitals) {
    const fromVitals =
      readSpo2LikeBlock(vitals.spo2) ??
      readSpo2LikeBlock(vitals.SpO2) ??
      firstNonNegativeNumber(getNestedValue(vitals, 'spo2.percentage'));
    if (fromVitals != null) return Math.round(fromVitals);
  }
  return null;
}

function getBatteryLevel(data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null): number | null {
  const system = getSectionData(data, 'system');
  const value = toFiniteNumber(getNestedValue(system, 'battery.level'));
  if (value == null) return null;
  return clamp(value, 0, 100);
}

function normalizeFallState(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null
): { label: string | null; confirmed: boolean } {
  const fall = getSectionData(data, 'fall_detection');
  const description = normalizeText(getNestedValue(fall, 'state_description'));
  const confirmed =
    toBoolean(getNestedValue(fall, 'is_fall_confirmed')) ||
    toBoolean(getNestedValue(fall, 'confirmed')) ||
    isConfirmedFallDescription(description);
  if (confirmed) return { label: 'Confirmed fall', confirmed: true };

  const state = toFiniteNumber(getNestedValue(fall, 'state'));
  if (state === 0) return { label: 'Normal', confirmed: false };
  if (description) return { label: description, confirmed: false };
  if (state != null) return { label: `State ${state}`, confirmed: false };
  return { label: null, confirmed: false };
}

export function getTruthState(
  hasData: boolean,
  lastSeenAgeMs: number | null,
  requestError: string | null
): PositionTruthState {
  if (!hasData || requestError) return 'offline';
  if (lastSeenAgeMs == null) return 'stale';
  return lastSeenAgeMs <= POSITION_ONLINE_TTL_MS ? 'online' : 'stale';
}

export function getFreshnessLevel(lastSeenAgeMs: number | null): PositionFreshnessLevel {
  if (lastSeenAgeMs == null) return 'stale';
  if (lastSeenAgeMs <= POSITION_ONLINE_TTL_MS) return 'live';
  if (lastSeenAgeMs <= POSITION_DELAYED_TTL_MS) return 'delayed';
  return 'stale';
}

function hasAbnormalVitals(heartRate: number | null, spo2: number | null): boolean {
  return (heartRate != null && heartRate >= 110) || (spo2 != null && spo2 <= 92);
}

export function getRiskLevel(input: {
  truthState: PositionTruthState;
  heartRate: number | null;
  spo2: number | null;
  sosState: boolean;
  fallConfirmed: boolean;
}): PositionRiskLevel {
  if (input.sosState || input.fallConfirmed) return 'critical';
  if (input.truthState !== 'online') return 'warning';
  if (hasAbnormalVitals(input.heartRate, input.spo2)) return 'warning';
  return 'stable';
}

export function getPriorityBand(input: {
  truthState: PositionTruthState;
  heartRate: number | null;
  spo2: number | null;
  sosState: boolean;
  fallConfirmed: boolean;
}): PositionPriorityBand {
  if (input.sosState || input.fallConfirmed) return 'critical';
  if (input.truthState === 'offline' || hasAbnormalVitals(input.heartRate, input.spo2)) return 'warning';
  if (input.truthState === 'stale') return 'stale-only';
  return 'stable';
}

export function getPriorityReasonCode(input: {
  truthState: PositionTruthState;
  heartRate: number | null;
  spo2: number | null;
  sosState: boolean;
  fallConfirmed: boolean;
}): PositionPriorityReasonCode {
  if (input.sosState) return 'critical-sos';
  if (input.fallConfirmed) return 'critical-fall';
  if (input.truthState === 'offline') return 'warning-offline';
  if (hasAbnormalVitals(input.heartRate, input.spo2)) return 'warning-vitals';
  if (input.truthState === 'stale') return 'stale-data';
  return 'stable-monitoring';
}

function areCoordsEqual(a: PositionPoint | null, b: PositionPoint | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) < 0.35 && Math.abs(a.y - b.y) < 0.35;
}

export function getZoneCommandState(input: {
  currentZoneId: PositionZoneId | null;
  currentZoneName: string | null;
  targetZoneId: PositionZoneId | null;
  targetZoneName: string | null;
  currentCoords: PositionPoint | null;
  targetCoords: PositionPoint | null;
}): PositionZoneCommandState {
  const hasCurrent = Boolean(input.currentZoneId || input.currentZoneName);
  const hasTarget = Boolean(input.targetZoneId || input.targetZoneName || input.targetCoords);
  if (!hasCurrent && !hasTarget) return 'zone-unknown';
  if (!hasTarget) return 'holding';

  const sameZone =
    Boolean(input.currentZoneId && input.targetZoneId && input.currentZoneId === input.targetZoneId) ||
    Boolean(
      input.currentZoneName &&
        input.targetZoneName &&
        input.currentZoneName.trim().toLowerCase() === input.targetZoneName.trim().toLowerCase()
    );

  if (sameZone || areCoordsEqual(input.currentCoords, input.targetCoords)) return 'target-reached';
  return 'target-pending';
}

function getRecentActions(input: {
  truthState: PositionTruthState;
  sosState: boolean;
  fallConfirmed: boolean;
  hasTargetZone: boolean;
}): PositionActionCode[] {
  const actions: PositionActionCode[] = [];
  if (input.sosState) actions.push('sos-active');
  if (input.fallConfirmed) actions.push('fall-confirmed');
  if (input.truthState === 'stale') actions.push('stale-upstream');
  if (input.truthState === 'offline') actions.push('offline-upstream');
  if (input.hasTargetZone) actions.push('target-zone-set');
  if (actions.length === 0) actions.push('monitoring-stable');
  return actions;
}

function getNextActionCode(
  truthState: PositionTruthState,
  riskLevel: PositionRiskLevel
): PositionNextActionCode {
  if (riskLevel === 'critical') return 'escalate-care';
  if (truthState === 'offline') return 'verify-device-link';
  if (truthState === 'stale' || riskLevel === 'warning') return 'verify-upstream';
  return 'continue-monitoring';
}

function isLatestDocument(data: unknown): data is MongoUpstreamLatest {
  return Boolean(
    data &&
      typeof data === 'object' &&
      (((data as MongoUpstreamLatest).device_id ?? null) != null || (data as MongoUpstreamLatest)._id)
  );
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed';
}

function cloneUpstreamDoc(doc: MongoUpstreamLatest): MongoUpstreamLatest {
  return JSON.parse(JSON.stringify(doc)) as MongoUpstreamLatest;
}

function firstSectionFromDocs(
  docs: MongoUpstreamLatest[],
  key: 'position' | 'location' | 'sos' | 'fall_detection' | 'system'
): Record<string, unknown> | null {
  for (const doc of docs) {
    const section = getSectionData(doc, key);
    if (section && Object.keys(section).length > 0) return section;
  }
  return null;
}

function mergeSensorSectionsFromDocs(docs: MongoUpstreamLatest[]): Record<string, unknown> | null {
  const sortedAsc = [...docs].sort(
    (a, b) =>
      (parsePositionTimestamp(a.server_received_at) ?? 0) -
      (parsePositionTimestamp(b.server_received_at) ?? 0)
  );
  let merged: Record<string, unknown> = {};
  for (const doc of sortedAsc) {
    const sensors = getSectionData(doc, 'sensors');
    if (sensors) merged = { ...merged, ...sensors };
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function mergeUpstreamDocsForPosition(docs: MongoUpstreamLatest[]): MongoUpstreamLatest | null {
  const valid = docs.filter(isLatestDocument);
  if (valid.length === 0) return null;
  const sortedDesc = [...valid].sort(
    (a, b) =>
      (parsePositionTimestamp(b.server_received_at) ?? 0) -
      (parsePositionTimestamp(a.server_received_at) ?? 0)
  );
  const primary = cloneUpstreamDoc(sortedDesc[0]);

  const mergedSensors = mergeSensorSectionsFromDocs(sortedDesc);
  if (mergedSensors) primary.sensors = mergedSensors as MongoUpstreamLatest['sensors'];

  const position = firstSectionFromDocs(sortedDesc, 'position');
  if (position) primary.position = position;

  const location = firstSectionFromDocs(sortedDesc, 'location');
  if (location) primary.location = location;

  const sos = firstSectionFromDocs(sortedDesc, 'sos');
  if (sos) primary.sos = sos;

  const fall = firstSectionFromDocs(sortedDesc, 'fall_detection');
  if (fall) primary.fall_detection = fall;

  const system = firstSectionFromDocs(sortedDesc, 'system');
  if (system) primary.system = system;

  return primary;
}

function getPriorityTimestamp(
  recentActivity: PositionActivityItem[],
  lastSeenAt: string | null
): string | null {
  return recentActivity[0]?.timestamp ?? lastSeenAt;
}

function comparePriorityBand(a: PositionPriorityBand, b: PositionPriorityBand): number {
  const priority: Record<PositionPriorityBand, number> = {
    critical: 0,
    warning: 1,
    'stale-only': 2,
    stable: 3
  };
  return priority[a] - priority[b];
}

function compareRiskLevel(a: PositionRiskLevel, b: PositionRiskLevel): number {
  const priority: Record<PositionRiskLevel, number> = {
    critical: 0,
    warning: 1,
    stable: 2
  };
  return priority[a] - priority[b];
}

export function comparePositionResidents(a: PositionResidentViewModel, b: PositionResidentViewModel): number {
  const bandDiff = comparePriorityBand(a.priorityBand, b.priorityBand);
  if (bandDiff !== 0) return bandDiff;

  const riskDiff = compareRiskLevel(a.riskLevel, b.riskLevel);
  if (riskDiff !== 0) return riskDiff;

  const priorityTimeA = a.priorityTimestamp ? Date.parse(a.priorityTimestamp) : Number.NEGATIVE_INFINITY;
  const priorityTimeB = b.priorityTimestamp ? Date.parse(b.priorityTimestamp) : Number.NEGATIVE_INFINITY;
  if (priorityTimeA !== priorityTimeB) return priorityTimeB - priorityTimeA;

  const timeA = a.lastSeenAt ? Date.parse(a.lastSeenAt) : Number.NEGATIVE_INFINITY;
  const timeB = b.lastSeenAt ? Date.parse(b.lastSeenAt) : Number.NEGATIVE_INFINITY;
  if (timeA !== timeB) return timeB - timeA;

  return a.displayName.localeCompare(b.displayName);
}

export function sortPositionResidents(residents: PositionResidentViewModel[]): PositionResidentViewModel[] {
  return [...residents].sort(comparePositionResidents);
}

function hasZoneResolution(resident: PositionResidentViewModel | null): boolean {
  if (!resident) return false;
  return Boolean(
    resident.currentCoords ||
      resident.targetCoords ||
      resident.currentZoneId ||
      resident.targetZoneId ||
      resident.currentZoneName ||
      resident.targetZoneName
  );
}

export function resolvePositionSelection(
  residents: PositionResidentViewModel[],
  selectedResidentId?: string | null
): PositionResolvedSelection {
  const selectedResident =
    residents.find((resident) => resident.residentId === selectedResidentId) ?? residents[0] ?? null;
  return {
    selectedResidentId: selectedResident?.residentId ?? null,
    selectedResident
  };
}

function getRailSurfaceState(input: {
  isInitialLoading: boolean;
  hasResidentsConfigured: boolean;
  hasPartialFailures: boolean;
  allRecordsFailed: boolean;
}): PositionSurfaceState {
  if (!input.hasResidentsConfigured) return 'empty';
  if (input.isInitialLoading) return 'loading';
  if (input.allRecordsFailed) return 'error';
  if (input.hasPartialFailures) return 'partial-error';
  return 'ready';
}

function getSummarySurfaceState(input: {
  isInitialLoading: boolean;
  selectedResident: PositionResidentViewModel | null;
}): PositionSurfaceState {
  if (input.isInitialLoading) return 'loading';
  if (!input.selectedResident) return 'empty';
  if (input.selectedResident.recordError && !input.selectedResident.hasData) return 'error';
  if (!input.selectedResident.hasData) return 'empty';
  return 'ready';
}

function getMapSurfaceState(input: {
  isInitialLoading: boolean;
  selectedResident: PositionResidentViewModel | null;
}): PositionSurfaceState {
  if (input.isInitialLoading) return 'loading';
  if (!input.selectedResident) return 'empty';
  if (input.selectedResident.recordError && !input.selectedResident.hasData) return 'error';
  if (!input.selectedResident.hasData) return 'empty';
  if (!hasZoneResolution(input.selectedResident)) return 'empty';
  return 'ready';
}

function getDecisionSurfaceState(input: {
  isInitialLoading: boolean;
  selectedResident: PositionResidentViewModel | null;
  hasPartialFailures: boolean;
  allRecordsFailed: boolean;
}): PositionSurfaceState {
  if (input.isInitialLoading) return 'loading';
  if (!input.selectedResident) return 'empty';
  if (
    (input.selectedResident.recordError && !input.selectedResident.hasData) ||
    (input.allRecordsFailed && !input.selectedResident.hasData)
  ) {
    return 'error';
  }
  if (!input.selectedResident.hasData) return 'empty';
  if (input.hasPartialFailures) return 'partial-error';
  return 'ready';
}

function getResidentDeviceIds(resident: Pick<PositionResidentRegistryEntry, 'deviceId' | 'deviceAliases'>): string[] {
  return Array.from(new Set([resident.deviceId, ...(resident.deviceAliases ?? [])].filter(Boolean)));
}

function activityMatchesResident(
  resident: PositionResidentViewModel | null,
  activity?: PositionResidentActivitySnapshot | null
): boolean {
  if (!resident || !activity) return false;
  const residentIds = new Set(getResidentDeviceIds(resident));
  const activityIds = activity.deviceIds?.length ? activity.deviceIds : [activity.deviceId];
  return activityIds.some((id) => residentIds.has(id));
}

function getActivityState(input: {
  selectedResident: PositionResidentViewModel | null;
  activityLoading: boolean;
  selectedResidentActivity?: PositionResidentActivitySnapshot | null;
}): PositionActivityState {
  if (!input.selectedResident) return 'empty';
  const matches = activityMatchesResident(input.selectedResident, input.selectedResidentActivity);
  if (matches && input.selectedResidentActivity?.loadError) return 'blocked';
  if (matches && (input.selectedResidentActivity?.recentActivity?.length ?? 0) > 0) return 'ready';
  if (input.activityLoading && !matches) return 'loading';
  if (!input.selectedResident.hasData || input.selectedResident.recordError) return 'blocked';
  return 'empty';
}

function isLocationLatestResponse(data: unknown): data is MongoLatestValidLocationResponse {
  return Boolean(data && typeof data === 'object' && (data as MongoLatestValidLocationResponse).found);
}

function latestLocationToMongoDoc(data: MongoLatestValidLocationResponse): MongoUpstreamLatest {
  const position = asObjectRecord(data.position) ?? null;
  return {
    _id: data._id,
    device_id: data.device_id,
    mysql_device_id: data.mysql_device_id,
    server_received_at: data.server_received_at,
    location: {
      current: {
        x: data.x,
        y: data.y,
        name: data.location_name,
        location_zone_id: data.location_zone_id
      }
    },
    position: position ?? undefined
  } as MongoUpstreamLatest;
}

export async function loadPositionCommandCenterSnapshot(
  registry: readonly PositionResidentRegistryEntry[] = POSITION_RESIDENT_REGISTRY
): Promise<PositionCommandCenterSnapshot> {
  await ensurePositionMysqlLocationZoneNames();
  const list = registry.length > 0 ? [...registry] : clonePositionRegistryFallback();
  const records = await Promise.all(
    list.map(async (resident): Promise<PositionSnapshotRecord> => {
      try {
        const deviceIds = getResidentDeviceIds(resident);
        const settled = await Promise.allSettled(
          deviceIds.flatMap((deviceId) => [
            mongoUpstreamApi.getLatest({ device_id: deviceId }),
            mongoUpstreamApi.getLatest({ device_id: deviceId, data_type: 'status_update' }),
            mongoUpstreamApi.getLatest({ device_id: deviceId, data_type: 'heartbeat' }),
            mongoUpstreamApi.getLatest({ device_id: deviceId, data_type: 'vitals' }),
            mongoUpstreamApi.getLatestValidLocation(deviceId, { scan_limit: 200 })
          ])
        );
        const docs: MongoUpstreamLatest[] = [];
        for (const r of settled) {
          if (r.status !== 'fulfilled') continue;
          const value = r.value as unknown;
          if (isLatestDocument(value)) docs.push(value);
          if (isLocationLatestResponse(value) && value.found) docs.push(latestLocationToMongoDoc(value));
        }
        const merged = mergeUpstreamDocsForPosition(docs);
        return { resident, latestStatus: merged, error: null };
      } catch (error) {
        return { resident, latestStatus: null, error: normalizeError(error) };
      }
    })
  );

  const failed = records.filter((record) => record.error);
  const loadError = failed.length === records.length ? failed[0]?.error ?? 'Request failed' : null;
  return {
    fetchedAt: new Date().toISOString(),
    records,
    loadError
  };
}

function normalizeHistoryDocuments(historyDocs: unknown[]): MongoUpstreamHistoryDocument[] {
  return historyDocs.filter((doc): doc is MongoUpstreamHistoryDocument => Boolean(doc && typeof doc === 'object'));
}

function buildHistoryRecord(doc: MongoUpstreamHistoryDocument): PositionHistoryRecord {
  const timestamp = toIsoTimestamp(doc.server_received_at ?? doc.timestamp ?? null);
  const currentCoords = getCoords(doc, 'current');
  const targetCoords = getCoords(doc, 'target');
  const positionCurrent = getPositionPointRecord(doc, 'current');
  const positionTarget = getPositionPointRecord(doc, 'target');
  const currentZoneId =
    MYSQL_LOCATION_ZONE_ID_TO_ZONE.get(getMysqlLocationZoneIdFromPoint(positionCurrent) ?? 0) ??
    zoneIdFromName(positionCurrent?.zone_key ?? positionCurrent?.name) ??
    getPositionZoneFromCoords(currentCoords);
  const targetZoneId =
    MYSQL_LOCATION_ZONE_ID_TO_ZONE.get(getMysqlLocationZoneIdFromPoint(positionTarget) ?? 0) ??
    zoneIdFromName(positionTarget?.zone_key ?? positionTarget?.name) ??
    getPositionZoneFromCoords(targetCoords);
  const currentZoneName = getCurrentZoneName(doc);
  const targetZoneName = getTargetZoneName(doc);
  const heartRate = getSensorMetric(doc, 'heart_rate', 'bpm');
  const spo2 = getSensorMetric(doc, 'spo2', 'percentage');
  const fall = normalizeFallState(doc);
  const sosState = toBoolean(getNestedValue(getSectionData(doc, 'sos'), 'active'));

  return {
    id: doc._id ?? `${doc.device_id ?? 'device'}-${timestamp ?? Math.random().toString(36).slice(2)}`,
    timestamp,
    currentZoneId,
    currentZoneName,
    targetZoneId,
    targetZoneName,
    heartRate,
    spo2,
    sosState,
    fallConfirmed: fall.confirmed
  };
}

function buildZoneChangeDetail(olderZone: string | null, newerZone: string | null): string {
  if (olderZone && newerZone) return `Moved from ${olderZone} to ${newerZone}.`;
  if (newerZone) return `Current zone is now ${newerZone}.`;
  return 'Current zone changed in upstream data.';
}

function buildTargetZoneDetail(olderZone: string | null, newerZone: string | null): string {
  if (olderZone && newerZone) return `Target changed from ${olderZone} to ${newerZone}.`;
  if (newerZone) return `Target zone set to ${newerZone}.`;
  return 'Target zone changed in upstream data.';
}

function buildVitalsWarningDetail(heartRate: number | null, spo2: number | null): string {
  if (heartRate != null && spo2 != null) return `Heart rate ${heartRate} bpm and SpO2 ${spo2}%.`;
  if (heartRate != null) return `Heart rate ${heartRate} bpm entered warning range.`;
  if (spo2 != null) return `SpO2 ${spo2}% entered warning range.`;
  return 'Vitals entered warning range.';
}

function createActivityItem(
  id: string,
  timestamp: string | null,
  tone: PositionActivityTone,
  title: string,
  detail: string
): PositionActivityItem {
  return { id, timestamp, tone, title, detail, source: 'mongo-upstream' };
}

export function buildPositionResidentActivity(historyDocs: unknown[]): PositionActivityItem[] {
  const records = normalizeHistoryDocuments(historyDocs)
    .map(buildHistoryRecord)
    .sort((a, b) => {
      const timeA = a.timestamp ? Date.parse(a.timestamp) : Number.NEGATIVE_INFINITY;
      const timeB = b.timestamp ? Date.parse(b.timestamp) : Number.NEGATIVE_INFINITY;
      return timeB - timeA;
    });

  if (records.length === 0) return [];

  const items: PositionActivityItem[] = [];
  for (let index = 0; index < records.length && items.length < 5; index += 1) {
    const newer = records[index];
    const older = records[index + 1] ?? null;
    const newerCurrentZone = getZoneDisplayName(newer.currentZoneId, newer.currentZoneName);
    const olderCurrentZone = older ? getZoneDisplayName(older.currentZoneId, older.currentZoneName) : null;
    const newerTargetZone = getZoneDisplayName(newer.targetZoneId, newer.targetZoneName);
    const olderTargetZone = older ? getZoneDisplayName(older.targetZoneId, older.targetZoneName) : null;
    const currentVitalsAbnormal = hasAbnormalVitals(newer.heartRate, newer.spo2);
    const olderVitalsAbnormal = older ? hasAbnormalVitals(older.heartRate, older.spo2) : false;

    if (newer.sosState && !older?.sosState) {
      items.push(createActivityItem(`${newer.id}-sos`, newer.timestamp, 'critical', 'SOS active', 'Latest upstream state reports an active SOS signal.'));
    }

    if (newer.fallConfirmed && !older?.fallConfirmed) {
      items.push(createActivityItem(`${newer.id}-fall`, newer.timestamp, 'critical', 'Confirmed fall', 'Latest upstream state reports a confirmed fall.'));
    }

    if (older && newerCurrentZone !== olderCurrentZone) {
      items.push(createActivityItem(`${newer.id}-zone`, newer.timestamp, 'info', 'Zone changed', buildZoneChangeDetail(olderCurrentZone, newerCurrentZone)));
    }

    if (newerTargetZone && newerTargetZone !== olderTargetZone) {
      items.push(createActivityItem(`${newer.id}-target`, newer.timestamp, 'info', 'Target updated', buildTargetZoneDetail(olderTargetZone, newerTargetZone)));
    }

    if (currentVitalsAbnormal && !olderVitalsAbnormal) {
      items.push(createActivityItem(`${newer.id}-vitals`, newer.timestamp, 'warning', 'Vitals warning', buildVitalsWarningDetail(newer.heartRate, newer.spo2)));
    }
  }

  if (items.length === 0) {
    items.push(createActivityItem(`${records[0].id}-sync`, records[0].timestamp, 'info', 'Latest sync', 'Status update received from device.'));
  }

  return items.slice(0, 5);
}

export async function loadPositionResidentActivity(
  deviceIdOrIds: string | readonly string[]
): Promise<PositionResidentActivitySnapshot> {
  const deviceIds = Array.isArray(deviceIdOrIds) ? [...deviceIdOrIds] : [deviceIdOrIds];
  const uniqueDeviceIds = Array.from(new Set(deviceIds.filter(Boolean)));
  const primaryDeviceId = uniqueDeviceIds[0] ?? '';

  try {
    const responses = await Promise.allSettled(
      uniqueDeviceIds.map((deviceId) =>
        mongoUpstreamApi.list({
          device_id: deviceId,
          page: 1,
          page_size: POSITION_ACTIVITY_PAGE_SIZE
        }) as Promise<{ items?: unknown[] } | null>
      )
    );
    const items = responses.flatMap((response) =>
      response.status === 'fulfilled' ? response.value?.items ?? [] : []
    );
    const firstError = responses.find((response) => response.status === 'rejected') as PromiseRejectedResult | undefined;

    return {
      deviceId: primaryDeviceId,
      deviceIds: uniqueDeviceIds,
      fetchedAt: new Date().toISOString(),
      recentActivity: buildPositionResidentActivity(items),
      loadError: items.length === 0 && firstError ? normalizeError(firstError.reason) : null
    };
  } catch (error) {
    return {
      deviceId: primaryDeviceId,
      deviceIds: uniqueDeviceIds,
      fetchedAt: new Date().toISOString(),
      recentActivity: [],
      loadError: normalizeError(error)
    };
  }
}

function buildResidentViewModel(record: PositionSnapshotRecord, now: number): PositionResidentViewModel {
  const latestStatus = record.latestStatus;
  const currentCoords = getCoords(latestStatus, 'current');
  const targetCoords = getCoords(latestStatus, 'target');
  const positionCurrent = getPositionPointRecord(latestStatus, 'current');
  const positionTarget = getPositionPointRecord(latestStatus, 'target');
  const currentZoneId =
    MYSQL_LOCATION_ZONE_ID_TO_ZONE.get(getMysqlLocationZoneIdFromPoint(positionCurrent) ?? 0) ??
    zoneIdFromName(positionCurrent?.zone_key ?? positionCurrent?.name) ??
    getPositionZoneFromCoords(currentCoords);
  const targetZoneId =
    MYSQL_LOCATION_ZONE_ID_TO_ZONE.get(getMysqlLocationZoneIdFromPoint(positionTarget) ?? 0) ??
    zoneIdFromName(positionTarget?.zone_key ?? positionTarget?.name) ??
    getPositionZoneFromCoords(targetCoords);
  const currentZoneLabelKey = getPositionZoneLabelKey(currentZoneId);
  const targetZoneLabelKey = getPositionZoneLabelKey(targetZoneId);
  const upstreamCurrentZoneName = getCurrentZoneName(latestStatus);
  const currentZoneName = applyMysqlNameToCurrentZoneName(latestStatus, currentZoneId, upstreamCurrentZoneName);
  const targetZoneName = getTargetZoneName(latestStatus);
  const lastSeenAt = toIsoTimestamp(latestStatus?.server_received_at ?? null);
  const lastSeenMs = parsePositionTimestamp(latestStatus?.server_received_at ?? null);
  const lastSeenAgeMs = lastSeenMs == null ? null : Math.max(0, now - lastSeenMs);
  const heartRate = getSensorMetric(latestStatus, 'heart_rate', 'bpm');
  const spo2 = getSensorMetric(latestStatus, 'spo2', 'percentage');
  const battery = getBatteryLevel(latestStatus);
  const sosState = toBoolean(getNestedValue(getSectionData(latestStatus, 'sos'), 'active'));
  const fall = normalizeFallState(latestStatus);
  const truthState = getTruthState(Boolean(latestStatus), lastSeenAgeMs, record.error);
  const freshnessLevel = getFreshnessLevel(lastSeenAgeMs);
  const riskLevel = getRiskLevel({ truthState, heartRate, spo2, sosState, fallConfirmed: fall.confirmed });
  const priorityBand = getPriorityBand({ truthState, heartRate, spo2, sosState, fallConfirmed: fall.confirmed });
  const priorityReasonCode = getPriorityReasonCode({ truthState, heartRate, spo2, sosState, fallConfirmed: fall.confirmed });
  const zoneCommandState = getZoneCommandState({
    currentZoneId,
    currentZoneName,
    targetZoneId,
    targetZoneName,
    currentCoords,
    targetCoords
  });
  const recentActions = getRecentActions({
    truthState,
    sosState,
    fallConfirmed: fall.confirmed,
    hasTargetZone: Boolean(targetZoneId || targetZoneName)
  });

  return {
    residentId: record.resident.residentId,
    displayName: record.resident.displayName,
    deviceId: record.resident.deviceId,
    deviceAliases: record.resident.deviceAliases,
    deviceLabel: record.resident.deviceLabel,
    roomLabel: record.resident.roomLabel,
    recordError: record.error,
    isOnline: truthState === 'online',
    truthState,
    freshnessLevel,
    riskLevel,
    priorityBand,
    priorityReasonCode,
    zoneCommandState,
    currentZoneId,
    currentZoneLabelKey,
    currentZoneName,
    targetZoneId,
    targetZoneLabelKey,
    targetZoneName,
    currentCoords,
    targetCoords,
    heartRate,
    spo2,
    battery,
    fallState: fall.label,
    fallConfirmed: fall.confirmed,
    sosState,
    lastSeenAt,
    lastSeenAgeMs,
    hasData: Boolean(latestStatus),
    recentActions,
    nextActionCode: getNextActionCode(truthState, riskLevel),
    recentActivity: [],
    activityBlockedReason: null,
    priorityTimestamp: lastSeenAt
  };
}

function applySelectedResidentActivity(
  residents: PositionResidentViewModel[],
  selectedResidentActivity: PositionResidentActivitySnapshot | null | undefined
): PositionResidentViewModel[] {
  if (!selectedResidentActivity) return residents;

  return residents.map((resident) => {
    if (!activityMatchesResident(resident, selectedResidentActivity)) return resident;
    const recentActivity = selectedResidentActivity.recentActivity;
    return {
      ...resident,
      recentActivity,
      activityBlockedReason: selectedResidentActivity.loadError,
      priorityTimestamp: getPriorityTimestamp(recentActivity, resident.lastSeenAt)
    };
  });
}

export function buildPositionCommandCenterViewModel(
  snapshot: PositionCommandCenterSnapshot | null,
  options: {
    selectedResidentId?: string | null;
    now?: number;
    selectedResidentActivity?: PositionResidentActivitySnapshot | null;
    snapshotLoading?: boolean;
    activityLoading?: boolean;
    emptyRegistry?: readonly PositionResidentRegistryEntry[];
  } = {}
): PositionCommandCenterViewModel {
  const now = options.now ?? Date.now();
  const emptyFallback = options.emptyRegistry ?? POSITION_RESIDENT_REGISTRY;
  const records =
    snapshot?.records ??
    emptyFallback.map((resident) => ({
      resident,
      latestStatus: null,
      error: null
    }));
  const baseResidents = records.map((record) => buildResidentViewModel(record, now));
  const residents = sortPositionResidents(applySelectedResidentActivity(baseResidents, options.selectedResidentActivity));
  const { selectedResidentId, selectedResident } = resolvePositionSelection(residents, options.selectedResidentId);
  const partialFailureCount = records.filter((record) => Boolean(record.error)).length;
  const hasPartialFailures = partialFailureCount > 0;
  const isInitialLoading = Boolean(options.snapshotLoading && snapshot == null);
  const allRecordsFailed = records.length > 0 && partialFailureCount === records.length;
  const activityState = getActivityState({
    selectedResident,
    activityLoading: Boolean(options.activityLoading),
    selectedResidentActivity: options.selectedResidentActivity
  });

  return {
    residents,
    selectedResidentId,
    selectedResident,
    selectedResidentRecordError: selectedResident?.recordError ?? null,
    counts: {
      total: residents.length,
      online: residents.filter((resident) => resident.truthState === 'online').length,
      stale: residents.filter((resident) => resident.truthState === 'stale').length,
      offline: residents.filter((resident) => resident.truthState === 'offline').length
    },
    surfaceStates: {
      rail: getRailSurfaceState({
        isInitialLoading,
        hasResidentsConfigured: records.length > 0,
        hasPartialFailures,
        allRecordsFailed
      }),
      summary: getSummarySurfaceState({
        isInitialLoading,
        selectedResident
      }),
      map: getMapSurfaceState({
        isInitialLoading,
        selectedResident
      }),
      decision: getDecisionSurfaceState({
        isInitialLoading,
        selectedResident,
        hasPartialFailures,
        allRecordsFailed
      })
    },
    activityState,
    hasPartialFailures,
    partialFailureCount,
    fetchedAt: snapshot?.fetchedAt ?? null,
    loadError: snapshot?.loadError ?? null
  };
}
