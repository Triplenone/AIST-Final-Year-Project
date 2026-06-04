type ResidentNameLookup = {
  deviceId: string;
  displayName: string;
};

type FlightGateLatestResponse = {
  found?: boolean;
  device_id?: string;
  gate?: string | number | null;
};

/** Shared gate parsing for flight panel and map navigation. */
export function extractFlightGateFromLatestResponse(
  res: FlightGateLatestResponse,
  expectedDeviceId?: string
): string | null {
  if (!res.found) return null;
  if (expectedDeviceId && res.device_id != null && res.device_id !== expectedDeviceId) {
    return null;
  }
  if (res.gate == null || String(res.gate).trim() === '') {
    return null;
  }
  return String(res.gate).trim();
}

/**
 * MQTT flight downlink omits passengerName; resolve from the device-bound resident.
 */
export function resolveFlightPassengerName(
  apiPassengerName: string | undefined | null,
  deviceId: string,
  options: {
    selectedResident?: { deviceId?: string; displayName?: string } | null;
    registry?: readonly ResidentNameLookup[];
  } = {}
): string | undefined {
  const fromApi = apiPassengerName?.trim();
  if (fromApi) return fromApi;

  const selected = options.selectedResident;
  if (selected?.deviceId === deviceId) {
    const selectedName = selected.displayName?.trim();
    if (selectedName) return selectedName;
  }

  const entry = options.registry?.find((row) => row.deviceId === deviceId);
  const registryName = entry?.displayName?.trim();
  return registryName || undefined;
}
