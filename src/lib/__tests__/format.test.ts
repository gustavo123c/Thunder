import {
  formatRest,
  formatDecimal,
  formatMonthYear,
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatPaceValue,
  formatPaceDelta,
  formatPaceTrack,
  formatRunDate,
  formatShortDistance,
  formatWeightKg,
} from '../format';

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

describe('formatPaceValue', () => {
  it('omits the unit (used to prefill inputs)', () => {
    expect(formatPaceValue(330)).toBe('5:30');
    expect(formatPaceValue(null)).toBe('--');
  });
});

describe('formatWeightKg', () => {
  it('uses a comma and at most one decimal', () => {
    expect(formatWeightKg(72.5)).toBe('72,5 kg');
    expect(formatWeightKg(80)).toBe('80 kg');
    expect(formatWeightKg(72.46)).toBe('72,5 kg');
    expect(formatWeightKg(null)).toBe('--');
  });
});

describe('formatRunDate', () => {
  const now = new Date(2026, 10, 25, 20, 0); // 25 Nov 2026, 20:00 local

  it('uses Hoje / Ontem for recent runs', () => {
    expect(formatRunDate(new Date(2026, 10, 25, 9, 5).toISOString(), now)).toBe('Hoje às 09:05');
    expect(formatRunDate(new Date(2026, 10, 24, 18, 30).toISOString(), now)).toBe('Ontem às 18:30');
  });

  it('shows day and month this year, and the year otherwise', () => {
    expect(formatRunDate(new Date(2026, 10, 2, 7, 0).toISOString(), now)).toBe(
      '2 de nov. às 07:00',
    );
    expect(formatRunDate(new Date(2025, 0, 3, 7, 0).toISOString(), now)).toBe('3 de jan. de 2025');
  });

  it('handles invalid input', () => {
    expect(formatRunDate('nope', now)).toBe('--');
  });
});

describe('formatPaceDelta / formatShortDistance', () => {
  it('describes pace differences', () => {
    expect(formatPaceDelta(-15)).toBe('15 s/km mais rápido');
    expect(formatPaceDelta(72)).toBe('1:12 /km mais lento');
  });

  it('switches units at 1 km', () => {
    expect(formatShortDistance(850)).toBe('850 m');
    expect(formatShortDistance(5230)).toBe('5,23 km');
  });
});

describe('formatPaceTrack', () => {
  it('uses the running-watch notation', () => {
    expect(formatPaceTrack(330)).toBe(`5'30"`);
    expect(formatPaceTrack(605)).toBe(`10'05"`);
    expect(formatPaceTrack(null)).toBe("--'--");
  });
});

describe('formatMonthYear / formatDecimal', () => {
  it('formats month and year in pt-BR', () => {
    expect(formatMonthYear(new Date(2026, 10, 3))).toBe('Novembro de 2026');
  });
  it('formats decimals with a comma', () => {
    expect(formatDecimal(22.94)).toBe('22,9');
    expect(formatDecimal(null)).toBe('--');
  });
});

describe('formatRest', () => {
  it('formats rest like a running coach', () => {
    expect(formatRest(45)).toBe('45 s');
    expect(formatRest(90)).toBe('1:30');
    expect(formatRest(120)).toBe('2:00');
  });
});
