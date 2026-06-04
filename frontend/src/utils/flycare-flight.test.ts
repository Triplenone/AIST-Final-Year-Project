import { describe, expect, it } from 'vitest';

import { extractFlightGateFromLatestResponse, resolveFlightPassengerName } from './flycare-flight';

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

  it('rejects mismatched device_id', () => {
    expect(
      extractFlightGateFromLatestResponse({ found: true, device_id: 'ESP32_B', gate: '10' }, 'ESP32_A')
    ).toBeNull();
  });
});
