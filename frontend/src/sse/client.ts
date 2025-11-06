// 針對住民 SSE 模擬器撰寫的強型別 EventSource 封裝。
export type ResidentStatus = 'stable' | 'followUp' | 'high' | 'checked_out';

export type ResidentVitals = {
  hr: number;
  bpSystolic: number;
  bpDiastolic: number;
  spo2: number;
  temperature: number;
};

export type Resident = {
  id: string;
  name: string;
  room: string;
  status: ResidentStatus;
  lastSeenAt: string;
  lastSeenLocation: string;
  vitals: ResidentVitals;
  checkedOut: boolean;
  createdAt: string;
  updatedAt: string;
  origin?: 'seed' | 'dynamic';
};

export type ResidentEventType = 'resident.new' | 'resident.update' | 'resident.checkout';

export type ResidentEvent<TType extends ResidentEventType = ResidentEventType> = {
  type: TType;
  timestamp: string;
  resident: Resident;
};

type Listener = (event: ResidentEvent) => void;

type ListenerMap = Map<string, Set<Listener>>;

const knownEventTypes: ResidentEventType[] = ['resident.new', 'resident.update', 'resident.checkout'];

// 在派送前先檢查資料格式，避免異常 Payload 影響 UI。
const safeParse = (raw: string): ResidentEvent | null => {
  try {
    const parsed = JSON.parse(raw) as ResidentEvent;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.resident || typeof parsed.resident.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

const attachListener = (map: ListenerMap, type: string, listener: Listener) => {
  let listeners = map.get(type);
  if (!listeners) {
    listeners = new Set();
    map.set(type, listeners);
  }
  listeners.add(listener);
};

const detachListener = (map: ListenerMap, type: string, listener: Listener) => {
  const listeners = map.get(type);
  if (!listeners) return;
  listeners.delete(listener);
  if (listeners.size === 0) {
    map.delete(type);
  }
};

// 對特定事件與萬用事件的監聽器逐一呼叫。
const dispatch = (listeners: ListenerMap, type: string, event: ResidentEvent) => {
  const specific = listeners.get(type);
  if (specific) {
    specific.forEach((listener) => {
      listener(event);
    });
  }
  const wildcard = listeners.get('*');
  if (wildcard) {
    wildcard.forEach((listener) => {
      listener(event);
    });
  }
};

type EventSourceWrapper = {
  source: EventSource;
  on: (type: ResidentEventType | '*', handler: Listener) => () => void;
  off: (type: ResidentEventType | '*', handler: Listener) => void;
  close: () => void;
};

// 建立 EventSource、提供型別安全的監聽註冊並處理重連訊息。
export const openResidentSSE = (url = '/sim/sse', eventSourceInit?: EventSourceInit): EventSourceWrapper => {
  const listeners: ListenerMap = new Map();
  const es = new EventSource(url, eventSourceInit);

  let errorCount = 0;
  es.addEventListener('open', () => {
    errorCount = 0;
    console.info('[SSE] Connected to resident simulator');
  });

  es.addEventListener('error', (event) => {
    const attempt = errorCount + 1;
    errorCount = attempt;
    const delay = Math.min(30000, 2000 * 2 ** attempt);
    console.warn(`[SSE] Connection error (attempt ${attempt}). Retrying automatically, suggested delay ≈ ${delay}ms`, event);
  });

  const baseListener = (type: ResidentEventType | 'message') => (rawEvent: MessageEvent<string>) => {
    const parsed = safeParse(rawEvent.data);
    if (!parsed) {
      console.warn('[SSE] Dropped malformed payload', rawEvent.data);
      return;
    }
    const eventType = type === 'message' ? parsed.type : type;
    dispatch(listeners, eventType, parsed);
  };

  knownEventTypes.forEach((type) => {
    es.addEventListener(type, baseListener(type));
  });
  es.addEventListener('message', baseListener('message'));

  const on = (type: ResidentEventType | '*', handler: Listener) => {
    attachListener(listeners, type, handler);
    return () => {
      detachListener(listeners, type, handler);
    };
  };

  const off = (type: ResidentEventType | '*', handler: Listener) => {
    detachListener(listeners, type, handler);
  };

  const close = () => {
    listeners.clear();
    es.close();
  };

  return {
    source: es,
    on,
    off,
    close
  };
};
