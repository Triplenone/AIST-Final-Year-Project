import {
  getPositionZoneFromCoords,
  getPositionZoneLabelKey,
  getPositionZoneDisplayForResident,
  type PositionResidentViewModel
} from '../adapters/position-command-center';
import i18n from '../i18n';
import { locationApi, userApi } from '../services/api';
import type { BackendEvent, BackendLocation, BackendUser } from '../types/backend';
import type { FallAlertDetailRow, FallAlertKind } from '../types/fall-alert';

export type FallAlertBackendLookups = {
  userNameByUserId: ReadonlyMap<number, string>;
  locationNameByZoneId: ReadonlyMap<number, string>;
  latestLocationByDeviceId: ReadonlyMap<string, string>;
};

let fallAlertLookupsCache: { at: number; data: FallAlertBackendLookups } | null = null;
const FALL_ALERT_LOOKUPS_TTL_MS = 60_000;

function normalizeDeviceId(value: unknown): string {
  return String(value ?? '').trim();
}

function resolveLocationFromLatestXY(x: unknown, y: unknown): string | null {
  const xNum = typeof x === 'number' ? x : Number(x);
  const yNum = typeof y === 'number' ? y : Number(y);
  if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) return null;

  const zoneId = getPositionZoneFromCoords({ x: xNum, y: yNum });
  if (!zoneId) return null;

  const labelKey = getPositionZoneLabelKey(zoneId);
  if (!labelKey) return null;

  return i18n.t(labelKey, { defaultValue: zoneId });
}

export async function fetchFallAlertBackendLookups(
  forceRefresh = false,
  deviceIds: readonly string[] = []
): Promise<FallAlertBackendLookups> {
  if (
    deviceIds.length === 0 &&
    !forceRefresh &&
    fallAlertLookupsCache &&
    Date.now() - fallAlertLookupsCache.at < FALL_ALERT_LOOKUPS_TTL_MS
  ) {
    return fallAlertLookupsCache.data;
  }

  try {
    const [usersRaw, locsRaw] = await Promise.all([
      userApi.list({ limit: 1000 }),
      locationApi.list({ limit: 1000 })
    ]);
    const users = Array.isArray(usersRaw) ? (usersRaw as BackendUser[]) : [];
    const locs = Array.isArray(locsRaw) ? (locsRaw as BackendLocation[]) : [];

    const userNameByUserId = new Map<number, string>();
    for (const user of users) {
      const name = user.name?.trim();
      if (user.user_id != null && name) {
        userNameByUserId.set(user.user_id, name);
      }
    }

    const locationNameByZoneId = new Map<number, string>();
    for (const location of locs) {
      const name = location.name?.trim();
      if (location.location_zone_id != null && name) {
        locationNameByZoneId.set(location.location_zone_id, name);
      }
    }

    const latestLocationByDeviceId = new Map<string, string>();
    const uniqueDeviceIds = Array.from(
      new Set(deviceIds.map((id) => normalizeDeviceId(id)).filter((id) => id.length > 0))
    );
    if (uniqueDeviceIds.length > 0) {
      const { mongoUpstreamApi } = await import('../services/api');
      const results = await Promise.allSettled(
        uniqueDeviceIds.map((id) => mongoUpstreamApi.getLatestValidLocation(id))
      );

      for (let i = 0; i < results.length; i += 1) {
        const result = results[i];
        const fallbackKey = uniqueDeviceIds[i];
        if (result.status !== 'fulfilled') continue;

        const payload = result.value;
        if (!payload?.found) continue;

        const rawLocationName = typeof payload.location_name === 'string' ? payload.location_name.trim() : '';
        const resolvedName = rawLocationName || resolveLocationFromLatestXY(payload.x, payload.y);
        if (!resolvedName) continue;

        const keyCandidates = [
          fallbackKey,
          normalizeDeviceId(payload.device_id),
          normalizeDeviceId(payload.mysql_device_id)
        ].filter((key) => key.length > 0);
        for (const key of keyCandidates) {
          latestLocationByDeviceId.set(key, resolvedName);
        }
      }
    }

    const data: FallAlertBackendLookups = { userNameByUserId, locationNameByZoneId, latestLocationByDeviceId };
    fallAlertLookupsCache = { at: Date.now(), data };
    return data;
  } catch {
    const empty: FallAlertBackendLookups = {
      userNameByUserId: new Map(),
      locationNameByZoneId: new Map(),
      latestLocationByDeviceId: new Map()
    };
    fallAlertLookupsCache = { at: Date.now(), data: empty };
    return empty;
  }
}

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

export function buildFallAlertRowsFromBackendEvents(
  events: BackendEvent[],
  lookups?: FallAlertBackendLookups | null
): FallAlertDetailRow[] {
  return events.map((event, index) => {
    const params = event.event_params ?? {};
    const fromParamsUser =
      typeof params.user_name === 'string' && params.user_name.trim()
        ? params.user_name.trim()
        : typeof params.resident_name === 'string' && String(params.resident_name).trim()
          ? String(params.resident_name).trim()
          : '';
    const fromDbUser = lookups?.userNameByUserId.get(event.related_user_id)?.trim() ?? '';
    const userName =
      fromParamsUser ||
      fromDbUser ||
      i18n.t('fallAlert.fallbackUser', {
        id: event.related_user_id,
        defaultValue: `User #${event.related_user_id}`
      });

    const fromParamsLoc =
      typeof params.location_name === 'string' && params.location_name.trim()
        ? params.location_name.trim()
        : '';
    const zoneId = event.location_zone_id;
    const fromDbLoc = zoneId != null ? (lookups?.locationNameByZoneId.get(zoneId)?.trim() ?? '') : '';
    const fallbackLocation =
      fromParamsLoc ||
      fromDbLoc ||
      (zoneId != null
        ? i18n.t('fallAlert.fallbackZone', { id: zoneId, defaultValue: `Zone #${zoneId}` })
        : i18n.t('fallAlert.unknownDash', { defaultValue: 'Unknown' }));

    const deviceIdText = String(event.trigger_device_id);
    const location = lookups?.latestLocationByDeviceId?.get(deviceIdText)?.trim() || fallbackLocation;
    return {
      id: `event-${event.event_id}-${index}`,
      deviceId: deviceIdText,
      boundUser: userName,
      location,
      triggeredAtIso: event.event_timestamp,
      kinds: event.event_type === 'sos' ? ['sos'] : ['fall'],
      sourceEventId: event.event_id
    };
  });
}
