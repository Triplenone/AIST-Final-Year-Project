import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
// import agentImg from '../img/agent.png';
import agentImg from '../img/ElderlyCare.png';
import { mongoUpstreamApi, type MongoUpstreamLatest } from '../services/api';

/**
 * 预设用户与设备绑定，用于判断「在线」与后续多用户点选。
 * 收到某 device_id 的上行数据时，对应用户视为在线。
 * 扩展多用户时在此追加项，左侧列表点选后用 selectedUser 控制右侧与图中展示对象。
 */
const PRESET_USERS = [
  { id: 'TestUser01', name: 'TestUser01', deviceId: 'ESP32_00005CFA7AD4DB1C' },
] as const;

/** 区域列表（8 个地点）：用于根据坐标解析地点名称，labelKey 对应 i18n position.zone.* */
const ZONES = [
  { id: 'door1', labelKey: 'position.zone.door1' },
  { id: 'door2', labelKey: 'position.zone.door2' },
  { id: 'nurse_station', labelKey: 'position.zone.nurse_station' },
  { id: 'activity_room', labelKey: 'position.zone.activity_room' },
  { id: 'rehabilitation_room', labelKey: 'position.zone.rehabilitation_room' },
  { id: 'central_common_area', labelKey: 'position.zone.central_common_area' },
  { id: 'toilet', labelKey: 'position.zone.toilet' },
  { id: 'bedroom', labelKey: 'position.zone.bedroom' },
] as const;

/** 宽高比 12:16，即 12 列 × 16 行 */
const COLS = 12;
const ROWS = 16;
const MAP_PIXEL_WIDTH = 600;
const MAP_PIXEL_HEIGHT = 800;

/**
 * 16 行 × 12 列，与平面图对应：行 0 = 顶部，行 15 = 底部；列 0 = 左，列 11 = 右。
 * 用于根据网格坐标解析 zone id，得到地点名称（步骤 4）。可用的 id：door1 | door2 | nurse_station | activity_room | rehabilitation_room | central_common_area | toilet | bedroom，空格 ' ' 表示未分配。
 * 具体每格对应哪个地点请在此手动调整。
 */
