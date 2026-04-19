import {
  getPositionZoneDisplayForResident,
  type PositionResidentViewModel
} from '../adapters/position-command-center';
import i18n from '../i18n';
import { locationApi, userApi, type MongoUpstreamLatest } from '../services/api';
import type { BackendEvent, BackendLocation, BackendUser } from '../types/backend';
import type { FallAlertDetailRow, FallAlertKind } from '../types/fall-alert';

/** 从 MySQL 用户表 / 位置表解析的显示名（用于后端事件弹窗） */
export type FallAlertBackendLookups = {
  userNameByUserId: ReadonlyMap<number, string>;
  locationNameByZoneId: ReadonlyMap<number, string>;
};

let fallAlertLookupsCache: { at: number; data: FallAlertBackendLookups } | null = null;
const FALL_ALERT_LOOKUPS_TTL_MS = 60_000;

/** 拉取用户与位置区列表，供跌倒事件弹窗对齐 MySQL 显示名。 */
export async function fetchFallAlertBackendLookups(forceRefresh = false): Promise<FallAlertBackendLookups> {
  if (
    !forceRefresh &&
    fallAlertLookupsCache &&
    Date.now() - fallAlertLookupsCache.at < FALL_ALERT_LOOKUPS_TTL_MS
  ) {
    return fallAlertLookupsCache.data;
  }
  try {
    // 与 FastAPI Query(le=1000) 对齐；超出上限会导致 422，查表失败并回退为「用户 #n / 区域 #n」。
    const [usersRaw, locsRaw] = await Promise.all([
      userApi.list({ limit: 1000 }),
      locationApi.list({ limit: 1000 })
    ]);
    const users = Array.isArray(usersRaw) ? (usersRaw as BackendUser[]) : [];
    const locs = Array.isArray(locsRaw) ? (locsRaw as BackendLocation[]) : [];
    const userNameByUserId = new Map<number, string>();
    for (const u of users) {
      const nm = u.name?.trim();
      if (u.user_id != null && nm) userNameByUserId.set(u.user_id, nm);
    }
    const locationNameByZoneId = new Map<number, string>();
    for (const row of locs) {
      const nm = row.name?.trim();
      if (row.location_zone_id != null && nm) locationNameByZoneId.set(row.location_zone_id, nm);
    }
    const data: FallAlertBackendLookups = { userNameByUserId, locationNameByZoneId };
    fallAlertLookupsCache = { at: Date.now(), data };
    return data;
  } catch {
    const empty: FallAlertBackendLookups = { userNameByUserId: new Map(), locationNameByZoneId: new Map() };
    fallAlertLookupsCache = { at: Date.now(), data: empty };
    return empty;
  }
}

/** 定位页：从当前触发 SOS / 确认跌倒 的住民视图构建弹窗行 */
export function buildFallAlertRowsFromPositionResidents(
  residents: PositionResidentViewModel[],
  t: (key: string, opts?: Record<string, unknown>) => string
): FallAlertDetailRow[] {
  return residents.map((resident, index) => {
    const kinds: FallAlertKind[] = [];
    if (resident.sosState) kinds.push('sos');
    if (resident.fallConfirmed) kinds.push('fall');
    const triggeredAtIso = resident.lastSeenAt ?? new Date().toISOString();
    return {
      id: `${resident.deviceId}-${triggeredAtIso}-${index}`,
      deviceId: resident.deviceId,
      boundUser: resident.displayName,
      location: getPositionZoneDisplayForResident(resident, t),
      triggeredAtIso,
      kinds
    };
  });
}

/** 后端跌倒事件 → 弹窗行（event_params → MySQL 用户/位置名 → i18n 占位） */
export function buildFallAlertRowsFromBackendEvents(
  events: BackendEvent[],
  lookups?: FallAlertBackendLookups | null
): FallAlertDetailRow[] {
  return events.map((e, index) => {
    const params = e.event_params ?? {};
    const fromParamsUser =
      typeof params.user_name === 'string' && params.user_name.trim()
        ? params.user_name.trim()
        : typeof params.resident_name === 'string' && String(params.resident_name).trim()
          ? String(params.resident_name).trim()
          : '';
    const fromDbUser = lookups?.userNameByUserId.get(e.related_user_id)?.trim() ?? '';
    const userName =
      fromParamsUser ||
      fromDbUser ||
      i18n.t('fallAlert.fallbackUser', { id: e.related_user_id, defaultValue: `User #${e.related_user_id}` });
    const fromParamsLoc =
      typeof params.location_name === 'string' && params.location_name.trim()
        ? params.location_name.trim()
        : '';
    const zoneId = e.location_zone_id;
    const fromDbLoc =
      zoneId != null ? (lookups?.locationNameByZoneId.get(zoneId)?.trim() ?? '') : '';
    const location =
      fromParamsLoc ||
      fromDbLoc ||
      (zoneId != null
        ? i18n.t('fallAlert.fallbackZone', { id: zoneId, defaultValue: `Zone #${zoneId}` })
        : i18n.t('fallAlert.unknownDash', { defaultValue: '—' }));
    return {
      id: `event-${e.event_id}-${index}`,
      deviceId: String(e.trigger_device_id),
      boundUser: userName,
      location,
      triggeredAtIso: e.event_timestamp,
      kinds: ['fall'],
      sourceEventId: e.event_id
    };
  });
}

function readFlyCareLocation(data: MongoUpstreamLatest): string {
  const top = data.location as Record<string, unknown> | undefined;
  const payload = data.payload as Record<string, unknown> | undefined;
  const loc = (top ?? payload?.location) as Record<string, unknown> | undefined;
  const cur = loc?.current as Record<string, unknown> | undefined;
  const name = cur?.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return '—';
}

function flyCareKinds(data: MongoUpstreamLatest): FallAlertKind[] {
  const kinds: FallAlertKind[] = [];
  const sos = (data.sos ?? (data.payload as Record<string, unknown> | undefined)?.sos) as Record<string, unknown> | undefined;
  if (sos && (sos.active === true || sos.active === 'true')) kinds.push('sos');
  const fall = (data.fall_detection ??
    (data.payload as Record<string, unknown> | undefined)?.fall_detection) as Record<string, unknown> | undefined;
  const desc = typeof fall?.state_description === 'string' ? fall.state_description : '';
  const fallConfirmed =
    desc === '确认跌倒' ||
    desc.toLowerCase() === 'confirmed fall' ||
    fall?.is_fall_confirmed === true ||
    fall?.is_fall_confirmed === 'true';
  if (fallConfirmed) kinds.push('fall');
  return kinds;
}

/** 航班监护页：单设备上行摘要 */
export function buildFallAlertRowFromFlyCare(
  data: MongoUpstreamLatest,
  displayName: string | null
): FallAlertDetailRow {
  const deviceId = data.device_id != null ? String(data.device_id) : '—';
  const triggered =
    typeof data.server_received_at === 'string' && data.server_received_at.trim()
      ? data.server_received_at.trim()
      : new Date().toISOString();
  return {
    id: `${deviceId}-${triggered}`,
    deviceId,
    boundUser: displayName?.trim() || '—',
    location: readFlyCareLocation(data),
    triggeredAtIso: triggered,
    kinds: flyCareKinds(data)
  };
}
