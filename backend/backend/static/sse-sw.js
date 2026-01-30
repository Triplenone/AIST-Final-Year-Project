// 由 Service Worker 支援的 SSE 模擬器，無需後端即可產生住民事件。
const SSE_PATH = '/sim/sse';
const SNAPSHOT_PATH = '/sim/snapshot';
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive'
};

const textEncoder = new TextEncoder();
const encode = (input) => textEncoder.encode(input);

// residentRegistry 用於保存住民清單，方便後續事件更新既有資料。
const residentRegistry = new Map();
// activeConnections 記錄所有開啟中的串流，方便群播事件。
const activeConnections = new Set();
let allowEmptyRoster = false;
const suppressedSeedIds = new Set();

const givenNames = ['Anna', 'Li', 'Dewei', 'Maria', 'Haruto', 'Mei', 'Chloe', 'Mateo', 'Aisha', 'Noah', 'Sara', 'Wei', 'Lucas', 'Yuna'];
const surnames = ['Chen', 'Singh', 'Lopez', 'Tanaka', 'Ng', 'Garcia', 'Lee', 'Patel', 'Silva', 'Wong', 'Smith', 'Khan', 'Ito', 'Martinez'];
const roomPrefixes = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'];
const roomNumbers = Array.from({ length: 20 }, (_, index) => String(100 + index));
const locations = ['Dining Hall', 'Garden', 'Physiotherapy', 'Nurse Station', 'Activity Room', 'Lounge', 'Room', 'Rehab Gym'];
const statuses = ['stable', 'followUp', 'high'];

// 預設住民清單，確保名單穩定且可隨時間更新生命徵象。
const baseResidentSeeds = [
  { id: 'res-anna-chen', name: 'Anna Chen', room: '1A-101' },
  { id: 'res-maria-lopez', name: 'Maria Lopez', room: '1A-104' },
  { id: 'res-haruto-tanaka', name: 'Haruto Tanaka', room: '2B-203' },
  { id: 'res-wei-li', name: 'Wei Li', room: '2A-215' },
  { id: 'res-aisha-singh', name: 'Aisha Singh', room: '3B-306' },
  { id: 'res-lucas-ng', name: 'Lucas Ng', room: '3A-318' },
  { id: 'res-mei-wong', name: 'Mei Wong', room: '4A-402' },
  { id: 'res-mateo-garcia', name: 'Mateo Garcia', room: '4B-416' }
];

const baseResidentIdSet = new Set(baseResidentSeeds.map((seed) => seed.id));
const dynamicResidentIds = new Set();

const getActiveResidents = () => Array.from(residentRegistry.values()).filter((resident) => !resident.checkedOut);

const markRosterActive = () => {
  if (allowEmptyRoster) {
    allowEmptyRoster = false;
  }
};

// 立即啟用，確保首次載入就能攔截 /sim/sse。
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const gaussianRandom = (mean, stdDev, min, max) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const value = mean + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev;
  return Math.max(min, Math.min(max, value));
};

const pick = (array) => array[randomInt(0, array.length - 1)];

const nextResidentId = () => `res-${Math.random().toString(36).slice(2, 7)}${Date.now().toString(36)}`;

const buildVitals = (previousVitals) => {
  const fallback = previousVitals ?? {
    hr: randomInt(60, 95),
    bpSystolic: randomInt(110, 130),
    bpDiastolic: randomInt(65, 85),
    spo2: randomInt(95, 99),
    temperature: Number(gaussianRandom(36.6, 0.2, 36.1, 37.8).toFixed(1))
  };

  return {
    hr: Math.round(gaussianRandom(fallback.hr, 4, 54, 120)),
    bpSystolic: Math.round(gaussianRandom(fallback.bpSystolic, 6, 95, 160)),
    bpDiastolic: Math.round(gaussianRandom(fallback.bpDiastolic, 4, 55, 100)),
    spo2: Math.round(gaussianRandom(fallback.spo2, 1.2, 90, 100)),
    temperature: Number(gaussianRandom(fallback.temperature, 0.15, 35.8, 38.5).toFixed(1))
  };
};

