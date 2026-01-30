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
  getStatus: () => api.get('/data-reception/status'),
};

// KPI API (KPI metrics APIs)
export const kpiApi = {
  list: (params?: Record<string, unknown>) => api.get<BackendKpiMetric[]>('/kpi/', { params }),
  get: (id: number) => api.get<BackendKpiMetric>(`/kpi/${id}`),
  create: (data: Partial<BackendKpiMetric>) => api.post<BackendKpiMetric>('/kpi/', data),
  update: (id: number, data: Partial<BackendKpiMetric>) => api.put<BackendKpiMetric>(`/kpi/${id}`, data),
  delete: (id: number) => api.delete(`/kpi/${id}`),
};

export default api;
