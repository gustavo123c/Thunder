import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import { parseRunDetail } from '@/services/supabase/run-json';
import detailFixture from '@/services/supabase/__tests__/fixtures/run-detail.json';

import { fetchRunDetail, RunNotFoundError } from '../api/runs.api';
import { RunDetailView } from '../components/RunDetailView';

jest.mock('@/components/map/RouteMap', () => ({ RouteMap: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('../api/runs.api', () => {
  const actual = jest.requireActual('../api/runs.api');
  return { ...actual, fetchRunDetail: jest.fn(), updateRun: jest.fn(), deleteRun: jest.fn() };
});
jest.mock('@/services/supabase/client', () => ({ supabase: {} }));

const mockedFetch = jest.mocked(fetchRunDetail);
const detail = parseRunDetail(detailFixture);
let queryClient: QueryClient;

async function renderDetail(viewerId: string) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <RunDetailView runId={detail.id} viewerId={viewerId} />
    </QueryClientProvider>,
  );
}

afterEach(() => queryClient.clear());

it('shows metrics, splits and the evolution insights to the owner', async () => {
  mockedFetch.mockResolvedValue(detail);
  await renderDetail(detail.userId);

  expect(await screen.findByText('Corrida matinal')).toBeOnTheScreen();
  expect(screen.getByLabelText('Distância: 3,59 km')).toBeOnTheScreen();
  expect(screen.getByText('Parciais')).toBeOnTheScreen();
  expect(screen.getByLabelText('Quilômetro 1: pace 5:33 por quilômetro')).toBeOnTheScreen();
  // Compared with the earlier 5 km run at 5:50 /km (not similar distance → no pace insight)
  expect(screen.getByText('Sua evolução')).toBeOnTheScreen();
  expect(screen.getByText('Novo recorde: seu quilômetro mais rápido.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /Visível para: Público/ })).toBeOnTheScreen();
});

it('hides owner-only sections from other athletes', async () => {
  mockedFetch.mockResolvedValue(detail);
  await renderDetail('someone-else');

  expect(await screen.findByText(/Ana Souza ·/)).toBeOnTheScreen();
  expect(screen.queryByText('Sua evolução')).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Apagar corrida' })).not.toBeOnTheScreen();
});

it('explains when a run is not available', async () => {
  mockedFetch.mockRejectedValue(new RunNotFoundError());
  await renderDetail(detail.userId);

  expect(await screen.findByText('Corrida não encontrada')).toBeOnTheScreen();
});
