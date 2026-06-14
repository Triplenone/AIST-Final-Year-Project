/** Airport map zones and grid for FlyCare command center (12×16, aligned with FlyCare.png). */

import type { PositionPoint } from './position-command-center';

export type FlyCareZoneId =
  | 'boarding_gate_10'
  | 'boarding_gate_11'
  | 'restricted_area'
  | 'toilet'
  | 'immigration'
  | 'security_check'
  | 'non_restricted_area'
  | 'check_in_counter'
  | 'customer_services';

export type FlyCareZoneDefinition = {
  id: FlyCareZoneId;
  labelKey: string;
};

export const FLYCARE_GRID_COLUMNS = 12;
export const FLYCARE_GRID_ROWS = 16;
export const FLYCARE_MAP_PIXEL_WIDTH = 600;
export const FLYCARE_MAP_PIXEL_HEIGHT = 800;

/** Set to false after manual grid calibration is complete. */
export const FLYCARE_SHOW_GRID_OVERLAY = false;

export const FLYCARE_GRID_ZONE_SHORT_LABELS: Readonly<Record<string, string>> = {
  ' ': '—',
  boarding_gate_10: 'G10',
  boarding_gate_11: 'G11',
  restricted_area: 'RST',
  toilet: 'WC',
  immigration: 'IMM',
  security_check: 'SEC',
  non_restricted_area: 'OPEN',
  check_in_counter: 'CHK',
  customer_services: 'CS'
};

export const FLYCARE_ZONES: readonly FlyCareZoneDefinition[] = [
  { id: 'boarding_gate_10', labelKey: 'flyCare.zone.boarding_gate_10' },
  { id: 'boarding_gate_11', labelKey: 'flyCare.zone.boarding_gate_11' },
  { id: 'restricted_area', labelKey: 'flyCare.zone.restricted_area' },
  { id: 'toilet', labelKey: 'flyCare.zone.toilet' },
  { id: 'immigration', labelKey: 'flyCare.zone.immigration' },
  { id: 'security_check', labelKey: 'flyCare.zone.security_check' },
  { id: 'non_restricted_area', labelKey: 'flyCare.zone.non_restricted_area' },
  { id: 'check_in_counter', labelKey: 'flyCare.zone.check_in_counter' },
  { id: 'customer_services', labelKey: 'flyCare.zone.customer_services' }
];

/**
 * 12×16 grid over FlyCare.png (row 0 = top / gates, row 15 = bottom / check-in).
 * Manually calibrated against FlyCare.png — rows 0–3 gates + customer services throat,
 * rows 4–7 post-customs restricted (walkable), 8–9 immigration, 10 security, 11–15 check-in.
 */
export const FLYCARE_GRID_TO_ZONE: readonly (readonly string[])[] = [
  ['toilet', 'toilet', 'toilet', 'boarding_gate_11', 'boarding_gate_11', 'boarding_gate_11', 'boarding_gate_10', 'boarding_gate_10', 'boarding_gate_10', 'boarding_gate_10', 'restricted_area', 'restricted_area'],
  ['toilet', 'toilet', 'toilet', 'boarding_gate_11', 'boarding_gate_11', 'boarding_gate_11', 'boarding_gate_10', 'boarding_gate_10', 'boarding_gate_10', 'boarding_gate_10', 'restricted_area', 'restricted_area'],
  ['toilet', 'toilet', 'toilet', 'boarding_gate_11', 'boarding_gate_11', 'boarding_gate_11', 'boarding_gate_10', 'boarding_gate_10', 'boarding_gate_10', 'boarding_gate_10', 'restricted_area', 'restricted_area'],
  ['toilet', 'toilet', 'toilet', 'boarding_gate_11', 'customer_services', 'customer_services', 'customer_services', 'customer_services', 'boarding_gate_10', 'boarding_gate_10', 'restricted_area', 'restricted_area'],
  ['restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'customer_services', 'customer_services', 'customer_services', 'customer_services', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area'],
  ['restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area'],
  ['restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area'],
  ['restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area'],
  ['immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration'],
  ['immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration', 'immigration'],
  ['security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check', 'security_check'],
  ['check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter'],
  ['check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter'],
  ['check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter'],
  ['check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter'],
  ['check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter']
];

