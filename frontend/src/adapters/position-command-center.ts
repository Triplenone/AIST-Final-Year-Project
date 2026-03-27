import { mongoUpstreamApi, type MongoUpstreamLatest } from '../services/api';

export type PositionTruthState = 'online' | 'stale' | 'offline';
export type PositionFreshnessLevel = 'live' | 'delayed' | 'stale';
export type PositionRiskLevel = 'stable' | 'warning' | 'critical';
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

export type PositionPoint = {
  x: number;
  y: number;
};

export type PositionResidentRegistryEntry = {
  residentId: string;
  displayName: string;
  deviceId: string;
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

export type PositionResidentViewModel = {
  residentId: string;
  displayName: string;
  deviceId: string;
  isOnline: boolean;
  truthState: PositionTruthState;
  freshnessLevel: PositionFreshnessLevel;
  riskLevel: PositionRiskLevel;
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
};

export type PositionCommandCenterViewModel = {
  residents: PositionResidentViewModel[];
  selectedResidentId: string | null;
  selectedResident: PositionResidentViewModel | null;
  counts: {
    total: number;
    online: number;
    stale: number;
    offline: number;
  };
  fetchedAt: string | null;
  loadError: string | null;
};

export const POSITION_ONLINE_TTL_MS = 30_000;
export const POSITION_DELAYED_TTL_MS = 120_000;
export const POSITION_GRID_COLUMNS = 12;
export const POSITION_GRID_ROWS = 16;
export const POSITION_MAP_PIXEL_WIDTH = 600;
export const POSITION_MAP_PIXEL_HEIGHT = 800;

export const POSITION_RESIDENT_REGISTRY: readonly PositionResidentRegistryEntry[] = [
  {
    residentId: 'TestUser01',
    displayName: 'TestUser01',
    deviceId: 'ESP32_00005CFA7AD4DB1C'
  }
];

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

export const POSITION_GRID_TO_ZONE: readonly (readonly string[])[] = [
  ['nurse_station', 'nurse_station', 'nurse_station', 'nurse_station', 'activity_room', 'activity_room', 'activity_room', 'activity_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room'],
  ['door1', 'nurse_station', 'nurse_station', 'nurse_station', 'activity_room', 'activity_room', 'activity_room', 'activity_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room'],
  ['nurse_station', 'nurse_station', 'nurse_station', 'nurse_station', 'activity_room', 'activity_room', 'activity_room', 'activity_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room'],
  ['nurse_station', 'nurse_station', 'nurse_station', 'nurse_station', 'activity_room', 'activity_room', 'activity_room', 'activity_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'toilet', 'toilet', 'toilet', 'toilet'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'toilet', 'toilet', 'toilet', 'toilet'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'toilet', 'toilet', 'toilet', 'toilet'],
  ['door2', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'toilet', 'toilet', 'toilet', 'toilet'],
  [' ', ' ', ' ', ' ', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom'],
  [' ', ' ', ' ', ' ', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom'],
  [' ', ' ', ' ', ' ', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom'],
  [' ', ' ', ' ', ' ', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom']
];

function getSectionData(
  data: MongoUpstreamLatest | null,
  key: 'location' | 'fall_detection' | 'sos' | 'sensors' | 'system'
): Record<string, unknown> | null {
  if (!data) return null;
  const topLevel = data[key];
  if (topLevel != null && typeof topLevel === 'object') {
    return topLevel as Record<string, unknown>;
  }
  const payload = data.payload;
  const nested = payload?.[key];
  if (nested != null && typeof nested === 'object') {
    return nested as Record<string, unknown>;
  }
  return null;
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

// 统一 timestamp parser，兼容 ISO string 和 Mongo $date object。
export function parsePositionTimestamp(value: unknown): number | null {
  const normalized = normalizeDateValue(value);
  if (normalized == null) return null;
  const parsed = new Date(normalized).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoTimestamp(value: unknown): string | null {
  const parsed = parsePositionTimestamp(value);
  return parsed == null ? null : new Date(parsed).toISOString();
}

function getCoords(data: MongoUpstreamLatest | null, key: 'current' | 'target'): PositionPoint | null {
  const location = getSectionData(data, 'location');
  const x = toFiniteNumber(getNestedValue(location, `${key}.x`));
  const y = toFiniteNumber(getNestedValue(location, `${key}.y`));
  if (x == null || y == null) return null;
  return { x, y };
}

export function getPositionZoneFromCoords(coords: PositionPoint | null): PositionZoneId | null {
  if (!coords) return null;
  const col = Math.min(POSITION_GRID_COLUMNS - 1, Math.max(0, Math.round(coords.x)));
  const row = Math.min(POSITION_GRID_ROWS - 1, Math.max(0, Math.round(coords.y)));
  const zoneId = POSITION_GRID_TO_ZONE[row]?.[col] ?? '';
  if (!zoneId || zoneId.trim() === '') return null;
  return zoneId as PositionZoneId;
}

export function getPositionZoneLabelKey(zoneId: PositionZoneId | null): string | null {
  if (!zoneId) return null;
  return POSITION_ZONES.find((zone) => zone.id === zoneId)?.labelKey ?? null;
}

export function gridIndicesToPixelPercent(coords: PositionPoint): { leftPercent: number; topPercent: number } {
  const col = Math.min(POSITION_GRID_COLUMNS - 1, Math.max(0, Math.round(coords.x)));
  const row = Math.min(POSITION_GRID_ROWS - 1, Math.max(0, Math.round(coords.y)));
  const pixelX = ((col + 0.5) / POSITION_GRID_COLUMNS) * POSITION_MAP_PIXEL_WIDTH;
  const pixelY = ((row + 0.5) / POSITION_GRID_ROWS) * POSITION_MAP_PIXEL_HEIGHT;
  return {
    leftPercent: (pixelX / POSITION_MAP_PIXEL_WIDTH) * 100,
    topPercent: (pixelY / POSITION_MAP_PIXEL_HEIGHT) * 100
  };
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getCurrentZoneName(data: MongoUpstreamLatest | null): string | null {
  const location = getSectionData(data, 'location');
  return normalizeText(getNestedValue(location, 'current.name'));
}

function getTargetZoneName(data: MongoUpstreamLatest | null): string | null {
  const location = getSectionData(data, 'location');
  return normalizeText(getNestedValue(location, 'target.name'));
}

// sensor.valid 为 false 时不把数值当成 trustworthy metric。
function getSensorMetric(data: MongoUpstreamLatest | null, sensorKey: 'heart_rate' | 'spo2', valueKey: 'bpm' | 'percentage'): number | null {
  const sensors = getSectionData(data, 'sensors');
  const valid = getNestedValue(sensors, `${sensorKey}.valid`);
  if (valid === false || valid === 'false') return null;
  const value = toFiniteNumber(getNestedValue(sensors, `${sensorKey}.${valueKey}`));
  if (value == null || value <= 0) return null;
  return value;
}

function getBatteryLevel(data: MongoUpstreamLatest | null): number | null {
  const system = getSectionData(data, 'system');
  const value = toFiniteNumber(getNestedValue(system, 'battery.level'));
  if (value == null) return null;
  return Math.max(0, Math.min(100, value));
}

function normalizeFallState(data: MongoUpstreamLatest | null): { label: string | null; confirmed: boolean } {
  const fall = getSectionData(data, 'fall_detection');
  const confirmed =
    toBoolean(getNestedValue(fall, 'is_fall_confirmed')) ||
    toBoolean(getNestedValue(fall, 'confirmed')) ||
    normalizeText(getNestedValue(fall, 'state_description'))?.toLowerCase().includes('confirmed') === true;
  if (confirmed) {
    return { label: 'Confirmed fall', confirmed: true };
  }

  const state = toFiniteNumber(getNestedValue(fall, 'state'));
  const description = normalizeText(getNestedValue(fall, 'state_description'));
  if (state === 0) {
    return { label: 'Normal', confirmed: false };
  }
  if (description) {
    return { label: description, confirmed: false };
  }
  if (state != null) {
    return { label: `State ${state}`, confirmed: false };
  }
  return { label: null, confirmed: false };
}

function getTruthState(hasData: boolean, lastSeenAgeMs: number | null, requestError: string | null): PositionTruthState {
  if (!hasData || requestError) return 'offline';
  if (lastSeenAgeMs == null) return 'stale';
  return lastSeenAgeMs <= POSITION_ONLINE_TTL_MS ? 'online' : 'stale';
}

function getFreshnessLevel(lastSeenAgeMs: number | null): PositionFreshnessLevel {
  if (lastSeenAgeMs == null) return 'stale';
  if (lastSeenAgeMs <= POSITION_ONLINE_TTL_MS) return 'live';
  if (lastSeenAgeMs <= POSITION_DELAYED_TTL_MS) return 'delayed';
  return 'stale';
}

function getRiskLevel(input: {
  truthState: PositionTruthState;
  heartRate: number | null;
  spo2: number | null;
  sosState: boolean;
  fallConfirmed: boolean;
}): PositionRiskLevel {
  if (input.sosState || input.fallConfirmed) return 'critical';
  if (input.truthState !== 'online') return 'warning';
  if (input.heartRate != null && input.heartRate >= 110) return 'warning';
  if (input.spo2 != null && input.spo2 <= 92) return 'warning';
  return 'stable';
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

function getNextActionCode(truthState: PositionTruthState, riskLevel: PositionRiskLevel): PositionNextActionCode {
  if (riskLevel === 'critical') return 'escalate-care';
  if (truthState === 'offline') return 'verify-device-link';
  if (truthState === 'stale' || riskLevel === 'warning') return 'verify-upstream';
  return 'continue-monitoring';
}

function compareResidents(a: PositionResidentViewModel, b: PositionResidentViewModel): number {
  const riskPriority: Record<PositionRiskLevel, number> = {
    critical: 0,
    warning: 1,
    stable: 2
  };
  const truthPriority: Record<PositionTruthState, number> = {
    online: 0,
    stale: 1,
    offline: 2
  };
  const riskDiff = riskPriority[a.riskLevel] - riskPriority[b.riskLevel];
  if (riskDiff !== 0) return riskDiff;

  const truthDiff = truthPriority[a.truthState] - truthPriority[b.truthState];
  if (truthDiff !== 0) return truthDiff;

  const timeA = a.lastSeenAt ? Date.parse(a.lastSeenAt) : Number.NEGATIVE_INFINITY;
  const timeB = b.lastSeenAt ? Date.parse(b.lastSeenAt) : Number.NEGATIVE_INFINITY;
  if (timeA !== timeB) return timeB - timeA;

  return a.displayName.localeCompare(b.displayName);
}

function isLatestDocument(data: unknown): data is MongoUpstreamLatest {
  return Boolean(data && typeof data === 'object' && (((data as MongoUpstreamLatest).device_id ?? null) != null || (data as MongoUpstreamLatest)._id));
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed';
}

export async function loadPositionCommandCenterSnapshot(): Promise<PositionCommandCenterSnapshot> {
  const records = await Promise.all(
    POSITION_RESIDENT_REGISTRY.map(async (resident): Promise<PositionSnapshotRecord> => {
      try {
        const response = await mongoUpstreamApi.getLatest({
          data_type: 'status_update',
          device_id: resident.deviceId
        });
        return {
          resident,
          latestStatus: isLatestDocument(response) ? response : null,
          error: null
        };
      } catch (error) {
        return {
          resident,
          latestStatus: null,
          error: normalizeError(error)
        };
      }
    })
  );

  const failed = records.filter((record) => record.error);
  const loadError =
    failed.length === records.length
      ? failed[0]?.error ?? 'Request failed'
      : null;

  return {
    fetchedAt: new Date().toISOString(),
    records,
    loadError
  };
}

function buildResidentViewModel(record: PositionSnapshotRecord, now: number): PositionResidentViewModel {
  const latestStatus = record.latestStatus;
  const currentCoords = getCoords(latestStatus, 'current');
  const targetCoords = getCoords(latestStatus, 'target');
  const currentZoneId = getPositionZoneFromCoords(currentCoords);
  const targetZoneId = getPositionZoneFromCoords(targetCoords);
  const currentZoneLabelKey = getPositionZoneLabelKey(currentZoneId);
  const targetZoneLabelKey = getPositionZoneLabelKey(targetZoneId);
  const currentZoneName = getCurrentZoneName(latestStatus);
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
  const riskLevel = getRiskLevel({
    truthState,
    heartRate,
    spo2,
    sosState,
    fallConfirmed: fall.confirmed
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
    isOnline: truthState === 'online',
    truthState,
    freshnessLevel,
    riskLevel,
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
    nextActionCode: getNextActionCode(truthState, riskLevel)
  };
}

export function buildPositionCommandCenterViewModel(
  snapshot: PositionCommandCenterSnapshot | null,
  options: { selectedResidentId?: string | null; now?: number } = {}
): PositionCommandCenterViewModel {
  const now = options.now ?? Date.now();
  const records =
    snapshot?.records ??
    POSITION_RESIDENT_REGISTRY.map((resident) => ({
      resident,
      latestStatus: null,
      error: null
    }));
  const residents = records.map((record) => buildResidentViewModel(record, now)).sort(compareResidents);
  const selectedResident =
    residents.find((resident) => resident.residentId === options.selectedResidentId) ??
    residents[0] ??
    null;

  return {
    residents,
    selectedResidentId: selectedResident?.residentId ?? null,
    selectedResident,
    counts: {
      total: residents.length,
      online: residents.filter((resident) => resident.truthState === 'online').length,
      stale: residents.filter((resident) => resident.truthState === 'stale').length,
      offline: residents.filter((resident) => resident.truthState === 'offline').length
    },
    fetchedAt: snapshot?.fetchedAt ?? null,
    loadError: snapshot?.loadError ?? null
  };
}
