import { deviceApi, locationApi, mongoUpstreamApi, userApi, type MongoUpstreamLatest } from '../services/api';
import type { BackendDevice, BackendLocation, BackendUser } from '../types/backend';

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

/** 距 `server_received_at` 小于等于该值视为在线 / live（方案 A：放宽以适配常见心跳间隔，原 30s 过严）。 */
export const POSITION_ONLINE_TTL_MS = 90_000;
/** 超过在线窗口且小于等于该值为 delayed；再大则为 stale 新鲜度。 */
export const POSITION_DELAYED_TTL_MS = 180_000;
export const POSITION_GRID_COLUMNS = 12;
export const POSITION_GRID_ROWS = 16;
export const POSITION_MAP_PIXEL_WIDTH = 600;
export const POSITION_MAP_PIXEL_HEIGHT = 800;
export const POSITION_ACTIVITY_PAGE_SIZE = 12;

/** 定位页跟踪的 MySQL `device.device_id` 列表（与 Mongo 上行通过下方映射关联）。 */
export const POSITION_TRACKED_MYSQL_DEVICE_IDS: readonly number[] = [1, 2];

/**
 * MySQL 设备 id → Mongo `device_raw_upstream` 顶层 `device_id` 字符串。
 * 请与 `backend/backend/config/device_id_map.json` 中 `mysql_device_id` / `mongodb_device_id` 保持一致。
 */
export const POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID: Readonly<Record<number, string>> = {
  1: 'ESP32_0000E03948D4DB1C',
  2: 'ESP32_00005CFA7AD4DB1C'
};

export const POSITION_RESIDENT_REGISTRY: readonly PositionResidentRegistryEntry[] = [
  {
    residentId: 'TestUser01',
    displayName: 'test-user01',
    deviceId: 'ESP32_0000E03948D4DB1C'
  },
  {
    residentId: 'TestUser02',
    displayName: 'test-user02',
    deviceId: 'ESP32_00005CFA7AD4DB1C'
  }
];

function clonePositionRegistryFallback(): PositionResidentRegistryEntry[] {
  return POSITION_RESIDENT_REGISTRY.map((entry) => ({ ...entry }));
}

/**
 * 从后端加载「设备 → 绑定老人」：展示名与 MySQL `user.name` 一致（如 test-user04）；`residentId` 为 `user_id` 字符串。
 * 失败或未绑定时回退到 {@link POSITION_RESIDENT_REGISTRY}。
 */
export async function resolvePositionResidentRegistry(): Promise<PositionResidentRegistryEntry[]> {
  const out: PositionResidentRegistryEntry[] = [];

  try {
    for (let index = 0; index < POSITION_TRACKED_MYSQL_DEVICE_IDS.length; index += 1) {
      const mysqlDeviceId = POSITION_TRACKED_MYSQL_DEVICE_IDS[index];
      const deviceOrdinal = index + 1;
      const mongoDeviceId = POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[mysqlDeviceId];
      if (!mongoDeviceId) continue;

      let device: BackendDevice | null = null;
      try {
        device = (await deviceApi.get(mysqlDeviceId)) as unknown as BackendDevice;
      } catch {
        device = null;
      }
      if (!device) continue;

      const uid = device.elderly_user_id;
      if (uid != null && uid > 0) {
        try {
          const user = (await userApi.get(uid)) as unknown as BackendUser;
          const displayName = (user.name && user.name.trim()) || `User ${uid}`;
          out.push({
            residentId: String(user.user_id),
            displayName,
            deviceId: mongoDeviceId
          });
        } catch {
          out.push({
            residentId: `device-${mysqlDeviceId}`,
            displayName: `设备 #${mysqlDeviceId}（设备${deviceOrdinal} · 用户不可读）`,
            deviceId: mongoDeviceId
          });
        }
      } else {
        out.push({
          residentId: `device-${mysqlDeviceId}`,
          displayName: `未绑定（设备${deviceOrdinal}）`,
          deviceId: mongoDeviceId
        });
      }
    }
  } catch {
    return clonePositionRegistryFallback();
  }

  if (out.length === 0) {
    return clonePositionRegistryFallback();
  }
  return out;
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

/**
 * 网格 zone id → MySQL `location_zone.location_zone_id`（与后台位置管理默认数据一致）。
 * 未在网格中的区域（如 corridor / 测试房间）可由上游 `location.current.location_zone_id` 命中名称。
 */
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

let mysqlLocationZoneNamesById: ReadonlyMap<number, string> | null = null;
let mysqlLocationNamesLoadPromise: Promise<void> | null = null;

/** 加载 `/locations` 名称表，供定位页与 MySQL 位置管理对齐；失败时视为空表。 */
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
      const m = new Map<number, string>();
      for (const row of rows) {
        const id = row.location_zone_id;
        const nm = row.name?.trim();
        if (id != null && nm) m.set(id, nm);
      }
      mysqlLocationZoneNamesById = m;
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

/**
 * 读取顶层或 payload 下的同名块并浅合并（payload 先、顶层后覆盖）。
 * 避免顶层 `sensors: {}` 占位时挡住 `payload.sensors` 中的心率/血氧。
 */
function getSectionData(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  key: 'location' | 'fall_detection' | 'sos' | 'sensors' | 'system'
): Record<string, unknown> | null {
  if (!data) return null;
  const topObj = asObjectRecord(data[key]);
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
  const topV = asObjectRecord((data as Record<string, unknown>).vitals);
  const payloadObj = asObjectRecord(data.payload);
  const nestedV = payloadObj ? asObjectRecord(payloadObj.vitals) : null;
  if (!topV && !nestedV) return null;
  if (!nestedV) return topV;
  if (!topV) return nestedV;
  return { ...nestedV, ...topV };
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

/**
 * 与定位页信息面板「当前位置」及地图区名规则对齐：MySQL/上游区名优先，其次 labelKey → i18n，再按 zoneId 查表翻译。
 */
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
    const zone = POSITION_ZONES.find((item) => item.id === resident.currentZoneId);
    if (zone) {
      return t(zone.labelKey, { defaultValue: resident.currentZoneName ?? zone.id });
    }
    return resident.currentZoneId;
  }
  return t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
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

function getMysqlLocationZoneIdFromUpstream(
  latestStatus: MongoUpstreamLatest | null,
  positionZoneId: PositionZoneId | null
): number | null {
  const loc = getSectionData(latestStatus, 'location');
  const currentRaw = loc ? getNestedValue(loc, 'current') : undefined;
  const current = asObjectRecord(currentRaw);
  if (current) {
    const id =
      parsePositiveIntLocation(current.location_zone_id) ??
      parsePositiveIntLocation(current.zone_id) ??
      parsePositiveIntLocation(current.locationZoneId);
    if (id != null) return id;
  }
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
    return map.get(mysqlId) ?? null;
  }
  return upstreamName;
}

