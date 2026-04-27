// Backend endpoint configuration.
// Keep API calls on the same origin as the frontend. During development,
// Vite proxies these paths to the local FastAPI server.
export const BACKEND_BASE_URL = '';

// FastAPI REST prefix (TestStage-FYP style)
export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;

// Resident snapshot endpoint. The backend may fall back to REST when /sim is unavailable.
export const SNAPSHOT_URL = `${BACKEND_BASE_URL}/sim/snapshot`;

// SSE endpoint. The backend may fall back to REST when /sim is unavailable.
export const SSE_URL = `${BACKEND_BASE_URL}/sim/sse`;

// Residents REST endpoint.
export const RESIDENTS_API_URL = `${API_BASE_URL}/residents`;
