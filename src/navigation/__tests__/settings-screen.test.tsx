import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { colorScheme } from 'nativewind';
import { Alert, type AlertButton } from 'react-native';

import SettingsScreen from '@/app/settings';
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
}));
jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
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
});
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
