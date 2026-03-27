import { mongoUpstreamApi, type MongoUpstreamLatest } from '../services/api';

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
  fetchedAt: string | null;
  recentActivity: PositionActivityItem[];
  loadError: string | null;
};

export type PositionResidentViewModel = {
  residentId: string;
  displayName: string;
  deviceId: string;
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

export const POSITION_ONLINE_TTL_MS = 30_000;
export const POSITION_DELAYED_TTL_MS = 120_000;
export const POSITION_GRID_COLUMNS = 12;
export const POSITION_GRID_ROWS = 16;
export const POSITION_MAP_PIXEL_WIDTH = 600;
export const POSITION_MAP_PIXEL_HEIGHT = 800;
export const POSITION_ACTIVITY_PAGE_SIZE = 12;

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
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
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

// 兼容 ISO string 和 Mongo $date object。
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

function getCoords(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  key: 'current' | 'target'
): PositionPoint | null {
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

function humanizeZoneId(zoneId: PositionZoneId | null): string | null {
  if (!zoneId) return null;
  return zoneId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getZoneDisplayName(zoneId: PositionZoneId | null, zoneName: string | null): string | null {
  return zoneName ?? humanizeZoneId(zoneId);
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

function isConfirmedFallDescription(description: string | null): boolean {
  if (!description) return false;

  const normalized = description.toLowerCase();
  return (
    normalized.includes('confirmed') ||
    description.includes('确认跌倒') ||
    description.includes('確認跌倒')
  );
}

function getCurrentZoneName(data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null): string | null {
  const location = getSectionData(data, 'location');
  return normalizeText(getNestedValue(location, 'current.name'));
}

function getTargetZoneName(data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null): string | null {
  const location = getSectionData(data, 'location');
  return normalizeText(getNestedValue(location, 'target.name'));
}

// sensor.valid = false 时不把值当作 trustworthy metric。
function getSensorMetric(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  sensorKey: 'heart_rate' | 'spo2',
  valueKey: 'bpm' | 'percentage'
): number | null {
  const sensors = getSectionData(data, 'sensors');
  const valid = getNestedValue(sensors, `${sensorKey}.valid`);
  if (valid === false || valid === 'false') return null;
  const value = toFiniteNumber(getNestedValue(sensors, `${sensorKey}.${valueKey}`));
  if (value == null || value <= 0) return null;
  return value;
}

function getBatteryLevel(data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null): number | null {
  const system = getSectionData(data, 'system');
  const value = toFiniteNumber(getNestedValue(system, 'battery.level'));
  if (value == null) return null;
  return Math.max(0, Math.min(100, value));
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
  if (confirmed) {
    return { label: 'Confirmed fall', confirmed: true };
  }

  const state = toFiniteNumber(getNestedValue(fall, 'state'));
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

export function getRiskLevel(input: {
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

function hasAbnormalVitals(heartRate: number | null, spo2: number | null): boolean {
  return (heartRate != null && heartRate >= 110) || (spo2 != null && spo2 <= 92);
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
  return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
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

  if (sameZone || areCoordsEqual(input.currentCoords, input.targetCoords)) {
    return 'target-reached';
  }

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

export function sortPositionResidents(
  residents: PositionResidentViewModel[]
): PositionResidentViewModel[] {
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

function getActivityState(input: {
  selectedResident: PositionResidentViewModel | null;
  activityLoading: boolean;
  selectedResidentActivity?: PositionResidentActivitySnapshot | null;
}): PositionActivityState {
  if (!input.selectedResident) return 'empty';
  const activityMatchesSelectedResident =
    input.selectedResidentActivity?.deviceId === input.selectedResident.deviceId;

  if (activityMatchesSelectedResident && input.selectedResidentActivity?.loadError) return 'blocked';
  if (activityMatchesSelectedResident && input.selectedResidentActivity.recentActivity.length > 0) return 'ready';
  if (input.activityLoading && !activityMatchesSelectedResident) return 'loading';
  if (!input.selectedResident.hasData || input.selectedResident.recordError) return 'blocked';
  return 'empty';
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
  const currentZoneId = getPositionZoneFromCoords(currentCoords);
  const targetZoneId = getPositionZoneFromCoords(targetCoords);
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
  if (olderZone && newerZone) {
    return `Moved from ${olderZone} to ${newerZone}.`;
  }
  if (newerZone) {
    return `Current zone is now ${newerZone}.`;
  }
  return 'Current zone changed in upstream data.';
}

function buildTargetZoneDetail(olderZone: string | null, newerZone: string | null): string {
  if (olderZone && newerZone) {
    return `Target changed from ${olderZone} to ${newerZone}.`;
  }
  if (newerZone) {
    return `Target zone set to ${newerZone}.`;
  }
  return 'Target zone changed in upstream data.';
}

function buildVitalsWarningDetail(heartRate: number | null, spo2: number | null): string {
  if (heartRate != null && spo2 != null) {
    return `Heart rate ${heartRate} bpm and SpO2 ${spo2}%.`;
  }
  if (heartRate != null) {
    return `Heart rate ${heartRate} bpm entered warning range.`;
  }
  if (spo2 != null) {
    return `SpO2 ${spo2}% entered warning range.`;
  }
  return 'Vitals entered warning range.';
}

function createActivityItem(
  id: string,
  timestamp: string | null,
  tone: PositionActivityTone,
  title: string,
  detail: string
): PositionActivityItem {
  return {
    id,
    timestamp,
    tone,
    title,
    detail,
    source: 'mongo-upstream'
  };
}

export function buildPositionResidentActivity(historyDocs: unknown[]): PositionActivityItem[] {
  const records = normalizeHistoryDocuments(historyDocs)
    .map(buildHistoryRecord)
    .sort((a, b) => {
      const timeA = a.timestamp ? Date.parse(a.timestamp) : Number.NEGATIVE_INFINITY;
      const timeB = b.timestamp ? Date.parse(b.timestamp) : Number.NEGATIVE_INFINITY;
      return timeB - timeA;
    });

  if (records.length === 0) {
    return [];
  }

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
      items.push(
        createActivityItem(
          `${newer.id}-sos`,
          newer.timestamp,
          'critical',
          'SOS active',
          'Latest upstream state reports an active SOS signal.'
        )
      );
    }

    if (newer.fallConfirmed && !older?.fallConfirmed) {
      items.push(
        createActivityItem(
          `${newer.id}-fall`,
          newer.timestamp,
          'critical',
          'Confirmed fall',
          'Latest upstream state reports a confirmed fall.'
        )
      );
    }

    if (older && newerCurrentZone !== olderCurrentZone) {
      items.push(
        createActivityItem(
          `${newer.id}-zone`,
          newer.timestamp,
          'info',
          'Zone changed',
          buildZoneChangeDetail(olderCurrentZone, newerCurrentZone)
        )
      );
    }

    if (newerTargetZone && newerTargetZone !== olderTargetZone) {
      items.push(
        createActivityItem(
          `${newer.id}-target`,
          newer.timestamp,
          'info',
          'Target updated',
          buildTargetZoneDetail(olderTargetZone, newerTargetZone)
        )
      );
    }

    if (currentVitalsAbnormal && !olderVitalsAbnormal) {
      items.push(
        createActivityItem(
          `${newer.id}-vitals`,
          newer.timestamp,
          'warning',
          'Vitals warning',
          buildVitalsWarningDetail(newer.heartRate, newer.spo2)
        )
      );
    }
  }

  if (items.length === 0) {
    items.push(
      createActivityItem(
        `${records[0].id}-sync`,
        records[0].timestamp,
        'info',
        'Latest sync',
        'Status update received from device.'
      )
    );
  }

  return items.slice(0, 5);
}

export async function loadPositionResidentActivity(
  deviceId: string
): Promise<PositionResidentActivitySnapshot> {
  try {
    const response = (await mongoUpstreamApi.list({
      device_id: deviceId,
      data_type: 'status_update',
      page: 1,
      page_size: POSITION_ACTIVITY_PAGE_SIZE
    })) as { items?: unknown[] } | null;

    return {
      deviceId,
      fetchedAt: new Date().toISOString(),
      recentActivity: buildPositionResidentActivity(response?.items ?? []),
      loadError: null
    };
  } catch (error) {
    return {
      deviceId,
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
  const priorityBand = getPriorityBand({
    truthState,
    heartRate,
    spo2,
    sosState,
    fallConfirmed: fall.confirmed
  });
  const priorityReasonCode = getPriorityReasonCode({
    truthState,
    heartRate,
    spo2,
    sosState,
    fallConfirmed: fall.confirmed
  });
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
  if (!selectedResidentActivity) {
    return residents;
  }

  return residents.map((resident) => {
    if (resident.deviceId !== selectedResidentActivity.deviceId) {
      return resident;
    }

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
  } = {}
): PositionCommandCenterViewModel {
  const now = options.now ?? Date.now();
  const records =
    snapshot?.records ??
    POSITION_RESIDENT_REGISTRY.map((resident) => ({
      resident,
      latestStatus: null,
        error: null
      }));
  const baseResidents = records.map((record) => buildResidentViewModel(record, now));
  const residents = sortPositionResidents(
    applySelectedResidentActivity(baseResidents, options.selectedResidentActivity)
  );
  const { selectedResidentId, selectedResident } = resolvePositionSelection(
    residents,
    options.selectedResidentId
  );
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
