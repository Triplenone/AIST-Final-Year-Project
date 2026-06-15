import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import '../styles/position-page.css';
import {
  POSITION_RESIDENT_REGISTRY,
  buildPositionCommandCenterViewModel,
  loadPositionCommandCenterSnapshot,
  loadPositionResidentActivity,
  POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID,
  resolvePositionResidentRegistry,
  type PositionCommandCenterSnapshot,
  type PositionResidentActivitySnapshot,
  type PositionResidentRegistryEntry
} from '../adapters/position-command-center';
import { FlyCareFlightPanel } from '../components/flycare/FlyCareFlightPanel';
import { FlyCareMapStage } from '../components/flycare/FlyCareMapStage';
import { PositionDecisionPanel } from '../components/position/PositionDecisionPanel';
import { PositionResidentRail } from '../components/position/PositionResidentRail';
import { PositionSummaryBar } from '../components/position/PositionSummaryBar';
import { eventApi, mongoUpstreamApi, type FlightLatestResponse } from '../services/api';
import type { BackendEvent } from '../types/backend';
import type { FallAlertDetailRow } from '../types/fall-alert';
import { buildFallAlertRowsFromPositionResidents } from '../utils/fall-alert-rows';
import {
  buildFlightInfoFromLatestResponse,
  extractFlightGateFromLatestResponse,
  type ResolvedFlightInfo
} from '../utils/flycare-flight';

const FLYCARE_MAP_PROFILE = 'flycare' as const;
const FLYCARE_SNAPSHOT_REFRESH_MS = 2_000;
const FLYCARE_FLIGHT_REFRESH_MS = 5_000;
const FLYCARE_ALERT_EVENT_REFRESH_MS = 5_000;
const FLYCARE_PREFERRED_DEVICE_IDS = new Set(['ESP32_0000E03948D4DB1C', 'ESP32_1CDBD44839E0']);

type FlyCarePageProps = {
  onSosOrFallDetected?: (items: FallAlertDetailRow[]) => void;
};

function initialRegistry(): PositionResidentRegistryEntry[] {
  return POSITION_RESIDENT_REGISTRY.map((entry) => ({ ...entry }));
}

function getPreferredFlyCareResidentId(registry: readonly PositionResidentRegistryEntry[]): string | null {
  return registry.find((resident) => FLYCARE_PREFERRED_DEVICE_IDS.has(resident.deviceId))?.residentId ?? null;
}

function resolveMysqlDeviceIdForMongoDevice(deviceId: string): number | null {
  for (const [mysqlDeviceId, mongoDeviceId] of Object.entries(POSITION_MONGO_DEVICE_ID_BY_MYSQL_ID)) {
    if (mongoDeviceId === deviceId) {
      return Number(mysqlDeviceId);
    }
  }
  return null;
}

