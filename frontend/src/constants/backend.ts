// 後端端點設定 (Backend endpoint configuration)
// - Vite 開發（5173 / preview 4173）→ 同 host 的 :8000
// - 由 FastAPI static 或 Cloudflare Tunnel 同源提供時 → 使用當前 origin（不帶 :8000）

const DEV_VITE_PORTS = new Set(['5173', '4173']);

function resolveBackendBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const { protocol, hostname, port } = window.location;

  if (DEV_VITE_PORTS.has(port)) {
    return `${protocol}//${hostname}:8000`;
  }

  const origin = window.location.origin;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

export const BACKEND_BASE_URL = resolveBackendBaseUrl();

// FastAPI REST prefix (TestStage-FYP style)
export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;

// 住民快照端點 (Resident snapshot endpoint) – 若後端有提供 /sim/snapshot adapter，可用於替代 REST 輪詢
export const SNAPSHOT_URL = `${BACKEND_BASE_URL}/sim/snapshot`;

// SSE 端點 (SSE endpoint) – 若後端未提供，可改成輪詢 REST
export const SSE_URL = `${BACKEND_BASE_URL}/sim/sse`;

// 住民 REST 端點 (Residents REST endpoint)
export const RESIDENTS_API_URL = `${API_BASE_URL}/residents`;
