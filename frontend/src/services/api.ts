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

// 統一錯誤處理 (Unified error handling)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error?.response?.data?.detail || error?.message || 'Request failed';
    return Promise.reject(new Error(message));
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

// 數據接收 API (Data reception APIs)
export const dataReceptionApi = {
  receive: (data: unknown) => api.post('/data-reception/receive', data),
  getStatus: () => api.get<DataReceptionStatus>('/data-reception/status'),
  tcpStart: (params?: { host?: string; port?: number }) =>
    api.post<{ status: string; message: string; host?: string; port?: number }>('/data-reception/tcp/start', null, { params }),
  tcpStop: () => api.post<{ status: string; message: string }>('/data-reception/tcp/stop'),
  tcpStatus: () => api.get<{ status: string; data: { is_running: boolean; host: string; port: number; total_samples: number; errors: number; last_receive_time: string | null } }>('/data-reception/tcp/status'),
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

// MongoDB 上行数据 API（Position 页面右面板等）
export type MongoUpstreamLatest = {
  _id?: string;
  device_id?: string | number;
  timestamp?: number;
  server_received_at?: string;
  location?: Record<string, unknown>;
  fall_detection?: Record<string, unknown>;
  sos?: Record<string, unknown>;
  sensors?: Record<string, unknown>;
  system?: Record<string, unknown>;
  /** 部分后端可能直接返回完整 payload，前端会从此处回退读取 location 等 */
  payload?: Record<string, unknown>;
};

/** 最新航班信息（与 FlyCare 右侧面板一致） */
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

export const mongoUpstreamApi = {
  /** 最新一条上行；data_type 只返回该类型（如 status_update）；exclude_data_type 排除该类型（如 flight） */
  getLatest: (params?: { device_id?: string; data_type?: string; exclude_data_type?: string }) =>
    api.get<MongoUpstreamLatest>('/mongo-upstream/latest', { params }),
  /** 最新航班，传入 device_id 时只返回该设备（用户）的航班 */
  getLatestFlight: (deviceId?: string) =>
    api.get<FlightLatestResponse>('/mongo-upstream/flight/latest', {
      params: deviceId ? { device_id: deviceId } : undefined,
    }),
  list: (params?: Record<string, unknown>) =>
    api.get<{ page: number; page_size: number; total: number; items: unknown[] }>('/mongo-upstream/', { params }),
  get: (docId: string) => api.get<unknown>(`/mongo-upstream/${docId}`),
};

export default api;
