type ResidentNameLookup = {
  deviceId: string;
  displayName: string;
};

type FlightInfoLatestPayload = {
  flight_number?: string | number | null;
  airline?: string | null;
  departure_airport?: string | null;
  destination?: string | null;
  seat_number?: string | null;
  scheduled_departure?: string | null;
  estimated_departure?: string | null;
  boarding_time?: string | null;
  boarding_gate?: string | number | null;
  status?: string | null;
  delay_minutes?: number | string | null;
  delay_reason?: string | null;
  gate_changed?: boolean | null;
  terminal?: string | null;
  checkin_counter?: string | null;
};

type FlightGateLatestResponse = {
  found?: boolean;
  _id?: string;
  device_id?: string;
  mysql_device_id?: number | null;
  gate?: string | number | null;
  flight_info?: FlightInfoLatestPayload | null;
  passengerName?: string | null;
  flightNumber?: string | number | null;
  flightTime?: string | null;
  airline?: string | null;
  estimatedDeparture?: string | null;
  boardingTime?: string | null;
  flightStatus?: string | null;
  delayMinutes?: number | string | null;
  delayReason?: string | null;
  gateChanged?: boolean | null;
  terminal?: string | null;
  checkinCounter?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  seatNumber?: string | null;
};

type FlightDeviceMatchOptions = {
  expectedMysqlDeviceId?: number | null;
};

export type ResolvedFlightInfo = {
  passengerName?: string;
  flightNumber?: string;
  gate?: string;
  flightTime?: string;
  airline?: string;
  estimatedDeparture?: string;
  boardingTime?: string;
  flightStatus?: string;
  delayMinutes?: number;
  delayReason?: string;
  gateChanged?: boolean;
  terminal?: string;
  checkinCounter?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  seatNumber?: string;
};

function cleanString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const next = String(value).trim();
  return next || undefined;
}

function cleanNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

export function isFlightLatestResponseForDevice(
  res: FlightGateLatestResponse,
  expectedDeviceId?: string,
  options: FlightDeviceMatchOptions = {}
): boolean {
  if (!res.found) return false;
  if (!expectedDeviceId || res.device_id == null || res.device_id === expectedDeviceId) {
    return true;
  }
  const expectedMysqlDeviceId = options.expectedMysqlDeviceId;
  if (expectedMysqlDeviceId == null || res.mysql_device_id == null) {
    return false;
  }
  return Number(res.mysql_device_id) === Number(expectedMysqlDeviceId);
}

/** Shared gate parsing for flight panel and map navigation. */
export function extractFlightGateFromLatestResponse(
  res: FlightGateLatestResponse,
  expectedDeviceId?: string,
  options: FlightDeviceMatchOptions = {}
): string | null {
  if (!isFlightLatestResponseForDevice(res, expectedDeviceId, options)) return null;
  const gate = res.gate ?? res.flight_info?.boarding_gate;
  if (gate == null || String(gate).trim() === '') {
    return null;
  }
  return String(gate).trim();
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

export function buildFlightInfoFromLatestResponse(
  res: FlightGateLatestResponse,
  deviceId: string,
  options: FlightDeviceMatchOptions & {
    selectedResident?: { deviceId?: string; displayName?: string } | null;
    registry?: readonly ResidentNameLookup[];
  } = {}
): ResolvedFlightInfo | null {
  if (!isFlightLatestResponseForDevice(res, deviceId, options)) return null;

  const flightInfo = res.flight_info ?? {};
  const gate = extractFlightGateFromLatestResponse(res, deviceId, options) ?? undefined;
  const delayMinutes = cleanNumber(res.delayMinutes) ?? cleanNumber(flightInfo.delay_minutes);

  return {
    passengerName: resolveFlightPassengerName(res.passengerName, deviceId, options),
    flightNumber: cleanString(res.flightNumber) ?? cleanString(flightInfo.flight_number),
    gate,
    flightTime: cleanString(res.flightTime) ?? cleanString(flightInfo.scheduled_departure),
    airline: cleanString(res.airline) ?? cleanString(flightInfo.airline),
    estimatedDeparture: cleanString(res.estimatedDeparture) ?? cleanString(flightInfo.estimated_departure),
    boardingTime: cleanString(res.boardingTime) ?? cleanString(flightInfo.boarding_time),
    flightStatus: cleanString(res.flightStatus) ?? cleanString(flightInfo.status),
    delayMinutes,
    delayReason: cleanString(res.delayReason) ?? cleanString(flightInfo.delay_reason),
    gateChanged: res.gateChanged ?? flightInfo.gate_changed ?? undefined,
    terminal: cleanString(res.terminal) ?? cleanString(flightInfo.terminal),
    checkinCounter: cleanString(res.checkinCounter) ?? cleanString(flightInfo.checkin_counter),
    departureAirport: cleanString(res.departureAirport) ?? cleanString(flightInfo.departure_airport),
    arrivalAirport: cleanString(res.arrivalAirport) ?? cleanString(flightInfo.destination),
    seatNumber: cleanString(res.seatNumber) ?? cleanString(flightInfo.seat_number)
  };
}