export function FlyCarePage({ onSosOrFallDetected }: FlyCarePageProps) {
  const { t } = useTranslation();
  const [registry, setRegistry] = useState<PositionResidentRegistryEntry[]>(initialRegistry);
  const [snapshot, setSnapshot] = useState<PositionCommandCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    () => getPreferredFlyCareResidentId(POSITION_RESIDENT_REGISTRY) ?? POSITION_RESIDENT_REGISTRY[0]?.residentId ?? null
  );
  const [residentActivity, setResidentActivity] = useState<PositionResidentActivitySnapshot | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showAllOnMap, setShowAllOnMap] = useState(false);
  const [residentGateById, setResidentGateById] = useState<Map<string, string | null>>(() => new Map());
  const previousAlertRef = useRef(false);
  const activityRequestSequenceRef = useRef(0);
  const flightRequestSequenceRef = useRef(0);
  const lastConfirmedFlightIdRef = useRef<string | null>(null);
  const pendingFlightIdRef = useRef<string | null>(null);
  const dismissedFlightIdRef = useRef<string | null>(null);
  const flightInfoRef = useRef<ResolvedFlightInfo | null>(null);
  const pendingFlightUpdateRef = useRef<ResolvedFlightInfo | null>(null);
  const [flightInfo, setFlightInfo] = useState<ResolvedFlightInfo | null>(null);
  const [pendingFlightUpdate, setPendingFlightUpdate] = useState<ResolvedFlightInfo | null>(null);
  const [showFlightUpdateDrawer, setShowFlightUpdateDrawer] = useState(false);
  const [flyCareAlertEvents, setFlyCareAlertEvents] = useState<BackendEvent[]>([]);

  useEffect(() => {
    flightInfoRef.current = flightInfo;
  }, [flightInfo]);

  useEffect(() => {
    pendingFlightUpdateRef.current = pendingFlightUpdate;
  }, [pendingFlightUpdate]);

  const refreshSnapshot = useCallback(async () => {
    setLoading(true);
    let nextRegistry: PositionResidentRegistryEntry[];
    try {
      nextRegistry = await resolvePositionResidentRegistry();
    } catch {
      nextRegistry = initialRegistry();
    }
    const regForSnapshot = nextRegistry.length > 0 ? nextRegistry : initialRegistry();

    try {
      setRegistry(nextRegistry);
      setSelectedResidentId((current) => {
        if (current != null && nextRegistry.some((r) => r.residentId === current)) {
          return current;
        }
        return getPreferredFlyCareResidentId(nextRegistry) ?? nextRegistry[0]?.residentId ?? null;
      });
      const nextSnapshot = await loadPositionCommandCenterSnapshot(regForSnapshot);
      setSnapshot(nextSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setSnapshot({
        fetchedAt: new Date().toISOString(),
        records: regForSnapshot.map((resident) => ({
          resident,
          latestStatus: null,
          error: message
        })),
        loadError: message
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSnapshot();
    const intervalId = window.setInterval(() => {
      void refreshSnapshot();
    }, FLYCARE_SNAPSHOT_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [refreshSnapshot]);

  useEffect(() => {
    if (!selectedResidentId && residentActivity) {
      setResidentActivity(null);
    }
  }, [residentActivity, selectedResidentId]);

  const viewModel = useMemo(
    () =>
      buildPositionCommandCenterViewModel(snapshot, {
        selectedResidentId,
        selectedResidentActivity: residentActivity,
        snapshotLoading: loading,
        activityLoading,
        emptyRegistry: registry,
        mapProfile: FLYCARE_MAP_PROFILE
      }),
    [activityLoading, loading, residentActivity, registry, selectedResidentId, snapshot]
  );

  useEffect(() => {
    if (viewModel.selectedResidentId !== selectedResidentId) {
      setSelectedResidentId(viewModel.selectedResidentId);
    }
  }, [selectedResidentId, viewModel.selectedResidentId]);

  const selectedFlightDeviceId = viewModel.selectedResident?.deviceId ?? null;
  const selectedFlightResident = useMemo(
    () =>
      selectedFlightDeviceId
        ? {
            deviceId: selectedFlightDeviceId,
            displayName: viewModel.selectedResident?.displayName
          }
        : null,
    [selectedFlightDeviceId, viewModel.selectedResident?.displayName]
  );

  useEffect(() => {
    const deviceId = viewModel.selectedResident?.deviceId ?? null;
    if (!deviceId) {
      setResidentActivity(null);
      setActivityLoading(false);
      return;
    }

    const requestId = activityRequestSequenceRef.current + 1;
    activityRequestSequenceRef.current = requestId;
    setActivityLoading(true);
    setResidentActivity((current) => (current?.deviceId === deviceId ? current : null));

    void loadPositionResidentActivity(deviceId, FLYCARE_MAP_PROFILE)
      .then((nextActivity) => {
        if (activityRequestSequenceRef.current !== requestId) return;
        setResidentActivity(nextActivity);
      })
      .finally(() => {
        if (activityRequestSequenceRef.current !== requestId) return;
        setActivityLoading(false);
      });
  }, [snapshot?.fetchedAt, viewModel.selectedResident?.deviceId]);

  const fetchLatestFlight = useCallback(async () => {
    const deviceId = selectedFlightDeviceId;
    if (!deviceId) {
      flightRequestSequenceRef.current += 1;
      flightInfoRef.current = null;
      pendingFlightUpdateRef.current = null;
      setFlightInfo(null);
      setPendingFlightUpdate(null);
      setShowFlightUpdateDrawer(false);
      lastConfirmedFlightIdRef.current = null;
      pendingFlightIdRef.current = null;
      dismissedFlightIdRef.current = null;
      return;
    }
    const requestId = flightRequestSequenceRef.current + 1;
    flightRequestSequenceRef.current = requestId;
    try {
      const res = (await mongoUpstreamApi.getLatestFlight(deviceId)) as unknown as FlightLatestResponse;
      if (flightRequestSequenceRef.current !== requestId) return;
      const expectedMysqlDeviceId = resolveMysqlDeviceIdForMongoDevice(deviceId);
      const flightPayload = buildFlightInfoFromLatestResponse(res, deviceId, {
        expectedMysqlDeviceId,
        selectedResident: selectedFlightResident,
        registry
      });
      if (!flightPayload) {
        flightInfoRef.current = null;
        pendingFlightUpdateRef.current = null;
        setFlightInfo(null);
        setPendingFlightUpdate(null);
        setShowFlightUpdateDrawer(false);
        lastConfirmedFlightIdRef.current = null;
        pendingFlightIdRef.current = null;
        dismissedFlightIdRef.current = null;
        return;
      }
      const docId = res._id ?? null;
      if (docId === lastConfirmedFlightIdRef.current) {
        return;
      }
      if (docId != null && docId === pendingFlightIdRef.current) {
        return;
      }
      if (docId != null && docId === dismissedFlightIdRef.current) {
        return;
      }
      if (flightInfoRef.current == null) {
        flightInfoRef.current = flightPayload;
        setFlightInfo(flightPayload);
        lastConfirmedFlightIdRef.current = docId;
        dismissedFlightIdRef.current = null;
        return;
      }
      pendingFlightUpdateRef.current = flightPayload;
      setPendingFlightUpdate(flightPayload);
      pendingFlightIdRef.current = docId;
      setShowFlightUpdateDrawer(true);
    } catch {
      if (flightRequestSequenceRef.current !== requestId) return;
      if (flightInfoRef.current == null) {
        setFlightInfo(null);
        lastConfirmedFlightIdRef.current = null;
      }
    }
  }, [registry, selectedFlightDeviceId, selectedFlightResident]);

  useEffect(() => {
    void fetchLatestFlight();
    const interval = setInterval(() => {
      void fetchLatestFlight();
    }, FLYCARE_FLIGHT_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchLatestFlight]);

  const refreshActiveEventAlerts = useCallback(async () => {
    try {
      const [sosRes, fallRes] = await Promise.all([
        eventApi.list({ event_type: 'sos', limit: 50 }),
        eventApi.list({ event_type: 'fall', limit: 50 })
      ]);
      const sosEvents = sosRes as unknown as BackendEvent[];
      const fallEvents = fallRes as unknown as BackendEvent[];
      setFlyCareAlertEvents([...sosEvents, ...fallEvents]);
    } catch {
      setFlyCareAlertEvents([]);
    }
  }, []);

  useEffect(() => {
    void refreshActiveEventAlerts();
    const interval = setInterval(() => {
      void refreshActiveEventAlerts();
    }, FLYCARE_ALERT_EVENT_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshActiveEventAlerts]);

  useEffect(() => {
    if (!onSosOrFallDetected) return;
    const alerting = viewModel.residents.filter(
      (resident) => (resident.sosState || resident.fallConfirmed) && resident.freshnessLevel !== 'stale'
    );
    const alertNow = alerting.length > 0;
    if (alertNow && !previousAlertRef.current) {
      previousAlertRef.current = true;
      onSosOrFallDetected(buildFallAlertRowsFromPositionResidents(alerting, t, FLYCARE_MAP_PROFILE));
    }
    if (!alertNow) {
      previousAlertRef.current = false;
    }
  }, [onSosOrFallDetected, t, viewModel.residents]);

  const mapResidents = useMemo(() => {
    if (showAllOnMap) {
      return viewModel.residents.filter((resident) => resident.currentCoords != null);
    }
    return viewModel.selectedResident?.currentCoords ? [viewModel.selectedResident] : [];
  }, [showAllOnMap, viewModel.residents, viewModel.selectedResident]);

  useEffect(() => {
    let cancelled = false;
    if (mapResidents.length === 0) {
      setResidentGateById(new Map());
      return () => {
        cancelled = true;
      };
    }

    const loadMapResidentGates = async () => {
      const entries = await Promise.all(
        mapResidents.map(async (resident) => {
          try {
            const res = (await mongoUpstreamApi.getLatestFlight(resident.deviceId)) as unknown as FlightLatestResponse;
            const gate = extractFlightGateFromLatestResponse(res, resident.deviceId, {
              expectedMysqlDeviceId: resolveMysqlDeviceIdForMongoDevice(resident.deviceId)
            });
            return [resident.residentId, gate] as const;
          } catch {
            return [resident.residentId, null] as const;
          }
        })
      );
      if (cancelled) return;
      setResidentGateById(new Map(entries));
    };

    void loadMapResidentGates();
    const interval = setInterval(() => {
      void loadMapResidentGates();
    }, FLYCARE_FLIGHT_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mapResidents, snapshot?.fetchedAt]);

  const effectiveResidentGateById = useMemo(() => {
    const merged = new Map(residentGateById);
    const selected = viewModel.selectedResident;
    const panelGate = flightInfo?.gate?.trim();
    if (selected?.residentId && panelGate && !merged.get(selected.residentId)) {
      merged.set(selected.residentId, panelGate);
    }
    return merged;
  }, [flightInfo?.gate, residentGateById, viewModel.selectedResident]);

  const handleSelectResident = useCallback((residentId: string) => {
    flightRequestSequenceRef.current += 1;
    setShowAllOnMap(false);
    setSelectedResidentId(residentId);
    flightInfoRef.current = null;
    pendingFlightUpdateRef.current = null;
    setFlightInfo(null);
    setPendingFlightUpdate(null);
    lastConfirmedFlightIdRef.current = null;
    pendingFlightIdRef.current = null;
    dismissedFlightIdRef.current = null;
    setShowFlightUpdateDrawer(false);
  }, []);

  const handleShowAllOnMap = useCallback(() => {
    setShowAllOnMap(true);
  }, []);

  const handleConfirmFlightUpdate = useCallback(() => {
    const nextFlight = pendingFlightUpdateRef.current ?? pendingFlightUpdate;
    if (nextFlight) {
      const confirmed = { ...nextFlight };
      flightInfoRef.current = confirmed;
      setFlightInfo(confirmed);
      if (pendingFlightIdRef.current != null) {
        lastConfirmedFlightIdRef.current = pendingFlightIdRef.current;
      }
      pendingFlightUpdateRef.current = null;
      setPendingFlightUpdate(null);
      dismissedFlightIdRef.current = null;
      pendingFlightIdRef.current = null;
      setShowFlightUpdateDrawer(false);
    }
  }, [pendingFlightUpdate]);

  const handleCloseFlightUpdateDrawer = useCallback(() => {
    if (pendingFlightIdRef.current != null) {
      dismissedFlightIdRef.current = pendingFlightIdRef.current;
    }
    pendingFlightUpdateRef.current = null;
    setPendingFlightUpdate(null);
    pendingFlightIdRef.current = null;
    setShowFlightUpdateDrawer(false);
  }, []);

  return (
    <section className="position-command-center flycare-command-center">
      <div className="position-command-center__column position-command-center__column--left">
        <PositionResidentRail
          residents={viewModel.residents}
          selectedResidentId={viewModel.selectedResidentId}
          showAllOnMap={showAllOnMap}
          counts={viewModel.counts}
          surfaceState={viewModel.surfaceStates.rail}
          loadError={viewModel.loadError}
          partialFailureCount={viewModel.partialFailureCount}
          onShowAllOnMap={handleShowAllOnMap}
          onSelectResident={handleSelectResident}
          mapProfile={FLYCARE_MAP_PROFILE}
        />
        <PositionSummaryBar
          resident={viewModel.selectedResident}
          fetchedAt={viewModel.fetchedAt}
          surfaceState={viewModel.surfaceStates.summary}
          recordError={viewModel.selectedResidentRecordError}
          variant="sidebar"
          mapProfile={FLYCARE_MAP_PROFILE}
        />
      </div>

      <div className="position-command-center__column position-command-center__column--center">
        <FlyCareMapStage
          resident={viewModel.selectedResident}
          mapResidents={mapResidents}
          showAllOnMap={showAllOnMap}
          selectedResidentId={viewModel.selectedResidentId}
          residentGateById={effectiveResidentGateById}
          surfaceState={viewModel.surfaceStates.map}
          recordError={viewModel.selectedResidentRecordError}
          alertEvents={flyCareAlertEvents}
        />
      </div>

      <aside className="position-command-center__column position-command-center__column--panel position-command-center__column--sticky flycare-command-center__panel">
        <FlyCareFlightPanel
          flightInfo={flightInfo}
          pendingFlightUpdate={pendingFlightUpdate}
          showFlightUpdateDrawer={showFlightUpdateDrawer}
          onConfirmFlightUpdate={handleConfirmFlightUpdate}
          onCloseFlightUpdateDrawer={handleCloseFlightUpdateDrawer}
        />
        <PositionDecisionPanel
          resident={viewModel.selectedResident}
          surfaceState={viewModel.surfaceStates.decision}
          activityState={viewModel.activityState}
          loadError={viewModel.loadError}
          recordError={viewModel.selectedResidentRecordError}
          partialFailureCount={viewModel.partialFailureCount}
          mapProfile={FLYCARE_MAP_PROFILE}
          onRefresh={() => {
            void refreshSnapshot();
          }}
        />
      </aside>
    </section>
  );
}