/** Click order when editing grid cells in the FlyCare map overlay. */
export const FLYCARE_GRID_ZONE_CYCLE: readonly string[] = [
  ' ',
  ...FLYCARE_ZONES.map((zone) => zone.id)
];

export function cloneFlyCareGrid(): string[][] {
  return FLYCARE_GRID_TO_ZONE.map((row) => [...row]);
}

export function cycleFlyCareGridZone(current: string, direction: 1 | -1 = 1): string {
  const normalized = String(current ?? ' ').trim() || ' ';
  const index = FLYCARE_GRID_ZONE_CYCLE.indexOf(normalized);
  const nextIndex = index < 0 ? 0 : (index + direction + FLYCARE_GRID_ZONE_CYCLE.length) % FLYCARE_GRID_ZONE_CYCLE.length;
  return FLYCARE_GRID_ZONE_CYCLE[nextIndex] ?? ' ';
}

export function serializeFlyCareGridForExport(grid: readonly (readonly string[])[]): string {
  const rows = grid
    .map((row) => `  [${row.map((cell) => `'${cell === ' ' ? ' ' : cell}'`).join(', ')}]`)
    .join(',\n');
  return `export const FLYCARE_GRID_TO_ZONE: readonly (readonly string[])[] = [\n${rows}\n];`;
}

/** Fixed grid anchors for zone markers (cell indices, not bbox centers). */
export const FLYCARE_ZONE_ANCHOR_POINTS: Readonly<Partial<Record<FlyCareZoneId, PositionPoint>>> = {
  boarding_gate_11: { x: 4, y: 1 },
  boarding_gate_10: { x: 8, y: 1 },
  check_in_counter: { x: 6, y: 13 },
  security_check: { x: 6, y: 10 },
  immigration: { x: 6, y: 8 }
};

function snapGridPoint(point: PositionPoint): PositionPoint {
  return {
    x: Math.min(FLYCARE_GRID_COLUMNS - 1, Math.max(0, Math.round(point.x))),
    y: Math.min(FLYCARE_GRID_ROWS - 1, Math.max(0, Math.round(point.y)))
  };
}

/** Shared grid snap for device pins — keeps map marker aligned to grid cells. */
export function normalizeFlyCareMapCoords(point: PositionPoint | null): PositionPoint | null {
  if (!point) return null;
  return snapGridPoint(point);
}

export function getFlyCareZoneAnchorPoint(zoneId: FlyCareZoneId): PositionPoint {
  const anchor = FLYCARE_ZONE_ANCHOR_POINTS[zoneId];
  if (anchor) return { ...anchor };
  return getFlyCareZoneCenter(zoneId) ?? snapGridPoint({ x: 6, y: 8 });
}

export function getFlyCareZoneCenter(zoneId: FlyCareZoneId): PositionPoint | null {
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;

  for (let row = 0; row < FLYCARE_GRID_TO_ZONE.length; row += 1) {
    const cols = FLYCARE_GRID_TO_ZONE[row];
    for (let col = 0; col < cols.length; col += 1) {
      if (String(cols[col]).trim() !== zoneId) continue;
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
    }
  }

  if (!Number.isFinite(minCol) || !Number.isFinite(minRow)) {
    const anchor = FLYCARE_ZONE_ANCHOR_POINTS[zoneId];
    return anchor ? { ...anchor } : null;
  }

  const anchor = FLYCARE_ZONE_ANCHOR_POINTS[zoneId];
  if (anchor) {
    return { ...anchor };
  }

  return {
    x: Math.round((minCol + maxCol) / 2),
    y: Math.round((minRow + maxRow) / 2)
  };
}

export function getFlyCareZoneFromCoords(coords: PositionPoint | null): FlyCareZoneId | null {
  if (!coords) return null;
  const col = Math.min(FLYCARE_GRID_COLUMNS - 1, Math.max(0, Math.round(coords.x)));
  const row = Math.min(FLYCARE_GRID_ROWS - 1, Math.max(0, Math.round(coords.y)));
  const zoneId = (FLYCARE_GRID_TO_ZONE[row]?.[col] ?? '').trim();
  if (!zoneId) return null;
  return zoneId as FlyCareZoneId;
}

export function getFlyCareZoneLabelKey(zoneId: FlyCareZoneId | string | null): string | null {
  if (!zoneId) return null;
  return FLYCARE_ZONES.find((zone) => zone.id === zoneId)?.labelKey ?? null;
}

