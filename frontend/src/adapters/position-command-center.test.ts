import { describe, expect, it } from 'vitest';

import {
  POSITION_RESIDENT_REGISTRY,
  buildPositionCommandCenterViewModel,
  buildPositionResidentActivity,
  getZoneCommandState,
  resolvePositionSelection,
  sortPositionResidents,
  type PositionResidentViewModel
} from './position-command-center';

function makeResident(
  overrides: Partial<PositionResidentViewModel>
): PositionResidentViewModel {
  return {
    residentId: overrides.residentId ?? 'resident',
    displayName: overrides.displayName ?? 'Resident',
    deviceId: overrides.deviceId ?? 'device',
    recordError: overrides.recordError ?? null,
    isOnline: overrides.isOnline ?? true,
    truthState: overrides.truthState ?? 'online',
    freshnessLevel: overrides.freshnessLevel ?? 'live',
    riskLevel: overrides.riskLevel ?? 'stable',
    priorityBand: overrides.priorityBand ?? 'stable',
    priorityReasonCode: overrides.priorityReasonCode ?? 'stable-monitoring',
    zoneCommandState: overrides.zoneCommandState ?? 'holding',
    currentZoneId: overrides.currentZoneId ?? null,
    currentZoneLabelKey: overrides.currentZoneLabelKey ?? null,
    currentZoneName: overrides.currentZoneName ?? null,
    targetZoneId: overrides.targetZoneId ?? null,
    targetZoneLabelKey: overrides.targetZoneLabelKey ?? null,
    targetZoneName: overrides.targetZoneName ?? null,
    currentCoords: overrides.currentCoords ?? null,
    targetCoords: overrides.targetCoords ?? null,
    heartRate: overrides.heartRate ?? null,
    spo2: overrides.spo2 ?? null,
    battery: overrides.battery ?? null,
    fallState: overrides.fallState ?? null,
    fallConfirmed: overrides.fallConfirmed ?? false,
    sosState: overrides.sosState ?? false,
    lastSeenAt: overrides.lastSeenAt ?? '2026-03-28T00:00:00.000Z',
    lastSeenAgeMs: overrides.lastSeenAgeMs ?? 15_000,
    hasData: overrides.hasData ?? true,
    recentActions: overrides.recentActions ?? ['monitoring-stable'],
    nextActionCode: overrides.nextActionCode ?? 'continue-monitoring',
    recentActivity: overrides.recentActivity ?? [],
    activityBlockedReason: overrides.activityBlockedReason ?? null,
    priorityTimestamp: overrides.priorityTimestamp ?? overrides.lastSeenAt ?? '2026-03-28T00:00:00.000Z'
  };
}

