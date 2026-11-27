import {
  allRegionTargets,
  BODY_3D_REGIONS,
  expectedZoneNames,
  normalizeAngle,
  parseZoneName,
  shortestRotation,
  zoneName,
} from '../body-zones';

describe('body zones', () => {
  it('parses zone material names', () => {
    expect(parseZoneName('zone_it_band_left')).toEqual({ region: 'it_band', side: 'left' });
    expect(parseZoneName('zone_lower_back_center')).toEqual({
      region: 'lower_back',
      side: 'center',
    });
    expect(parseZoneName('body')).toBeNull();
    expect(parseZoneName('zone_elbowz_left')).toBeNull();
    expect(parseZoneName('zone_knee_up')).toBeNull();
  });

  it('round-trips names and lists the 21 zones of the model', () => {
    expect(zoneName({ region: 'knee', side: 'right' })).toBe('zone_knee_right');
    const names = expectedZoneNames();
    expect(names).toHaveLength(BODY_3D_REGIONS.length * 2 - 1);
    expect(names).toContain('zone_lower_back_center');
    expect(names).not.toContain('zone_lower_back_left');
    for (const name of names) expect(parseZoneName(name)).not.toBeNull();
  });

  it('turns the short way round', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
    // From 350° to 0° (front): +10°, not -350°.
    const from = (350 * Math.PI) / 180;
    expect(shortestRotation(from, 0) - from).toBeCloseTo((10 * Math.PI) / 180);
  });
});

describe('allRegionTargets', () => {
  it('lists both sides of bilateral regions and the center of the others', () => {
    const targets = allRegionTargets();
    expect(targets).toContainEqual({ region: 'it_band', side: 'left' });
    expect(targets).toContainEqual({ region: 'it_band', side: 'right' });
    expect(targets).toContainEqual({ region: 'chest', side: 'center' });
    expect(targets).not.toContainEqual({ region: 'chest', side: 'left' });
    expect(new Set(targets.map((t) => `${t.region}:${t.side}`)).size).toBe(targets.length);
  });
});
