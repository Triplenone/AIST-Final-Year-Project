// 後端端點設定 (Backend endpoint configuration)
// 集中管理，方便切換環境 (Centralised to switch environments easily)

// 後端基底網址 (Backend base URL)：
// - 本機開啟前端（localhost:5173）時 -> http://localhost:8000
// - 區網設備開啟前端（例如 192.168.x.x:5173）時 -> http://192.168.x.x:8000
const isBrowser = typeof window !== 'undefined';
const backendProtocol = isBrowser ? window.location.protocol : 'http:';
const backendHost = isBrowser ? window.location.hostname : 'localhost';
export const BACKEND_BASE_URL = `${backendProtocol}//${backendHost}:8000`;

// FastAPI REST prefix (TestStage-FYP style)
export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;

// 住民快照端點 (Resident snapshot endpoint) – 若後端有提供 /sim/snapshot adapter，可用於替代 REST 輪詢
export const SNAPSHOT_URL = `${BACKEND_BASE_URL}/sim/snapshot`;

// SSE 端點 (SSE endpoint) – 若後端未提供，可改成輪詢 REST
export const SSE_URL = `${BACKEND_BASE_URL}/sim/sse`;

// 住民 REST 端點 (Residents REST endpoint)
export const RESIDENTS_API_URL = `${API_BASE_URL}/residents`;