// 產生一筆模擬住民資料，並附上合理的生理數據。
const createResident = (seed = null) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const resident = {
    id: seed?.id ?? nextResidentId(),
    name: seed?.name ?? `${pick(givenNames)} ${pick(surnames)}`,
    room: seed?.room ?? `${pick(roomPrefixes)}-${pick(roomNumbers)}`,
    status: seed?.status ?? pick(statuses),
    lastSeenAt: seed?.lastSeenAt ?? nowIso,
    lastSeenLocation: seed?.lastSeenLocation ?? pick(locations),
    vitals: seed?.vitals ?? buildVitals(seed?.vitals),
    checkedOut: false,
    createdAt: seed?.createdAt ?? nowIso,
    updatedAt: seed?.updatedAt ?? nowIso,
    origin: seed?.origin ?? (seed ? 'seed' : 'dynamic')
  };
  residentRegistry.set(resident.id, resident);
  if (resident.origin === 'seed') {
    baseResidentIdSet.add(resident.id);
    suppressedSeedIds.delete(resident.id);
    dynamicResidentIds.delete(resident.id);
  } else {
    dynamicResidentIds.add(resident.id);
  }
  markRosterActive();
  return resident;
};

const touchResident = (resident) => {
  resident.updatedAt = new Date().toISOString();
  return resident;
};

const initializeResidentBase = () => {
  if (allowEmptyRoster) {
    return;
  }
  baseResidentSeeds.forEach((seed) => {
    if (suppressedSeedIds.has(seed.id)) {
      return;
    }
    const existing = residentRegistry.get(seed.id);
    if (!existing) {
      createResident(seed);
      return;
    }
    if (existing.checkedOut) {
      existing.checkedOut = false;
      existing.status = pick(statuses);
      existing.lastSeenAt = new Date().toISOString();
      existing.lastSeenLocation = pick(locations);
      existing.vitals = buildVitals(existing.vitals);
      existing.origin = 'seed';
      touchResident(existing);
      return;
    }
    existing.origin = 'seed';
  });
};

initializeResidentBase();

// 從仍在院的住民中挑選一位以便後續更新。
const randomActiveResident = () => {
  const residents = Array.from(residentRegistry.values()).filter((resident) => !resident.checkedOut);
  if (residents.length === 0) return null;
  return pick(residents);
};

// 透過高斯雜訊微調生命徵象與位置資訊。
const mutateResident = (resident) => {
  const updated = {
    ...resident,
    status: pick(statuses),
    checkedOut: false,
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: pick(locations),
    vitals: buildVitals(resident.vitals)
  };
  residentRegistry.set(updated.id, touchResident(updated));
  return updated;
};

const clearDynamicResidents = () => {
  const cleared = [];
  Array.from(dynamicResidentIds).forEach((id) => {
    const resident = residentRegistry.get(id);
    if (resident) {
      const checkedOut = checkoutResident(resident);
      cleared.push(checkedOut);
      residentRegistry.delete(id);
    }
    dynamicResidentIds.delete(id);
  });
  return cleared;
};

const clearAllResidents = () => {
  const cleared = [];
  residentRegistry.forEach((resident, id) => {
    const checkedOut = checkoutResident(resident);
    cleared.push(checkedOut);
    residentRegistry.delete(id);
    dynamicResidentIds.delete(id);
    if (baseResidentIdSet.has(id)) {
      suppressedSeedIds.add(id);
    }
  });
  allowEmptyRoster = true;
  return cleared;
};

const deleteResidentById = (id) => {
  const resident = residentRegistry.get(id);
  if (!resident) {
    return null;
  }
  const checkedOut = checkoutResident(resident);
  residentRegistry.delete(id);
  dynamicResidentIds.delete(id);
  if (baseResidentIdSet.has(id)) {
    suppressedSeedIds.add(id);
  }
  return checkedOut;
};

const createManualResident = (input) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const safeName = input.name?.trim() || `${pick(givenNames)} ${pick(surnames)}`;
  const safeRoom = input.room?.trim() || `${pick(roomPrefixes)}-${pick(roomNumbers)}`;
  const safeStatus = statuses.includes(input.status) ? input.status : 'stable';
  const safeLocation = input.lastSeenLocation?.trim() || safeRoom;
  const safeTimestamp = input.lastSeenAt || nowIso;
  const seed = {
    id: input.id || nextResidentId(),
    name: safeName,
    room: safeRoom,
    status: safeStatus,
    lastSeenAt: safeTimestamp,
    lastSeenLocation: safeLocation,
    createdAt: nowIso,
    updatedAt: nowIso,
    origin: 'manual'
  };
  return createResident(seed);
};