function firstNonNegativeNumber(...candidates: unknown[]): number | null {
  for (const c of candidates) {
    const n = toFiniteNumber(c);
    if (n != null && Number.isFinite(n) && n >= 0) return n;
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

/** 与 Mongo `sensors` / `payload.sensors` / `vitals` 常见形态对齐；含 0 也返回（不再因 valid:false 整段丢弃）。 */
function getSensorMetric(
  data: MongoUpstreamLatest | MongoUpstreamHistoryDocument | null,
  sensorKey: 'heart_rate' | 'spo2',
  valueKey: 'bpm' | 'percentage'
): number | null {
  const sensors = getSectionData(data, 'sensors');
  const vitals = getPayloadVitals(data);

  if (sensorKey === 'heart_rate') {
    if (sensors) {
      const fromBlock =
        readHeartRateLikeBlock(sensors.heart_rate) ?? readHeartRateLikeBlock(sensors.heartRate);
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

function cloneUpstreamDoc(doc: MongoUpstreamLatest): MongoUpstreamLatest {
  return JSON.parse(JSON.stringify(doc)) as MongoUpstreamLatest;
}

/** 合并多条上行中的 sensors（时间新的覆盖同名键），用于定位页同时展示位置与心率/血氧。 */
function mergeSensorSectionsFromDocs(docs: MongoUpstreamLatest[]): Record<string, unknown> | null {
  if (docs.length === 0) return null;
  const sortedAsc = [...docs].sort(
    (a, b) =>
      (parsePositionTimestamp(a.server_received_at) ?? 0) -
      (parsePositionTimestamp(b.server_received_at) ?? 0)
  );
  let merged: Record<string, unknown> = {};
  for (const doc of sortedAsc) {
    const s = getSectionData(doc, 'sensors');
    if (s && typeof s === 'object') {
      merged = { ...merged, ...s };
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

/** 用最新一条为骨架，合并其它文档中的 sensors，避免只查 status_update 时漏掉 heartbeat 上的体征。 */
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
  if (mergedSensors) {
    primary.sensors = mergedSensors as MongoUpstreamLatest['sensors'];
  }
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
  if (
    activityMatchesSelectedResident &&
    (input.selectedResidentActivity?.recentActivity?.length ?? 0) > 0
  ) {
    return 'ready';
  }
  if (input.activityLoading && !activityMatchesSelectedResident) return 'loading';
  if (!input.selectedResident.hasData || input.selectedResident.recordError) return 'blocked';
  return 'empty';
}

export async function loadPositionCommandCenterSnapshot(
  registry: readonly PositionResidentRegistryEntry[] = POSITION_RESIDENT_REGISTRY
): Promise<PositionCommandCenterSnapshot> {
  await ensurePositionMysqlLocationZoneNames();
  const list = registry.length > 0 ? [...registry] : clonePositionRegistryFallback();
  const records = await Promise.all(
    list.map(async (resident): Promise<PositionSnapshotRecord> => {
      try {
        const deviceId = resident.deviceId;
        const settled = await Promise.allSettled([
          mongoUpstreamApi.getLatest({ device_id: deviceId, exclude_data_type: 'flight' }),
          mongoUpstreamApi.getLatest({ device_id: deviceId, data_type: 'status_update' }),
          mongoUpstreamApi.getLatest({ device_id: deviceId, data_type: 'heartbeat' }),
          mongoUpstreamApi.getLatest({ device_id: deviceId, data_type: 'vitals' })
        ]);
        const docs: MongoUpstreamLatest[] = [];
        for (const r of settled) {
          if (r.status !== 'fulfilled') continue;
          const value = r.value as unknown;
          if (isLatestDocument(value)) {
            docs.push(value);
          }
        }
        const merged = mergeUpstreamDocsForPosition(docs);
        return {
          resident,
          latestStatus: merged,
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
  return historyDocs.filter((doc): doc is MongoUpstreamHistoryDocument => {
    if (!doc || typeof doc !== 'object') return false;
    const dt = (doc as MongoUpstreamHistoryDocument).data_type;
    if (dt === 'flight') return false;
    return true;
  });
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
    /** snapshot 为空时用于占位行（须与 load 快照时使用的登记册一致）。 */
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
