import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PainMapSection } from '@/features/health';
import { fetchOpenPains, resolvePain, setPain } from '@/features/health/api/pain.api';

import { fetchRecentWorkouts, saveWorkout } from '../api/workouts.api';
import { WorkoutBuilder } from '../components/WorkoutBuilder';

jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock('../api/workouts.api', () => ({
  saveWorkout: jest.fn(),
  fetchRecentWorkouts: jest.fn(),
  deleteWorkout: jest.fn(),
}));
jest.mock('@/features/health/api/pain.api', () => ({
  fetchOpenPains: jest.fn(),
  setPain: jest.fn(),
  resolvePain: jest.fn(),
}));

let queryClient: QueryClient;

async function renderWithQuery(node: React.ReactElement) {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  await render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(saveWorkout).mockResolvedValue(undefined);
  jest.mocked(fetchRecentWorkouts).mockResolvedValue([]);
});
afterEach(() => queryClient.clear());

describe('WorkoutBuilder', () => {
  it('generates a structured running workout and saves it', async () => {
    const user = userEvent.setup();
    await renderWithQuery(
      <WorkoutBuilder userId="u1" defaultLevel="beginner" pains={[]} recentPaceSPerKm={390} />,
    );

    expect(screen.getByText('6:30 /km')).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Tiros' }));
    await user.press(screen.getByRole('radio', { name: '30 min' }));
    await user.press(screen.getByRole('button', { name: 'Gerar treino' }));

    expect(await screen.findByText('Ficha de treino de corrida')).toBeOnTheScreen();
    expect(screen.getAllByText('Tiros de 200 m').length).toBeGreaterThan(0);
    expect(screen.getByText('Aquecimento')).toBeOnTheScreen();
    expect(screen.getByText('Desaquecimento')).toBeOnTheScreen();
    // 6:30 /km - 55 s = 5:35 /km → 200 m in ≈ 1:05
    expect(screen.getByText(/5:35 \/km · ≈ 1:05 por tiro/)).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Aviso importante sobre sua saúde').length).toBeGreaterThan(0);
    expect(saveWorkout).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ type: 'intervals', durationMin: 30, level: 'beginner' }),
      expect.objectContaining({ title: 'Tiros de 200 m', sessionType: 'intervals' }),
    );

    await user.press(screen.getByRole('button', { name: 'Iniciar este treino' }));
    expect(router.navigate).toHaveBeenCalledWith('/record');

    await user.press(screen.getByRole('button', { name: 'Montar outro treino' }));
    expect(screen.getByRole('button', { name: 'Gerar treino' })).toBeOnTheScreen();
  });

  it('gives a long run enough time', async () => {
    const user = userEvent.setup();
    await renderWithQuery(
      <WorkoutBuilder userId="u1" defaultLevel="intermediate" pains={[]} recentPaceSPerKm={360} />,
    );
    await user.press(screen.getByRole('radio', { name: 'Longão' }));
    expect(screen.getByRole('radio', { name: '60 min' })).toBeChecked();
  });

  it('lowers the load for moderate pain', async () => {
    await renderWithQuery(
      <WorkoutBuilder
        userId="u1"
        defaultLevel="intermediate"
        pains={[{ region: 'knee', side: 'left', intensity: 6 }]}
        recentPaceSPerKm={360}
      />,
    );

    expect(screen.getByText('Joelho esquerdo')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Gerar treino' }));

    expect(await screen.findByText('Adaptado para você')).toBeOnTheScreen();
    expect(screen.getByText(/Treino de tiros trocado por/)).toBeOnTheScreen();
    expect(screen.getByText(/Volume da parte principal reduzido em 40%/)).toBeOnTheScreen();
    expect(screen.getByText('60%')).toBeOnTheScreen(); // load stat
  });

  it('suspends running for severe leg pain', async () => {
    await renderWithQuery(
      <WorkoutBuilder
        userId="u1"
        defaultLevel="intermediate"
        pains={[{ region: 'knee', side: 'left', intensity: 9 }]}
        recentPaceSPerKm={null}
      />,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Gerar treino' }));

    expect(await screen.findByText('Recuperação: sem corrida hoje')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Iniciar este treino' })).not.toBeOnTheScreen();
    // The health notice is a collapsible banner: expand it to read the full text.
    await userEvent.setup().press(screen.getAllByLabelText('Aviso importante sobre sua saúde')[0]!);
    expect(screen.getByText(/especialmente agora que você relatou dor/)).toBeOnTheScreen();
  });
});

describe('PainMapSection', () => {
  it('records pain when a body region is tapped', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchOpenPains).mockResolvedValue([]);
    jest.mocked(setPain).mockResolvedValue(undefined);
    await renderWithQuery(<PainMapSection userId="u1" sex="female" />);

    expect(await screen.findByText('Nenhuma dor registrada.')).toBeOnTheScreen();
    await user.press(await screen.findByRole('button', { name: 'Escolher pela lista' }));
    await user.press(screen.getByRole('button', { name: 'Joelho esquerdo' }));
    expect(
      await screen.findByText('Como está a dor ou desconforto nesta região?'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: /Moderada/ }));

    await waitFor(() => expect(setPain).toHaveBeenCalledWith('u1', undefined, 'knee', 'left', 6));
  });

  it('lists open pains and offers to clear them', async () => {
    const user = userEvent.setup();
    jest
      .mocked(fetchOpenPains)
      .mockResolvedValue([
        { id: 'p1', region: 'lower_back', side: 'center', intensity: 3, createdAt: '' },
      ]);
    await renderWithQuery(<PainMapSection userId="u1" sex={null} />);

    await user.press(await screen.findByRole('button', { name: 'Editar dor: Lombar' }));
    expect(screen.getByRole('button', { name: 'Não sinto mais dor aqui' })).toBeOnTheScreen();
  });

  it('removes a pain straight from its chip', async () => {
    const user = userEvent.setup();
    jest
      .mocked(fetchOpenPains)
      .mockResolvedValue([
        { id: 'p1', region: 'lower_back', side: 'center', intensity: 6, createdAt: '' },
      ]);
    jest.mocked(resolvePain).mockResolvedValue(undefined);
    await renderWithQuery(<PainMapSection userId="u1" sex={null} />);

    await user.press(await screen.findByRole('button', { name: 'Remover dor: Lombar' }));
    await waitFor(() => expect(resolvePain).toHaveBeenCalledWith('p1'));
  });
});
