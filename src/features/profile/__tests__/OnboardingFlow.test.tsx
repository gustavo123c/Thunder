import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';

import type { Profile } from '@/domain/types/profile';

import { isUsernameTaken, updateProfile } from '../api/profile.api';
import { OnboardingFlow } from '../components/OnboardingFlow';

jest.mock('../api/profile.api', () => {
  class UsernameTakenError extends Error {}
  return {
    UsernameTakenError,
    isUsernameTaken: jest.fn(),
    updateProfile: jest.fn(),
    fetchProfile: jest.fn(),
  };
});

const mockedIsUsernameTaken = jest.mocked(isUsernameTaken);
const mockedUpdateProfile = jest.mocked(updateProfile);

const newProfile: Profile = {
  id: 'user-1',
  username: null,
  fullName: 'Ana',
  avatarUrl: null,
  level: null,
  weightKg: null,
  heightCm: null,
  birthDate: null,
  mainGoal: null,
  goalTargetPaceSPerKm: null,
  onboardedAt: null,
  sex: null,
};

let queryClient: QueryClient;

async function renderFlow() {
  // gcTime: Infinity avoids lingering GC timers that keep Jest alive.
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <OnboardingFlow profile={newProfile} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  queryClient.clear();
});

it('walks through the four steps and completes onboarding', async () => {
  const user = userEvent.setup();
  mockedIsUsernameTaken.mockResolvedValue(false);
  mockedUpdateProfile.mockImplementation(async (_id, update) => ({
    ...newProfile,
    ...update,
    onboardedAt: '2026-11-25T10:00:00Z',
  }));
  await renderFlow();

  // Step 1 — name is prefilled from sign up
  expect(screen.getByLabelText('Nome').props.value).toBe('Ana');
  await user.type(screen.getByLabelText('Nome de usuário'), 'ana.corre');
  await user.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(mockedIsUsernameTaken).toHaveBeenCalledWith('ana.corre', 'user-1');

  // Step 2 — level
  expect(await screen.findByText('Qual é o seu nível?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByText('Escolha seu nível.')).toBeOnTheScreen();
  await user.press(screen.getByRole('radio', { name: /Iniciante/ }));
  await user.press(screen.getByRole('button', { name: 'Continuar' }));

  // Step 3 — body
  expect(await screen.findByText('Sobre você')).toBeOnTheScreen();
  await user.type(screen.getByLabelText('Peso'), '62,5');
  await user.type(screen.getByLabelText('Altura'), '168');
  await user.press(screen.getByRole('radio', { name: 'Feminino' }));
  await user.press(screen.getByRole('button', { name: 'Continuar' }));

  // Step 4 — goal; target pace only appears for "improve pace"
  expect(await screen.findByText('Qual é a sua meta?')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Pace alvo')).not.toBeOnTheScreen();
  await user.press(screen.getByRole('radio', { name: /Baixar meu pace/ }));
  await user.type(screen.getByLabelText('Pace alvo'), '6:15');
  await user.press(screen.getByRole('button', { name: 'Começar a correr' }));

  expect(mockedUpdateProfile).toHaveBeenCalledWith(
    'user-1',
    {
      fullName: 'Ana',
      username: 'ana.corre',
      level: 'beginner',
      weightKg: 62.5,
      heightCm: 168,
      sex: 'female',
      mainGoal: 'improve_pace',
      goalTargetPaceSPerKm: 375,
    },
    { completeOnboarding: true },
  );
});

it('blocks the first step when the username is taken', async () => {
  const user = userEvent.setup();
  mockedIsUsernameTaken.mockResolvedValue(true);
  await renderFlow();

  await user.type(screen.getByLabelText('Nome de usuário'), 'ana');
  await user.press(screen.getByRole('button', { name: 'Continuar' }));

  expect(await screen.findByText('Este nome de usuário já está em uso.')).toBeOnTheScreen();
  expect(screen.getByText('Bem-vindo ao Thunder ⚡')).toBeOnTheScreen();
  expect(mockedUpdateProfile).not.toHaveBeenCalled();
});

it('can go back to a previous step keeping the answers', async () => {
  const user = userEvent.setup();
  mockedIsUsernameTaken.mockResolvedValue(false);
  await renderFlow();

  await user.type(screen.getByLabelText('Nome de usuário'), 'ana.corre');
  await user.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText('Qual é o seu nível?');
  await user.press(screen.getByRole('button', { name: 'Voltar' }));

  expect(screen.getByLabelText('Nome de usuário').props.value).toBe('ana.corre');
});
