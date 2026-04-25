import { describe, expect, it } from 'vitest';

import type { BackendEvent } from '../types/backend';

import { buildFallAlertRowsFromBackendEvents } from './fall-alert-rows';

function makeFallEvent(overrides: Partial<BackendEvent> = {}): BackendEvent {
  return {
    event_id: 1,
    event_type: 'fall',
    related_user_id: 4,
    trigger_device_id: 2,
    location_zone_id: 6,
    event_timestamp: '2026-04-20T03:37:37.000Z',
    event_params: {},
    event_status: 'unhandled',
    ...overrides
  };
}

describe('buildFallAlertRowsFromBackendEvents', () => {
  it('uses MySQL lookup maps for bound user and location when params are empty', () => {
    const userNameByUserId = new Map<number, string>();
    userNameByUserId.set(4, 'test-user04');
    const locationNameByZoneId = new Map<number, string>();
    locationNameByZoneId.set(6, 'Central Common Area');
    const rows = buildFallAlertRowsFromBackendEvents([makeFallEvent()], {
      userNameByUserId,
      locationNameByZoneId
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].boundUser).toBe('test-user04');
    expect(rows[0].location).toBe('Central Common Area');
    expect(rows[0].deviceId).toBe('2');
    expect(rows[0].sourceEventId).toBe(1);
  });

  it('prefers event_params names over lookup maps', () => {
    const rows = buildFallAlertRowsFromBackendEvents(
      [
        makeFallEvent({
          event_params: {
            user_name: 'Param User',
            location_name: 'Param Room'
          }
        })
      ],
      (() => {
        const userNameByUserId = new Map<number, string>();
        userNameByUserId.set(4, 'FromDb');
        const locationNameByZoneId = new Map<number, string>();
        locationNameByZoneId.set(6, 'FromDbLoc');
        return { userNameByUserId, locationNameByZoneId };
      })()
    );
    expect(rows[0].boundUser).toBe('Param User');
    expect(rows[0].location).toBe('Param Room');
  });

  it('maps sos event type to sos alert kind', () => {
    const rows = buildFallAlertRowsFromBackendEvents([
      makeFallEvent({
        event_id: 2,
        event_type: 'sos'
      })
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kinds).toEqual(['sos']);
  });
});
