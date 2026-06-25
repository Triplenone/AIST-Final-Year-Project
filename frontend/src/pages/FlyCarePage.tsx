import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import '../styles/position-page.css';
import {
  POSITION_RESIDENT_REGISTRY,
  buildPositionCommandCenterViewModel,
  loadPositionCommandCenterSnapshot,
  loadPositionResidentActivity,
  mergeLatestLocationResponseIntoPositionSnapshot,
  resolvePositionResidentRegistry,
  type PositionCommandCenterSnapshot,
  type PositionMapProfile,
  type PositionResidentActivitySnapshot,
  type PositionResidentRegistryEntry
} from '../adapters/position-command-center';
import { FlyCareHealthPanel } from '../components/flycare/FlyCareHealthPanel';
import { PositionDecisionPanel } from '../components/position/PositionDecisionPanel';
import { PositionMapStage } from '../components/position/PositionMapStage';
import { PositionResidentRail } from '../components/position/PositionResidentRail';
import { PositionSummaryBar } from '../components/position/PositionSummaryBar';
import { mongoUpstreamApi } from '../services/api';
import type { ReminderLatestItem } from '../services/api';
import type { FallAlertDetailRow } from '../types/fall-alert';
import { buildFallAlertRowsFromPositionResidents } from '../utils/fall-alert-rows';

const ELDERLY_MAP_PROFILE: PositionMapProfile = 'indoor';
const ELDERLY_SNAPSHOT_REFRESH_MS = 2_000;
const ELDERLY_SELECTED_LOCATION_REFRESH_MS = 1_000;
const ELDERLY_PREFERRED_DEVICE_IDS = new Set(['ESP32_0000E03948D4DB1C', 'ESP32_1CDBD44839E0']);

type FlyCarePageProps = {
  onSosOrFallDetected?: (items: FallAlertDetailRow[]) => void;
};

function initialRegistry(): PositionResidentRegistryEntry[] {
  return POSITION_RESIDENT_REGISTRY.map((entry) => ({ ...entry }));
}

function getPreferredResidentId(registry: readonly PositionResidentRegistryEntry[]): string | null {
  return registry.find((resident) => ELDERLY_PREFERRED_DEVICE_IDS.has(resident.deviceId))?.residentId ?? null;
}

