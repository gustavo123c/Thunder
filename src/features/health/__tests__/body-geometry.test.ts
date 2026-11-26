import { BODY_REGIONS, REGION_INFO } from '@/domain/health/body-regions';
import { BODY_SEXES } from '@/domain/types/profile';

import { BODY_VIEWBOX, bodyHotspots } from '../body-geometry';

describe('bodyHotspots', () => {
  it.each(BODY_SEXES)('%s: every region is tappable on each side in its views', (sex) => {
    for (const region of BODY_REGIONS) {
      const { views, bilateral } = REGION_INFO[region];
      for (const view of views) {
        const keys = bodyHotspots(sex, view)
          .filter((h) => h.region === region)
          .map((h) => h.side)
          .sort();
        expect({ region, view, sides: keys }).toEqual({
          region,
          view,
          sides: bilateral ? ['left', 'right'] : ['center'],
        });
      }
    }
  });

  it('mirrors sides: front view shows the left side on the viewer right', () => {
    const front = bodyHotspots('male', 'front').find((h) => h.key === 'knee:left');
    const back = bodyHotspots('male', 'back').find((h) => h.key === 'ankle:left');
    expect(front?.shape.cx).toBeGreaterThan(100);
    expect(back?.shape.cx).toBeLessThan(100);
  });

  it('keeps every hotspot inside the drawing', () => {
    for (const sex of BODY_SEXES) {
      for (const view of ['front', 'back'] as const) {
        for (const { shape } of bodyHotspots(sex, view)) {
          expect(shape.cx).toBeGreaterThan(0);
          expect(shape.cx).toBeLessThan(BODY_VIEWBOX.width);
          expect(shape.cy).toBeLessThan(BODY_VIEWBOX.height);
        }
      }
    }
  });

  it('draws different proportions for male and female models', () => {
    const shoulder = (sex: 'male' | 'female') =>
      bodyHotspots(sex, 'front').find((h) => h.key === 'shoulder:left')?.shape.cx;
    const hip = (sex: 'male' | 'female') =>
      bodyHotspots(sex, 'front').find((h) => h.key === 'hip:left')?.shape.cx;
    expect(shoulder('male')).toBeGreaterThan(shoulder('female')!);
    expect(hip('female')).toBeGreaterThan(hip('male')!);
  });
});
