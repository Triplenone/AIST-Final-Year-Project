/** Airport map zones and grid for FlyCare command center (12×16, aligned with FlyCare.png). */

import type { PositionPoint } from './position-command-center';

export type FlyCareZoneId =
  | 'boarding_gate_1'
  | 'boarding_gate_2'
  | 'restricted_area'
  | 'toilet'
  | 'immigration'
  | 'security_check'
  | 'non_restricted_area'
  | 'check_in_counter';

export type FlyCareZoneDefinition = {
  id: FlyCareZoneId;
  labelKey: string;
};

export type FlyCareRouteWaypoint = {
  id: 'current' | FlyCareZoneId;
  point: PositionPoint;
  labelKey: string;
};

export type FlyCareRoute = {
  gateZoneId: 'boarding_gate_1' | 'boarding_gate_2';
  waypoints: FlyCareRouteWaypoint[];
};

export const FLYCARE_GRID_COLUMNS = 12;
export const FLYCARE_GRID_ROWS = 16;
export const FLYCARE_MAP_PIXEL_WIDTH = 600;
export const FLYCARE_MAP_PIXEL_HEIGHT = 800;

/** Inclusive column spans on the 12-column grid (0-based). Immigration uses grid row 8 only. */
const IMMIGRATION_COLS = { start: 2, end: 9 } as const;
const SECURITY_COLS = { start: 3, end: 8 } as const;

export const FLYCARE_ZONES: readonly FlyCareZoneDefinition[] = [
  { id: 'boarding_gate_1', labelKey: 'flyCare.zone.boarding_gate_1' },
  { id: 'boarding_gate_2', labelKey: 'flyCare.zone.boarding_gate_2' },
  { id: 'restricted_area', labelKey: 'flyCare.zone.restricted_area' },
  { id: 'toilet', labelKey: 'flyCare.zone.toilet' },
  { id: 'immigration', labelKey: 'flyCare.zone.immigration' },
  { id: 'security_check', labelKey: 'flyCare.zone.security_check' },
  { id: 'non_restricted_area', labelKey: 'flyCare.zone.non_restricted_area' },
  { id: 'check_in_counter', labelKey: 'flyCare.zone.check_in_counter' }
];

function emptyRow(): string[] {
  return Array(FLYCARE_GRID_COLUMNS).fill(' ');
}

function fillRowSpan(
  row: string[],
  zoneId: string,
  colStart: number,
  colEndInclusive: number
): void {
  for (let col = colStart; col <= colEndInclusive; col += 1) {
    row[col] = zoneId;
  }
}

/** Rows 8–13: immigration (row 8 only) + buffer + security band. */
function buildImmigrationSecurityBand(): readonly (readonly string[])[] {
  const rows: string[][] = [];

  // Row 8 only — immigration (white block on map), wider than security below.
  const immigrationRow = emptyRow();
  fillRowSpan(immigrationRow, 'immigration', IMMIGRATION_COLS.start, IMMIGRATION_COLS.end);
  rows.push(immigrationRow);

  // Row 9: corridor below immigration, above security gap.
  const belowImmigrationRow = emptyRow();
  fillRowSpan(
    belowImmigrationRow,
    'restricted_area',
    IMMIGRATION_COLS.start,
    IMMIGRATION_COLS.end
  );
  rows.push(belowImmigrationRow);

  // Row 10: narrow walkway between immigration stack and pink security band.
  const gapRow = emptyRow();
  fillRowSpan(gapRow, 'non_restricted_area', SECURITY_COLS.start, SECURITY_COLS.end);
  rows.push(gapRow);

  // Rows 11–13: Security checkpoint (pink band).
  for (let i = 0; i < 3; i += 1) {
    const row = emptyRow();
    fillRowSpan(row, 'security_check', SECURITY_COLS.start, SECURITY_COLS.end);
    rows.push(row);
  }

  return rows;
}

/**
 * 12×16 grid over FlyCare.png (row 0 = top / gates, row 15 = bottom / check-in).
 * Immigration sits directly above security; security sits directly above check-in approach.
 */
