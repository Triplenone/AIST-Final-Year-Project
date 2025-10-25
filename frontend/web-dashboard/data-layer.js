;(function(global){
  const CONFIG = global.APP_CONFIG || {};
  const mode = (CONFIG.dataMode || 'local').toLowerCase();

  function safeParse(raw, fallback){
    if(!raw) return fallback;
    try{
      return JSON.parse(raw);
    }catch(err){
      console.warn('[DataStore] Failed to parse persisted data, resetting to fallback.', err);
      return fallback;
    }
  }

  const LocalAdapter = {
    mode: 'local',
    get(key, fallback){
      return safeParse(localStorage.getItem(key), fallback);
    },
    set(key, value){
      try{
        localStorage.setItem(key, JSON.stringify(value));
      }catch(err){
        console.warn('[DataStore] Unable to persist value for', key, err);
      }
    }
  };

  const ApiAdapter = {
    mode: 'api',
    get(key, fallback){
      console.warn(`[DataStore] API mode selected but adapter for "${key}" is not implemented yet. Returning fallback.`);
      return fallback;
    },
    set(key, value){
      console.warn(`[DataStore] API mode selected but adapter for "${key}" is not implemented yet. Value not sent.`, { key, value });
    }
  };

  global.DataStore = mode === 'api' ? ApiAdapter : LocalAdapter;
})(window);

