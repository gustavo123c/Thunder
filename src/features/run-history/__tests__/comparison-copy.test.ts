import { compareWithHistory } from '@/domain/insights/comparison';
import type { RunHistoryEntry } from '@/domain/types/run';

import { nextCursor, RUNS_PAGE_SIZE } from '../api/runs.api';
import { describeComparison } from '../comparison-copy';

jest.mock('@/services/supabase/client', () => ({ supabase: {} }));

const entry = (partial: Partial<RunHistoryEntry>): RunHistoryEntry => ({
  id: Math.random().toString(),
  startedAt: '2026-11-20T09:00:00Z',
  distanceM: 5000,
  movingTimeS: 1800,
  avgPaceSPerKm: 360,
  bestPaceSPerKm: 340,
  ...partial,
});

describe('describeComparison', () => {
  it('welcomes the first run', () => {
    const [insight] = describeComparison(compareWithHistory(entry({}), []));
    expect(insight?.text).toMatch(/Primeira corrida/);
  });

  it('lists records first, then pace and distance trends', () => {
    const comparison = compareWithHistory(
      entry({ distanceM: 6000, avgPaceSPerKm: 330, bestPaceSPerKm: 320 }),
      [entry({ distanceM: 5500, avgPaceSPerKm: 345, bestPaceSPerKm: 330 })],
    );
    expect(describeComparison(comparison).map((i) => i.text)).toEqual([
      'Sua corrida mais longa até agora!',
      'Novo recorde: seu quilômetro mais rápido.',
      '15 s/km mais rápido que a média de 1 corrida parecida.',
      '500 m a mais que a corrida anterior.',
    ]);
  });

  it('stays encouraging on a slower day', () => {
    const comparison = compareWithHistory(entry({ avgPaceSPerKm: 400, bestPaceSPerKm: 390 }), [
      entry({ avgPaceSPerKm: 360 }),
      entry({ avgPaceSPerKm: 360 }),
    ]);
    const [insight] = describeComparison(comparison);
    expect(insight).toEqual({
      emoji: '🧘',
      text: '40 s/km mais lento que a média de 2 corridas parecidas.',
      tone: 'neutral',
    });
  });
});

describe('nextCursor', () => {
  const page = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      startedAt: `2026-11-${10 + i}`,
    })) as never[];

  it('continues after the last item of a full page', () => {
    expect(nextCursor(page(RUNS_PAGE_SIZE))).toEqual({
      before: `2026-11-${10 + RUNS_PAGE_SIZE - 1}`,
      beforeId: `r${RUNS_PAGE_SIZE - 1}`,
    });
  });

  it('stops after a partial page', () => {
    expect(nextCursor(page(3))).toBeNull();
    expect(nextCursor([])).toBeNull();
  });
});
