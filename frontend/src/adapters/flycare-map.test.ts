import { describe, expect, it } from 'vitest';

import {
  buildFlyCareRoute,
  getFlyCareGateTarget,
  getFlyCareMandatoryWaypoints,
  getFlyCareZoneCenter
} from './flycare-map';

describe('flycare-map route helpers', () => {
  it('maps gate strings to FlyCare gate zones', () => {
    expect(getFlyCareGateTarget('10')).toBe('boarding_gate_1');
    expect(getFlyCareGateTarget('A11')).toBe('boarding_gate_1');
    expect(getFlyCareGateTarget('G12')).toBe('boarding_gate_2');
    expect(getFlyCareGateTarget('14')).toBe('boarding_gate_2');
    expect(getFlyCareGateTarget('B7')).toBeNull();
  });

  it('derives mandatory waypoints from zone centers', () => {
    const waypoints = getFlyCareMandatoryWaypoints();
    expect(waypoints.map((waypoint) => waypoint.id)).toEqual(['security_check', 'immigration']);
    expect(waypoints[0]?.point).toEqual(getFlyCareZoneCenter('security_check'));
    expect(waypoints[1]?.point).toEqual(getFlyCareZoneCenter('immigration'));
  });

  it('builds current to security to immigration to gate route', () => {
    const route = buildFlyCareRoute({ x: 4, y: 14 }, '12');
    expect(route?.gateZoneId).toBe('boarding_gate_2');
    expect(route?.waypoints.map((waypoint) => waypoint.id)).toEqual([
      'current',
      'security_check',
      'immigration',
      'boarding_gate_2'
    ]);
  });

  it('returns null when current point or gate is missing', () => {
    expect(buildFlyCareRoute(null, '12')).toBeNull();
    expect(buildFlyCareRoute({ x: 4, y: 14 }, '')).toBeNull();
  });
});
