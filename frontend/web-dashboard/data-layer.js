;(function bootstrapDataLayer(global){
  const CONFIG = global.APP_CONFIG || {};
  const mode = (CONFIG.dataMode || 'local').toLowerCase();
  const RESOURCE_PATH = {
    residents: '/residents',
    messages: '/messages',
    operations: '/operations',
    overview: '/overview'
  };

  function safeParse(raw, fallback){
    if(!raw) return fallback;
    try{
      return JSON.parse(raw);
    }catch(err){
      console.warn('[DataStore] Failed to parse persisted data, resetting to fallback.', err);
      return fallback;
    }
  }

  function safeStringify(value){
    try{
      return JSON.stringify(value);
    }catch(err){
      console.warn('[DataStore] Failed to serialise value.', err);
      return null;
    }
  }

  function buildResult(source, data, error, updated){
    return { source, data, error: error || null, updated: Boolean(updated) };
  }

  const LocalAdapter = {
    mode: 'local',
    get(key, fallback){
      return safeParse(localStorage.getItem(key), fallback);
    },
    set(key, value){
      const serialised = safeStringify(value);
      if(!serialised) return;
      try{
        localStorage.setItem(key, serialised);
      }catch(err){
        console.warn('[DataStore] Unable to persist value for', key, err);
      }
    },
    async list(namespace, fallback){
      return buildResult('local', this.get(namespace, fallback), null, false);
    },
    async upsert(namespace, entity){
      const current = this.get(namespace, Array.isArray(entity)?[]:{});
      if(Array.isArray(current)){
        const idx = current.findIndex(item => item.id === entity.id);
        if(idx >= 0){
          current[idx] = entity;
        }else{
          current.unshift(entity);
        }
        this.set(namespace, current);
        return buildResult('local', entity, null, true);
      }
      const next = { ...current, ...entity };
      this.set(namespace, next);
      return buildResult('local', next, null, true);
    },
    async remove(namespace, id){
      const current = this.get(namespace, []);
      if(!Array.isArray(current)){
        return buildResult('local', id, new Error('Remove not supported for object stores'), false);
      }
      this.set(namespace, current.filter(item => item.id !== id));
      return buildResult('local', id, null, true);
    }
  };

  async function requestJson(path, options = {}){
    const controller = new AbortController();
    const timeoutMs = CONFIG.sync?.retryMs || 4000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {},
      CONFIG.auth?.token ? { Authorization: `Bearer ${CONFIG.auth.token}` } : {}
    );
    try{
      const res = await fetch(`${CONFIG.apiBase}${path}`, { ...options, headers, signal: controller.signal });
      if(!res.ok){
        throw new Error(`API ${res.status} ${res.statusText}`);
      }
      if(res.status === 204){
        return null;
      }
      return await res.json();
    }finally{
      clearTimeout(timer);
    }
  }

  const ApiAdapter = {
    mode: 'api',
    get(key, fallback){
      return LocalAdapter.get(key, fallback);
    },
    set(key, value){
      LocalAdapter.set(key, value);
    },
    async list(namespace, fallback){
      const path = RESOURCE_PATH[namespace];
      if(!path){
        return buildResult('api', fallback, new Error(`Unknown namespace: ${namespace}`), false);
      }
      try{
        const payload = await requestJson(path, { method: 'GET' });
        const data = Array.isArray(payload?.items) ? payload.items : payload ?? fallback;
        LocalAdapter.set(namespace, data);
        return buildResult('api', data, null, true);
      }catch(err){
        console.warn('[DataStore] API fetch failed, falling back to local cache.', err);
        return buildResult('api', LocalAdapter.get(namespace, fallback), err, false);
      }
    },
    async upsert(namespace, entity){
      const path = RESOURCE_PATH[namespace];
      if(!path){
        return buildResult('api', entity, new Error(`Unknown namespace: ${namespace}`), false);
      }
      try{
        const payload = await requestJson(path, {
          method: entity.id ? 'PUT' : 'POST',
          body: safeStringify(entity)
        });
        const record = payload ?? entity;
        LocalAdapter.upsert(namespace, record);
        return buildResult('api', record, null, true);
      }catch(err){
        console.warn('[DataStore] Unable to sync entity, queued locally.', err);
        LocalAdapter.upsert(namespace, entity);
        return buildResult('api', entity, err, false);
      }
    },
    async remove(namespace, id){
      const path = RESOURCE_PATH[namespace];
      if(!path){
        return buildResult('api', id, new Error(`Unknown namespace: ${namespace}`), false);
      }
      try{
        await requestJson(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        LocalAdapter.remove(namespace, id);
        return buildResult('api', id, null, true);
      }catch(err){
        console.warn('[DataStore] Unable to delete via API, local-only removal applied.', err);
        LocalAdapter.remove(namespace, id);
        return buildResult('api', id, err, false);
      }
    }
  };

  const HybridAdapter = {
    mode: 'hybrid',
    get(key, fallback){
      return LocalAdapter.get(key, fallback);
    },
    set(key, value){
      LocalAdapter.set(key, value);
    },
    async list(namespace, fallback){
      const localResult = await LocalAdapter.list(namespace, fallback);
      const apiResult = await ApiAdapter.list(namespace, localResult.data);
      return apiResult.updated ? apiResult : localResult;
    },
    async upsert(namespace, entity){
      LocalAdapter.upsert(namespace, entity);
      return ApiAdapter.upsert(namespace, entity);
    },
    async remove(namespace, id){
      LocalAdapter.remove(namespace, id);
      return ApiAdapter.remove(namespace, id);
    }
  };

  function createGateway(adapter){
    return {
      mode: adapter.mode,
      residents: {
        list(fallback){
          return adapter.list('residents', fallback);
        },
        save(payload){
          return adapter.upsert('residents', payload);
        },
        remove(id){
          return adapter.remove('residents', id);
        }
      },
      messages: {
        list(fallback){
          return adapter.list('messages', fallback);
        },
        save(payload){
          return adapter.upsert('messages', payload);
        }
      },
      operations: {
        fetch(fallback){
          return adapter.list('operations', fallback);
        },
        save(payload){
          return adapter.upsert('operations', payload);
        }
      },
      overview: {
        fetch(fallback){
          return adapter.list('overview', fallback);
        },
        save(payload){
          return adapter.upsert('overview', payload);
        }
      }
    };
  }

  const selected =
    mode === 'api' ? ApiAdapter : mode === 'hybrid' ? HybridAdapter : LocalAdapter;

  global.DataStore = {
    mode: selected.mode,
    get: selected.get.bind(selected),
    set: selected.set.bind(selected)
  };
  global.DataGateway = createGateway(selected);
})(window);
