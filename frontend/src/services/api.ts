import axios from 'axios';
import {
  BackendDevice,
  BackendDeviceDataLog,
  BackendEvent,
  BackendKpiMetric,
  BackendLocation,
  BackendResident,
  BackendUser,
  BackendUserStatus,
} from '../types/backend';
import { API_BASE_URL } from '../constants/backend';

// axios 實例 (axios instance) with base URL pointing to FastAPI backend (/api/v1)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ApiError extends Error {
  status?: number;
  detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// 統一錯誤處理 (Unified error handling)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const detail = error?.response?.data?.detail ?? error?.response?.data;
    const message =
      (typeof detail === 'string' ? detail : detail?.message) ||
      error?.message ||
      'Request failed';
    return Promise.reject(new ApiError(message, error?.response?.status, detail));
  }
);

// 用戶 API (User APIs)
export const userApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendUser[]>('/users/', { params }),
  get: (id: number) => api.get<BackendUser>(`/users/${id}`),
  create: (data: Partial<BackendUser>) => api.post<BackendUser>('/users/', data),
  update: (id: number, data: Partial<BackendUser>) => api.put<BackendUser>(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// 設備 API (Device APIs)
export const deviceApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendDevice[]>('/devices/', { params }),
  get: (id: number) => api.get<BackendDevice>(`/devices/${id}`),
  create: (data: Partial<BackendDevice>) => api.post<BackendDevice>('/devices/', data),
  update: (id: number, data: Partial<BackendDevice>) => api.put<BackendDevice>(`/devices/${id}`, data),
  delete: (id: number) => api.delete(`/devices/${id}`),
};

// 位置區域 API (Location zone APIs)
export const locationApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendLocation[]>('/locations/', { params }),
  get: (id: number) => api.get<BackendLocation>(`/locations/${id}`),
  create: (data: Partial<BackendLocation>) => api.post<BackendLocation>('/locations/', data),
  update: (id: number, data: Partial<BackendLocation>) => api.put<BackendLocation>(`/locations/${id}`, data),
  delete: (id: number) => api.delete(`/locations/${id}`),
};

// 事件 API (Event APIs)
export const eventApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendEvent[]>('/events/', { params }),
  get: (id: number) => api.get<BackendEvent>(`/events/${id}`),
  create: (data: Partial<BackendEvent>) => api.post<BackendEvent>('/events/', data),
  update: (id: number, data: Partial<BackendEvent>) => api.put<BackendEvent>(`/events/${id}`, data),
  delete: (id: number) => api.delete(`/events/${id}`),
  handle: (id: number, status: string, handledBy?: number, remark?: string) =>
    api.put<BackendEvent>(`/events/${id}/handle`, null, {
      params: { event_status: status, handled_by: handledBy, remark },
    }),
};

// 用戶狀態 API (User status APIs)
export const userStatusApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendUserStatus[]>('/user-status/', { params }),
  get: (id: number) => api.get<BackendUserStatus>(`/user-status/${id}`),
  create: (data: Partial<BackendUserStatus>) => api.post<BackendUserStatus>('/user-status/', data),
  update: (id: number, data: Partial<BackendUserStatus>) => api.put<BackendUserStatus>(`/user-status/${id}`, data),
  delete: (id: number) => api.delete(`/user-status/${id}`),
};

// 設備數據日誌 API (Device data log APIs)
export const deviceDataLogApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendDeviceDataLog[]>('/device-data-log/', { params }),
  get: (id: number) => api.get<BackendDeviceDataLog>(`/device-data-log/${id}`),
  create: (data: Partial<BackendDeviceDataLog>) => api.post<BackendDeviceDataLog>('/device-data-log/', data),
  update: (id: number, data: Partial<BackendDeviceDataLog>) => api.put<BackendDeviceDataLog>(`/device-data-log/${id}`, data),
  delete: (id: number) => api.delete(`/device-data-log/${id}`),
  searchElderDetail: (params?: Record<string, unknown>) =>
    api.get<BackendDeviceDataLog[]>('/device-data-log/search-elder-detail', { params }),
  statistics: (params?: Record<string, unknown>) =>
    api.get<Record<string, unknown>>('/device-data-log/statistics/overview', { params }),
};

// 住民 API (Resident APIs)
export const residentApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendResident[]>('/residents/', { params }),
  get: (id: string | number) => api.get<BackendResident>(`/residents/${id}`),
  getDeviceDataLogs: (id: string | number, params?: Record<string, unknown>) =>
    api.get<BackendDeviceDataLog[]>(`/residents/${id}/device-data-logs`, { params }),
};

export type FamilySummaryTodayResponse = {
  found: boolean;
  placeholder?: boolean;
  user_id?: number;
  user_name?: string;
  date?: string;
  source?: string;
  generated_at?: string;
  summary_text?: string;
  message?: string;
  stats?: {
    total_events?: number;
    critical_events?: number;
    unhandled_events?: number;
    latest_event_type?: string | null;
  };
};

export const familySummaryApi = {
  getToday: (userId: number) =>
    api.get<FamilySummaryTodayResponse>('/family-summary/today', {
      params: { user_id: userId },
    }),
};

// 數據接收 API (Data reception APIs)
export const dataReceptionApi = {
  receive: (data: unknown) => api.post('/data-reception/receive', data),
  getStatus: () => api.get<DataReceptionStatus>('/data-reception/status'),
  tcpStart: (params?: { host?: string; port?: number }) =>
    api.post<{ status: string; message: string; host?: string; port?: number }>('/data-reception/tcp/start', null, {
      params,
    }),
  tcpStop: () => api.post<{ status: string; message: string }>('/data-reception/tcp/stop'),
  tcpStatus: () =>
    api.get<{
      status: string;
      data: {
        is_running: boolean;
        host: string;
        port: number;
        total_samples: number;
        errors: number;
        last_receive_time: string | null;
      };
    }>('/data-reception/tcp/status'),
};

