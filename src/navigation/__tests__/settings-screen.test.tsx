import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { colorScheme } from 'nativewind';
import { Alert, type AlertButton } from 'react-native';

import SettingsScreen from '@/app/settings';
import { revokeHealthConsent } from '@/features/profile/api/health-consent.api';
import { fetchProfile } from '@/features/profile/api/profile.api';
import { deleteAllWorkouts, fetchRecentWorkouts } from '@/features/workouts/api/workouts.api';
import { AppThemeProvider } from '@/theme/AppThemeProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use import
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ session: { user: { email: 'corredor@example.com' } } }),
  useSignOut: () => ({ mutate: jest.fn() }),
  useUserId: () => 'u1',
  useDeleteAccount: () => mockDeleteAccount,
}));
const mockDeleteAccount = { mutate: jest.fn(), isPending: false };
jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
jest.mock('@/features/profile/api/profile.api', () => ({ fetchProfile: jest.fn() }));
jest.mock('@/features/profile/api/health-consent.api', () => ({
  grantHealthConsent: jest.fn(),
  revokeHealthConsent: jest.fn(),
}));
jest.mock('@/features/workouts/api/workouts.api', () => ({
  fetchRecentWorkouts: jest.fn(),
  deleteAllWorkouts: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity } },
});

function renderSettings() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <SettingsScreen />
      </AppThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(colorScheme, 'set').mockImplementation(() => undefined);
  jest.mocked(fetchRecentWorkouts).mockResolvedValue([]);
  jest.mocked(deleteAllWorkouts).mockResolvedValue(undefined);
  jest.mocked(fetchProfile).mockResolvedValue(profileWith(null));
  jest.mocked(revokeHealthConsent).mockResolvedValue(undefined);
});

function profileWith(healthConsentAt: string | null) {
  return {
    id: 'u1',
    username: 'corredor',
    fullName: null,
    avatarUrl: null,
    level: null,
    weightKg: null,
    heightCm: null,
    birthDate: null,
    mainGoal: null,
    goalTargetPaceSPerKm: null,
    onboardedAt: '2026-11-25T10:00:00Z',
    sex: null,
    healthConsentAt,
  };
}
afterEach(() => queryClient.clear());

it('keeps content below the iOS header and switches the appearance', async () => {
  await renderSettings();

  // Without this, iOS draws the first section under the translucent header.
  expect(screen.getByTestId('settings-scroll').props.contentInsetAdjustmentBehavior).toBe(
    'automatic',
  );

  const light = await screen.findByRole('radio', { name: 'Claro' });
  await userEvent.setup().press(light);
  expect(light).toBeChecked();
  expect(colorScheme.set).toHaveBeenLastCalledWith('light');
});

it('deletes every saved workout after confirming', async () => {
  jest.mocked(fetchRecentWorkouts).mockResolvedValue([
    {
      id: 'w1',
      createdAt: '2026-11-20T10:00:00Z',
      generator: 'rules',
      plan: { title: 'Rodagem', blocks: [] } as never,
      painRegions: [],
      feedback: null,
    },
  ]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await renderSettings();

  await userEvent
    .setup()
    .press(await screen.findByRole('button', { name: 'Apagar todos os treinos salvos' }));
  const [title, , buttons] = alert.mock.calls[0] ?? [];
  expect(title).toBe('Apagar todos os treinos salvos?');
  expect(deleteAllWorkouts).not.toHaveBeenCalled();

  (buttons as AlertButton[]).find((b) => b.text === 'Apagar todos')?.onPress?.();
  await waitFor(() => expect(deleteAllWorkouts).toHaveBeenCalledWith('u1'));
});

it('disables delete-all when there is nothing saved', async () => {
  await renderSettings();
  expect(await screen.findByText('Nenhum treino salvo')).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Apagar todos os treinos salvos' }),
  ).not.toBeOnTheScreen();
});

it('hides health features until consent and revokes after confirming', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await renderSettings();
  expect(
    await screen.findByRole('button', { name: 'Autorizar uso de dados de saúde' }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Questionário de saúde' })).not.toBeOnTheScreen();

  queryClient.clear();
  jest.mocked(fetchProfile).mockResolvedValue(profileWith('2026-12-01T10:00:00Z'));
  await renderSettings();
  await userEvent
    .setup()
    .press(await screen.findByRole('button', { name: 'Revogar e apagar dados de saúde' }));
  const [title, , buttons] = alert.mock.calls.at(-1) ?? [];
  expect(title).toBe('Revogar o uso de dados de saúde?');
  expect(revokeHealthConsent).not.toHaveBeenCalled();
  (buttons as AlertButton[]).find((b) => b.text === 'Revogar e apagar')?.onPress?.();
  await waitFor(() => expect(revokeHealthConsent).toHaveBeenCalled());
  alert.mockRestore();
});

it('deletes the account only after two confirmations', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await renderSettings();
  await userEvent.setup().press(await screen.findByRole('button', { name: 'Excluir conta' }));

  const [title, , first] = alert.mock.calls.at(-1) ?? [];
  expect(title).toBe('Excluir sua conta?');
  (first as AlertButton[]).find((b) => b.text === 'Continuar')?.onPress?.();
  expect(mockDeleteAccount.mutate).not.toHaveBeenCalled();

  const [secondTitle, , second] = alert.mock.calls.at(-1) ?? [];
  expect(secondTitle).toBe('Excluir definitivamente?');
  (second as AlertButton[]).find((b) => b.text === 'Excluir conta')?.onPress?.();
  expect(mockDeleteAccount.mutate).toHaveBeenCalled();
  alert.mockRestore();
});
