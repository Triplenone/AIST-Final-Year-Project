import { describe, expect, it } from 'vitest';

import {
  POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID,
  POSITION_RESIDENT_REGISTRY,
  buildPositionCommandCenterViewModel,
  buildPositionResidentActivity,
  getPositionNavigationTargetDisplay,
  getPositionZoneDisplayForResident,
  getZoneCommandState,
  mergeUpstreamDocsForPosition,
  resolvePositionSelection,
  sortPositionResidents,
  stabilizePositionResidentRegistry,
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
    navigationTargetName: overrides.navigationTargetName ?? null,
    navigationDistanceMeters: overrides.navigationDistanceMeters ?? null,
    navigationDirection: overrides.navigationDirection ?? null,
    navigationEtaMinutes: overrides.navigationEtaMinutes ?? null,
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
  it('tracks FlyCare demo registry entries with Hong Kong passenger names', () => {
    expect(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[2]).toBe('ESP32_0000C422A443CA48');
    expect(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[3]).toBe('ESP32_0000C8292A04A7AC');
    expect(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[4]).toBe('ESP32_0000A022A443CA48');
    expect(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[5]).toBe('ESP32_00009822A443CA48');
    expect(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[6]).toBe('ESP32_00008C292A04A7AC');
    expect(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[7]).toBe('ESP32_00009022A443CA48');
    expect(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[8]).toBe('ESP32_000048CA43A42298');
    expect(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID[9]).toBe('ESP32_0000E03948D4DB1C');
    expect(POSITION_RESIDENT_REGISTRY.map((entry) => entry.displayName)).toEqual(
      expect.arrayContaining([
        'LAU SIU FONG',
        'WONG KA MING',
        'HO CHI WAI',
        'TANG WAI HAN',
        'MA KA WAI',
        'YIP MAN LING',
        'NG WAI LUN',
        'LEE KA YAN'
      ])
    );
  });

  it('keeps the FlyCare registry at the tracked demo size when a refresh is partial', () => {
    const partial = [
      {
        ...POSITION_RESIDENT_REGISTRY[6],
        displayName: 'NG WAI LUN LIVE'
      },
      {
        ...POSITION_RESIDENT_REGISTRY[7],
        displayName: 'LEE KA YAN LIVE'
      }
    ];

    const stabilized = stabilizePositionResidentRegistry(partial);

    expect(stabilized).toHaveLength(POSITION_RESIDENT_REGISTRY.length);
    expect(stabilized.map((entry) => entry.deviceId)).toEqual(
      POSITION_RESIDENT_REGISTRY.map((entry) => entry.deviceId)
    );
    expect(stabilized.find((entry) => entry.deviceId === POSITION_RESIDENT_REGISTRY[6].deviceId)?.displayName).toBe(
      'NG WAI LUN LIVE'
    );
  });

  it('preserves currentCoords from an earlier same-device location when heartbeat is newest', () => {
    const merged = mergeUpstreamDocsForPosition([
      {
        _id: 'heartbeat-new',
        device_id: 'device-1',
        server_received_at: '2026-03-28T00:02:00.000Z',
        data_type: 'heartbeat',
        system: { battery: { level: 90 } }
      },
      {
        _id: 'location-old',
        device_id: 'device-1',
        server_received_at: '2026-03-28T00:01:00.000Z',
        data_type: 'location',
        location: { current: { x: 4, y: 12, name: 'Security' } }
      }
    ]);
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const viewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:02:05.000Z',
        loadError: null,
        records: [{ resident, latestStatus: merged, error: null }]
      },
      { selectedResidentId: resident.residentId, now: Date.parse('2026-03-28T00:02:05.000Z'), mapProfile: 'flycare' }
    );

    expect(viewModel.selectedResident?.currentCoords).toEqual({ x: 4, y: 12 });
    expect(viewModel.selectedResident?.battery).toBe(90);
  });

  it('exposes FlyCare navigation target details from location.target', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const viewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:02:05.000Z',
        loadError: null,
        records: [
          {
            resident,
            latestStatus: {
              _id: 'status-target',
              device_id: resident.deviceId,
              server_received_at: '2026-03-28T00:02:00.000Z',
              data_type: 'status_update',
              location: {
                current: { x: 6.05, y: 3.85, name: 'Customer Services' },
                target: {
                  x: 8,
                  y: 1.8,
                  name: 'Gate 10',
                  distance: 2.83,
                  direction: 'southeast',
                  eta: 2
                }
              }
            } as never,
            error: null
          }
        ]
      },
      { selectedResidentId: resident.residentId, now: Date.parse('2026-03-28T00:02:05.000Z'), mapProfile: 'flycare' }
    );

    const selectedResident = viewModel.selectedResident!;
    expect(selectedResident.targetZoneName).toBeNull();
    expect(selectedResident.navigationTargetName).toBe('Gate 10');
    expect(selectedResident.navigationDistanceMeters).toBe(2.83);
    expect(selectedResident.navigationDirection).toBe('southeast');
    expect(selectedResident.navigationEtaMinutes).toBe(2);
    expect(selectedResident.zoneCommandState).toBe('target-pending');
    expect(getPositionNavigationTargetDisplay(selectedResident)).toBe('Gate 10 · 2.83 m · southeast · ETA 2 min');
  });

  it('does not expose a cleared FlyCare navigation target', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const viewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:02:05.000Z',
        loadError: null,
        records: [
          {
            resident,
            latestStatus: {
              _id: 'status-target-cleared',
              device_id: resident.deviceId,
              server_received_at: '2026-03-28T00:02:00.000Z',
              data_type: 'status_update',
              location: {
                current: { x: 6.05, y: 3.85, name: 'Customer Services' },
                target: {
                  active: false,
                  x: null,
                  y: null,
                  name: '',
                  distance: 0,
                  direction: 'none',
                  eta: 0
                }
              }
            } as never,
            error: null
          }
        ]
      },
      { selectedResidentId: resident.residentId, now: Date.parse('2026-03-28T00:02:05.000Z'), mapProfile: 'flycare' }
    );

    const selectedResident = viewModel.selectedResident!;
    expect(selectedResident.navigationTargetName).toBeNull();
    expect(selectedResident.navigationDistanceMeters).toBeNull();
    expect(selectedResident.navigationDirection).toBeNull();
    expect(selectedResident.navigationEtaMinutes).toBeNull();
    expect(selectedResident.targetCoords).toBeNull();
    expect(getPositionNavigationTargetDisplay(selectedResident)).toBeNull();
  });

  it('preserves older valid vitals when a newer status update reports invalid zero sensors', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const merged = mergeUpstreamDocsForPosition([
      {
        _id: 'status-new',
        device_id: resident.deviceId,
        server_received_at: '2026-03-28T00:02:00.000Z',
        data_type: 'status_update',
        sensors: {
          heart_rate: { valid: false, bpm: 0 },
          spo2: { valid: false, percentage: 0 }
        }
      },
      {
        _id: 'vitals-old',
        device_id: resident.deviceId,
        server_received_at: '2026-03-28T00:01:00.000Z',
        data_type: 'vitals',
        sensors: {
          heart_rate: { valid: true, bpm: 83 },
          spo2: { valid: true, percentage: 98 }
        }
      }
    ]);

    const viewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:02:05.000Z',
        loadError: null,
        records: [{ resident, latestStatus: merged, error: null }]
      },
      { selectedResidentId: resident.residentId, now: Date.parse('2026-03-28T00:02:05.000Z') }
    );

    expect(viewModel.selectedResident?.heartRate).toBe(83);
    expect(viewModel.selectedResident?.spo2).toBe(98);
  });

  it('reads fallback flat location.x/y coordinates', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const viewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:00:20.000Z',
        loadError: null,
        records: [
          {
            resident,
            error: null,
            latestStatus: {
              device_id: resident.deviceId,
              server_received_at: '2026-03-28T00:00:00.000Z',
              location: { x: 5, y: 8, name: 'Immigration' }
            } as never
          }
        ]
      },
      { selectedResidentId: resident.residentId, now: Date.parse('2026-03-28T00:00:20.000Z'), mapProfile: 'flycare' }
    );

    expect(viewModel.selectedResident?.currentCoords).toEqual({ x: 5, y: 8 });
  });

  it('ignores legacy MySQL or payload location names on FlyCare map', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const viewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:00:20.000Z',
        loadError: null,
        records: [
          {
            resident,
            error: null,
            latestStatus: {
              device_id: resident.deviceId,
              server_received_at: '2026-03-28T00:00:00.000Z',
              location: {
                current: {
                  x: 1,
                  y: 1,
                  name: 'Security checkpoint',
                  location_zone_id: 3
                }
              }
            } as never
          }
        ]
      },
      { selectedResidentId: resident.residentId, now: Date.parse('2026-03-28T00:00:20.000Z'), mapProfile: 'flycare' }
    );

    expect(viewModel.selectedResident?.currentZoneId).toBe('toilet');
    expect(viewModel.selectedResident?.currentZoneName).toBeNull();
    expect(
      getPositionZoneDisplayForResident(
        viewModel.selectedResident!,
        (key) => `i18n:${key}`,
        'flycare'
      )
    ).toBe('i18n:flyCare.zone.toilet');
  });

  it('getPositionZoneDisplayForResident prefers non-empty currentZoneName over labelKey i18n', () => {
    const t = (key: string) => `i18n:${key}`;
    expect(
      getPositionZoneDisplayForResident(
        {
          currentZoneId: 'bedroom',
          currentZoneLabelKey: 'position.zone.bedroom',
          currentZoneName: 'Gate area'
        },
        t
      )
    ).toBe('Gate area');
  });

  it('getPositionZoneDisplayForResident falls back to labelKey when name is absent', () => {
    const t = (key: string) => `i18n:${key}`;
    expect(
      getPositionZoneDisplayForResident(
        {
          currentZoneId: 'bedroom',
          currentZoneLabelKey: 'position.zone.bedroom',
          currentZoneName: null
        },
        t
      )
    ).toBe('i18n:position.zone.bedroom');
  });

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
              current: { x: 5, y: 13, name: 'Gate area' }
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

  it('reads flat numeric sensors when bpm/percentage objects are absent', () => {
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
            server_received_at: '2026-03-28T00:00:00.000Z',
            location: {
              current: { x: 5, y: 13, name: 'Gate area' }
            },
            sensors: {
              heart_rate: 88,
              spo2: 99
            }
          } as never
        }
      ]
    };

    const viewModel = buildPositionCommandCenterViewModel(snapshot, {
      selectedResidentId: resident.residentId,
      now: Date.parse('2026-03-28T00:00:20.000Z')
    });

    expect(viewModel.selectedResident?.heartRate).toBe(88);
    expect(viewModel.selectedResident?.spo2).toBe(99);
  });

  it('shows heart rate and SpO2 when Mongo reports 0 (not No data)', () => {
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
            server_received_at: '2026-03-28T00:00:00.000Z',
            sensors: {
              heart_rate: { valid: true, bpm: 0 },
              spo2: { valid: true, percentage: 0 }
            }
          } as never
        }
      ]
    };

    const viewModel = buildPositionCommandCenterViewModel(snapshot, {
      selectedResidentId: resident.residentId,
      now: Date.parse('2026-03-28T00:00:20.000Z')
    });

    expect(viewModel.selectedResident?.heartRate).toBe(0);
    expect(viewModel.selectedResident?.spo2).toBe(0);
  });

  it('reads HR/SpO2 from payload.sensors when top-level sensors is an empty object', () => {
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
            server_received_at: '2026-03-28T00:00:00.000Z',
            location: { current: { x: 5, y: 13, name: 'Gate area' } },
            sensors: {},
            payload: {
              sensors: {
                heart_rate: { bpm: 72, valid: true },
                spo2: { percentage: 98, valid: true }
              }
            }
          } as never
        }
      ]
    };

    const viewModel = buildPositionCommandCenterViewModel(snapshot, {
      selectedResidentId: resident.residentId,
      now: Date.parse('2026-03-28T00:00:20.000Z')
    });

    expect(viewModel.selectedResident?.heartRate).toBe(72);
    expect(viewModel.selectedResident?.spo2).toBe(98);
  });

  it('falls back to last known vitals when payload.sensors reports invalid zero values', () => {
    const resident = {
      ...POSITION_RESIDENT_REGISTRY[0],
      lastKnownVitals: { heartRate: 83, spo2: 98 }
    };
    const snapshot = {
      fetchedAt: '2026-03-28T00:00:20.000Z',
      loadError: null,
      records: [
        {
          resident,
          error: null,
          latestStatus: {
            device_id: resident.deviceId,
            server_received_at: '2026-03-28T00:00:00.000Z',
            sensors: {},
            payload: {
              sensors: {
                heart_rate: { bpm: 0, valid: false },
                spo2: { percentage: 0, valid: false }
              }
            }
          } as never
        }
      ]
    };

    const viewModel = buildPositionCommandCenterViewModel(snapshot, {
      selectedResidentId: resident.residentId,
      now: Date.parse('2026-03-28T00:00:20.000Z')
    });

    expect(viewModel.selectedResident?.heartRate).toBe(83);
    expect(viewModel.selectedResident?.spo2).toBe(98);
    expect(viewModel.selectedResident?.priorityReasonCode).toBe('stable-monitoring');
  });

  it('uses emptyRegistry when snapshot is null', () => {
    const custom = [{ residentId: '99', displayName: 'Custom', deviceId: 'ESP32_custom' }];
    const viewModel = buildPositionCommandCenterViewModel(null, {
      emptyRegistry: custom,
      now: Date.parse('2026-03-28T00:00:20.000Z')
    });
    expect(viewModel.residents).toHaveLength(1);
    expect(viewModel.residents[0]?.residentId).toBe('99');
    expect(viewModel.residents[0]?.displayName).toBe('Custom');
  });

  it('recognizes confirmed fall from English and localized state descriptions', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const now = Date.parse('2026-03-28T00:00:20.000Z');

    const englishViewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:00:20.000Z',
        loadError: null,
        records: [
          {
            resident,
            error: null,
            latestStatus: {
              device_id: resident.deviceId,
              server_received_at: '2026-03-28T00:00:00.000Z',
              fall_detection: {
                state_description: 'Confirmed fall'
              }
            } as never
          }
        ]
      },
      {
        selectedResidentId: resident.residentId,
        now
      }
    );

    const localizedViewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:00:20.000Z',
        loadError: null,
        records: [
          {
            resident,
            error: null,
            latestStatus: {
              device_id: resident.deviceId,
              server_received_at: '2026-03-28T00:00:00.000Z',
              fall_detection: {
                state_description: '確認跌倒'
              }
            } as never
          }
        ]
      },
      {
        selectedResidentId: resident.residentId,
        now
      }
    );

    expect(englishViewModel.selectedResident?.fallConfirmed).toBe(true);
    expect(englishViewModel.selectedResident?.riskLevel).toBe('critical');
    expect(localizedViewModel.selectedResident?.fallConfirmed).toBe(true);
    expect(localizedViewModel.selectedResident?.priorityBand).toBe('critical');
  });

  it('recognizes explicit boolean fall confirmation', () => {
    const resident = POSITION_RESIDENT_REGISTRY[0];
    const viewModel = buildPositionCommandCenterViewModel(
      {
        fetchedAt: '2026-03-28T00:00:20.000Z',
        loadError: null,
        records: [
          {
            resident,
            error: null,
            latestStatus: {
              device_id: resident.deviceId,
              server_received_at: '2026-03-28T00:00:00.000Z',
              fall_detection: {
                confirmed: true,
                state_description: 'monitoring'
              }
            } as never
          }
        ]
      },
      {
        selectedResidentId: resident.residentId,
        now: Date.parse('2026-03-28T00:00:20.000Z')
      }
    );

    expect(viewModel.selectedResident?.fallConfirmed).toBe(true);
    expect(viewModel.selectedResident?.fallState).toBe('Confirmed fall');
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

  it('ignores stale activity from another device when deriving activity state', () => {
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

    const blockedMismatch = buildPositionCommandCenterViewModel(snapshot, {
      selectedResidentId: resident.residentId,
      selectedResidentActivity: {
        deviceId: 'other-device',
        fetchedAt: '2026-03-28T00:00:30.000Z',
        recentActivity: [],
        loadError: 'stale other device'
      }
    });

    const readyMatch = buildPositionCommandCenterViewModel(snapshot, {
      selectedResidentId: resident.residentId,
      selectedResidentActivity: {
        deviceId: resident.deviceId,
        fetchedAt: '2026-03-28T00:00:30.000Z',
        recentActivity: [
          {
            id: 'activity-1',
            timestamp: '2026-03-28T00:00:25.000Z',
            tone: 'info',
            title: 'Latest sync',
            detail: 'Status update received from device.',
            source: 'mongo-upstream'
          }
        ],
        loadError: null
      }
    });

    expect(blockedMismatch.activityState).toBe('empty');
    expect(blockedMismatch.selectedResident?.recentActivity).toEqual([]);
    expect(readyMatch.activityState).toBe('ready');
    expect(readyMatch.selectedResident?.recentActivity).toHaveLength(1);
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
