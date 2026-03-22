import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import airportImg from '../img/FlyCare.png';
import { mongoUpstreamApi, type MongoUpstreamLatest, type FlightLatestResponse } from '../services/api';

/**
 * 预设用户与设备绑定（机场场景可扩展为旅客列表）。
 * 收到某 device_id 的上行数据时，对应用户视为在线。
 */
const PRESET_USERS = [
  { id: 'TestUser01', name: 'TestUser01', deviceId: 'ESP32_00005CFA7AD4DB1C' },
] as const;

/** 机场区域（7 个）：用于根据坐标解析地点名称，labelKey 对应 i18n flyCare.zone.* */
const ZONES = [
  { id: 'boarding_gate_1', labelKey: 'flyCare.zone.boarding_gate_1' },
  { id: 'boarding_gate_2', labelKey: 'flyCare.zone.boarding_gate_2' },
  { id: 'restricted_area', labelKey: 'flyCare.zone.restricted_area' },
  { id: 'toilet', labelKey: 'flyCare.zone.toilet' },
  { id: 'security_check', labelKey: 'flyCare.zone.security_check' },
  { id: 'non_restricted_area', labelKey: 'flyCare.zone.non_restricted_area' },
  { id: 'check_in_counter', labelKey: 'flyCare.zone.check_in_counter' },
] as const;

const COLS = 12;
const ROWS = 16;
const MAP_PIXEL_WIDTH = 600;
const MAP_PIXEL_HEIGHT = 800;
const METERS_PER_GRID = 5;
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * 16 行 × 12 列，与机场平面图对应。具体每格对应哪个区域可在此手动调整。
 * 可用 id：boarding_gate_1 | boarding_gate_2 | restricted_area | toilet | security_check | non_restricted_area | check_in_counter
 */
