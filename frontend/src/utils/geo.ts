export type LatLng = {
  lat: number;
  lng: number;
};

export type LatLngTuple = [number, number]; // [lat, lng] for Leaflet

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const parseFloatSafe = (value: string): number | null => {
  const n = Number.parseFloat(value.trim());
  return Number.isFinite(n) ? n : null;
};

type RawPair = { a: number; b: number };

const inferOrder = (pairs: RawPair[]): 'lnglat' | 'latlng' => {
  // Heuristic:
  // - Latitude must be within [-90, 90]
  // - Longitude is within [-180, 180] and often exceeds 90 (e.g., 116.xxx)
  // If we see many pairs where a looks like longitude and b looks like latitude -> lnglat.
  // If reversed -> latlng.
  let lnglatVotes = 0;
  let latlngVotes = 0;

  for (const { a, b } of pairs) {
    const aAbs = Math.abs(a);
    const bAbs = Math.abs(b);
    const aCouldBeLat = aAbs <= 90;
    const bCouldBeLat = bAbs <= 90;
    const aCouldBeLng = aAbs <= 180;
    const bCouldBeLng = bAbs <= 180;

    if (aCouldBeLng && bCouldBeLat && aAbs > 90 && bAbs <= 90) {
      lnglatVotes += 2;
      continue;
    }
    if (bCouldBeLng && aCouldBeLat && bAbs > 90 && aAbs <= 90) {
      latlngVotes += 2;
      continue;
    }

    // Soft votes when both are plausible
    if (aCouldBeLng && bCouldBeLat) lnglatVotes += 1;
    if (bCouldBeLng && aCouldBeLat) latlngVotes += 1;
  }

  return latlngVotes > lnglatVotes ? 'latlng' : 'lnglat';
};

export type CoordinateMode = 'geo' | 'indoor';

/**
 * Parse `LocationZone.geofence_coordinates` into a polygon.
 *
 * - geo mode: expected "lng,lat;lng,lat;lng,lat"
 * - indoor mode: expected "x,y; x,y; ..." mapped to lng=x, lat=y (pixel coords)
 */
export function parseGeofenceCoordinates(input?: string | null, mode: CoordinateMode = 'geo'): LatLng[] | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  const rawPairs: RawPair[] = [];

  for (const token of raw.split(';')) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',').map((p) => p.trim());
    if (parts.length < 2) continue;
    const a = parseFloatSafe(parts[0]);
    const b = parseFloatSafe(parts[1]);
    if (a === null || b === null) continue;
    rawPairs.push({ a, b });
  }

  if (rawPairs.length < 3) return null;

  if (mode === 'indoor') {
    const points = rawPairs
      .map(({ a, b }) => ({ lng: a, lat: b }))
      .filter((p) => isFiniteNumber(p.lat) && isFiniteNumber(p.lng));
    return points.length >= 3 ? points : null;
  }

  const order = inferOrder(rawPairs);
  const points: LatLng[] = rawPairs
    .map(({ a, b }) => (order === 'lnglat' ? { lng: a, lat: b } : { lng: b, lat: a }))
    .filter((p) => isFiniteNumber(p.lat) && isFiniteNumber(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);

  return points.length >= 3 ? points : null;
}

export function toLatLngTuple(point: LatLng): LatLngTuple {
  return [point.lat, point.lng];
}

export function getPolygonBounds(points: LatLng[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const { lat, lng } of points) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(maxLat) || !Number.isFinite(minLng) || !Number.isFinite(maxLng)) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  return { minLat, maxLat, minLng, maxLng };
}

export function getPolygonBoundsTuple(points: LatLng[]): [LatLngTuple, LatLngTuple] {
  const { minLat, maxLat, minLng, maxLng } = getPolygonBounds(points);
  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ];
}

/**
 * Polygon centroid (planar approximation).
 * Uses lng as x, lat as y. Good enough for small areas.
 */
export function getPolygonCentroid(points: LatLng[]): LatLng {
  if (points.length === 0) return { lat: 0, lng: 0 };
  if (points.length === 1) return points[0];

  // Ensure closed ring for centroid formula.
  const ring = points[0].lat === points.at(-1)?.lat && points[0].lng === points.at(-1)?.lng ? points : [...points, points[0]];

  let twiceArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const p0 = ring[i];
    const p1 = ring[i + 1];
    const x0 = p0.lng;
    const y0 = p0.lat;
    const x1 = p1.lng;
    const y1 = p1.lat;
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  const area = twiceArea / 2;
  if (!Number.isFinite(area) || Math.abs(area) < 1e-12) {
    // Fallback: average
    const sum = points.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 }
    );
    return { lat: sum.lat / points.length, lng: sum.lng / points.length };
  }

  const factor = 1 / (6 * area);
  return { lng: cx * factor, lat: cy * factor };
}

export function getPolygonCentroidTuple(points: LatLng[]): LatLngTuple {
  return toLatLngTuple(getPolygonCentroid(points));
}

