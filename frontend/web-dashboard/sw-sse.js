/* eslint-disable no-restricted-globals */
const swVersion = 'sse-mock-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const encoder = new TextEncoder();
const supportsStreaming = (() => {
  if (typeof ReadableStream !== 'function') {
    return false;
  }
  try {
    // Firefox (pre-113) throws here when ReadableStream is unsupported inside SW.
    // eslint-disable-next-line no-new
    new Response(new ReadableStream({
      start(controller) {
        controller.close();
      },
    }));
    return true;
  } catch (err) {
    return false;
  }
})();

let seed = 123456789;
function rand() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return (seed & 0xffffffff) / 0x100000000;
}

function gauss(mu = 0, sigma = 1) {
  const u = 1 - rand();
  const v = 1 - rand();
  const mag = Math.sqrt(-2 * Math.log(u));
  const z = mag * Math.cos(2 * Math.PI * v);
  return mu + z * sigma;
}

const rooms = ['Room 101', 'Room 102', 'Room 201', 'Lobby', 'Dining Hall', 'Garden'];
const familyNames = ['Lee', 'Chan', 'Wong', 'Lam', 'Ng', 'Lau', 'Yip', 'Ho', 'Ma', 'Cheung'];
const baseResidents = [
  {
    id: 'r1',
    name: 'Mrs. Chen',
    gender: 'Female',
    age: 72,
    room: '204',
    baselineVitals: { hr: 72, spo2: 97, temp: 36.6, bp: { sys: 118, dia: 76 } },
    isGenerated: false,
  },
  {
    id: 'r2',
    name: 'Mr. Lee',
    gender: 'Male',
    age: 75,
    room: '310',
    baselineVitals: { hr: 80, spo2: 96, temp: 36.5, bp: { sys: 130, dia: 82 } },
    isGenerated: false,
  },
  {
    id: 'r3',
    name: 'Mrs. Singh',
    gender: 'Female',
    age: 68,
    room: '118',
    baselineVitals: { hr: 96, spo2: 95, temp: 36.9, bp: { sys: 110, dia: 70 } },
    isGenerated: false,
  },
  {
    id: 'r4',
    name: 'Ms. Lopez',
    gender: 'Female',
    age: 70,
    room: '122',
    baselineVitals: { hr: 68, spo2: 98, temp: 36.4, bp: { sys: 116, dia: 74 } },
    isGenerated: false,
  },
];