// 標記住民已退房，同時保留其資料。
const checkoutResident = (resident) => {
  const updated = {
    ...resident,
    status: 'checked_out',
    checkedOut: true,
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: 'Departure'
  };
  residentRegistry.set(updated.id, touchResident(updated));
  return updated;
};

const composeEventPayload = (type, resident) => ({
  type,
  timestamp: new Date().toISOString(),
  resident
});

const firstAvailableSeed = () => baseResidentSeeds.find((seed) => !suppressedSeedIds.has(seed.id)) ?? null;

const payloadFactories = {
  'resident.new': () => composeEventPayload('resident.new', createResident()),
  'resident.update': () => {
    initializeResidentBase();
    let target = randomActiveResident();
    if (!target) {
      if (allowEmptyRoster) {
        return null;
      }
      const fallbackSeed = firstAvailableSeed();
      if (!fallbackSeed) {
        return null;
      }
      target = residentRegistry.get(fallbackSeed.id) ?? createResident(fallbackSeed);
    }
    return composeEventPayload('resident.update', mutateResident(target));
  },
  'resident.checkout': () => {
    let target = randomActiveResident();
    if (!target) {
      if (allowEmptyRoster) {
        return null;
      }
      const fallbackSeed = firstAvailableSeed();
      if (!fallbackSeed) {
        return null;
      }
      target = residentRegistry.get(fallbackSeed.id) ?? createResident(fallbackSeed);
    }
    return composeEventPayload('resident.checkout', checkoutResident(target));
  }
};

const ensureRosterForCommand = () => {
  if (residentRegistry.size === 0) {
    const fallbackSeed = firstAvailableSeed();
    if (fallbackSeed) {
      createResident(fallbackSeed);
    } else {
      createResident();
    }
    return;
  }
  markRosterActive();
};

// 確保串流中至少存在一位活躍住民，並維持預設名單。
const ensureResidentBase = () => {
  initializeResidentBase();
  const activeResidents = Array.from(residentRegistry.values()).filter((resident) => !resident.checkedOut);
  if (activeResidents.length === 0 && baseResidentSeeds.length > 0) {
    const seed = baseResidentSeeds[0];
    const revived = residentRegistry.get(seed.id) ?? createResident(seed);
    revived.checkedOut = false;
    touchResident(revived);
    return composeEventPayload('resident.new', revived);
  }
  return null;
};

const nextRandomEvent = () => {
  const fallback = ensureResidentBase();
  if (fallback) return fallback;

  return payloadFactories['resident.update']();
};

const sendRosterSnapshot = (connection) => {
  ensureResidentBase();
  const activeResidents = getActiveResidents();
  activeResidents.forEach((resident) => {
    const payload = composeEventPayload('resident.new', resident);
    sendEvent(connection, payload.type, payload);
  });
};

const sendEvent = (connection, eventType, payload) => {
  if (connection.closed) return;
  const id = `${Date.now()}-${connection.sequence++}`;
  connection.controller.enqueue(encode(`id: ${id}\n`));
  connection.controller.enqueue(encode(`event: ${eventType}\n`));
  connection.controller.enqueue(encode(`data: ${JSON.stringify(payload)}\n\n`));
};

const broadcastPayload = (payload) => {
  activeConnections.forEach((connection) => {
    sendEvent(connection, payload.type, payload);
  });
};

const sendKeepAlive = (connection) => {
  if (connection.closed) return;
  connection.controller.enqueue(encode(`: ping\n\n`));
};

// 每 15 秒送出 keep-alive 註解，維持 EventSource 連線。
const scheduleKeepAlive = (connection) => {
  connection.keepAliveTimer = setTimeout(() => {
    sendKeepAlive(connection);
    if (!connection.closed) {
      scheduleKeepAlive(connection);
    }
  }, 15000);
};