const GRID_TO_ZONE: string[][] = [
  [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
  [' ', 'restricted_area', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', ' '],
  [' ', 'restricted_area', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', ' '],
  [' ', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', ' '],
  [' ', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area ', ' '],
  [' ', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'toilet', 'toilet', 'toilet', 'toilet', ' '],
  [' ', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'toilet', 'toilet', 'toilet', 'toilet', 'toilet', ' '],
  [' ', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', ' ', ' ', ' ', ' ', ' '],
  [' ', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', ' ', ' ', ' ', ' ', ' '],
  [' ', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', ' ', ' ', ' ', ' ', ' '],
  [' ', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', ' ', ' ', ' ', ' ', ' '],
  [' ', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', ' '],
  [' ', 'non_restricted_area', 'non_restricted_area', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'non_restricted_area', 'non_restricted_area', ' '],
  [' ', 'non_restricted_area', 'non_restricted_area', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'non_restricted_area', 'non_restricted_area', ' '],
  [' ', 'non_restricted_area', 'non_restricted_area', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'non_restricted_area', 'non_restricted_area', ' '],
  [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
];

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

function getCurrentCoords(data: MongoUpstreamLatest | null): { x: number; y: number } | null {
  const loc = getSectionData(data, 'location') as { current?: { x?: number; y?: number } } | null | undefined;
  const current = loc?.current;
  if (current == null || typeof current.x !== 'number' || typeof current.y !== 'number') return null;
  const x = Number(current.x);
  const y = Number(current.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function getTargetCoords(data: MongoUpstreamLatest | null): { x: number; y: number } | null {
  const loc = getSectionData(data, 'location') as { target?: { x?: number; y?: number } } | null | undefined;
  const target = loc?.target;
  if (target == null || typeof target.x !== 'number' || typeof target.y !== 'number') return null;
  const x = Number(target.x);
  const y = Number(target.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

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

function getZoneFromCoords(x: number, y: number): string | null {
  const col = Math.min(COLS - 1, Math.max(0, Math.round(x)));
  const row = Math.min(ROWS - 1, Math.max(0, Math.round(y)));
  const zoneId = GRID_TO_ZONE[row]?.[col] ?? null;
  return zoneId && zoneId.trim() !== '' ? zoneId : null;
}

function buildNavigationText(t: TranslateFn, data: MongoUpstreamLatest | null): string {
  const current = getCurrentCoords(data);
  const target = getTargetCoords(data);
  if (!current || !target) return t('flyCare.navigationPlaceholder');

  const currentCol = Math.min(COLS - 1, Math.max(0, Math.round(current.x)));
  const currentRow = Math.min(ROWS - 1, Math.max(0, Math.round(current.y)));
  const targetCol = Math.min(COLS - 1, Math.max(0, Math.round(target.x)));
  const targetRow = Math.min(ROWS - 1, Math.max(0, Math.round(target.y)));

  const deltaRow = targetRow - currentRow; // >0 目标在下方（后方），<0 目标在上方（前方）
  const deltaCol = targetCol - currentCol; // >0 目标在右侧，<0 目标在左侧

  const steps: string[] = [];
  if (deltaRow < 0) {
    steps.push(t('flyCare.navigationStepForward', { meters: Math.abs(deltaRow) * METERS_PER_GRID }));
  } else if (deltaRow > 0) {
    steps.push(t('flyCare.navigationStepBackward', { meters: Math.abs(deltaRow) * METERS_PER_GRID }));
  }

  if (deltaCol > 0) {
    steps.push(t('flyCare.navigationStepRight', { meters: Math.abs(deltaCol) * METERS_PER_GRID }));
  } else if (deltaCol < 0) {
    steps.push(t('flyCare.navigationStepLeft', { meters: Math.abs(deltaCol) * METERS_PER_GRID }));
  }

  if (steps.length === 0) return t('flyCare.navigationArrived');
  if (steps.length === 1) return steps[0];
  return t('flyCare.navigationTwoSteps', { first: steps[0], second: steps[1] });
}

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

/** 航班信息结构（后续对接 MQTT/API 时字段可对齐） */
export type FlightInfo = {
  passengerName?: string;
  flightNumber?: string;
  gate?: string;
  flightTime?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  seatNumber?: string;
};

type FlyCarePageProps = {
  onSosOrFallDetected?: () => void;
};

export function FlyCarePage({ onSosOrFallDetected }: FlyCarePageProps) {
  const { t } = useTranslation();
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<MongoUpstreamLatest | null>(null);
  const [panelLoading, setPanelLoading] = useState(true);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const previousAlertRef = useRef(false);
  /** 已确认展示的航班文档 _id，用于判断是否为新航班更新（需弹窗提醒） */
  const lastConfirmedFlightIdRef = useRef<string | null>(null);
  /** 侧弹窗中待确认航班的 _id，确认后写入 lastConfirmedFlightIdRef */
  const pendingFlightIdRef = useRef<string | null>(null);

  /** 右侧信息面板展示的航班信息（暂无数据时为空；收到新航班时先走侧弹窗，确认后同步到此） */
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  /** 航班变动侧边弹窗：待确认的新航班信息 */
  const [pendingFlightUpdate, setPendingFlightUpdate] = useState<FlightInfo | null>(null);
  const [showFlightUpdateDrawer, setShowFlightUpdateDrawer] = useState(false);

  const onlineUsers = useMemo(() => {
    if (!panelData?.device_id) return [];
    const id = String(panelData.device_id);
    return PRESET_USERS.filter((u) => u.deviceId === id);
  }, [panelData?.device_id]);

  const displayUser = useMemo(() => {
    if (selectedUserId) return PRESET_USERS.find((u) => u.id === selectedUserId) ?? null;
    return onlineUsers[0] ?? null;
  }, [selectedUserId, onlineUsers]);

  const displayData = useMemo(() => {
    if (!panelData) return null;
    if (!displayUser) return null;
    if (String(panelData.device_id) !== displayUser.deviceId) return null;
    return panelData;
  }, [panelData, displayUser]);

  const fetchLatest = useCallback(async () => {
    setPanelError(null);
    setPanelLoading(true);
    try {
      const data = (await mongoUpstreamApi.getLatest({ exclude_data_type: 'flight' })) as MongoUpstreamLatest;
      setPanelData(data && typeof data === 'object' && (data.device_id != null || data._id) ? data : null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setPanelError(msg === 'Not found' || msg.includes('404') ? t('flyCare.apiUnavailable') : msg);
      setPanelData(null);
    } finally {
      setPanelLoading(false);
    }
  }, [t]);

  /** 拉取当前展示用户绑定的最新航班；若为新/变更则用侧弹窗提醒，确认后同步到信息面板 */
  const fetchLatestFlight = useCallback(async () => {
    if (!displayUser?.deviceId) {
      setFlightInfo(null);
      lastConfirmedFlightIdRef.current = null;
      return;
    }
    try {
      const res = (await mongoUpstreamApi.getLatestFlight(displayUser.deviceId)) as unknown as FlightLatestResponse;
      if (!res.found || (res.device_id != null && res.device_id !== displayUser.deviceId)) {
        setFlightInfo(null);
        lastConfirmedFlightIdRef.current = null;
        return;
      }
      const flightPayload: FlightInfo = {
        passengerName: res.passengerName,
        flightNumber: res.flightNumber,
        gate: res.gate,
        flightTime: res.flightTime,
        departureAirport: res.departureAirport,
        arrivalAirport: res.arrivalAirport,
        seatNumber: res.seatNumber,
      };
      const docId = res._id ?? null;
      if (docId === lastConfirmedFlightIdRef.current) {
        return;
      }
      if (flightInfo == null) {
        setFlightInfo(flightPayload);
        lastConfirmedFlightIdRef.current = docId;
        return;
      }
      setPendingFlightUpdate(flightPayload);
      pendingFlightIdRef.current = docId;
      setShowFlightUpdateDrawer(true);
    } catch {
      setFlightInfo(null);
      lastConfirmedFlightIdRef.current = null;
    }
  }, [displayUser?.deviceId, flightInfo]);

  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 10000);
    return () => clearInterval(interval);
  }, [fetchLatest]);

  useEffect(() => {
    fetchLatestFlight();
    const interval = setInterval(fetchLatestFlight, 10000);
    return () => clearInterval(interval);
  }, [fetchLatestFlight]);

  useEffect(() => {
    if (!onSosOrFallDetected || !panelData) return;
    const alertNow = isSosOrFallAlert(panelData);
    if (alertNow && !previousAlertRef.current) {
      previousAlertRef.current = true;
      onSosOrFallDetected();
    }
    if (!alertNow) previousAlertRef.current = false;
  }, [panelData, onSosOrFallDetected]);

  /** 确认航班变动：将侧边弹窗中的新航班信息同步到右侧信息面板 */
  const handleConfirmFlightUpdate = useCallback(() => {
    if (pendingFlightUpdate) {
      setFlightInfo({ ...pendingFlightUpdate });
      if (pendingFlightIdRef.current != null) {
        lastConfirmedFlightIdRef.current = pendingFlightIdRef.current;
      }
      setPendingFlightUpdate(null);
      pendingFlightIdRef.current = null;
      setShowFlightUpdateDrawer(false);
    }
  }, [pendingFlightUpdate]);

  /** 关闭航班变动弹窗（不更新面板） */
  const handleCloseFlightUpdateDrawer = useCallback(() => {
    setPendingFlightUpdate(null);
    setShowFlightUpdateDrawer(false);
  }, []);

  const formatVal = (v: unknown): string => (v != null && v !== '') ? String(v) : '—';

  return (
    <div className="position-page flycare-page">
      <aside className="position-page__left">
        <div className="position-page__panel">
          <header className="section-heading">
            <h3>{t('flyCare.userList')}</h3>
            <p className="muted">
              {onlineUsers.length > 0
                ? t('flyCare.usersOnline', { count: onlineUsers.length })
                : t('flyCare.noUsersOnline')}
            </p>
          </header>
          <ul className="position-page__zone-list" role="list" aria-label={t('flyCare.userList')}>
            {onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className={`position-page__zone-item ${displayUser?.id === user.id ? 'position-page__zone-item--highlight' : ''}`}
                    onClick={() => setSelectedUserId(displayUser?.id === user.id ? null : user.id)}
                  >
                    {user.name}
                  </button>
                </li>
              ))
            ) : (
              <li><p className="muted">{t('flyCare.noUsersOnline')}</p></li>
            )}
          </ul>
        </div>
      </aside>

      <div className="position-page__center">
        <div className="position-page__map-wrap">
          <img
            src={airportImg}
            alt={t('flyCare.mapAlt')}
            className="position-page__map-img"
          />
          {displayData && (() => {
            const coords = getCurrentCoords(displayData);
            const targetCoords = getTargetCoords(displayData);
            if (!coords && !targetCoords) return null;
            return (
              <div className="position-page__user-dot-wrap" aria-hidden>
                {coords && (() => {
                  const { leftPercent, topPercent } = gridIndicesToPixelPercent(coords.x, coords.y);
                  return (
                    <div className="position-page__user-pin" style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}>
                      <span className="position-page__user-label">{displayUser?.name ?? 'User'}</span>
                      <span
                        className="position-page__user-dot"
                        title={displayUser?.name ?? t('flyCare.currentLocation')}
                      />
                    </div>
                  );
                })()}
                {targetCoords && (() => {
                  const { leftPercent, topPercent } = gridIndicesToPixelPercent(targetCoords.x, targetCoords.y);
                  return (
                    <span
                      className="flycare-page__target-dot"
                      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                      title="Target"
                    />
                  );
                })()}
              </div>
            );
          })()}
          <div
            className="position-page__grid-overlay"
            role="img"
            aria-label={t('flyCare.mapAlt')}
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
                    title={zoneId ? t(ZONES.find((z) => z.id === zoneId)?.labelKey ?? 'flyCare.zone.boarding_gate_1') : undefined}
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
            <h3>{t('flyCare.rightPanelTitle')}</h3>
            <button type="button" className="position-page__refresh-btn" onClick={fetchLatest}>
              {t('flyCare.refresh')}
            </button>
          </div>
          {panelLoading && <p className="muted">{t('common.loading')}</p>}
          {panelError && <p className="position-page__error">{panelError}</p>}
          {!panelLoading && !panelError && !panelData && (
            <p className="muted">{t('flyCare.noDeviceData')}</p>
          )}
          {!panelLoading && !panelError && panelData && (() => {
            const data = displayData ?? panelData;
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
            return (
              <>
                {/* 航班信息置于最上 */}
                <div className="position-page__info-block flycare-page__flight-block">
                  <h4>{t('flyCare.flightTitle')}</h4>
                  <p className="position-page__value position-page__value--muted">{t('flyCare.flightPassengerName')}: {formatVal(flightInfo?.passengerName)}</p>
                  <p className="position-page__value position-page__value--muted">{t('flyCare.flightNumber')}: {formatVal(flightInfo?.flightNumber)}</p>
                  <p className="position-page__value position-page__value--muted">{t('flyCare.flightGate')}: {formatVal(flightInfo?.gate)}</p>
                  <p className="position-page__value position-page__value--muted">{t('flyCare.flightTime')}: {formatVal(flightInfo?.flightTime)}</p>
                  <p className="position-page__value position-page__value--muted">{t('flyCare.flightDeparture')}: {formatVal(flightInfo?.departureAirport)}</p>
                  <p className="position-page__value position-page__value--muted">{t('flyCare.flightArrival')}: {formatVal(flightInfo?.arrivalAirport)}</p>
                  <p className="position-page__value position-page__value--muted">{t('flyCare.flightSeat')}: {formatVal(flightInfo?.seatNumber)}</p>
                  {/* <button type="button" className="flycare-page__simulate-btn" onClick={handleSimulateFlightUpdate}>
                    {t('flyCare.simulateFlightUpdate')}
                  </button> */}
                </div>
                <div className="position-page__info-block">
                  <h4>{t('flyCare.userName')}</h4>
                  <p className="position-page__value">{displayUser?.name ?? '—'}</p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('flyCare.deviceId')}</h4>
                  <p className="position-page__value">{formatVal(panelData.device_id)}</p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('flyCare.currentLocation')}</h4>
                  <p className="position-page__value">{zone ? t(zone.labelKey) : '—'}</p>
                  <p className="position-page__value position-page__value--muted">
                    {t('flyCare.currentX')}: {currentX != null ? String(currentX) : '—'}
                  </p>
                  <p className="position-page__value position-page__value--muted">
                    {t('flyCare.currentY')}: {currentY != null ? String(currentY) : '—'}
                  </p>
                  <p className="position-page__value position-page__value--muted">
                    {t('flyCare.targetX')}: {targetX != null ? String(targetX) : '—'}
                  </p>
                  <p className="position-page__value position-page__value--muted">
                    {t('flyCare.targetY')}: {targetY != null ? String(targetY) : '—'}
                  </p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('flyCare.navigationTitle')}</h4>
                  <p className="position-page__value position-page__value--muted">
                    {buildNavigationText(t, data)}
                  </p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('flyCare.fallStateDescription')}</h4>
                  <p className="position-page__value">{formatVal(fallStateDesc)}</p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('flyCare.sosStatus')}</h4>
                  <p className="position-page__value">
                    active: {sosActive !== undefined && sosActive !== null ? String(sosActive) : '—'}
                  </p>
                  <p className="position-page__value position-page__value--muted">
                    trigger_time: {sosTriggerTime !== undefined && sosTriggerTime !== null ? String(sosTriggerTime) : '—'}
                  </p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('flyCare.heartRateBpm')} / {t('flyCare.spo2Percentage')}</h4>
                  <p className="position-page__value">
                    {formatVal(heartRateBpm)} · {formatVal(spo2Pct)}
                  </p>
                </div>
                <div className="position-page__info-block">
                  <h4>{t('flyCare.batteryLevel')}</h4>
                  <p className="position-page__value">{formatVal(batteryLevel)}</p>
                </div>
              </>
            );
          })()}
        </div>
      </aside>

      {/* 航班信息变动侧边弹窗：展示新航班信息，确认后更新到右侧面板 */}
      {showFlightUpdateDrawer && (
        <div className="flycare-page__flight-drawer-backdrop" onClick={handleCloseFlightUpdateDrawer} aria-hidden />
      )}
      <div className={`flycare-page__flight-drawer ${showFlightUpdateDrawer ? 'flycare-page__flight-drawer--open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="flycare-flight-drawer-title">
        <div className="flycare-page__flight-drawer-inner">
          <h3 id="flycare-flight-drawer-title" className="flycare-page__flight-drawer-title">
            {t('flyCare.flightUpdateTitle')}
          </h3>
          {pendingFlightUpdate && (
            <div className="flycare-page__flight-drawer-fields">
              <p><strong>{t('flyCare.flightPassengerName')}</strong>: {formatVal(pendingFlightUpdate.passengerName)}</p>
              <p><strong>{t('flyCare.flightNumber')}</strong>: {formatVal(pendingFlightUpdate.flightNumber)}</p>
              <p><strong>{t('flyCare.flightGate')}</strong>: {formatVal(pendingFlightUpdate.gate)}</p>
              <p><strong>{t('flyCare.flightTime')}</strong>: {formatVal(pendingFlightUpdate.flightTime)}</p>
              <p><strong>{t('flyCare.flightDeparture')}</strong>: {formatVal(pendingFlightUpdate.departureAirport)}</p>
              <p><strong>{t('flyCare.flightArrival')}</strong>: {formatVal(pendingFlightUpdate.arrivalAirport)}</p>
              <p><strong>{t('flyCare.flightSeat')}</strong>: {formatVal(pendingFlightUpdate.seatNumber)}</p>
            </div>
          )}
          <div className="flycare-page__flight-drawer-actions">
            <button type="button" className="primary" onClick={handleConfirmFlightUpdate}>
              {t('flyCare.flightUpdateConfirm')}
            </button>
            <button type="button" className="secondary" onClick={handleCloseFlightUpdateDrawer}>
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
