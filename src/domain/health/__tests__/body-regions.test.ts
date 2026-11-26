import { BODY_REGIONS, describeRegion, painLevel, REGION_INFO } from '../body-regions';

it('labels regions with side and grammatical gender', () => {
  expect(describeRegion('knee', 'left')).toBe('Joelho esquerdo');
  expect(describeRegion('calf', 'right')).toBe('Panturrilha direita');
  expect(describeRegion('quadriceps', 'left')).toBe('Coxa esquerda (frente)');
  expect(describeRegion('lower_back', 'center')).toBe('Lombar');
});

it('maps intensity to levels', () => {
  expect(painLevel(2)).toBe('mild');
  expect(painLevel(5)).toBe('moderate');
  expect(painLevel(9)).toBe('severe');
});

it('declares map views for regions (elbow and hip are list-only)', () => {
  for (const region of BODY_REGIONS) {
    if (region === 'elbow' || region === 'hip') continue;
    expect(REGION_INFO[region].views.length).toBeGreaterThan(0);
  }
});
