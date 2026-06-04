import { describe, expect, it } from 'vitest';

import {
  buildFlyCareRoute,
  FLYCARE_BAND_CROSSING_LANE,
  FLYCARE_GATE_DESTINATIONS,
  getFlyCareGateTarget,
  getFlyCareRouteFailureReason,
  getFlyCareZoneAnchorPoint,
  getFlyCareZoneCenter,
  getFlyCareZoneFromCoords,
  isFlyCareNavSegmentVisible,
  isFlyCareOrthogonalSegmentWalkable,
  normalizeFlyCareMapCoords,
  resolveFlyCarePinLabelSide
} from './flycare-map';

describe('flycare-map helpers', () => {
  it('pins gate anchors to fixed grid cells', () => {
    expect(getFlyCareZoneAnchorPoint('boarding_gate_11')).toEqual({ x: 4, y: 1 });
    expect(getFlyCareZoneAnchorPoint('boarding_gate_10')).toEqual({ x: 8, y: 1 });
    expect(getFlyCareZoneCenter('boarding_gate_11')).toEqual({ x: 4, y: 1 });
    expect(getFlyCareZoneCenter('boarding_gate_10')).toEqual({ x: 8, y: 1 });
  });

  it('snaps device coordinates to grid cells', () => {
    expect(normalizeFlyCareMapCoords({ x: 4.2, y: 14.6 })).toEqual({ x: 4, y: 15 });
  });

  it('resolves zone ids from grid coordinates', () => {
    expect(getFlyCareZoneFromCoords({ x: 6, y: 8 })).toBe('immigration');
    expect(getFlyCareZoneFromCoords({ x: 4, y: 1 })).toBe('boarding_gate_11');
  });

  it('flips pin labels near map edges', () => {
    expect(resolveFlyCarePinLabelSide({ leftPercent: 8 })).toBe('right');
    expect(resolveFlyCarePinLabelSide({ leftPercent: 92 })).toBe('left');
    expect(resolveFlyCarePinLabelSide({ leftPercent: 50 })).toBe('right');
  });

  it('parses gate labels for boarding destinations', () => {
    expect(getFlyCareGateTarget('11')).toBe('boarding_gate_11');
    expect(getFlyCareGateTarget('G10')).toBe('boarding_gate_10');
    expect(getFlyCareGateTarget('Gate 11')).toBe('boarding_gate_11');
    expect(getFlyCareGateTarget(null)).toBeNull();
  });

  it('builds an orthogonal route from immigration to gate 11', () => {
    const route = buildFlyCareRoute({ x: 6, y: 8 }, '11');
    expect(route).not.toBeNull();
    expect(route?.endPoint).toEqual(FLYCARE_GATE_DESTINATIONS.boarding_gate_11);
    expect(route?.pathPoints[0]).toEqual({ x: 6, y: 8 });
    expect(route?.pathPoints.at(-1)).toEqual({ x: 4, y: 1 });

    for (let index = 1; index < (route?.pathPoints.length ?? 0); index += 1) {
      const previous = route!.pathPoints[index - 1];
      const current = route!.pathPoints[index];
      const isOrthogonal = previous.x === current.x || previous.y === current.y;
      expect(isOrthogonal).toBe(true);
    }
  });

  it('routes through corridor hub instead of cutting vertically through shops', () => {
    const route = buildFlyCareRoute({ x: 4, y: 8 }, 'G11');
    expect(route).not.toBeNull();
    const points = route!.pathPoints;
    expect(route?.startPoint).toEqual({ x: 4, y: 8 });
    expect(points.at(-1)).toEqual({ x: 4, y: 1 });
    expect(points.some((point) => point.x === 6 && point.y === 8)).toBe(true);
    expect(isFlyCareOrthogonalSegmentWalkable({ x: 4, y: 8 }, { x: 4, y: 1 })).toBe(false);
  });

  it('uses band crossing lane waypoints for restricted-band jumps', () => {
    const route = buildFlyCareRoute({ x: 6, y: 8 }, '11');
    const laneKeys = new Set(
      FLYCARE_BAND_CROSSING_LANE.map((point) => `${point.x}:${point.y}`)
    );
    expect(route?.pathPoints.some((point) => laneKeys.has(`${point.x}:${point.y}`))).toBe(true);
  });

  it('builds a route from adjacent immigration cell to gate 11', () => {
    const route = buildFlyCareRoute({ x: 4, y: 8 }, 'G11');
    expect(route?.endPoint).toEqual({ x: 4, y: 1 });
  });

  it('returns null when gate is missing or resident is already at destination', () => {
    expect(buildFlyCareRoute({ x: 5, y: 8 }, null)).toBeNull();
    expect(buildFlyCareRoute({ x: 4, y: 1 }, '11')).toBeNull();
    expect(buildFlyCareRoute({ x: 8, y: 1 }, '10')).toBeNull();
    expect(getFlyCareRouteFailureReason({ x: 8, y: 1 }, '10')).toBe('already_at_gate');
  });

  it('builds a route from post-customs restricted cell (11,6)', () => {
    expect(getFlyCareZoneFromCoords({ x: 11, y: 6 })).toBe('restricted_area');
    const route = buildFlyCareRoute({ x: 11, y: 6 }, '10');
    expect(route).not.toBeNull();
    expect(route?.startPoint).toEqual({ x: 11, y: 6 });
    expect(route?.pathPoints[0]).toEqual({ x: 11, y: 6 });
    expect(route?.endPoint).toEqual(FLYCARE_GATE_DESTINATIONS.boarding_gate_10);
    expect(getFlyCareRouteFailureReason({ x: 11, y: 6 }, '10')).toBeNull();
  });
});