export function FlyCarePage({ onSosOrFallDetected }: FlyCarePageProps) {
  const { t } = useTranslation();
  const [registry, setRegistry] = useState<PositionResidentRegistryEntry[]>(initialRegistry);
  const [snapshot, setSnapshot] = useState<PositionCommandCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    () => getPreferredResidentId(POSITION_RESIDENT_REGISTRY) ?? POSITION_RESIDENT_REGISTRY[0]?.residentId ?? null
  );
  const [residentActivity, setResidentActivity] = useState<PositionResidentActivitySnapshot | null>(null);
  const [latestReminder, setLatestReminder] = useState<ReminderLatestItem | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showAllOnMap, setShowAllOnMap] = useState(false);
  const previousAlertRef = useRef(false);
  const snapshotRefreshInFlightRef = useRef(false);
  const snapshotRequestSequenceRef = useRef(0);
  const activityRequestSequenceRef = useRef(0);

  const refreshSnapshot = useCallback(async () => {
    if (snapshotRefreshInFlightRef.current) return;
    snapshotRefreshInFlightRef.current = true;
    const requestId = snapshotRequestSequenceRef.current + 1;
    snapshotRequestSequenceRef.current = requestId;
    setLoading(true);

    let nextRegistry: PositionResidentRegistryEntry[];
    try {
      nextRegistry = await resolvePositionResidentRegistry();
    } catch {
      nextRegistry = initialRegistry();
    }
    if (snapshotRequestSequenceRef.current !== requestId) return;

    const registryForSnapshot = nextRegistry.length > 0 ? nextRegistry : initialRegistry();
    try {
      const nextSnapshot = await loadPositionCommandCenterSnapshot(registryForSnapshot);
      if (snapshotRequestSequenceRef.current !== requestId) return;
      setRegistry(nextRegistry);
      setSelectedResidentId((current) => {
        if (current != null && nextRegistry.some((resident) => resident.residentId === current)) {
          return current;
        }
        return getPreferredResidentId(nextRegistry) ?? nextRegistry[0]?.residentId ?? null;
      });
      setSnapshot(nextSnapshot);
    } catch (error) {
      if (snapshotRequestSequenceRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : 'Request failed';
      setSnapshot({
        fetchedAt: new Date().toISOString(),
        records: registryForSnapshot.map((resident) => ({
          resident,
          latestStatus: null,
          error: message
        })),
        loadError: message
      });
    } finally {
      if (snapshotRequestSequenceRef.current === requestId) {
        setLoading(false);
        snapshotRefreshInFlightRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    void refreshSnapshot();
    const intervalId = window.setInterval(() => {
      void refreshSnapshot();
    }, ELDERLY_SNAPSHOT_REFRESH_MS);
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
        mapProfile: ELDERLY_MAP_PROFILE
      }),
    [activityLoading, loading, residentActivity, registry, selectedResidentId, snapshot]
  );

  useEffect(() => {
    if (viewModel.selectedResidentId !== selectedResidentId) {
      setSelectedResidentId(viewModel.selectedResidentId);
    }
  }, [selectedResidentId, viewModel.selectedResidentId]);

  const selectedDeviceId = viewModel.selectedResident?.deviceId ?? null;

  useEffect(() => {
    if (!selectedResidentId || !selectedDeviceId) return;
    let cancelled = false;
    let inFlight = false;

    const refreshSelectedLocation = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const location = await mongoUpstreamApi.getLatestValidLocation(selectedDeviceId);
        if (cancelled) return;
        setSnapshot((current) =>
          mergeLatestLocationResponseIntoPositionSnapshot(current, selectedResidentId, location)
        );
      } catch {
        // The full snapshot refresh remains the fallback path.
      } finally {
        inFlight = false;
      }
    };

    void refreshSelectedLocation();
    const intervalId = window.setInterval(() => {
      void refreshSelectedLocation();
    }, ELDERLY_SELECTED_LOCATION_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedDeviceId, selectedResidentId]);

  useEffect(() => {
    if (!selectedDeviceId) {
      setLatestReminder(null);
      return;
    }
    let cancelled = false;
    let inFlight = false;

    const refreshReminder = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await mongoUpstreamApi.getLatestReminder(selectedDeviceId);
        if (cancelled) return;
        setLatestReminder(response.found ? response.item ?? null : null);
      } catch {
        if (!cancelled) setLatestReminder(null);
      } finally {
        inFlight = false;
      }
    };

    void refreshReminder();
    const intervalId = window.setInterval(() => {
      void refreshReminder();
    }, ELDERLY_SNAPSHOT_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedDeviceId]);

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

    void loadPositionResidentActivity(deviceId, ELDERLY_MAP_PROFILE)
      .then((nextActivity) => {
        if (activityRequestSequenceRef.current !== requestId) return;
        setResidentActivity(nextActivity);
      })
      .finally(() => {
        if (activityRequestSequenceRef.current !== requestId) return;
        setActivityLoading(false);
      });
  }, [snapshot?.fetchedAt, viewModel.selectedResident?.deviceId]);

  useEffect(() => {
    if (!onSosOrFallDetected) return;
    const alerting = viewModel.residents.filter(
      (resident) => (resident.sosState || resident.fallConfirmed) && resident.freshnessLevel !== 'stale'
    );
    const alertNow = alerting.length > 0;
    if (alertNow && !previousAlertRef.current) {
      previousAlertRef.current = true;
      onSosOrFallDetected(buildFallAlertRowsFromPositionResidents(alerting, t, ELDERLY_MAP_PROFILE));
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
  }, []);

  const handleShowAllOnMap = useCallback(() => {
    setShowAllOnMap(true);
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
          mapProfile={ELDERLY_MAP_PROFILE}
        />
        <PositionSummaryBar
          resident={viewModel.selectedResident}
          fetchedAt={viewModel.fetchedAt}
          surfaceState={viewModel.surfaceStates.summary}
          recordError={viewModel.selectedResidentRecordError}
          variant="sidebar"
          mapProfile={ELDERLY_MAP_PROFILE}
        />
      </div>

      <div className="position-command-center__column position-command-center__column--center">
        <PositionMapStage
          resident={viewModel.selectedResident}
          mapResidents={mapResidents}
          showAllOnMap={showAllOnMap}
          surfaceState={viewModel.surfaceStates.map}
          recordError={viewModel.selectedResidentRecordError}
        />
      </div>

      <aside className="position-command-center__column position-command-center__column--panel position-command-center__column--sticky flycare-command-center__panel">
        <FlyCareHealthPanel
          resident={viewModel.selectedResident}
          fetchedAt={viewModel.fetchedAt}
          mapProfile={ELDERLY_MAP_PROFILE}
          latestReminder={latestReminder}
        />
        <PositionDecisionPanel
          resident={viewModel.selectedResident}
          surfaceState={viewModel.surfaceStates.decision}
          activityState={viewModel.activityState}
          loadError={viewModel.loadError}
          recordError={viewModel.selectedResidentRecordError}
          partialFailureCount={viewModel.partialFailureCount}
          mapProfile={ELDERLY_MAP_PROFILE}
          onRefresh={() => {
            void refreshSnapshot();
          }}
        />
      </aside>
    </section>
  );
}
