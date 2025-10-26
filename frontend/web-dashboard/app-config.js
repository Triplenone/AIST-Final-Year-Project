/**
 * Runtime configuration for the standalone dashboard.
 * Values can be overridden by defining `window.APP_CONFIG_ENV`
 * before this script executes (e.g. via build-time injection).
 */
(function applyAppConfig(global) {
  const defaultConfig = {
    dataMode: 'local', // 'local', 'api', or 'hybrid'
    apiBase: 'http://localhost:8000/api/v1',
    features: {
      auditTrail: false,
      offlineQueue: true
    },
    auth: {
      token: null
    },
    sync: {
      retryMs: 4000,
      maxRetries: 3
    }
  };

  const envOverrides = global.APP_CONFIG_ENV || {};
  global.APP_CONFIG = Object.freeze({
    ...defaultConfig,
    ...envOverrides,
    features: { ...defaultConfig.features, ...(envOverrides.features || {}) },
    auth: { ...defaultConfig.auth, ...(envOverrides.auth || {}) },
    sync: { ...defaultConfig.sync, ...(envOverrides.sync || {}) }
  });
})(window);
