import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import type { RunRecord } from '@/domain/types/run';

import { fetchUserRuns } from '../api/runs.api';
import { RunHistoryList } from '../components/RunHistoryList';

jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('../api/runs.api', () => ({
  ...jest.requireActual('../api/runs.api'),
  fetchUserRuns: jest.fn(),
}));

const run = (id: string, date: Date, km: number): RunRecord => ({
  id,
  userId: 'u1',
  title: `Corrida ${id}`,
  description: null,
  startedAt: date.toISOString(),
  endedAt: date.toISOString(),
  elapsedTimeS: km * 360,
  movingTimeS: km * 360,
  distanceM: km * 1000,
  avgPaceSPerKm: 360,
  bestPaceSPerKm: null,
  elevationGainM: null,
  caloriesKcal: null,
  visibility: 'public',
  kudosCount: 0,
  commentsCount: 0,
  route: [],
  media: [],
});

let queryClient: QueryClient;
afterEach(() => queryClient.clear());

it('groups the history by month with totals', async () => {
  jest
    .mocked(fetchUserRuns)
    .mockResolvedValue([
      run('a', new Date(2026, 10, 20, 7), 5),
      run('b', new Date(2026, 10, 2, 7), 3),
      run('c', new Date(2026, 9, 12, 7), 10),
    ]);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <RunHistoryList userId="u1" />
    </QueryClientProvider>,
  );

  expect(await screen.findByText('Novembro de 2026')).toBeOnTheScreen();
  expect(screen.getByText('Outubro de 2026')).toBeOnTheScreen();
  expect(screen.getByText(/2 corridas · 8,00 km/)).toBeOnTheScreen();
  expect(screen.getByText('Corrida c')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Apagar corrida Corrida a' })).toBeOnTheScreen();
});

it('shows a run without recorded distance with its time and a hint', async () => {
  jest.mocked(fetchUserRuns).mockResolvedValue([run('z', new Date(2026, 10, 20, 7), 0)]);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <RunHistoryList userId="u1" />
    </QueryClientProvider>,
  );

  expect(await screen.findByText('Sem distância registrada')).toBeOnTheScreen();
  expect(screen.getByText(/O GPS não registrou o trajeto/)).toBeOnTheScreen();
  expect(screen.queryByText('Distância')).not.toBeOnTheScreen();
});

it('shows the illustrated empty state with a call to action', async () => {
  jest.mocked(fetchUserRuns).mockResolvedValue([]);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <RunHistoryList userId="u1" />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Sua primeira rota começa aqui')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Fazer minha primeira corrida' })).toBeOnTheScreen();
});