export function getFlyCareZoneDisplay(
  zoneId: FlyCareZoneId | string | null,
  zoneLabelKey: string | null,
  zoneName: string | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const name = zoneName?.trim();
  if (name) return name;
  if (zoneLabelKey) {
    return t(zoneLabelKey, { defaultValue: zoneName ?? 'Unknown zone' });
  }
  if (zoneId) {
    const zone = FLYCARE_ZONES.find((item) => item.id === zoneId);
    if (zone) {
      return t(zone.labelKey, { defaultValue: zone.id });
    }
    return String(zoneId);
  }
  return t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
}

export function flyCareGridIndicesToPixelPercent(coords: PositionPoint): {
  leftPercent: number;
  topPercent: number;
} {
  const normalized = normalizeFlyCareMapCoords(coords) ?? snapGridPoint(coords);
  const pixelX = ((normalized.x + 0.5) / FLYCARE_GRID_COLUMNS) * FLYCARE_MAP_PIXEL_WIDTH;
  const pixelY = ((normalized.y + 0.5) / FLYCARE_GRID_ROWS) * FLYCARE_MAP_PIXEL_HEIGHT;
  return {
    leftPercent: (pixelX / FLYCARE_MAP_PIXEL_WIDTH) * 100,
    topPercent: (pixelY / FLYCARE_MAP_PIXEL_HEIGHT) * 100
  };
}

export type FlyCarePinLabelSide = 'left' | 'right';

export type FlyCareGateTarget = 'boarding_gate_10' | 'boarding_gate_11';

export const FLYCARE_GATE_DESTINATIONS: Readonly<Record<FlyCareGateTarget, PositionPoint>> = {
  boarding_gate_11: { x: 4, y: 1 },
  boarding_gate_10: { x: 8, y: 1 }
};

const FLYCARE_WALKABLE_ZONES = new Set<string>([
  'check_in_counter',
  'security_check',
  'immigration',
  'customer_services',
  'boarding_gate_10',
  'boarding_gate_11',
  'restricted_area'
]);

const FLYCARE_IMMIGRATION_ROWS = new Set([8, 9]);
const FLYCARE_CS_CORRIDOR_COL_MIN = 4;
const FLYCARE_CS_CORRIDOR_COL_MAX = 7;
const FLYCARE_CS_THROAT_ROW = 4;

/**
 * Phase C — manually block obstacle cells after grid-overlay inspection.
 * Format: `"col:row"` (e.g. `"3:2"` for Bari Uma area). Blocks BFS and rendering checks.
 */
export const FLYCARE_BLOCKED_CELLS: ReadonlySet<string> = new Set([
  // Example: '3:2', '2:3'
  '1:12','1:13','1:14','1:15',
  '3:12','3:13','3:14','3:15',
  '8:12','8:13','8:14','8:15',
  '11:12','11:13','11:14','11:15',
  '3:0',  '3:1',  '3:2',
  '5:0',  '5:1',  '5:2',  '5:7',
  '6:0',  '6:1',  '6:2','6:12','6:13','6:14','6:15',
  '7:0',  '8:0',  '9:0',  '10:0',  '11:0',
  '9:1','9:2','10:1','10:2','11:1','11:2',
  '3:6',  '4:6',  '5:6',  '7:6',  '8:6', '9:6',
  '0:7',  '1:7',  '10:7',  '11:7',
  '0:8',  '1:8',  '2:8',  '3:8', '7:8','8:8','9:8','10:8','11:8',
  '0:9',  '1:9',  '2:9',  '3:9', '4:9','5:9','7:9','8:9','9:9','10:9','11:9',
  '0:10', '1:10', '2:10', '3:10', '4:10','5:10','7:10','8:10','9:10','10:10','11:10'  
]);

/** Hub column — main vertical aisle for check-in / security / immigration (col 6). */
export const FLYCARE_CORRIDOR_HUB_COL = 6;

/**
 * Visual waypoints for immigration ↔ CS corridor (optional detour around shops on FlyCare.png).
 * BFS can walk through restricted_area normally; use this lane only to shape the rendered path.
 *
 * Calibration tip: turn on grid overlay, walk the white aisle on FlyCare.png,
 * and place one point per turn (immigration row → optional east detour → CS row).
 */
export const FLYCARE_BAND_CROSSING_LANE: readonly PositionPoint[] = [
  { x: 6, y: 8 },
  { x: 6, y: 4 }
];