// 隨機 1–3 秒後送出下一筆模擬事件。
const scheduleNextEvent = (connection) => {
  const delay = randomInt(1000, 3000);
  connection.eventTimer = setTimeout(() => {
    const payload = nextRandomEvent();
    if (payload) {
      sendEvent(connection, payload.type, payload);
    }
    if (!connection.closed) {
      scheduleNextEvent(connection);
    }
  }, delay);
};

// 當客戶端中斷時清除計時器並關閉串流。
const closeConnection = (connection) => {
  if (connection.closed) return;
  connection.closed = true;
  clearTimeout(connection.keepAliveTimer);
  clearTimeout(connection.eventTimer);
  activeConnections.delete(connection);
  try {
    connection.controller.close();
  } catch {
    // controller 可能已經被關閉，忽略錯誤
  }
};

// 只攔截 GET /sim/sse，其餘請求一律放行。
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === SNAPSHOT_PATH) {
    const body = JSON.stringify(getActiveResidents());
    event.respondWith(
      new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      })
    );
    return;
  }

  if (request.method === 'GET' && url.pathname === SSE_PATH) {
    let connection = null;
    const stream = new ReadableStream({
      start(controller) {
        connection = {
          controller,
          sequence: 0,
          keepAliveTimer: null,
          eventTimer: null,
          closed: false
        };
        activeConnections.add(connection);

        controller.enqueue(encode('retry: 3000\n\n'));
        controller.enqueue(encode(`: connected ${new Date().toISOString()}\n\n`));

        scheduleKeepAlive(connection);
        sendRosterSnapshot(connection);
        const initialPayload = nextRandomEvent();
        if (initialPayload) {
          sendEvent(connection, initialPayload.type, initialPayload);
        }
        scheduleNextEvent(connection);

        const abortConnection = () => closeConnection(connection);
        if (request.signal) {
          if (request.signal.aborted) {
            abortConnection();
          } else {
            request.signal.addEventListener('abort', abortConnection);
          }
        }
      },
      cancel() {
        if (connection) {
          closeConnection(connection);
        }
      }
    });

    event.respondWith(
      new Response(stream, {
        headers: SSE_HEADERS
      })
    );
    return;
  }
});

// 開發工具可透過 postMessage 觸發連發或新增住民事件。
self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'simulator:broadcast') {
    const payload = data.payload;
    if (!payload || typeof payload !== 'object') {
      return;
    }

    switch (payload.action) {
      case 'spawn': {
        const newcomer = payloadFactories['resident.new']();
        if (newcomer) {
          broadcastPayload(newcomer);
        }
        break;
      }
      case 'burst': {
        ensureRosterForCommand();
        for (let index = 0; index < 10; index += 1) {
          const updatePayload = payloadFactories['resident.update']();
          if (updatePayload) {
            broadcastPayload(updatePayload);
          }
        }
        break;
      }
      case 'mutate': {
        ensureRosterForCommand();
        const updatePayload = payloadFactories['resident.update']();
        if (updatePayload) {
          broadcastPayload(updatePayload);
        }
        break;
      }
      case 'clear': {
        const cleared = clearDynamicResidents();
        if (cleared.length === 0) {
          break;
        }
        cleared.forEach((resident) => {
          const checkoutPayload = composeEventPayload('resident.checkout', resident);
          broadcastPayload(checkoutPayload);
        });
        break;
      }
      case 'clearAll': {
        const cleared = clearAllResidents();
        if (cleared.length === 0) {
          break;
        }
        cleared.forEach((resident) => {
          const checkoutPayload = composeEventPayload('resident.checkout', resident);
          broadcastPayload(checkoutPayload);
        });
        break;
      }
      case 'delete': {
        if (!payload.id || typeof payload.id !== 'string') {
          break;
        }
        const deleted = deleteResidentById(payload.id);
        if (deleted) {
          const checkoutPayload = composeEventPayload('resident.checkout', deleted);
          broadcastPayload(checkoutPayload);
        }
        break;
      }
      case 'addCustom': {
        if (!payload.resident || typeof payload.resident !== 'object') {
          break;
        }
        const manual = createManualResident(payload.resident);
        const manualPayload = composeEventPayload('resident.new', manual);
        broadcastPayload(manualPayload);
        break;
      }
      default:
        break;
    }
  }
});