const state = {
  nextId: 1,
  residents: new Map(),
  eventId: 0,
  streams: new Map(),
  streamSerial: 0,
  ticker: null,
  tickMs: 2000,
  heartbeatMs: 15000,
  lastHeartbeat: Date.now(),
  eventHistory: [],
  historyLimit: 200,
  pollBuffer: [],
  lastTickAt: 0,
  generatedIds: new Set(),
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickName() {
  const surname = familyNames[Math.floor(rand() * familyNames.length)];
  const digits = String(Math.floor(rand() * 900) + 100);
  return `${surname} ${digits}`;
}

function registerResident(input) {
  // 建立或更新 Service Worker 端的住民基礎資料，供 SSE 模擬器使用
  const id = input.id || String(state.nextId++);
  const entry = {
    id,
    name: input.name || pickName(),
    gender: input.gender || (rand() < 0.5 ? 'Male' : 'Female'),
    age: input.age || Math.floor(rand() * 35) + 65,
    room: input.room || rooms[Math.floor(rand() * rooms.length)],
    baselineVitals: input.baselineVitals || {
      hr: Math.floor(rand() * 18) + 70,
      spo2: Math.floor(rand() * 3) + 96,
      temp: +(36.5 + gauss(0, 0.1)).toFixed(1),
      bp: {
        sys: 118 + Math.floor(gauss(0, 6)),
        dia: 74 + Math.floor(gauss(0, 4)),
      },
    },
    isGenerated: Boolean(input.isGenerated),
  };
  state.residents.set(id, entry);
  if (entry.isGenerated) {
    state.generatedIds.add(id);
  } else {
    state.generatedIds.delete(id);
  }
  return entry;
}

function toResidentPayload(entry) {
  return {
    id: entry.id,
    name: entry.name,
    gender: entry.gender,
    age: entry.age,
    room: entry.room,
    baselineVitals: entry.baselineVitals,
    isGenerated: entry.isGenerated,
  };
}

function createRandomResident() {
  return registerResident({ isGenerated: true });
}

function seedBaseResidents() {
  if (state.residents.size > 0) {
    return;
  }
  // 初始化內建住民，確保儀表板開啟時就有穩定資料可供模擬
  baseResidents.forEach((base) => {
    const entry = registerResident(base);
    recordEvent('new_resident', toResidentPayload(entry));
  });
  const maxId = baseResidents.reduce((acc, item) => {
    const numeric = Number(item.id.replace(/[^\d]/g, '')) || 0;
    return Math.max(acc, numeric);
  }, 0);
  state.nextId = Math.max(state.nextId, maxId + 1);
}

seedBaseResidents();

function vitalsFor(resident) {
  const base = resident.baselineVitals;
  return {
    id: resident.id,
    ts: new Date().toISOString(),
    hr: clamp(Math.round(base.hr + gauss(0, 4)), 55, 120),
    spo2: clamp(Math.round(base.spo2 + gauss(0.2, 0.8)), 92, 100),
    temp: clamp(+(base.temp + gauss(0, 0.1)).toFixed(1), 36.0, 37.8),
    bp: {
      sys: clamp(Math.round(base.bp.sys + gauss(0, 5)), 105, 150),
      dia: clamp(Math.round(base.bp.dia + gauss(0, 4)), 65, 95),
    },
  };
}

function makeFrame(type, payload, id) {
  return encoder.encode(`id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function makeComment(text) {
  return encoder.encode(`: ${text}\n\n`);
}

function broadcastEncoded(encoded) {
  for (const stream of state.streams.values()) {
    try {
      stream.controller.enqueue(encoded);
    } catch (err) {
      // Stream might already be closed; cleanup will occur soon.
    }
  }
}

function recordEvent(type, payload) {
  const id = ++state.eventId;
  const eventRecord = { id, type, payload };
  state.eventHistory.push(eventRecord);
  if (state.eventHistory.length > state.historyLimit) {
    state.eventHistory.shift();
  }
  state.pollBuffer.push(eventRecord);
  if (state.pollBuffer.length > state.historyLimit) {
    state.pollBuffer.shift();
  }
  const frame = makeFrame(type, payload, id);
  broadcastEncoded(frame);
  return eventRecord;
}

function broadcastComment(text) {
  const encoded = makeComment(text);
  broadcastEncoded(encoded);
}

function tick() {
  const now = Date.now();
  state.lastTickAt = now;

  if (state.residents.size === 0) {
    seedBaseResidents();
  }

  for (const resident of state.residents.values()) {
    const vitals = vitalsFor(resident);
    recordEvent('vitals', vitals);
  }

  if (now - state.lastHeartbeat >= state.heartbeatMs) {
    state.lastHeartbeat = now;
    broadcastComment('keep-alive');
  }
}

function ensureTicker() {
  if (!state.ticker) {
    tick();
    state.ticker = setInterval(() => {
      tick();
    }, state.tickMs);
  }
}

function stopTickerIfIdle() {
  if (state.ticker && state.streams.size === 0) {
    clearInterval(state.ticker);
    state.ticker = null;
  }
}

function sendHistory(controller, lastSeenId) {
  const isFiniteId = Number.isFinite(lastSeenId);
  for (const record of state.eventHistory) {
    if (!isFiniteId || record.id > lastSeenId) {
      controller.enqueue(makeFrame(record.type, record.payload, record.id));
    }
  }
}

async function streamHandler(event) {
  if (!supportsStreaming) {
    ensureTicker();
    return new Response('SSE unsupported in this browser; falling back.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  ensureTicker();
  const streamId = ++state.streamSerial;
  const requestLastEventId = event.request.headers.get('Last-Event-ID');
  const lastEventId = requestLastEventId ? Number(requestLastEventId) : NaN;

  const stream = new ReadableStream({
    start(controller) {
      state.streams.set(streamId, { controller });
      controller.enqueue(encoder.encode('retry: 4000\n\n'));
      sendHistory(controller, lastEventId);

      event.request.signal.addEventListener('abort', () => {
        state.streams.delete(streamId);
        stopTickerIfIdle();
      });
    },
    cancel() {
      state.streams.delete(streamId);
      stopTickerIfIdle();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

function jsonOK(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

function handleRandomResidentRequest() {
  const resident = createRandomResident();
  const payload = toResidentPayload(resident);
  recordEvent('new_resident', payload);
  return jsonOK(payload);
}

function handleCheckoutRequest(id) {
  if (state.residents.has(id)) {
    state.residents.delete(id);
    state.generatedIds.delete(id);
  }
  recordEvent('checkout', { id });
  return jsonOK({ ok: true, id });
}

function handleVitalsFeedRequest() {
  const now = Date.now();
  if (state.residents.size === 0) {
    seedBaseResidents();
  }
  if (now - state.lastTickAt >= state.tickMs) {
    tick();
  }
  const snapshot = state.pollBuffer.slice();
  state.pollBuffer.length = 0;
  return jsonOK(snapshot);
}

async function handleRandomBatchRequest(request) {
  let count = 1;
  try {
    const body = await request.json();
    if (body && Number.isFinite(Number(body.count))) {
      count = Number(body.count);
    }
  } catch (err) {
    count = 1;
  }
  count = Math.max(1, Math.min(10, count));
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const resident = createRandomResident();
    const payload = toResidentPayload(resident);
    created.push(payload);
    recordEvent('new_resident', payload);
  }
  return jsonOK({ ok: true, residents: created });
}

function handleClearGeneratedRequest() {
  // 只移除由模擬器產生的暫時住民，預設住民會留存以提供基準資料
  const removed = [];
  const ids = Array.from(state.generatedIds);
  ids.forEach((id) => {
    if (state.residents.delete(id)) {
      removed.push(id);
      recordEvent('checkout', { id });
    }
    state.generatedIds.delete(id);
  });
  return jsonOK({ ok: true, removed });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === '/events' && event.request.method === 'GET') {
    event.respondWith(streamHandler(event));
    return;
  }

  if (url.pathname === '/api/residents/random' && event.request.method === 'POST') {
    ensureTicker();
    event.respondWith(handleRandomResidentRequest());
    return;
  }
  if (url.pathname === '/api/residents/random-batch' && event.request.method === 'POST') {
    ensureTicker();
    event.respondWith(handleRandomBatchRequest(event.request));
    return;
  }

  if (url.pathname === '/api/residents/generated/clear' && event.request.method === 'POST') {
    ensureTicker();
    event.respondWith(handleClearGeneratedRequest());
    return;
  }

  const checkoutMatch = url.pathname.match(/^\/api\/residents\/([\w-]+)\/checkout$/);
  if (checkoutMatch && event.request.method === 'POST') {
    ensureTicker();
    const [, id] = checkoutMatch;
    event.respondWith(handleCheckoutRequest(id));
    return;
  }

  if (url.pathname === '/api/vitals-feed' && event.request.method === 'GET') {
    ensureTicker();
    event.respondWith(handleVitalsFeedRequest());
  }
});
