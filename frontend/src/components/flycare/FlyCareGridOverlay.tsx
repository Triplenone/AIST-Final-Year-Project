import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  FLYCARE_GRID_COLUMNS,
  FLYCARE_GRID_ROWS,
  FLYCARE_GRID_ZONE_SHORT_LABELS,
  FLYCARE_ZONES,
  cloneFlyCareGrid,
  cycleFlyCareGridZone,
  getFlyCareZoneDisplay,
  getFlyCareZoneLabelKey,
  serializeFlyCareGridForExport,
  type FlyCareZoneId
} from '../../adapters/flycare-map';

type FlyCareGridCalibrationProps = {
  grid: string[][];
  onGridChange: (grid: string[][]) => void;
};

function zoneCellClassName(zoneId: string): string {
  const normalized = zoneId.trim();
  if (!normalized) return 'flycare-map-stage__grid-cell--void';
  return `flycare-map-stage__grid-cell--${normalized.replace(/_/g, '-')}`;
}

export function FlyCareGridOverlay({ grid, onGridChange, selectedCell, onSelectCell }: FlyCareGridCalibrationProps & {
  selectedCell: { col: number; row: number } | null;
  onSelectCell: (cell: { col: number; row: number } | null) => void;
}) {
  const { t } = useTranslation();

  const handleCellClick = useCallback(
    (col: number, row: number, reverse: boolean) => {
      const nextGrid = grid.map((gridRow) => [...gridRow]);
      nextGrid[row][col] = cycleFlyCareGridZone(grid[row][col], reverse ? -1 : 1);
      onGridChange(nextGrid);
      onSelectCell({ col, row });
    },
    [grid, onGridChange, onSelectCell]
  );

  return (
    <div
      className="flycare-map-stage__grid-overlay position-map-stage__grid"
      role="group"
      aria-label={t('flyCare.gridOverlay.title', { defaultValue: 'FlyCare 地图格子校准' })}
    >
      {Array.from({ length: FLYCARE_GRID_ROWS }, (_, row) =>
        Array.from({ length: FLYCARE_GRID_COLUMNS }, (_, col) => {
          const zoneId = grid[row]?.[col] ?? ' ';
          const normalized = zoneId.trim();
          const isSelected = selectedCell?.col === col && selectedCell?.row === row;
          const shortLabel = FLYCARE_GRID_ZONE_SHORT_LABELS[normalized || ' '] ?? normalized.slice(0, 4);
          const zoneLabel = normalized
            ? getFlyCareZoneDisplay(normalized as FlyCareZoneId, getFlyCareZoneLabelKey(normalized as FlyCareZoneId), null, t)
            : t('flyCare.gridOverlay.emptyZone', { defaultValue: '空白（无区域）' });

          return (
            <button
              key={`${col}-${row}`}
              type="button"
              className={[
                'position-map-stage__cell',
                'flycare-map-stage__grid-cell',
                zoneCellClassName(zoneId),
                isSelected ? 'flycare-map-stage__grid-cell--selected' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${t('flyCare.gridOverlay.coord', { defaultValue: '坐标' })} ${col},${row}. ${zoneLabel}`}
              aria-pressed={isSelected}
              title={`${col},${row} · ${zoneLabel}`}
              onClick={(event) => handleCellClick(col, row, event.shiftKey)}
            >
              <span className="flycare-map-stage__grid-coord">
                {col},{row}
              </span>
              <span className="flycare-map-stage__grid-zone">{shortLabel}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

export function FlyCareGridCalibrationPanel({
  grid,
  onGridChange,
  selectedCell,
  onSelectCell
}: FlyCareGridCalibrationProps & {
  selectedCell: { col: number; row: number } | null;
  onSelectCell: (cell: { col: number; row: number } | null) => void;
}) {
  const { t } = useTranslation();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleCopy = useCallback(async () => {
    const payload = serializeFlyCareGridForExport(grid);
    try {
      await navigator.clipboard.writeText(payload);
      setCopyStatus('copied');
      console.info('[FlyCare grid] Copied FLYCARE_GRID_TO_ZONE to clipboard:\n', payload);
    } catch {
      setCopyStatus('failed');
      console.info('[FlyCare grid] Copy failed. Grid export:\n', payload);
    }
  }, [grid]);

  const handleReset = useCallback(() => {
    onGridChange(cloneFlyCareGrid());
    onSelectCell(null);
    setCopyStatus('idle');
  }, [onGridChange, onSelectCell]);

  const selectedZoneId = selectedCell ? grid[selectedCell.row]?.[selectedCell.col]?.trim() ?? '' : '';
  const selectedZoneLabel = selectedZoneId
    ? getFlyCareZoneDisplay(selectedZoneId as FlyCareZoneId, getFlyCareZoneLabelKey(selectedZoneId as FlyCareZoneId), null, t)
    : t('flyCare.gridOverlay.emptyZone', { defaultValue: '空白（无区域）' });

  return (
    <div className="flycare-map-stage__grid-toolbar">
      <div className="flycare-map-stage__grid-toolbar-copy">
        <strong>{t('flyCare.gridOverlay.title', { defaultValue: 'FlyCare 地图格子校准' })}</strong>
        <p>{t('flyCare.gridOverlay.hint', { defaultValue: '点击格子切换区域名称，Shift+点击反向切换。调整完成后复制配置发给我。' })}</p>
      </div>
      <div className="flycare-map-stage__grid-toolbar-meta">
        <span>
          {selectedCell
            ? `${t('flyCare.gridOverlay.selected', { defaultValue: '选中格子' })}: ${selectedCell.col},${selectedCell.row} · ${selectedZoneLabel}`
            : t('flyCare.gridOverlay.noSelection', { defaultValue: '点击地图格子查看坐标与区域' })}
        </span>
        <div className="flycare-map-stage__grid-toolbar-actions">
          <button type="button" className="flycare-map-stage__grid-button" onClick={() => void handleCopy()}>
            {copyStatus === 'copied'
              ? t('flyCare.gridOverlay.copied', { defaultValue: '已复制到剪贴板' })
              : copyStatus === 'failed'
                ? t('flyCare.gridOverlay.copyFailed', { defaultValue: '复制失败，请查看控制台' })
                : t('flyCare.gridOverlay.copy', { defaultValue: '复制格子配置' })}
          </button>
          <button type="button" className="flycare-map-stage__grid-button flycare-map-stage__grid-button--ghost" onClick={handleReset}>
            {t('flyCare.gridOverlay.reset', { defaultValue: '恢复默认' })}
          </button>
        </div>
      </div>
      <ul className="flycare-map-stage__grid-legend" aria-label={t('flyCare.gridOverlay.legend', { defaultValue: '区域缩写' })}>
        {FLYCARE_ZONES.map((zone) => (
          <li key={zone.id}>
            <span className={`flycare-map-stage__grid-legend-swatch flycare-map-stage__grid-cell--${zone.id.replace(/_/g, '-')}`} />
            <span>
              {FLYCARE_GRID_ZONE_SHORT_LABELS[zone.id]} = {t(zone.labelKey, { defaultValue: zone.id })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function useFlyCareGridCalibrationState() {
  const [editableGrid, setEditableGrid] = useState(() => cloneFlyCareGrid());
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  return { editableGrid, setEditableGrid, selectedCell, setSelectedCell };
}