const FLYCARE_BAND_CROSSING_LANE_ROWS = new Set([4, 8, 9]);
const FLYCARE_SPINE_ROWS = new Set([8, 9, 10, 11, 12, 13, 14, 15]);

function getBandCrossingLaneWaypoints(): PositionPoint[] {
  return FLYCARE_BAND_CROSSING_LANE.filter((point) => FLYCARE_BAND_CROSSING_LANE_ROWS.has(point.y));
}

export function formatFlyCareBlockedCellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

export function parseFlyCareBlockedCellKey(key: string): PositionPoint | null {
  const match = /^(\d+):(\d+)$/.exec(key.trim());
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}

export function isFlyCareBlockedCell(col: number, row: number): boolean {
  return FLYCARE_BLOCKED_CELLS.has(flyCareCellKey(col, row));
}

function flyCareSegmentKey(from: PositionPoint, to: PositionPoint): string {
  return `${flyCareCellKey(from.x, from.y)}->${flyCareCellKey(to.x, to.y)}`;
}

function buildFlyCareCorridorExceptionSegments(lane: readonly PositionPoint[]): ReadonlySet<string> {
  const keys = new Set<string>();
  for (let index = 1; index < lane.length; index += 1) {
    const previous = lane[index - 1];
    const current = lane[index];
    keys.add(flyCareSegmentKey(previous, current));
    keys.add(flyCareSegmentKey(current, previous));
  }
  return keys;
}

const FLYCARE_CORRIDOR_EXCEPTION_SEGMENTS = buildFlyCareCorridorExceptionSegments(FLYCARE_BAND_CROSSING_LANE);

function flyCareCellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

function flyCareCellFromKey(key: string): PositionPoint {
  const [x, y] = key.split(':').map(Number);
  return { x, y };
}

function isFlyCareWalkableCell(col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= FLYCARE_GRID_COLUMNS || row >= FLYCARE_GRID_ROWS) {
    return false;
  }
  if (isFlyCareBlockedCell(col, row)) {
    return false;
  }
  const zoneId = String(FLYCARE_GRID_TO_ZONE[row]?.[col] ?? '').trim();
  return FLYCARE_WALKABLE_ZONES.has(zoneId);
}

function isFlyCareOrthogonalSegment(from: PositionPoint, to: PositionPoint): boolean {
  return (from.x === to.x && from.y !== to.y) || (from.y === to.y && from.x !== to.x);
}

function iterFlyCareOrthogonalSegmentCells(from: PositionPoint, to: PositionPoint): PositionPoint[] {
  const cells: PositionPoint[] = [];
  if (from.x === to.x) {
    const step = from.y <= to.y ? 1 : -1;
    for (let row = from.y; row !== to.y; row += step) {
      cells.push({ x: from.x, y: row });
    }
    cells.push({ ...to });
    return cells;
  }
  if (from.y === to.y) {
    const step = from.x <= to.x ? 1 : -1;
    for (let col = from.x; col !== to.x; col += step) {
      cells.push({ x: col, y: from.y });
    }
    cells.push({ ...to });
    return cells;
  }
  return cells;
}

export function isFlyCareOrthogonalSegmentWalkable(from: PositionPoint, to: PositionPoint): boolean {
  if (from.x === to.x && from.y === to.y) {
    return isFlyCareWalkableCell(from.x, from.y);
  }
  if (!isFlyCareOrthogonalSegment(from, to)) {
    return false;
  }
  const cells = iterFlyCareOrthogonalSegmentCells(from, to);
  return cells.every((cell) => isFlyCareWalkableCell(cell.x, cell.y));
}

export function isFlyCareNavSegmentVisible(from: PositionPoint, to: PositionPoint): boolean {
  if (from.x === to.x && from.y === to.y) {
    return true;
  }
  if (!isFlyCareOrthogonalSegment(from, to)) {
    return false;
  }
  if (FLYCARE_CORRIDOR_EXCEPTION_SEGMENTS.has(flyCareSegmentKey(from, to))) {
    return true;
  }
  return isFlyCareOrthogonalSegmentWalkable(from, to);
}

function isFlyCareCsCorridorCol(col: number): boolean {
  return col >= FLYCARE_CS_CORRIDOR_COL_MIN && col <= FLYCARE_CS_CORRIDOR_COL_MAX;
}

