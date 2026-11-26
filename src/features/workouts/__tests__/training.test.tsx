import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { PainMapSection } from '@/features/health';
import { fetchOpenPains, setPain } from '@/features/health/api/pain.api';

import { fetchRecentWorkouts, saveWorkout } from '../api/workouts.api';
import { WorkoutBuilder } from '../components/WorkoutBuilder';

jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
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
  it('generates a structured workout and saves it', async () => {
    const user = userEvent.setup();
    await renderWithQuery(
      <WorkoutBuilder userId="u1" defaultLevel="beginner" pains={[]} recentPaceSPerKm={390} />,
    );

    expect(screen.getByText('Pace de referência (últimas corridas): 6:30 /km')).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Fortalecimento' }));
    await user.press(screen.getByRole('radio', { name: '20 min' }));
    await user.press(screen.getByRole('button', { name: '⚡ Gerar treino' }));

    expect(await screen.findByText('Fortalecimento para corredores')).toBeOnTheScreen();
    expect(screen.getByText('🔥 Aquecimento')).toBeOnTheScreen();
    expect(screen.getByText('⚡ Circuito de força')).toBeOnTheScreen();
    expect(screen.getByText('🧘 Desaquecimento')).toBeOnTheScreen();
    expect(screen.getByText('Aviso importante sobre sua saúde')).toBeOnTheScreen();
    expect(saveWorkout).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ goal: 'strength', durationMin: 20, level: 'beginner' }),
      expect.objectContaining({ title: 'Fortalecimento para corredores' }),
    );
  });

  it('adapts the workout to pain from the body map', async () => {
    await renderWithQuery(
      <WorkoutBuilder
        userId="u1"
        defaultLevel="intermediate"
        pains={[{ region: 'knee', side: 'left', intensity: 9 }]}
        recentPaceSPerKm={null}
      />,
    );

    expect(screen.getByText('Dores consideradas: Joelho esquerdo')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: '⚡ Gerar treino' }));

    expect(await screen.findByText('Adaptado para você')).toBeOnTheScreen();
    expect(screen.getAllByText('Recuperação ativa').length).toBeGreaterThan(0);
    expect(screen.getByText(/especialmente agora que você relatou dor/)).toBeOnTheScreen();
  });
});

describe('PainMapSection', () => {
  it('records pain when a body region is tapped', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchOpenPains).mockResolvedValue([]);
    jest.mocked(setPain).mockResolvedValue(undefined);
    await renderWithQuery(<PainMapSection userId="u1" sex="female" />);

    expect(await screen.findByText('Nenhuma dor registrada. Ótimo! 💪')).toBeOnTheScreen();
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
});