const GRID_TO_ZONE: string[][] = [
  ['nurse_station', 'nurse_station', 'nurse_station', 'nurse_station', 'activity_room', 'activity_room', 'activity_room', 'activity_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room'],
  ['door1'        , 'nurse_station', 'nurse_station', 'nurse_station', 'activity_room', 'activity_room', 'activity_room', 'activity_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room'],
  ['nurse_station', 'nurse_station', 'nurse_station', 'nurse_station', 'activity_room', 'activity_room', 'activity_room', 'activity_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room'],
  ['nurse_station', 'nurse_station', 'nurse_station', 'nurse_station', 'activity_room', 'activity_room', 'activity_room', 'activity_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room', 'rehabilitation_room'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'toilet', 'toilet', 'toilet', 'toilet'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'toilet', 'toilet', 'toilet', 'toilet'],
  ['central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'toilet', 'toilet', 'toilet', 'toilet'],
  ['door2'              , 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'central_common_area', 'toilet', 'toilet', 'toilet', 'toilet'],
  [' ', ' ', ' ', ' ', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom'],
  [' ', ' ', ' ', ' ', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom'],
  [' ', ' ', ' ', ' ', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom'],
  [' ', ' ', ' ', ' ', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom', 'bedroom'],
];

/**
 * 从上行 JSON 中读取 current.x / current.y（个位整数，一般为网格下标 0–11 / 0–15，12 列 16 行）。
 * 兼容顶层 location.current 与 payload.location.current。
 * 维护说明：若后端改为下发像素坐标 0–600/0–800，可在此做单位判断或直接返回像素再在步骤 3 中不再换算。
 */
function getCurrentCoords(data: MongoUpstreamLatest | null): { x: number; y: number } | null {
  const loc = getSectionData(data, 'location') as { current?: { x?: number; y?: number } } | null | undefined;
  const current = loc?.current;
  if (current == null || typeof current.x !== 'number' || typeof current.y !== 'number') return null;
  const x = Number(current.x);
  const y = Number(current.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/**
 * 步骤 3：将网格坐标换算为 600×800 像素坐标系下的位置，再转为地图容器内的百分比，用于红点定位。
 * 约定：JSON 的 x,y 为个位整数，此处按网格下标处理（x 0–11，y 0–15），换算到像素中心后得到 left/top 百分比。
 * 若后端改为直接下发 0–600/0–800 像素，可改为：leftPercent = (x / MAP_PIXEL_WIDTH) * 100, topPercent = (y / MAP_PIXEL_HEIGHT) * 100。
 */
function gridIndicesToPixelPercent(x: number, y: number): { leftPercent: number; topPercent: number } {
  const col = Math.min(COLS - 1, Math.max(0, Math.round(x)));
  const row = Math.min(ROWS - 1, Math.max(0, Math.round(y)));
  const pixelX = ((col + 0.5) / COLS) * MAP_PIXEL_WIDTH;
  const pixelY = ((row + 0.5) / ROWS) * MAP_PIXEL_HEIGHT;
  return {
    leftPercent: (pixelX / MAP_PIXEL_WIDTH) * 100,
    topPercent: (pixelY / MAP_PIXEL_HEIGHT) * 100,
  };
}

/**
 * 步骤 4：根据坐标解析所在网格，再查 GRID_TO_ZONE 得到地点 id，用于右侧「当前位置」展示。
 * 入参为与 getCurrentCoords 相同的网格含义（个位整数）；多用户时传入当前选中用户对应的 coords。
 * 维护说明：若改为像素坐标入参，可先换算 row = floor((y/800)*16), col = floor((x/600)*12) 再查表。
 */
function getZoneFromCoords(x: number, y: number): string | null {
  const col = Math.min(COLS - 1, Math.max(0, Math.round(x)));
  const row = Math.min(ROWS - 1, Math.max(0, Math.round(y)));
  const zoneId = GRID_TO_ZONE[row]?.[col] ?? null;
  return zoneId && zoneId.trim() !== '' ? zoneId : null;
}

/** 递归把对象展平为可读的键值列表，用于右面板展示 */
function flattenForDisplay(obj: unknown, prefix = ''): { key: string; value: string }[] {
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== 'object') return [{ key: prefix, value: String(obj) }];
  const entries: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      entries.push(...flattenForDisplay(v, fullKey));
    } else if (Array.isArray(v)) {
      entries.push({ key: fullKey, value: JSON.stringify(v) });
    } else {
      entries.push({ key: fullKey, value: v == null ? '—' : String(v) });
    }
  }
  return entries;
}

/** 从 panelData 取某区块数据，兼容顶层与 payload 内字段（后端可能从 payload 解出到顶层） */
function getSectionData(
  data: MongoUpstreamLatest | null,
  key: 'location' | 'fall_detection' | 'sos' | 'sensors' | 'system'
): Record<string, unknown> | null | undefined {
  if (!data) return undefined;
  const top = data[key];
  if (top != null && typeof top === 'object') return top as Record<string, unknown>;
  const payload = (data as { payload?: Record<string, unknown> }).payload;
  const inPayload = payload?.[key];
  if (inPayload != null && typeof inPayload === 'object') return inPayload as Record<string, unknown>;
  return null;
}

/** 按路径取嵌套值，如 'heart_rate.bpm' 从 sensors 中取 sensors.heart_rate.bpm */
function getNested(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  if (obj == null) return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** 判断当前数据是否触发 SOS/跌倒告警：sos.active 为 true 或跌倒状态为「确认跌倒」 */
function isSosOrFallAlert(data: MongoUpstreamLatest | null): boolean {
  if (!data) return false;
  const sos = getSectionData(data, 'sos') as Record<string, unknown> | null | undefined;
  const fall = getSectionData(data, 'fall_detection');
  const sosActive = sos && (sos.active === true || sos.active === 'true');
  const fallStateDesc = getNested(fall ?? undefined, 'state_description');
  const fallConfirmed =
    fallStateDesc === '确认跌倒' || String(fallStateDesc).toLowerCase() === 'confirmed fall';
  return Boolean(sosActive) || Boolean(fallConfirmed);
}

type PositionPageProps = {
  /** 当设备上报 SOS 为 true 或跌倒状态为「确认跌倒」时，由无到有时调用一次，用于弹出警告窗 */
  onSosOrFallDetected?: () => void;
};

export function PositionPage({ onSosOrFallDetected }: PositionPageProps) {
  const { t } = useTranslation();
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<MongoUpstreamLatest | null>(null);
  const [panelLoading, setPanelLoading] = useState(true);
  const [panelError, setPanelError] = useState<string | null>(null);
  /** 多用户模式：左侧点选用户后，右侧与图中只展示该用户最新位置与状态 */
  const [selectedUserId, setSelectedUserId] = useState<string>(PRESET_USERS[0]?.id ?? '');
  /** 仅在一次「从无告警到有告警」时触发弹窗，避免重复弹 */
  const previousAlertRef = useRef(false);

  const ONLINE_TTL_MS = 30_000;

  const parseServerReceivedAt = useCallback((v: unknown): number | null => {
    if (!v) return null;
    const parsed = new Date(String(v)).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const selectedUser = useMemo(() => {
    return PRESET_USERS.find((u) => u.id === selectedUserId) ?? PRESET_USERS[0] ?? null;
  }, [selectedUserId]);

  /** 保存每个 device_id 对应的最新 status_update（用于 left panel 在线列表与切换展示） */
  const [latestStatusByDeviceId, setLatestStatusByDeviceId] = useState<Record<string, MongoUpstreamLatest>>({});

  const onlineUsers = useMemo(() => {
    const now = Date.now();
    return PRESET_USERS.filter((u) => {
      const doc = latestStatusByDeviceId[u.deviceId];
      if (!doc) return false;
      const ts = parseServerReceivedAt(doc.server_received_at);
      return ts != null && now - ts <= ONLINE_TTL_MS;
    });
  }, [latestStatusByDeviceId, parseServerReceivedAt]);

  const fetchLatestStatusForDevice = useCallback(
    async (deviceId: string): Promise<MongoUpstreamLatest | null> => {
      const data = (await mongoUpstreamApi.getLatest({ data_type: 'status_update', device_id: deviceId })) as MongoUpstreamLatest;
      return data && typeof data === 'object' && (data.device_id != null || data._id) ? data : null;
    },
    []
  );

  const refreshAll = useCallback(async () => {
    setPanelError(null);
    setPanelLoading(true);
    try {
      const results = await Promise.all(
        PRESET_USERS.map(async (u) => {
          const res = await fetchLatestStatusForDevice(u.deviceId).catch(() => null);
          return [u.deviceId, res] as const;
        })
      );

      const map: Record<string, MongoUpstreamLatest> = {};
      for (const [deviceId, res] of results) {
        if (res) map[String(deviceId)] = res;
      }

      setLatestStatusByDeviceId(map);

      const devId = PRESET_USERS.find((u) => u.id === selectedUserId)?.deviceId ?? PRESET_USERS[0]?.deviceId;
      setPanelData(devId ? map[devId] ?? null : null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setPanelError(msg === 'Not found' || msg.includes('404') ? t('position.apiUnavailable') : msg);
      setPanelData(null);
    } finally {
      setPanelLoading(false);
    }
  }, [fetchLatestStatusForDevice, selectedUserId, t]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  /** 一键 SOS：当最新数据出现 SOS 为 true 或跌倒为「确认跌倒」时弹出警告窗（仅状态从无到有时触发一次） */
  useEffect(() => {
    if (!onSosOrFallDetected || !panelData) return;
    const alertNow = isSosOrFallAlert(panelData);
    if (alertNow && !previousAlertRef.current) {
      previousAlertRef.current = true;
      onSosOrFallDetected();
    }
    if (!alertNow) previousAlertRef.current = false;
  }, [panelData, onSosOrFallDetected]);

  return (
    <div className="position-page">
      <aside className="position-page__left">
        <div className="position-page__panel">
          <header className="section-heading">
            <h3>{t('position.userList')}</h3>
            <p className="muted">
              {onlineUsers.length > 0
                ? t('position.usersOnline', { count: onlineUsers.length })
                : t('position.noUsersOnline')}
            </p>
          </header>
          <ul className="position-page__zone-list" role="list" aria-label={t('position.userList')}>
            {PRESET_USERS.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className={`position-page__zone-item ${selectedUser?.id === user.id ? 'position-page__zone-item--highlight' : ''}`}
                  onClick={() => {
                    setSelectedUserId(user.id);
                    setPanelData(latestStatusByDeviceId[user.deviceId] ?? null);
                  }}
                >
                  {user.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="position-page__center">
        <div className="position-page__map-wrap">
          <img
            src={agentImg}
            alt={t('layout.nav.position')}
            className="position-page__map-img"
          />
          {/* 步骤 3：根据上行 current.x / current.y 在 600×800 图上绘制用户红点；坐标经 gridIndicesToPixelPercent 换算为百分比定位 */}
          {panelData && (() => {
            const coords = getCurrentCoords(panelData);
            if (!coords) return null;
            const { leftPercent, topPercent } = gridIndicesToPixelPercent(coords.x, coords.y);
            return (
              <div className="position-page__user-dot-wrap" aria-hidden>
                <div className="position-page__user-pin" style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}>
                  <span className="position-page__user-label">{selectedUser?.name ?? 'User'}</span>
                  <span
                    className="position-page__user-dot"
                    title={selectedUser?.name ?? t('position.currentLocation')}
                  />
                </div>
              </div>
            );
          })()}
          <div
            className="position-page__grid-overlay"
            role="img"
            aria-label={t('layout.nav.position')}
          >
            {Array.from({ length: ROWS }, (_, row) =>
              Array.from({ length: COLS }, (_, col) => {
                const index = row * COLS + col;
                const zoneId = GRID_TO_ZONE[row]?.[col] ?? '';
                const isHighlighted = highlightedZoneId !== null && zoneId === highlightedZoneId;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`position-page__cell ${isHighlighted ? 'position-page__cell--highlight' : ''}`}
                    onClick={() => setHighlightedZoneId(zoneId)}
                    title={zoneId ? t(ZONES.find((z) => z.id === zoneId)?.labelKey ?? 'position.zone.door1') : undefined}
                  />
                );
              })
            ).flat()}
          </div>
        </div>
      </div>
      <aside className="position-page__right">
        <div className="position-page__panel position-page__info-panel">
          <div className="position-page__info-panel-header">
            <h3>{t('position.rightPanelTitle')}</h3>
            <button type="button" className="position-page__refresh-btn" onClick={refreshAll}>
              {t('position.refresh')}
            </button>
          </div>
          {panelLoading && <p className="muted">{t('common.loading')}</p>}
          {panelError && <p className="position-page__error">{panelError}</p>}
          {!panelLoading && !panelError && !panelData && (
            <p className="muted">{t('position.noDeviceData')}</p>
          )}
          {!panelLoading && !panelError && panelData && (() => {
            const data = panelData;
            const loc = getSectionData(data, 'location') as {
              current?: { x?: number; y?: number };
              target?: { x?: number; y?: number };
            } | null | undefined;
            const fall = getSectionData(data, 'fall_detection');
            const sos = getSectionData(data, 'sos');
            const sensors = getSectionData(data, 'sensors');
            const system = getSectionData(data, 'system');
            const coords = getCurrentCoords(data);
            const zoneId = coords ? getZoneFromCoords(coords.x, coords.y) : null;
            const zone = zoneId ? ZONES.find((z) => z.id === zoneId) : null;
            const currentX = loc?.current?.x;
            const currentY = loc?.current?.y;
            const targetX = loc?.target?.x;
            const targetY = loc?.target?.y;
            const fallStateDesc = getNested(fall ?? undefined, 'state_description');
            const sosObj = sos && typeof sos === 'object' ? (sos as Record<string, unknown>) : null;
            const sosActive = sosObj ? sosObj.active : undefined;
            const sosTriggerTime = sosObj ? sosObj.trigger_time : undefined;
            const heartRateBpm = getNested(sensors ?? undefined, 'heart_rate.bpm');
            const spo2Pct = getNested(sensors ?? undefined, 'spo2.percentage');
            const batteryLevel = getNested(system ?? undefined, 'battery.level');
            const formatVal = (v: unknown): string => (v != null && v !== '') ? String(v) : '—';
            return (
              <>
                <div className="position-page__info-block">
                  <h4>{t('position.userName')}</h4>
                  <p className="position-page__value">{selectedUser?.name ?? '—'}</p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('position.deviceId')}</h4>
                  <p className="position-page__value">{formatVal(panelData.device_id)}</p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('position.currentLocation')}</h4>
                  <p className="position-page__value">{zone ? t(zone.labelKey) : '—'}</p>
                  <p className="position-page__value position-page__value--muted">
                    {t('position.currentX')}: {currentX != null ? String(currentX) : '—'}
                  </p>
                  <p className="position-page__value position-page__value--muted">
                    {t('position.currentY')}: {currentY != null ? String(currentY) : '—'}
                  </p>
                  <p className="position-page__value position-page__value--muted">
                    {t('position.targetX')}: {targetX != null ? String(targetX) : '—'}
                  </p>
                  <p className="position-page__value position-page__value--muted">
                    {t('position.targetY')}: {targetY != null ? String(targetY) : '—'}
                  </p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('position.fallStateDescription')}</h4>
                  <p className="position-page__value">{formatVal(fallStateDesc)}</p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('position.sosStatus')}</h4>
                  <p className="position-page__value">
                    active: {sosActive !== undefined && sosActive !== null ? String(sosActive) : '—'}
                  </p>
                  <p className="position-page__value position-page__value--muted">
                    trigger_time: {sosTriggerTime !== undefined && sosTriggerTime !== null ? String(sosTriggerTime) : '—'}
                  </p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('position.heartRateBpm')} / {t('position.spo2Percentage')}</h4>
                  <p className="position-page__value">
                    {formatVal(heartRateBpm)}   ·   {formatVal(spo2Pct)}
                  </p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('position.batteryLevel')}</h4>
                  <p className="position-page__value">{formatVal(batteryLevel)}</p>
                </div>
              </>
            );
          })()}
        </div>
      </aside>
    </div>
  );
}
