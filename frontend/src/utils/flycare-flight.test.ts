import { describe, expect, it } from 'vitest';

import {
  buildFlightInfoFromLatestResponse,
  extractFlightGateFromLatestResponse,
  isFlightLatestResponseForDevice,
  resolveFlightPassengerName
} from './flycare-flight';

describe('resolveFlightPassengerName', () => {
  const registry = [
    { deviceId: 'ESP32_A', displayName: 'CHAN TAI MAN' },
    { deviceId: 'ESP32_B', displayName: 'LAU SIU FONG' }
  ];

  it('prefers API passenger name when present', () => {
    expect(
      resolveFlightPassengerName('From API', 'ESP32_A', {
        selectedResident: { deviceId: 'ESP32_A', displayName: 'CHAN TAI MAN' },
        registry
      })
    ).toBe('From API');
  });

  it('falls back to selected resident display name for matching device', () => {
    expect(
      resolveFlightPassengerName(undefined, 'ESP32_A', {
        selectedResident: { deviceId: 'ESP32_A', displayName: 'CHAN TAI MAN' },
        registry
      })
    ).toBe('CHAN TAI MAN');
  });

  it('falls back to registry lookup when selected resident does not match', () => {
    expect(
      resolveFlightPassengerName(null, 'ESP32_B', {
        selectedResident: { deviceId: 'ESP32_A', displayName: 'CHAN TAI MAN' },
        registry
      })
    ).toBe('LAU SIU FONG');
  });
});

describe('extractFlightGateFromLatestResponse', () => {
  it('returns trimmed gate when found and device matches', () => {
    expect(
      extractFlightGateFromLatestResponse(
        { found: true, device_id: 'ESP32_A', gate: ' 10 ' },
        'ESP32_A'
      )
    ).toBe('10');
  });

  it('falls back to nested MQTT flight_info boarding_gate', () => {
    expect(
      extractFlightGateFromLatestResponse(
        { found: true, device_id: 'ESP32_A', flight_info: { boarding_gate: ' 11 ' } },
        'ESP32_A'
      )
    ).toBe('11');
  });

  it('rejects mismatched device_id', () => {
    expect(
      extractFlightGateFromLatestResponse({ found: true, device_id: 'ESP32_B', gate: '10' }, 'ESP32_A')
    ).toBeNull();
  });

  it('accepts aliased device_id when mysql_device_id matches', () => {
    expect(
      extractFlightGateFromLatestResponse(
        { found: true, device_id: 'ESP32_ALIAS', mysql_device_id: 8, gate: '10' },
        'ESP32_CANONICAL',
        { expectedMysqlDeviceId: 8 }
      )
    ).toBe('10');
  });

  it('still rejects aliased device_id when mysql_device_id differs', () => {
    expect(
      extractFlightGateFromLatestResponse(
        { found: true, device_id: 'ESP32_ALIAS', mysql_device_id: 9, gate: '10' },
        'ESP32_CANONICAL',
        { expectedMysqlDeviceId: 8 }
      )
    ).toBeNull();
  });
});

describe('buildFlightInfoFromLatestResponse', () => {
  const registry = [{ deviceId: 'ESP32_CANONICAL', displayName: 'NG WAI LUN' }];

  it('normalizes rich nested MQTT flight_info for a mysql device alias', () => {
    expect(
      buildFlightInfoFromLatestResponse(
        {
          found: true,
          device_id: 'ESP32_ALIAS',
          mysql_device_id: 8,
          flight_info: {
            flight_number: 'CX910',
            airline: 'Cathay Pacific',
            departure_airport: 'HKG',
            destination: 'Singapore',
            seat_number: '21C',
            scheduled_departure: '17:35',
            estimated_departure: '17:50',
            boarding_time: '17:05',
            boarding_gate: 'Gate 10',
            status: 'delayed',
            delay_minutes: 15,
            delay_reason: 'Live integration retest',
            terminal: 'T1',
            checkin_counter: 'A12'
          }
        },
        'ESP32_CANONICAL',
        {
          expectedMysqlDeviceId: 8,
          selectedResident: { deviceId: 'ESP32_CANONICAL', displayName: 'NG WAI LUN' },
          registry
        }
      )
    ).toEqual(
      expect.objectContaining({
        passengerName: 'NG WAI LUN',
        flightNumber: 'CX910',
        gate: 'Gate 10',
        flightTime: '17:35',
        estimatedDeparture: '17:50',
        boardingTime: '17:05',
        flightStatus: 'delayed',
        delayMinutes: 15,
        delayReason: 'Live integration retest',
        terminal: 'T1',
        checkinCounter: 'A12',
        departureAirport: 'HKG',
        arrivalAirport: 'Singapore',
        seatNumber: '21C'
      })
    );
  });

  it('keeps compatibility with legacy top-level flight fields', () => {
    expect(
      buildFlightInfoFromLatestResponse(
        {
          found: true,
          device_id: 'ESP32_A',
          passengerName: 'From API',
          flightNumber: 'CX888',
          gate: 'Gate 11',
          flightTime: '18:05',
          estimatedDeparture: '18:20',
          flightStatus: 'gate_changed',
          delayMinutes: '15',
          departureAirport: 'HKG',
          arrivalAirport: 'Tokyo',
          seatNumber: '9A'
        },
        'ESP32_A'
      )
    ).toEqual(
      expect.objectContaining({
        passengerName: 'From API',
        flightNumber: 'CX888',
        gate: 'Gate 11',
        flightTime: '18:05',
        estimatedDeparture: '18:20',
        flightStatus: 'gate_changed',
        delayMinutes: 15,
        departureAirport: 'HKG',
        arrivalAirport: 'Tokyo',
        seatNumber: '9A'
      })
    );
  });

  it('rejects mismatched latest flight payloads', () => {
    expect(
      buildFlightInfoFromLatestResponse({ found: true, device_id: 'ESP32_B', flightNumber: 'CX910' }, 'ESP32_A')
    ).toBeNull();
  });
});

describe('isFlightLatestResponseForDevice', () => {
  it('accepts selected canonical device_id', () => {
    expect(isFlightLatestResponseForDevice({ found: true, device_id: 'ESP32_A' }, 'ESP32_A')).toBe(true);
  });

  it('accepts alias response with matching mysql_device_id', () => {
    expect(
      isFlightLatestResponseForDevice(
        { found: true, device_id: 'ESP32_ALIAS', mysql_device_id: 8 },
        'ESP32_CANONICAL',
        { expectedMysqlDeviceId: 8 }
      )
    ).toBe(true);
  });
});
