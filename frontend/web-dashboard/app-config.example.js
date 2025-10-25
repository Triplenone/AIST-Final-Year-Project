/**
 * Copy this file to `app-config.js` and edit values as needed.
 * `dataMode: 'local'` keeps everything in localStorage.
 * Switch to `'api'` when the FastAPI backend is ready.
 */
window.APP_CONFIG = {
  dataMode: 'local', // or 'api'
  apiBase: 'http://localhost:8000/api/v1',
  auth: {
    token: null
  }
};

