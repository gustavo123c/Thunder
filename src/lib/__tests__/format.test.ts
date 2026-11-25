import { formatDistanceKm, formatDuration, formatPace } from '../format';

describe('formatDuration', () => {
  it('formats minutes and seconds under an hour', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(1834)).toBe('30:34');
  });

  it('includes hours when needed', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('drops fractional seconds', () => {
    expect(formatDuration(59.9)).toBe('00:59');
  });

  it('returns a placeholder for invalid input', () => {
    expect(formatDuration(-1)).toBe('--');
    expect(formatDuration(Number.NaN)).toBe('--');
  });
});

describe('formatPace', () => {
  it('formats seconds per km as m:ss', () => {
    expect(formatPace(330)).toBe('5:30 /km');
    expect(formatPace(305.4)).toBe('5:05 /km');
  });

  it('rounds up to the next minute without producing :60', () => {
    expect(formatPace(359.6)).toBe('6:00 /km');
  });

  it('returns a placeholder when pace is unknown', () => {
    expect(formatPace(null)).toBe('-- /km');
    expect(formatPace(0)).toBe('-- /km');
    expect(formatPace(Number.POSITIVE_INFINITY)).toBe('-- /km');
  });
});

describe('formatDistanceKm', () => {
  it('uses a comma as decimal separator', () => {
    expect(formatDistanceKm(5230)).toBe('5,23 km');
  });

  it('truncates instead of rounding up', () => {
    expect(formatDistanceKm(4999)).toBe('4,99 km');
  });

  it('returns a placeholder for invalid input', () => {
    expect(formatDistanceKm(-10)).toBe('-- km');
  });
});
