// Backend endpoint configuration.
// - Vite dev / preview (5173 / 4173) -> same host on :8001.
// - Same-origin static hosting or tunnel -> current origin.

const DEV_VITE_PORTS = new Set(['5173', '4173']);

function resolveBackendBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:8001';
  }

  const { protocol, hostname, port } = window.location;

  if (DEV_VITE_PORTS.has(port)) {
    return `${protocol}//${hostname}:8001`;
  }

  const origin = window.location.origin;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

export const BACKEND_BASE_URL = resolveBackendBaseUrl();

// FastAPI REST prefix.
export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;

// Legacy snapshot/SSE endpoints. They stay tied to BACKEND_BASE_URL for compatibility.
export const SNAPSHOT_URL = `${BACKEND_BASE_URL}/sim/snapshot`;
export const SSE_URL = `${BACKEND_BASE_URL}/sim/sse`;

// Passenger REST endpoint (legacy /residents route).
export const RESIDENTS_API_URL = `${API_BASE_URL}/residents`;