export const FLYCARE_GRID_TO_ZONE: readonly (readonly string[])[] = [
  // row 0 – top edge
  [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
  // rows 1–3 – Gate 11, Gate 10, restrooms (top-left)
  [' ', 'toilet', 'toilet', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_1', 'restricted_area', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', ' ', ' '],
  [' ', 'toilet', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_1', 'boarding_gate_1', 'restricted_area', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', ' '],
  [' ', 'restricted_area', 'boarding_gate_1', 'boarding_gate_1', 'restricted_area', 'restricted_area', 'restricted_area', 'boarding_gate_2', 'boarding_gate_2', 'boarding_gate_2', 'restricted_area', ' '],
  // rows 4–6 – dining wings + central corridor (below immigration)
  [' ', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'non_restricted_area', 'non_restricted_area', 'non_restricted_area', ' '],
  [' ', 'non_restricted_area', 'non_restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'non_restricted_area', 'non_restricted_area', ' '],
  [' ', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', ' '],
  // row 7 – throat between dining and immigration
  [' ', 'non_restricted_area', 'non_restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'restricted_area', 'non_restricted_area', 'non_restricted_area', ' '],
  // rows 8–13 – immigration @ row 8 + security (11–13), see buildImmigrationSecurityBand
  ...buildImmigrationSecurityBand(),
  // rows 14–15 – check-in islands (bottom; Cookies Quartet on right in col 9–10)
  [' ', 'non_restricted_area', 'non_restricted_area', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'non_restricted_area', 'non_restricted_area', ' '],
  [' ', 'non_restricted_area', 'non_restricted_area', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'check_in_counter', 'non_restricted_area', 'non_restricted_area', ' ']
];

const FLYCARE_ZONE_CENTER_FALLBACKS: Readonly<Record<'security_check' | 'immigration' | 'boarding_gate_1' | 'boarding_gate_2', PositionPoint>> = {
  security_check: { x: 5, y: 12 },
  immigration: { x: 5, y: 8 },
  boarding_gate_1: { x: 4, y: 2 },
  boarding_gate_2: { x: 8, y: 2 }
};

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
    return FLYCARE_ZONE_CENTER_FALLBACKS[zoneId as keyof typeof FLYCARE_ZONE_CENTER_FALLBACKS] ?? null;
  }

  return {
    x: Math.round((minCol + maxCol) / 2),
    y: Math.round((minRow + maxRow) / 2)
  };
}

export function getFlyCareGateTarget(gate: string | number | null | undefined): 'boarding_gate_1' | 'boarding_gate_2' | null {
  const text = String(gate ?? '').trim().toUpperCase();
  if (!text) return null;
  if (/^(?:A|G)?(?:10|11)$/.test(text)) return 'boarding_gate_1';
  if (/^(?:A|G)?12$/.test(text)) return 'boarding_gate_2';
  const numeric = Number(text.replace(/^[A-Z]+/, ''));
  if (Number.isFinite(numeric) && numeric >= 12) return 'boarding_gate_2';
  return null;
}

export function getFlyCareMandatoryWaypoints(): FlyCareRouteWaypoint[] {
  const security = getFlyCareZoneCenter('security_check') ?? FLYCARE_ZONE_CENTER_FALLBACKS.security_check;
  const immigration = getFlyCareZoneCenter('immigration') ?? FLYCARE_ZONE_CENTER_FALLBACKS.immigration;
  return [
    { id: 'security_check', point: security, labelKey: 'flyCare.route.security' },
    { id: 'immigration', point: immigration, labelKey: 'flyCare.route.immigration' }
  ];
}

export function buildFlyCareRoute(current: PositionPoint | null, gate: string | number | null | undefined): FlyCareRoute | null {
  if (!current) return null;
  const gateZoneId = getFlyCareGateTarget(gate);
  if (!gateZoneId) return null;
  const gatePoint = getFlyCareZoneCenter(gateZoneId) ?? FLYCARE_ZONE_CENTER_FALLBACKS[gateZoneId];
  return {
    gateZoneId,
    waypoints: [
      { id: 'current', point: current, labelKey: 'flyCare.route.current' },
      ...getFlyCareMandatoryWaypoints(),
      { id: gateZoneId, point: gatePoint, labelKey: 'flyCare.route.gate' }
    ]
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
  const col = Math.min(FLYCARE_GRID_COLUMNS - 1, Math.max(0, Math.round(coords.x)));
  const row = Math.min(FLYCARE_GRID_ROWS - 1, Math.max(0, Math.round(coords.y)));
  const pixelX = ((col + 0.5) / FLYCARE_GRID_COLUMNS) * FLYCARE_MAP_PIXEL_WIDTH;
  const pixelY = ((row + 0.5) / FLYCARE_GRID_ROWS) * FLYCARE_MAP_PIXEL_HEIGHT;
  return {
    leftPercent: (pixelX / FLYCARE_MAP_PIXEL_WIDTH) * 100,
    topPercent: (pixelY / FLYCARE_MAP_PIXEL_HEIGHT) * 100
  };
}
