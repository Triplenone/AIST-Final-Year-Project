/**
 * Runtime configuration for the standalone dashboard.
 * Set `dataMode` to 'api' once the FastAPI backend is ready,
 * and update `apiBase` / `auth` fields accordingly.
 */
window.APP_CONFIG = Object.assign(window.APP_CONFIG || {}, {
  dataMode: 'local', // 'local' or 'api'
  apiBase: 'http://localhost:8000/api/v1',
  auth: {
    token: null // TODO: populate with JWT when backend is connected
  }
});

