import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '../styles/position-page.css';
import {
  POSITION_RESIDENT_REGISTRY,
  buildPositionCommandCenterViewModel,
  loadPositionCommandCenterSnapshot,
  loadPositionResidentActivity,
  type PositionCommandCenterSnapshot,
  type PositionResidentActivitySnapshot,
  type PositionZoneId
} from '../adapters/position-command-center';
import { PositionDecisionPanel } from '../components/position/PositionDecisionPanel';
import { PositionMapStage } from '../components/position/PositionMapStage';
import { PositionResidentRail } from '../components/position/PositionResidentRail';
import { PositionSummaryBar } from '../components/position/PositionSummaryBar';

type PositionPageProps = {
  onSosOrFallDetected?: () => void;
};

const INITIAL_SELECTED_RESIDENT_ID = POSITION_RESIDENT_REGISTRY[0]?.residentId ?? null;

export function PositionPage({ onSosOrFallDetected }: PositionPageProps) {
  const [snapshot, setSnapshot] = useState<PositionCommandCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(INITIAL_SELECTED_RESIDENT_ID);
  const [manualHighlightedZoneId, setManualHighlightedZoneId] = useState<PositionZoneId | null>(null);
  const [residentActivity, setResidentActivity] = useState<PositionResidentActivitySnapshot | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const previousAlertRef = useRef(false);
  const activityRequestSequenceRef = useRef(0);

  const refreshSnapshot = useCallback(async () => {
    setLoading(true);

    try {
      const nextSnapshot = await loadPositionCommandCenterSnapshot();
      setSnapshot(nextSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setSnapshot({
        fetchedAt: new Date().toISOString(),
        records: POSITION_RESIDENT_REGISTRY.map((resident) => ({
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
        activityLoading
      }),
    [activityLoading, loading, residentActivity, selectedResidentId, snapshot]
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

    const alertNow = viewModel.residents.some((resident) => resident.sosState || resident.fallConfirmed);
    if (alertNow && !previousAlertRef.current) {
      previousAlertRef.current = true;
      onSosOrFallDetected();
    }

    if (!alertNow) {
      previousAlertRef.current = false;
    }
  }, [onSosOrFallDetected, viewModel.residents]);

  const effectiveHighlightedZoneId = manualHighlightedZoneId ?? viewModel.selectedResident?.currentZoneId ?? null;

  const handleSelectResident = useCallback((residentId: string) => {
    setSelectedResidentId(residentId);
    setManualHighlightedZoneId(null);
  }, []);

  const handleHighlightZone = useCallback((zoneId: PositionZoneId | null) => {
    setManualHighlightedZoneId((current) => (current === zoneId ? null : zoneId));
  }, []);

  return (
    <section className="position-command-center">
      <div className="position-command-center__column position-command-center__column--left">
        <PositionResidentRail
          residents={viewModel.residents}
          selectedResidentId={viewModel.selectedResidentId}
          counts={viewModel.counts}
          surfaceState={viewModel.surfaceStates.rail}
          loadError={viewModel.loadError}
          partialFailureCount={viewModel.partialFailureCount}
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
          surfaceState={viewModel.surfaceStates.map}
          recordError={viewModel.selectedResidentRecordError}
          highlightedZoneId={effectiveHighlightedZoneId}
          onHighlightZone={handleHighlightZone}
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