function getFlyCareNavNeighbors(col: number, row: number): PositionPoint[] {
  const neighbors: PositionPoint[] = [];
  const steps: readonly PositionPoint[] = [
    { x: col, y: row - 1 },
    { x: col, y: row + 1 },
    { x: col - 1, y: row },
    { x: col + 1, y: row }
  ];

  for (const step of steps) {
    if (isFlyCareWalkableCell(step.x, step.y)) {
      neighbors.push(step);
    }
  }

  if (FLYCARE_IMMIGRATION_ROWS.has(row) && isFlyCareCsCorridorCol(col) && isFlyCareWalkableCell(col, FLYCARE_CS_THROAT_ROW)) {
    neighbors.push({ x: col, y: FLYCARE_CS_THROAT_ROW });
  }
  if (row === FLYCARE_CS_THROAT_ROW && isFlyCareCsCorridorCol(col)) {
    for (const immigrationRow of FLYCARE_IMMIGRATION_ROWS) {
      if (isFlyCareWalkableCell(col, immigrationRow)) {
        neighbors.push({ x: col, y: immigrationRow });
      }
    }
  }

  return neighbors;
}

function findNearestFlyCareWalkableCell(origin: PositionPoint): PositionPoint | null {
  const start = snapGridPoint(origin);
  if (isFlyCareWalkableCell(start.x, start.y)) {
    return { ...start };
  }

  const queue = [start];
  const visited = new Set([flyCareCellKey(start.x, start.y)]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null) break;
    if (isFlyCareWalkableCell(current.x, current.y)) {
      return { ...current };
    }
    const steps: readonly PositionPoint[] = [
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y }
    ];
    for (const step of steps) {
      if (step.x < 0 || step.y < 0 || step.x >= FLYCARE_GRID_COLUMNS || step.y >= FLYCARE_GRID_ROWS) {
        continue;
      }
      const key = flyCareCellKey(step.x, step.y);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(step);
    }
  }
  return null;
}

function resolveFlyCareNavStartPoint(userStart: PositionPoint): PositionPoint | null {
  return findNearestFlyCareWalkableCell(userStart);
}

function findFlyCareNavPath(start: PositionPoint, end: PositionPoint): PositionPoint[] | null {
  const startPoint = snapGridPoint(start);
  const endPoint = snapGridPoint(end);
  if (startPoint.x === endPoint.x && startPoint.y === endPoint.y) {
    return [{ ...startPoint }];
  }

  const startKey = flyCareCellKey(startPoint.x, startPoint.y);
  const endKey = flyCareCellKey(endPoint.x, endPoint.y);
  const queue = [startKey];
  const visited = new Set<string>([startKey]);
  const parent = new Map<string, string | null>([[startKey, null]]);

  while (queue.length > 0) {
    const currentKey = queue.shift();
    if (currentKey == null) break;
    if (currentKey === endKey) break;

    const current = flyCareCellFromKey(currentKey);
    for (const neighbor of getFlyCareNavNeighbors(current.x, current.y)) {
      const neighborKey = flyCareCellKey(neighbor.x, neighbor.y);
      if (visited.has(neighborKey)) continue;
      visited.add(neighborKey);
      parent.set(neighborKey, currentKey);
      queue.push(neighborKey);
    }
  }

  if (!parent.has(endKey)) {
    return null;
  }

  const path: PositionPoint[] = [];
  let cursor: string | null = endKey;
  while (cursor != null) {
    path.unshift(flyCareCellFromKey(cursor));
    cursor = parent.get(cursor) ?? null;
  }
  return path;
}

function isFlyCareBandJump(from: PositionPoint, to: PositionPoint): boolean {
  if (from.x !== to.x) {
    return false;
  }
  const rowDelta = Math.abs(to.y - from.y);
  if (rowDelta <= 1) {
    return false;
  }
  const fromInImmigration = FLYCARE_IMMIGRATION_ROWS.has(from.y);
  const toInImmigration = FLYCARE_IMMIGRATION_ROWS.has(to.y);
  const fromInCsThroat = from.y === FLYCARE_CS_THROAT_ROW;
  const toInCsThroat = to.y === FLYCARE_CS_THROAT_ROW;
  return (fromInImmigration && toInCsThroat) || (fromInCsThroat && toInImmigration);
}

