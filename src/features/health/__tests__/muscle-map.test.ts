import { BODY_REGIONS, REGION_INFO } from '@/domain/health/body-regions';
import { BODY_SEXES } from '@/domain/types/profile';

import { anatomicalSide, musclePaths, tappableRegions } from '../muscle-map';

const VIEWS = ['front', 'back'] as const;

describe('anatomicalSide', () => {
  it('mirrors the front view and keeps the back view', () => {
    expect(anatomicalSide('left', 'front')).toBe('right');
    expect(anatomicalSide('right', 'front')).toBe('left');
    expect(anatomicalSide('left', 'back')).toBe('left');
    expect(anatomicalSide('center', 'front')).toBe('center');
  });
});

describe('musclePaths', () => {
  it.each(BODY_SEXES.flatMap((sex) => VIEWS.map((view) => [sex, view] as const)))(
    '%s %s: only head and hair are decorative',
    (sex, view) => {
      const paths = musclePaths(sex, view);
      expect(paths.length).toBeGreaterThan(30);
      const decorative = paths.filter((p) => p.region === null);
      expect(decorative.length).toBeLessThanOrEqual(6);
    },
  );

  it.each(BODY_SEXES.flatMap((sex) => VIEWS.map((view) => [sex, view] as const)))(
    '%s %s: bilateral muscles exist on both sides, central ones in the middle',
    (sex, view) => {
      for (const { region, side } of tappableRegions(sex, view)) {
        if (REGION_INFO[region].bilateral) {
          expect({ region, side }).toEqual({ region, side: expect.stringMatching(/left|right/) });
          const mirror = side === 'left' ? 'right' : 'left';
          expect(
            tappableRegions(sex, view).some((r) => r.region === region && r.side === mirror),
          ).toBe(true);
        } else {
          expect(side).toBe('center');
        }
      }
    },
  );

  it('offers every region declared for each view', () => {
    for (const sex of BODY_SEXES) {
      for (const view of VIEWS) {
        const available = new Set(tappableRegions(sex, view).map((r) => r.region));
        for (const region of BODY_REGIONS) {
          if (!REGION_INFO[region].views.includes(view)) continue;
          // Female back drawing has no separate ankle shapes (Achilles).
          if (sex === 'female' && view === 'back' && region === 'achilles') continue;
          expect({ sex, view, region, ok: available.has(region) }).toEqual({
            sex,
            view,
            region,
            ok: true,
          });
        }
      }
    }
  });

  it('maps the front-view knee on the right of the screen to the left knee', () => {
    const knees = musclePaths('male', 'front').filter((p) => p.region === 'knee');
    expect(new Set(knees.map((k) => k.side))).toEqual(new Set(['left', 'right']));
  });
});
