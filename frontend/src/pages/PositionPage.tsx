import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '../styles/position-page.css';
import {
  POSITION_RESIDENT_REGISTRY,
  buildPositionCommandCenterViewModel,
  loadPositionCommandCenterSnapshot,
  type PositionCommandCenterSnapshot,
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
  const previousAlertRef = useRef(false);

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

  const viewModel = useMemo(
    () =>
      buildPositionCommandCenterViewModel(snapshot, {
        selectedResidentId
      }),
    [selectedResidentId, snapshot]
  );

  useEffect(() => {
    if (viewModel.selectedResidentId !== selectedResidentId) {
      setSelectedResidentId(viewModel.selectedResidentId);
    }
  }, [selectedResidentId, viewModel.selectedResidentId]);

  // 只在 false -> true 边沿时触发 modal，避免 polling 重复弹窗。
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
      <aside className="position-command-center__column position-command-center__column--rail position-command-center__column--sticky">
        <PositionResidentRail
          residents={viewModel.residents}
          selectedResidentId={viewModel.selectedResidentId}
          counts={viewModel.counts}
          loading={loading}
          onSelectResident={handleSelectResident}
        />
      </aside>

      <div className="position-command-center__column position-command-center__column--center">
        <PositionSummaryBar
          resident={viewModel.selectedResident}
          fetchedAt={viewModel.fetchedAt}
          loading={loading}
        />
        <PositionMapStage
          resident={viewModel.selectedResident}
          highlightedZoneId={effectiveHighlightedZoneId}
          onHighlightZone={handleHighlightZone}
        />
      </div>

      <aside className="position-command-center__column position-command-center__column--panel position-command-center__column--sticky">
        <PositionDecisionPanel
          resident={viewModel.selectedResident}
          loadError={viewModel.loadError}
          loading={loading}
          onRefresh={() => {
            void refreshSnapshot();
          }}
        />
      </aside>
    </section>
  );
}