function appendFlyCareNavPoint(path: PositionPoint[], point: PositionPoint): void {
  const last = path[path.length - 1];
  if (last == null || last.x !== point.x || last.y !== point.y) {
    path.push({ ...point });
  }
}

function expandFlyCareBandCrossing(from: PositionPoint, to: PositionPoint): PositionPoint[] {
  const hubCol = FLYCARE_CORRIDOR_HUB_COL;
  const csRow = FLYCARE_CS_THROAT_ROW;
  const points: PositionPoint[] = [{ ...from }];
  const immigrationRow = FLYCARE_IMMIGRATION_ROWS.has(from.y) ? from.y : 8;

  if (from.x !== hubCol) {
    appendFlyCareNavPoint(points, { x: hubCol, y: from.y });
  }

  if (FLYCARE_IMMIGRATION_ROWS.has(from.y)) {
    appendFlyCareNavPoint(points, { x: hubCol, y: immigrationRow });
  }

  for (const waypoint of getBandCrossingLaneWaypoints()) {
    appendFlyCareNavPoint(points, waypoint);
  }

  if (to.y === csRow) {
    if (to.x !== points[points.length - 1].x) {
      appendFlyCareNavPoint(points, { x: to.x, y: csRow });
    }
  } else if (to.x !== points[points.length - 1].x) {
    appendFlyCareNavPoint(points, { x: to.x, y: csRow });
    appendFlyCareNavPoint(points, to);
  } else {
    appendFlyCareNavPoint(points, to);
  }

  return points;
}

function prependFlyCareSpineEntry(path: PositionPoint[]): PositionPoint[] {
  if (path.length === 0) {
    return [];
  }
  const start = path[0];
  const spineCol = FLYCARE_CORRIDOR_HUB_COL;
  if (!FLYCARE_SPINE_ROWS.has(start.y) || start.x === spineCol || !isFlyCareWalkableCell(spineCol, start.y)) {
    return path.map((point) => ({ ...point }));
  }

  const result: PositionPoint[] = [{ ...start }, { x: spineCol, y: start.y }];
  for (let index = 1; index < path.length; index += 1) {
    appendFlyCareNavPoint(result, path[index]);
  }
  return result;
}

function expandFlyCareCorridorJumps(path: PositionPoint[]): PositionPoint[] {
  if (path.length < 2) {
    return path.map((point) => ({ ...point }));
  }

  const expanded: PositionPoint[] = [{ ...path[0] }];
  for (let index = 1; index < path.length; index += 1) {
    const from = expanded[expanded.length - 1];
    const to = path[index];
    if (isFlyCareBandJump(from, to)) {
      for (const point of expandFlyCareBandCrossing(from, to).slice(1)) {
        appendFlyCareNavPoint(expanded, point);
      }
      continue;
    }
    appendFlyCareNavPoint(expanded, to);
  }
  return expanded;
}

function dedupeFlyCareNavPathPoints(path: PositionPoint[]): PositionPoint[] {
  if (path.length === 0) {
    return [];
  }
  const deduped: PositionPoint[] = [{ ...path[0] }];
  for (let index = 1; index < path.length; index += 1) {
    appendFlyCareNavPoint(deduped, path[index]);
  }
  return deduped;
}

function simplifyFlyCareNavPathSafe(path: PositionPoint[]): PositionPoint[] {
  if (path.length <= 2) {
    return path.map((point) => ({ ...point }));
  }

  const simplified: PositionPoint[] = [{ ...path[0] }];
  for (let index = 1; index < path.length - 1; index += 1) {
    const anchor = simplified[simplified.length - 1];
    const current = path[index];
    const next = path[index + 1];
    const deltaAnchor = { x: current.x - anchor.x, y: current.y - anchor.y };
    const deltaNext = { x: next.x - current.x, y: next.y - current.y };
    const isCollinear = deltaAnchor.x === deltaNext.x && deltaAnchor.y === deltaNext.y;
    const canSkip = isCollinear && isFlyCareNavSegmentVisible(anchor, next);
    if (!canSkip) {
      simplified.push({ ...current });
    }
  }
  simplified.push({ ...path[path.length - 1] });
  return dedupeFlyCareNavPathPoints(simplified);
}

function prepareFlyCareNavPathForRender(path: PositionPoint[]): PositionPoint[] {
  return simplifyFlyCareNavPathSafe(
    dedupeFlyCareNavPathPoints(expandFlyCareCorridorJumps(prependFlyCareSpineEntry(path)))
  );
}

