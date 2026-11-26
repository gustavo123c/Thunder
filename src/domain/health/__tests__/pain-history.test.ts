import {
  type PainEpisode,
  painRecurrences,
  recurringPains,
  returningPainCount,
} from '../pain-history';

const now = new Date('2026-11-27T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

const episode = (
  id: string,
  region: PainEpisode['region'],
  side: PainEpisode['side'],
  days: number,
  intensity = 3,
  resolved = true,
): PainEpisode => ({
  id,
  region,
  side,
  intensity,
  createdAt: daysAgo(days),
  resolvedAt: resolved ? daysAgo(days - 1) : null,
});

const history = [
  episode('1', 'knee', 'right', 2, 6),
  episode('2', 'knee', 'right', 10, 3),
  episode('3', 'knee', 'right', 25, 4),
  episode('4', 'knee', 'left', 5),
  episode('5', 'calf', 'left', 40), // outside the 30-day window
  episode('6', 'calf', 'left', 45),
];

describe('pain history', () => {
  it('counts episodes per region and side in the last 30 days', () => {
    expect(painRecurrences(history, now)).toEqual([
      { region: 'knee', side: 'right', count: 3, lastAt: daysAgo(2), maxIntensity: 6 },
      { region: 'knee', side: 'left', count: 1, lastAt: daysAgo(5), maxIntensity: 3 },
    ]);
  });

  it('flags pains reported at least twice as recurring', () => {
    expect(recurringPains(history, now).map((r) => `${r.region}:${r.side}`)).toEqual([
      'knee:right',
    ]);
    expect(recurringPains(history, now, 60).map((r) => r.region)).toEqual(['knee', 'calf']);
  });

  it('recognizes a pain that comes back', () => {
    expect(returningPainCount(history, 'knee', 'right', now)).toBe(3);
    expect(returningPainCount(history, 'shin', 'left', now)).toBe(0);
  });

  it('an open pain is not a return', () => {
    const open = [...history, episode('7', 'knee', 'right', 0, 5, false)];
    expect(returningPainCount(open, 'knee', 'right', now)).toBe(0);
  });
});