export type DataReceptionStatus = {
  status: string;
  service?: string;
  tcp_server?: {
    is_running: boolean;
    host: string;
    port: number;
    total_samples: number;
    errors: number;
    last_receive_time: string | null;
    active_client_count?: number;
  };
  stats?: {
    total_received: number;
    last_receive_time: string | null;
    errors: number;
    last_log_id: number | null;
  };
};

// KPI API (KPI metrics APIs)
export const kpiApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendKpiMetric[]>('/kpi/', { params }),
  get: (id: number) => api.get<BackendKpiMetric>(`/kpi/${id}`),
  create: (data: Partial<BackendKpiMetric>) => api.post<BackendKpiMetric>('/kpi/', data),
  update: (id: number, data: Partial<BackendKpiMetric>) => api.put<BackendKpiMetric>(`/kpi/${id}`, data),
  delete: (id: number) => api.delete(`/kpi/${id}`),
};

// MongoDB 上行数据 API，供 Position / FlyCare 右侧信息面板读取最新设备状态。
export type MongoUpstreamLatest = {
  _id?: string;
  device_id?: string | number;
  timestamp?: number;
  server_received_at?: string;
  location?: Record<string, unknown>;
  fall_detection?: Record<string, unknown>;
  sos?: Record<string, unknown>;
  sensors?: Record<string, unknown>;
  /** 部分上行在顶层携带体征摘要（与 payload.vitals 二选一或并存）。 */
  vitals?: Record<string, unknown>;
  system?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type MongoVitalsHistoryQuery = {
  start_ts?: number;
  end_ts?: number;
  page?: number;
  page_size?: number;
};

export type MongoVitalsHistoryItem = {
  _id?: string;
  user_id?: string | number;
  device_id?: string | number;
  timestamp?: number;
  server_received_at?: string;
  sensors?: Record<string, unknown>;
  vitals?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  /** Present on some backend responses alongside `payload`. */
  raw_payload?: Record<string, unknown>;
};

export type MongoVitalsHistoryResponse = {
  page: number;
  page_size: number;
  total: number;
  items: MongoVitalsHistoryItem[];
};

export type FlightLatestResponse = {
  found: boolean;
  _id?: string;
  device_id?: string;
  passengerName?: string;
  flightNumber?: string;
  gate?: string;
  flightTime?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  seatNumber?: string;
  message?: string;
};

export type MongoLatestValidLocationResponse = {
  found: boolean;
  _id?: string;
  device_id?: string | number;
  mysql_device_id?: number;
  server_received_at?: string;
  x?: number;
  y?: number;
  location_name?: string | null;
  location_zone_id?: number | string | null;
  message?: string;
};

export const mongoUpstreamApi = {
  getLatest: (params?: { device_id?: string; data_type?: string; exclude_data_type?: string }) =>
    api.get<MongoUpstreamLatest>('/mongo-upstream/latest', { params }),
  getLatestFlight: (deviceId?: string) =>
    api.get<FlightLatestResponse>('/mongo-upstream/flight/latest', {
      params: deviceId ? { device_id: deviceId } : undefined,
    }),
  getLatestValidLocation: (deviceId: string, params?: { scan_limit?: number }) =>
    api.get<MongoLatestValidLocationResponse>('/mongo-upstream/location/latest', {
      params: { device_id: deviceId, ...params },
    }),
  list: (params?: Record<string, unknown>) =>
    api.get<{ page: number; page_size: number; total: number; items: unknown[] }>('/mongo-upstream/', { params }),
  get: (docId: string) => api.get<unknown>(`/mongo-upstream/${docId}`),
  getVitalsHistoryByUser: (userId: number, params?: MongoVitalsHistoryQuery) =>
    api.get<MongoVitalsHistoryResponse>(`/mongo-upstream/vitals/user/${userId}/history`, { params }),
};

export type FlyCareFlightPreset = {
  device_id: string;
  mysql_device_id?: number;
  elderly_user_id?: number | null;
  passengerName?: string | null;
  deploy_location?: string | null;
};

export type FlightPublishPayload = {
  device_id: string;
  mysql_device_id?: number;
  passengerName: string;
  flightNumber: string;
  gate?: string;
  flightTime?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  seatNumber?: string;
  publish_mqtt: boolean;
  save_mongo: boolean;
};

export type FlyCarePresetsResponse = {
  items: FlyCareFlightPreset[];
  mqtt_topic: string;
};

export type FlyCareMqttStatus = {
  connected?: boolean;
  broker?: string;
  port?: number;
  topic?: string;
};

export type FlyCarePublishResult = {
  status: string;
  payload?: Record<string, unknown>;
  mqtt?: { ok: boolean; topic?: string; broker?: string };
  mongo?: { ok: boolean; db_name?: string; collection?: string };
};

export const flycareAdminApi = {
  getPresets: () => api.get<FlyCarePresetsResponse>('/flycare-admin/presets'),
  getMqttStatus: () => api.get<FlyCareMqttStatus>('/flycare-admin/mqtt/status'),
  publishFlight: (data: FlightPublishPayload) =>
    api.post<FlyCarePublishResult>('/flycare-admin/flight/publish', data),
};

export default api;
