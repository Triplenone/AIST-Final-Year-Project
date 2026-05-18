import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import '../styles/position-page.css';
import {
  POSITION_RESIDENT_REGISTRY,
  buildPositionCommandCenterViewModel,
  loadPositionCommandCenterSnapshot,
  loadPositionResidentActivity,
  resolvePositionResidentRegistry,
  type PositionCommandCenterSnapshot,
  type PositionResidentActivitySnapshot,
  type PositionResidentRegistryEntry
} from '../adapters/position-command-center';
import { FlyCareFlightPanel, type FlightInfo } from '../components/flycare/FlyCareFlightPanel';
import { FlyCareMapStage } from '../components/flycare/FlyCareMapStage';
import { PositionDecisionPanel } from '../components/position/PositionDecisionPanel';
import { PositionResidentRail } from '../components/position/PositionResidentRail';
import { PositionSummaryBar } from '../components/position/PositionSummaryBar';
import { mongoUpstreamApi, type FlightLatestResponse } from '../services/api';
import type { FallAlertDetailRow } from '../types/fall-alert';
import { buildFallAlertRowsFromPositionResidents } from '../utils/fall-alert-rows';

const FLYCARE_MAP_PROFILE = 'flycare' as const;

type FlyCarePageProps = {
  onSosOrFallDetected?: (items: FallAlertDetailRow[]) => void;
};

function initialRegistry(): PositionResidentRegistryEntry[] {
  return POSITION_RESIDENT_REGISTRY.map((entry) => ({ ...entry }));
}

export function FlyCarePage({ onSosOrFallDetected }: FlyCarePageProps) {
  const { t } = useTranslation();
  const [registry, setRegistry] = useState<PositionResidentRegistryEntry[]>(initialRegistry);
  const [snapshot, setSnapshot] = useState<PositionCommandCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    () => POSITION_RESIDENT_REGISTRY[0]?.residentId ?? null
  );
  const [residentActivity, setResidentActivity] = useState<PositionResidentActivitySnapshot | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showAllOnMap, setShowAllOnMap] = useState(false);
  const previousAlertRef = useRef(false);
  const activityRequestSequenceRef = useRef(0);
  const lastConfirmedFlightIdRef = useRef<string | null>(null);
  const pendingFlightIdRef = useRef<string | null>(null);
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [pendingFlightUpdate, setPendingFlightUpdate] = useState<FlightInfo | null>(null);
  const [showFlightUpdateDrawer, setShowFlightUpdateDrawer] = useState(false);

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
        return nextRegistry[0]?.residentId ?? null;
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
    }, 10_000);
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
    const deviceId = viewModel.selectedResident?.deviceId;
    if (!deviceId) {
      setFlightInfo(null);
      lastConfirmedFlightIdRef.current = null;
      return;
    }
    try {
      const res = (await mongoUpstreamApi.getLatestFlight(deviceId)) as unknown as FlightLatestResponse;
      if (!res.found || (res.device_id != null && res.device_id !== deviceId)) {
        setFlightInfo(null);
        lastConfirmedFlightIdRef.current = null;
        return;
      }
      const flightPayload: FlightInfo = {
        passengerName: res.passengerName,
        flightNumber: res.flightNumber,
        gate: res.gate,
        flightTime: res.flightTime,
        departureAirport: res.departureAirport,
        arrivalAirport: res.arrivalAirport,
        seatNumber: res.seatNumber
      };
      const docId = res._id ?? null;
      if (docId === lastConfirmedFlightIdRef.current) {
        return;
      }
      if (flightInfo == null) {
        setFlightInfo(flightPayload);
        lastConfirmedFlightIdRef.current = docId;
        return;
      }
      setPendingFlightUpdate(flightPayload);
      pendingFlightIdRef.current = docId;
      setShowFlightUpdateDrawer(true);
    } catch {
      setFlightInfo(null);
      lastConfirmedFlightIdRef.current = null;
    }
  }, [flightInfo, viewModel.selectedResident?.deviceId]);

  useEffect(() => {
    void fetchLatestFlight();
    const interval = setInterval(() => {
      void fetchLatestFlight();
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchLatestFlight]);

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

  const handleSelectResident = useCallback((residentId: string) => {
    setShowAllOnMap(false);
    setSelectedResidentId(residentId);
    setFlightInfo(null);
    setPendingFlightUpdate(null);
    lastConfirmedFlightIdRef.current = null;
    pendingFlightIdRef.current = null;
    setShowFlightUpdateDrawer(false);
  }, []);

  const handleShowAllOnMap = useCallback(() => {
    setShowAllOnMap(true);
  }, []);

  const handleConfirmFlightUpdate = useCallback(() => {
    if (pendingFlightUpdate) {
      setFlightInfo({ ...pendingFlightUpdate });
      if (pendingFlightIdRef.current != null) {
        lastConfirmedFlightIdRef.current = pendingFlightIdRef.current;
      }
      setPendingFlightUpdate(null);
      pendingFlightIdRef.current = null;
      setShowFlightUpdateDrawer(false);
    }
  }, [pendingFlightUpdate]);

  const handleCloseFlightUpdateDrawer = useCallback(() => {
    setPendingFlightUpdate(null);
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
          surfaceState={viewModel.surfaceStates.map}
          recordError={viewModel.selectedResidentRecordError}
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
