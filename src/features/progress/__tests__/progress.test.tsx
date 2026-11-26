import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { comparePeriods, computeWinStreak } from '@/domain/insights/activity';
import type { ActivityItem } from '@/services/supabase/run-json';

import { fetchActivity } from '../api/activity.api';
import { fetchUnlockedAchievements, unlockAchievements } from '../api/achievements.api';
import { AchievementsGrid } from '../components/AchievementsGrid';
import { RunCelebration } from '../components/RunCelebration';
import { GoalProgressCard } from '../components/GoalProgressCard';
import { PersonalRecords } from '../components/PersonalRecords';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { WinStreakCard } from '../components/WinStreakCard';
import { describeProgress, describeStreakCounts, formatPercent } from '../progress-copy';

jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
jest.mock('../api/activity.api', () => ({ fetchActivity: jest.fn() }));
jest.mock('../api/achievements.api', () => ({
  fetchUnlockedAchievements: jest.fn().mockResolvedValue([]),
  unlockAchievements: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const daysAgo = (days: number, paceS = 360, km = 5): ActivityItem => {
  const date = new Date();
  date.setHours(7, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return {
    id: `r${days}`,
    startedAt: date.toISOString(),
    distanceM: km * 1000,
    movingTimeS: km * paceS,
  };
};

describe('progress copy', () => {
  it('formats signed percentages in pt-BR', () => {
    expect(formatPercent(12)).toBe('+12%');
    expect(formatPercent(-3.5)).toBe('-3,5%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('summarizes week and month counts', () => {
    const now = new Date(2026, 10, 25, 18);
    const streak = computeWinStreak(
      [
        { startedAt: new Date(2026, 10, 24).toISOString(), distanceM: 5000, movingTimeS: 1800 },
        { startedAt: new Date(2026, 10, 5).toISOString(), distanceM: 5000, movingTimeS: 1800 },
      ],
      now,
    );
    expect(describeStreakCounts(streak)).toBe('1 treino esta semana | 2 no mês');
  });

  it('celebrates a faster pace and stays kind about a slower one', () => {
    const now = new Date(2026, 10, 25, 18);
    const at = (d: number) => new Date(2026, 10, d, 7).toISOString();
    const faster = comparePeriods(
      [
        { startedAt: at(17), distanceM: 5000, movingTimeS: 2000 },
        { startedAt: at(24), distanceM: 5000, movingTimeS: 1800 },
      ],
      'week',
      now,
    );
    expect(describeProgress(faster)).toEqual({
      text: 'Você melhorou 10% no seu pace de corrida em relação à semana passada.',
      tone: 'positive',
    });

    const slower = comparePeriods(
      [
        { startedAt: at(17), distanceM: 5000, movingTimeS: 1800 },
        { startedAt: at(24), distanceM: 5000, movingTimeS: 1980 },
      ],
      'week',
      now,
    );
    expect(describeProgress(slower).tone).toBe('negative');
    expect(describeProgress(slower).text).toMatch(/10% mais lento que na semana passada/);
  });

  it('invites to run when the period is empty', () => {
    const empty = comparePeriods([], 'month', new Date());
    expect(describeProgress(empty).text).toMatch(/Nenhuma corrida neste mês/);
  });
});

describe('progress components', () => {
  let queryClient: QueryClient;

  async function renderWithQuery(node: React.ReactElement) {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    await render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
  }

  afterEach(() => queryClient.clear());

  it('shows the win streak', async () => {
    jest.mocked(fetchActivity).mockResolvedValue([daysAgo(0), daysAgo(7), daysAgo(14)]);
    await renderWithQuery(<WinStreakCard userId="u1" />);
    expect(await screen.findByText('semanas seguidas')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('switches dashboard periods', async () => {
    jest.mocked(fetchActivity).mockResolvedValue([daysAgo(0, 300), daysAgo(365, 330)]);
    await renderWithQuery(<ProgressDashboard userId="u1" />);

    expect(await screen.findByText('Desempenho')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('tab', { name: 'Ano' }));
    expect(screen.getByRole('tab', { name: 'Ano' })).toBeSelected();
    expect(
      await screen.findByText(/no seu pace de corrida em relação ao ano passado/),
    ).toBeOnTheScreen();
  });

  it('shows personal records', async () => {
    jest
      .mocked(fetchActivity)
      .mockResolvedValue([daysAgo(1, 300, 3), daysAgo(3, 330, 10), daysAgo(5, 320, 5)]);
    await renderWithQuery(<PersonalRecords userId="u1" />);

    expect(await screen.findByText('Melhor pace')).toBeOnTheScreen();
    expect(screen.getByText('5:00')).toBeOnTheScreen(); // 3 km at 5:00
    expect(screen.getByText('10,00')).toBeOnTheScreen(); // longest run
    expect(screen.getByText('26:40')).toBeOnTheScreen(); // 5 km at 5:20
  });

  it('shows medals, locked ones with progress, and stores newly earned ones', async () => {
    jest.mocked(fetchActivity).mockResolvedValue([daysAgo(0), daysAgo(7), daysAgo(14)]);
    jest
      .mocked(fetchUnlockedAchievements)
      .mockResolvedValue([{ id: 'first_run', unlockedAt: '2026-01-01T00:00:00Z' }]);
    await renderWithQuery(<AchievementsGrid userId="u1" totals={{ runs: 3, distanceM: 15_000 }} />);
    // first run, first 5K, 3-week streak
    expect(await screen.findByText(/de 12 medalhas conquistadas/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Primeira corrida\. Conquistada/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^50 km acumulados\. Bloqueada, 30% concluída/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Meia maratona\. Bloqueada/)).toBeOnTheScreen();
    await waitFor(() =>
      expect(unlockAchievements).toHaveBeenCalledWith('u1', ['first_5k', 'streak_3'], null),
    );
  });

  it('celebrates a finished run with new medals and highlights', async () => {
    jest.mocked(unlockAchievements).mockClear();
    jest.mocked(fetchUnlockedAchievements).mockResolvedValue([]);
    jest.mocked(fetchActivity).mockResolvedValue([daysAgo(0, 330, 8)]);
    await renderWithQuery(<RunCelebration userId="u1" runId="r0" visible onClose={jest.fn()} />);

    expect(await screen.findByText('Corrida concluída!')).toBeOnTheScreen();
    expect(await screen.findByText('Novas medalhas')).toBeOnTheScreen();
    expect(screen.getByText('Primeira corrida')).toBeOnTheScreen();
    expect(screen.getByText('Primeiros 5 km')).toBeOnTheScreen();
    expect(
      screen.getByText('Faltam 2,0 km na sua maior corrida para a medalha Primeiros 10 km!'),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(unlockAchievements).toHaveBeenCalledWith('u1', ['first_run', 'first_5k'], 'r0'),
    );
  });

  it('shows the main goal progress bar', async () => {
    jest.mocked(fetchActivity).mockResolvedValue([daysAgo(2, 360, 2.5)]);
    await renderWithQuery(
      <GoalProgressCard
        userId="u1"
        goal="complete_5k"
        goalTitle="Completar 5 km"
        goalDescription=""
        targetPaceSPerKm={null}
      />,
    );
    expect(await screen.findByText('50%')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    expect(screen.getByText('Maior corrida: 2,50 km de 5,00 km')).toBeOnTheScreen();
  });
});
