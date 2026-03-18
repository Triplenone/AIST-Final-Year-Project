import type { APIRequestContext, APIResponse } from '@playwright/test';

type Device = {
  device_id: number;
  elderly_user_id?: number | null;
};

type Location = {
  location_zone_id: number;
  name?: string | null;
  category?: string | null;
};

type BackendEvent = {
  event_id: number;
  event_type: string;
  event_status: string;
  event_timestamp: string;
};

const DEFAULT_GEOFENCE_COORDS =
  '114.1705,22.3189;114.1710,22.3189;114.1710,22.3193;114.1705,22.3193';

const waitJson = async <T>(response: APIResponse): Promise<T> => {
  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Request failed: ${response.status()} ${text}`);
  }
  return (await response.json()) as T;
};

export const getFirstElderlyDevice = async (request: APIRequestContext): Promise<Device> => {
  const response = await request.get('/api/v1/devices/');
  const devices = await waitJson<Device[]>(response);
  const match = devices.find((device) => Boolean(device.elderly_user_id));
  if (!match) {
    throw new Error('No device with elderly_user_id found.');
  }
  return match;
};

export const ensureOutdoorLocation = async (
  request: APIRequestContext,
  name = 'Outdoor Garden'
): Promise<Location> => {
  const listResponse = await request.get('/api/v1/locations/?limit=1000');
  const locations = await waitJson<Location[]>(listResponse);
  const existing = locations.find((loc) => loc.name === name);
  if (existing) return existing;

  const createResponse = await request.post('/api/v1/locations/', {
    data: {
      name,
      category: 'outdoor_area',
      geofence_coordinates: DEFAULT_GEOFENCE_COORDS,
      is_safe_zone: false
    }
  });
  return await waitJson<Location>(createResponse);
};

export const sendReceptionPayload = async (
  request: APIRequestContext,
  payload: Record<string, unknown>
) => {
  const response = await request.post('/api/v1/data-reception/receive', { data: payload });
  return await waitJson<Record<string, unknown>>(response);
};

export const sendFallPayload = async (request: APIRequestContext, deviceId: number) => {
  const now = Math.floor(Date.now() / 1000);
  return await sendReceptionPayload(request, {
    device_id: deviceId,
    timestamp: now,
    relative_time: now,
    accelerometer: { x: 0.1, y: -0.02, z: 1.0 },
    gyroscope: { x: 0.01, y: -0.03, z: 0.02 },
    location: { x: 2.3, y: 3.6, z: 0, accuracy: 1.2, position_quality: 'good' },
    fall_detection: {
      state: 4,
      state_description: 'confirmed',
      confidence: 0.95,
      is_fall_confirmed: true,
      impact_force: 6.8,
      direction: 'front',
      fall_time: now
    },
    system_status: { wifi_connected: true, server_connected: true, battery_level: 85 }
  });
};

export const sendMultiEventPayload = async (
  request: APIRequestContext,
  deviceId: number,
  zoneName: string
) => {
  const now = Math.floor(Date.now() / 1000);
  return await sendReceptionPayload(request, {
    device_id: deviceId,
    timestamp: now,
    relative_time: now,
    accelerometer: { x: 0.1, y: -0.02, z: 1.0 },
    gyroscope: { x: 0.01, y: -0.03, z: 0.02 },
    location: { x: 2.3, y: 3.6, z: 0, accuracy: 1.2, position_quality: 'good' },
    fall_detection: {
      state: 4,
      state_description: 'confirmed',
      confidence: 0.95,
      is_fall_confirmed: true,
      impact_force: 6.8,
      direction: 'front',
      fall_time: now
    },
    system_status: { wifi_connected: true, server_connected: true, battery_level: 85 },
    sos_triggered: true,
    vitals: { hr: 130, spo2: 89, temperature: 38.2 },
    vitals_abnormal: true,
    geofence_breach: {
      lat: 22.3189,
      lng: 114.1705,
      zone_name: zoneName,
      breach: true
    },
    location_zone_name: zoneName
  });
};

export const getLatestEvent = async (
  request: APIRequestContext,
  eventType?: string,
  status?: string
): Promise<BackendEvent | null> => {
  const query = new URLSearchParams();
  query.set('limit', '1');
  if (eventType) query.set('event_type', eventType);
  if (status) query.set('event_status', status);
  const response = await request.get(`/api/v1/events/?${query.toString()}`);
  const events = await waitJson<BackendEvent[]>(response);
  return events[0] ?? null;
};

export const resolveEvent = async (request: APIRequestContext, eventId: number, status: string) => {
  const response = await request.put(`/api/v1/events/${eventId}/handle?event_status=${status}`);
  await waitJson<Record<string, unknown>>(response);
};

export const clearActiveEvents = async (request: APIRequestContext) => {
  const statuses = ['unhandled', 'confirmed'];
  for (const status of statuses) {
    const response = await request.get(`/api/v1/events/?event_status=${status}&limit=200`);
    const events = await waitJson<BackendEvent[]>(response);
    for (const event of events) {
      await resolveEvent(request, event.event_id, 'resolved');
    }
  }
};