export function getFlyCareGateTarget(gate: string | null | undefined): FlyCareGateTarget | null {
  if (!gate?.trim()) return null;
  const normalized = gate.trim().toUpperCase();
  const digits = normalized.replace(/[^0-9]/g, '');

  if (digits === '11' || normalized.includes('G11') || normalized.includes('GATE11') || normalized.includes('GATE 11')) {
    return 'boarding_gate_11';
  }
  if (digits === '10' || normalized.includes('G10') || normalized.includes('GATE10') || normalized.includes('GATE 10')) {
    return 'boarding_gate_10';
  }
  if (/\b11\b/.test(normalized) || normalized.endsWith('11')) {
    return 'boarding_gate_11';
  }
  if (/\b10\b/.test(normalized) || normalized.endsWith('10')) {
    return 'boarding_gate_10';
  }
  return null;
}

export type FlyCareNavRoute = {
  gateTarget: FlyCareGateTarget;
  gateLabel: string;
  startPoint: PositionPoint;
  endPoint: PositionPoint;
  pathPoints: PositionPoint[];
};

export type FlyCareRouteFailureReason =
  | 'missing_gate'
  | 'unsupported_gate'
  | 'already_at_gate'
  | 'no_path';

export function getFlyCareRouteFailureReason(
  currentCoords: PositionPoint | null,
  gate: string | null | undefined
): FlyCareRouteFailureReason | null {
  if (!currentCoords) {
    return 'no_path';
  }
  if (!gate?.trim()) {
    return 'missing_gate';
  }
  const gateTarget = getFlyCareGateTarget(gate);
  if (!gateTarget) {
    return 'unsupported_gate';
  }
  const startPoint = normalizeFlyCareMapCoords(currentCoords) ?? snapGridPoint(currentCoords);
  const endPoint = { ...FLYCARE_GATE_DESTINATIONS[gateTarget] };
  if (startPoint.x === endPoint.x && startPoint.y === endPoint.y) {
    return 'already_at_gate';
  }
  const navStart = resolveFlyCareNavStartPoint(startPoint);
  if (!navStart) {
    return 'no_path';
  }
  const rawPath = findFlyCareNavPath(navStart, endPoint);
  if (!rawPath || rawPath.length < 2) {
    return 'no_path';
  }
  return null;
}

export function buildFlyCareRoute(
  currentCoords: PositionPoint | null,
  gate: string | null | undefined
): FlyCareNavRoute | null {
  if (!currentCoords) return null;

  const gateTarget = getFlyCareGateTarget(gate);
  if (!gateTarget) return null;

  const userStart = normalizeFlyCareMapCoords(currentCoords) ?? snapGridPoint(currentCoords);
  const endPoint = { ...FLYCARE_GATE_DESTINATIONS[gateTarget] };
  if (userStart.x === endPoint.x && userStart.y === endPoint.y) {
    return null;
  }

  const navStart = resolveFlyCareNavStartPoint(userStart);
  if (!navStart) {
    return null;
  }

  const rawPath = findFlyCareNavPath(navStart, endPoint);
  if (!rawPath || rawPath.length < 2) {
    return null;
  }

  const pathPoints = prepareFlyCareNavPathForRender(rawPath);
  pathPoints[pathPoints.length - 1] = { ...endPoint };

  if (userStart.x === navStart.x && userStart.y === navStart.y) {
    pathPoints[0] = { ...userStart };
  } else if (isFlyCareNavSegmentVisible(userStart, navStart)) {
    pathPoints.unshift({ ...userStart });
  } else {
    pathPoints[0] = { ...navStart };
  }

  return {
    gateTarget,
    gateLabel: gate?.trim() ?? gateTarget,
    startPoint: userStart,
    endPoint,
    pathPoints
  };
}

const FLYCARE_PIN_LABEL_EDGE_MARGIN_PERCENT = 14;

/** Place pin name labels beside the dot, away from map edges. */
export function resolveFlyCarePinLabelSide(input: { leftPercent: number }): FlyCarePinLabelSide {
  if (input.leftPercent <= FLYCARE_PIN_LABEL_EDGE_MARGIN_PERCENT) {
    return 'right';
  }
  if (input.leftPercent >= 100 - FLYCARE_PIN_LABEL_EDGE_MARGIN_PERCENT) {
    return 'left';
  }
  return 'right';
}
