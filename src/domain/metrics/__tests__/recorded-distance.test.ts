import { hasRecordedDistance, MIN_RECORDED_DISTANCE_M } from '../recorded-distance';

describe('hasRecordedDistance', () => {
  it('needs at least 50 m', () => {
    expect(MIN_RECORDED_DISTANCE_M).toBe(50);
    expect(hasRecordedDistance(0)).toBe(false);
    expect(hasRecordedDistance(49.9)).toBe(false);
    expect(hasRecordedDistance(50)).toBe(true);
    expect(hasRecordedDistance(Number.NaN)).toBe(false);
  });
});