describe('position-command-center adapter', () => {
  it('classifies truth and freshness from Mongo $date values', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const snapshot = {
      fetchedAt: '2026-03-28T00:00:20.000Z',
      loadError: null,
      records: [
        {
          resident,
          error: null,
          latestStatus: {
            device_id: resident.deviceId,
            server_received_at: { $date: '2026-03-28T00:00:00.000Z' },
            location: {
              current: { x: 5, y: 13, name: 'Bedroom' }
            },
            sensors: {
              heart_rate: { valid: true, bpm: 82 },
              spo2: { valid: true, percentage: 97 }
            }
          } as never
        }
      ]
    };

    const viewModel = buildPositionCommandCenterViewModel(snapshot, {
      selectedResidentId: resident.residentId,
      now: Date.parse('2026-03-28T00:00:20.000Z')
    });

    expect(viewModel.selectedResident?.truthState).toBe('online');
    expect(viewModel.selectedResident?.freshnessLevel).toBe('live');
    expect(viewModel.selectedResident?.priorityBand).toBe('stable');
  });

  it('sorts residents by critical, warning, stale-only, then stable', () => {
    const residents = [
      makeResident({
        residentId: 'stable',
        displayName: 'Stable',
        priorityBand: 'stable',
        riskLevel: 'stable',
        lastSeenAt: '2026-03-28T00:00:10.000Z',
        priorityTimestamp: '2026-03-28T00:00:10.000Z'
      }),
      makeResident({
        residentId: 'stale',
        displayName: 'Stale',
        truthState: 'stale',
        freshnessLevel: 'stale',
        riskLevel: 'warning',
        priorityBand: 'stale-only',
        priorityReasonCode: 'stale-data',
        lastSeenAt: '2026-03-28T00:00:12.000Z',
        priorityTimestamp: '2026-03-28T00:00:12.000Z'
      }),
      makeResident({
        residentId: 'warning',
        displayName: 'Warning',
        riskLevel: 'warning',
        priorityBand: 'warning',
        priorityReasonCode: 'warning-vitals',
        lastSeenAt: '2026-03-28T00:00:15.000Z',
        priorityTimestamp: '2026-03-28T00:00:15.000Z'
      }),
      makeResident({
        residentId: 'critical',
        displayName: 'Critical',
        riskLevel: 'critical',
        priorityBand: 'critical',
        priorityReasonCode: 'critical-sos',
        lastSeenAt: '2026-03-28T00:00:05.000Z',
        priorityTimestamp: '2026-03-28T00:00:05.000Z'
      })
    ];

    const sorted = sortPositionResidents(residents);

    expect(sorted.map((resident) => resident.residentId)).toEqual(['critical', 'warning', 'stale', 'stable']);
  });

  it('derives target-pending and target-reached zone states', () => {
    expect(
      getZoneCommandState({
        currentZoneId: 'activity_room',
        currentZoneName: null,
        targetZoneId: 'toilet',
        targetZoneName: null,
        currentCoords: { x: 5, y: 2 },
        targetCoords: { x: 9, y: 9 }
      })
    ).toBe('target-pending');

    expect(
      getZoneCommandState({
        currentZoneId: 'toilet',
        currentZoneName: null,
        targetZoneId: 'toilet',
        targetZoneName: null,
        currentCoords: { x: 9, y: 9 },
        targetCoords: { x: 9, y: 9 }
      })
    ).toBe('target-reached');
  });

  it('builds recent activity from upstream transitions', () => {
    const activity = buildPositionResidentActivity([
      {
        _id: 'doc-3',
        device_id: 'device-1',
        server_received_at: '2026-03-28T00:02:00.000Z',
        payload: {
          location: {
            current: { x: 9, y: 9, name: 'Toilet' },
            target: { x: 9, y: 9, name: 'Toilet' }
          },
          sensors: {
            heart_rate: { valid: true, bpm: 118 },
            spo2: { valid: true, percentage: 91 }
          }
        }
      },
      {
        _id: 'doc-2',
        device_id: 'device-1',
        server_received_at: '2026-03-28T00:01:00.000Z',
        payload: {
          location: {
            current: { x: 5, y: 7, name: 'Central common area' },
            target: { x: 9, y: 9, name: 'Toilet' }
          },
          sensors: {
            heart_rate: { valid: true, bpm: 84 },
            spo2: { valid: true, percentage: 97 }
          }
        }
      },
      {
        _id: 'doc-1',
        device_id: 'device-1',
        server_received_at: '2026-03-28T00:00:00.000Z',
        payload: {
          location: {
            current: { x: 5, y: 7, name: 'Central common area' }
          },
          sensors: {
            heart_rate: { valid: true, bpm: 82 },
            spo2: { valid: true, percentage: 98 }
          }
        }
      }
    ]);

    expect(activity.map((item) => item.title)).toEqual(
      expect.arrayContaining(['Zone changed', 'Target updated', 'Vitals warning'])
    );
  });

  it('applies blocked recent activity to the selected resident only', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const snapshot = {
      fetchedAt: '2026-03-28T00:00:20.000Z',
      loadError: null,
      records: [
        {
          resident,
          error: null,
          latestStatus: {
            device_id: resident.deviceId,
            server_received_at: '2026-03-28T00:00:00.000Z'
          } as never
        }
      ]
    };

    const viewModel = buildPositionCommandCenterViewModel(snapshot, {
      selectedResidentId: resident.residentId,
      selectedResidentActivity: {
        deviceId: resident.deviceId,
        fetchedAt: '2026-03-28T00:00:30.000Z',
        recentActivity: [],
        loadError: 'backend blocked'
      }
    });

    expect(viewModel.selectedResident?.activityBlockedReason).toBe('backend blocked');
    expect(viewModel.selectedResident?.recentActivity).toEqual([]);
  });

  it('marks the initial snapshot as loading instead of fake offline ready state', () => {
    const viewModel = buildPositionCommandCenterViewModel(null, {
      selectedResidentId: POSITION_RESIDENT_REGISTRY[0]?.residentId,
      snapshotLoading: true
    });

    expect(viewModel.surfaceStates.rail).toBe('loading');
    expect(viewModel.surfaceStates.summary).toBe('loading');
    expect(viewModel.surfaceStates.map).toBe('loading');
    expect(viewModel.surfaceStates.decision).toBe('loading');
  });

  it('supports an explicit empty registry snapshot', () => {
    const viewModel = buildPositionCommandCenterViewModel({
      fetchedAt: '2026-03-28T00:00:20.000Z',
      loadError: null,
      records: []
    });

    expect(viewModel.residents).toEqual([]);
    expect(viewModel.selectedResident).toBeNull();
    expect(viewModel.surfaceStates.rail).toBe('empty');
    expect(viewModel.surfaceStates.summary).toBe('empty');
    expect(viewModel.surfaceStates.map).toBe('empty');
    expect(viewModel.surfaceStates.decision).toBe('empty');
  });

  it('distinguishes selected-record failure from partial resident failures', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const viewModel = buildPositionCommandCenterViewModel({
      fetchedAt: '2026-03-28T00:00:20.000Z',
      loadError: 'Request failed',
      records: [
        {
          resident,
          error: 'Not found',
          latestStatus: null
        }
      ]
    }, {
      selectedResidentId: resident.residentId
    });

    expect(viewModel.selectedResidentRecordError).toBe('Not found');
    expect(viewModel.partialFailureCount).toBe(1);
    expect(viewModel.surfaceStates.rail).toBe('error');
    expect(viewModel.surfaceStates.summary).toBe('error');
    expect(viewModel.surfaceStates.decision).toBe('error');
  });

  it('marks map state empty when the selected resident has data but no zone resolution', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const viewModel = buildPositionCommandCenterViewModel({
      fetchedAt: '2026-03-28T00:00:20.000Z',
      loadError: null,
      records: [
        {
          resident,
          error: null,
          latestStatus: {
            device_id: resident.deviceId,
            server_received_at: '2026-03-28T00:00:00.000Z',
            sensors: {
              heart_rate: { valid: true, bpm: 82 },
              spo2: { valid: true, percentage: 97 }
            }
          } as never
        }
      ]
    }, {
      selectedResidentId: resident.residentId,
      now: Date.parse('2026-03-28T00:00:20.000Z')
    });

    expect(viewModel.selectedResident?.hasData).toBe(true);
    expect(viewModel.surfaceStates.map).toBe('empty');
  });

  it('resolves selection from the sorted resident list', () => {
    const residents = sortPositionResidents([
      makeResident({
        residentId: 'warning',
        priorityBand: 'warning',
        riskLevel: 'warning',
        priorityReasonCode: 'warning-vitals'
      }),
      makeResident({
        residentId: 'stable',
        priorityBand: 'stable',
        riskLevel: 'stable'
      })
    ]);

    const selection = resolvePositionSelection(residents, null);

    expect(selection.selectedResidentId).toBe('warning');
    expect(selection.selectedResident?.residentId).toBe('warning');
  });
});
