import { isTap, zoneFromHits } from '../components/body3d/pick';

const hit = (zone?: string) => ({ object: { userData: zone ? { zone } : {} } });

describe('3D picking', () => {
  it('uses the first surface hit', () => {
    expect(zoneFromHits([hit('zone_knee_left'), hit('zone_calf_left')])).toEqual({
      region: 'knee',
      side: 'left',
    });
  });
  it('ignores the neutral body and empty hits', () => {
    expect(zoneFromHits([hit(), hit('zone_knee_left')])).toBeNull();
    expect(zoneFromHits([hit('body')])).toBeNull();
    expect(zoneFromHits([])).toBeNull();
  });
  it('tells taps from drags', () => {
    expect(isTap(3, 2, 120)).toBe(true);
    expect(isTap(30, 0, 120)).toBe(false);
    expect(isTap(0, 0, 900)).toBe(false);
  });
});
