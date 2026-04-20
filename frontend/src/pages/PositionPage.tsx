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
import { PositionDecisionPanel } from '../components/position/PositionDecisionPanel';
import { PositionMapStage } from '../components/position/PositionMapStage';
import { PositionResidentRail } from '../components/position/PositionResidentRail';
import { PositionSummaryBar } from '../components/position/PositionSummaryBar';
import type { FallAlertDetailRow } from '../types/fall-alert';
import { buildFallAlertRowsFromPositionResidents } from '../utils/fall-alert-rows';

type PositionPageProps = {
  onSosOrFallDetected?: (items: FallAlertDetailRow[]) => void;
};

function initialRegistry(): PositionResidentRegistryEntry[] {
  return POSITION_RESIDENT_REGISTRY.map((entry) => ({ ...entry }));
}

export function PositionPage({ onSosOrFallDetected }: PositionPageProps) {
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

  /** 每次执行均重新拉取设备→用户展示名，便于在后台修改用户名后定位页自动更新。 */
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
        emptyRegistry: registry
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

    void loadPositionResidentActivity(deviceId)
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

    const alerting = viewModel.residents.filter((resident) => resident.sosState || resident.fallConfirmed);
    const alertNow = alerting.length > 0;
    if (alertNow && !previousAlertRef.current) {
      previousAlertRef.current = true;
      onSosOrFallDetected(buildFallAlertRowsFromPositionResidents(alerting, t));
    }

    if (!alertNow) {
      previousAlertRef.current = false;
    }
  }, [onSosOrFallDetected, t, viewModel.residents]);

  const mapResidents = useMemo(() => {
    if (showAllOnMap) {
      // 全员模式按“有坐标即可展示”，避免 stale/delayed 被误过滤导致地图无点。
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
    <section className="position-command-center">
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
        />
        <PositionSummaryBar
          resident={viewModel.selectedResident}
          fetchedAt={viewModel.fetchedAt}
          surfaceState={viewModel.surfaceStates.summary}
          recordError={viewModel.selectedResidentRecordError}
          variant="sidebar"
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

      <aside className="position-command-center__column position-command-center__column--panel position-command-center__column--sticky">
        <PositionDecisionPanel
          resident={viewModel.selectedResident}
          surfaceState={viewModel.surfaceStates.decision}
          activityState={viewModel.activityState}
          loadError={viewModel.loadError}
          recordError={viewModel.selectedResidentRecordError}
          partialFailureCount={viewModel.partialFailureCount}
          onRefresh={() => {
            void refreshSnapshot();
          }}
        />
      </aside>
    </section>
  );
}
