import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PainHistoryView, PainMapSection } from '@/features/health';
import {
  fetchOpenPains,
  fetchPainHistory,
  resolvePain,
  setPain,
} from '@/features/health/api/pain.api';

import { useActiveWorkoutStore } from '../active-workout.store';
import {
  fetchRecentWorkouts,
  saveWorkout,
  saveWorkoutFeedback,
  type SavedWorkout,
} from '../api/workouts.api';
import { WorkoutBuilder } from '../components/WorkoutBuilder';
import { WorkoutCheckIn } from '../components/WorkoutCheckIn';

jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock('../api/workouts.api', () => ({
  saveWorkout: jest.fn(),
  fetchRecentWorkouts: jest.fn(),
  deleteWorkout: jest.fn(),
  saveWorkoutFeedback: jest.fn(),
  newWorkoutId: () => 'w-new',
}));
jest.mock('@/features/health/api/pain.api', () => ({
  fetchOpenPains: jest.fn(),
  fetchPainHistory: jest.fn(),
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
  jest.mocked(fetchPainHistory).mockResolvedValue([]);
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
      'w-new',
    );

    await user.press(screen.getByRole('button', { name: 'Iniciar este treino' }));
    expect(router.navigate).toHaveBeenCalledWith('/record');
    expect(useActiveWorkoutStore.getState().active).toMatchObject({
      id: 'w-new',
      title: 'Tiros de 200 m',
      forPain: false,
    });

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

describe('WorkoutBuilder — new options', () => {
  it('generates from a free-text goal ("Outro")', async () => {
    const user = userEvent.setup();
    await renderWithQuery(
      <WorkoutBuilder userId="u1" defaultLevel="intermediate" pains={[]} recentPaceSPerKm={360} />,
    );
    await user.press(screen.getByRole('radio', { name: 'Outro' }));
    expect(screen.getByRole('button', { name: 'Gerar treino' })).toBeDisabled();

    await user.type(screen.getByLabelText('O que você busca?'), 'Foco em subida');
    await user.press(screen.getByRole('button', { name: 'Gerar treino' }));

    expect(await screen.findByText(/foi lido como: treino de subidas/)).toBeOnTheScreen();
    expect(saveWorkout).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ type: 'custom', customGoal: 'Foco em subida' }),
      expect.objectContaining({ sessionType: 'hills' }),
      'w-new',
    );
  });

  it('offers the advanced level with heart-rate zones', async () => {
    const user = userEvent.setup();
    await renderWithQuery(
      <WorkoutBuilder userId="u1" defaultLevel="intermediate" pains={[]} recentPaceSPerKm={330} />,
    );
    await user.press(screen.getByRole('radio', { name: 'Avançado' }));
    await user.press(screen.getByRole('radio', { name: '60 min' }));
    await user.press(screen.getByRole('button', { name: 'Gerar treino' }));
    expect((await screen.findAllByText('Tiros de 1 km (VO2máx)')).length).toBeGreaterThan(0);
    expect(screen.getByText(/· Z5$/)).toBeOnTheScreen();
  });

  it('recognizes a returning pain and repeats the previous adapted workout', async () => {
    const previous: SavedWorkout = {
      id: 'w-old',
      createdAt: new Date().toISOString(),
      generator: 'rules',
      plan: {
        title: 'Rodagem',
        summary: '30 min',
        totalMinutes: 30,
        blocks: [],
        adaptations: [],
        safetyNotes: [],
        sessionType: 'easy',
      },
      painRegions: ['knee'],
      feedback: 'helped',
    };
    jest.mocked(fetchRecentWorkouts).mockResolvedValue([previous]);
    const user = userEvent.setup();
    await renderWithQuery(
      <WorkoutBuilder
        userId="u1"
        defaultLevel="intermediate"
        pains={[{ region: 'knee', side: 'left', intensity: 3 }]}
        recentPaceSPerKm={360}
        recurring={[{ region: 'knee', side: 'left', count: 3, lastAt: '', maxIntensity: 3 }]}
      />,
    );

    expect(
      await screen.findByText(/Essa dor em joelho esquerdo voltou \(3 vezes/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/você disse: ajudou muito/)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Repetir esse treino' }));
    expect(screen.getByText('Ficha de treino de corrida')).toBeOnTheScreen();
    expect(saveWorkout).not.toHaveBeenCalled();
  });

  it('goes easier where the last check-in reported discomfort', async () => {
    jest.mocked(fetchRecentWorkouts).mockResolvedValue([
      {
        id: 'w-old',
        createdAt: new Date().toISOString(),
        generator: 'rules',
        plan: {
          title: 'x',
          summary: '',
          totalMinutes: 30,
          blocks: [],
          adaptations: [],
          safetyNotes: [],
        },
        painRegions: ['knee'],
        feedback: 'discomfort',
      },
    ]);
    const user = userEvent.setup();
    await renderWithQuery(
      <WorkoutBuilder
        userId="u1"
        defaultLevel="intermediate"
        pains={[{ region: 'knee', side: 'left', intensity: 3 }]}
        recentPaceSPerKm={360}
      />,
    );
    expect(await screen.findByText('Desconforto — carga menor')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Gerar treino' }));
    expect(await screen.findByText(/desconforto após o último treino/)).toBeOnTheScreen();
  });
});

describe('WorkoutCheckIn', () => {
  it('saves how the workout felt', async () => {
    jest.mocked(saveWorkoutFeedback).mockResolvedValue(undefined);
    const onAnswered = jest.fn();
    await renderWithQuery(
      <WorkoutCheckIn userId="u1" workoutId="w1" runId="r1" onAnswered={onAnswered} />,
    );
    await userEvent.setup().press(screen.getByRole('radio', { name: 'Ainda sinto desconforto' }));
    await waitFor(() => expect(saveWorkoutFeedback).toHaveBeenCalledWith('w1', 'discomfort', 'r1'));
    expect(
      await screen.findByText(/próximo treino para essa região terá uma carga menor/),
    ).toBeOnTheScreen();
    expect(onAnswered).toHaveBeenCalledWith('discomfort');
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

describe('pain history', () => {
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
  const knee = (id: string, days: number, resolved = true) => ({
    id,
    region: 'knee' as const,
    side: 'right' as const,
    intensity: 6,
    createdAt: daysAgo(days),
    resolvedAt: resolved ? daysAgo(days - 1) : null,
  });

  it('warns when a past pain comes back', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchOpenPains).mockResolvedValue([]);
    jest.mocked(fetchPainHistory).mockResolvedValue([knee('1', 5), knee('2', 15)]);
    await renderWithQuery(<PainMapSection userId="u1" sex="male" />);

    await user.press(await screen.findByRole('button', { name: 'Escolher pela lista' }));
    await user.press(screen.getByRole('button', { name: 'Joelho direito' }));
    expect(
      await screen.findByText(/Essa dor em joelho direito voltou — você já a relatou 2 vezes/),
    ).toBeOnTheScreen();
  });

  it('shows recurring pains and every episode', async () => {
    jest
      .mocked(fetchPainHistory)
      .mockResolvedValue([knee('1', 2, false), knee('2', 9), knee('3', 20)]);
    await renderWithQuery(<PainHistoryView userId="u1" />);

    expect(await screen.findByText('Dores recorrentes')).toBeOnTheScreen();
    expect(screen.getByText(/3 vezes nos últimos 30 dias/)).toBeOnTheScreen();
    expect(screen.getAllByText('Resolvida')).toHaveLength(2);
    expect(screen.getByText('Em aberto')).toBeOnTheScreen();
  });
});
