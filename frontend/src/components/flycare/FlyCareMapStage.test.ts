import { describe, expect, it } from 'vitest';

import type { PositionResidentViewModel } from '../../adapters/position-command-center';
import type { BackendEvent } from '../../types/backend';
import {
  buildFlyCareMarkerTooltipState,
  normalizeFlyCareAlertEvents,
  shouldFlashFlyCareMarker
} from './FlyCareMapStage';

const t = (_key: string, options?: Record<string, unknown>) => String(options?.defaultValue ?? _key);

function resident(overrides: Partial<PositionResidentViewModel>): PositionResidentViewModel {
  return {
    residentId: '8',
    displayName: 'Resident',
    deviceId: 'ESP32_test',
    recordError: null,
    isOnline: true,
    truthState: 'online',
    freshnessLevel: 'live',
    riskLevel: 'stable',
    priorityBand: 'stable',
    priorityReasonCode: 'stable-monitoring',
    zoneCommandState: 'holding',
    currentZoneId: null,
    currentZoneLabelKey: null,
    currentZoneName: null,
    targetZoneId: null,
    targetZoneLabelKey: null,
    targetZoneName: null,
    currentCoords: { x: 1, y: 1 },
    targetCoords: null,
    heartRate: null,
    spo2: null,
    battery: null,
    fallState: null,
    fallConfirmed: false,
    sosState: false,
    lastSeenAt: '2026-06-02T00:00:00.000Z',
    lastSeenAgeMs: 1_000,
    hasData: true,
    recentActions: ['monitoring-stable'],
    nextActionCode: 'continue-monitoring',
    recentActivity: [],
    activityBlockedReason: null,
    priorityTimestamp: '2026-06-02T00:00:00.000Z',
    ...overrides
  };
}

describe('FlyCareMapStage alert state', () => {
  it('flashes for fresh Mongo SOS or Fall alert', () => {
    expect(shouldFlashFlyCareMarker(resident({ sosState: true }), new Set(), new Set())).toBe(true);
    expect(shouldFlashFlyCareMarker(resident({ fallConfirmed: true }), new Set(), new Set())).toBe(true);
  });

  it('does not flash for stale Mongo alert without active MySQL event', () => {
    expect(
      shouldFlashFlyCareMarker(
        resident({ sosState: true, freshnessLevel: 'stale', lastSeenAgeMs: 600_001 }),
        new Set(),
        new Set()
      )
    ).toBe(false);
  });

  it('flashes for linked unhandled MySQL event by device or resident id', () => {
    expect(shouldFlashFlyCareMarker(resident({ deviceId: 'ESP32_event' }), new Set(['ESP32_event']), new Set())).toBe(
      true
    );
    expect(shouldFlashFlyCareMarker(resident({ residentId: '10' }), new Set(), new Set(['10']))).toBe(true);
  });

  it('builds a normal accessible tooltip for non-alert markers', () => {
    const state = buildFlyCareMarkerTooltipState(
      resident({ currentZoneName: 'Check-in smoke', lastSeenAt: '2026-06-03T01:00:00.000Z' }),
      [],
      t
    );

    expect(state.isAlertActive).toBe(false);
    expect(state.areaLabel).toBe('Check-in smoke');
    expect(state.eventLabel).toBe('Normal');
    expect(state.handlingStatusLabel).toBe('No active event');
    expect(state.ariaLabel).toContain('Area: Check-in smoke');
  });

  it('shows active not linked for fresh Mongo SOS without a MySQL event', () => {
    const state = buildFlyCareMarkerTooltipState(resident({ sosState: true }), [], t);

    expect(state.isAlertActive).toBe(true);
    expect(state.alertKinds).toEqual(['sos']);
    expect(state.eventLabel).toBe('SOS');
    expect(state.handlingStatusLabel).toBe('Active, not linked');
  });

  it('uses linked unhandled MySQL events for tooltip status and alert kind', () => {
    const events = normalizeFlyCareAlertEvents([
      {
        event_id: 100,
        event_type: 'fall',
        related_user_id: 10,
        trigger_device_id: 5,
        event_timestamp: '2026-06-03T01:02:03.000Z',
        event_status: 'unhandled',
        event_params: null
      } as BackendEvent
    ]);
    const state = buildFlyCareMarkerTooltipState(resident({ residentId: '10', deviceId: 'ESP32_00009822A443CA48' }), events, t);

    expect(state.isAlertActive).toBe(true);
    expect(state.alertKinds).toEqual(['fall']);
    expect(state.eventLabel).toBe('Fall');
    expect(state.handlingStatusLabel).toBe('unhandled');
    expect(state.hasUnhandledEvent).toBe(true);
  });

  it('does not keep flashing or show handled status for resolved or false_alarm events without active Mongo alert', () => {
    const events = normalizeFlyCareAlertEvents([
      {
        event_id: 101,
        event_type: 'sos',
        related_user_id: 10,
        trigger_device_id: 5,
        event_timestamp: '2026-06-03T01:02:03.000Z',
        event_status: 'false_alarm',
        event_params: null
      } as BackendEvent
    ]);
    const state = buildFlyCareMarkerTooltipState(resident({ residentId: '10', deviceId: 'ESP32_00009822A443CA48' }), events, t);

    expect(state.isAlertActive).toBe(false);
    expect(state.eventLabel).toBe('Normal');
    expect(state.handlingStatusLabel).toBe('No active event');
  });
});
