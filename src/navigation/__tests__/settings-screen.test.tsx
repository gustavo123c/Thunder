import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';
import { colorScheme } from 'nativewind';

import SettingsScreen from '@/app/settings';
import { AppThemeProvider } from '@/theme/AppThemeProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use import
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ session: { user: { email: 'corredor@example.com' } } }),
  useSignOut: () => ({ mutate: jest.fn() }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(colorScheme, 'set').mockImplementation(() => undefined);
});

it('keeps content below the iOS header and switches the appearance', async () => {
  await render(
    <AppThemeProvider>
      <SettingsScreen />
    </AppThemeProvider>,
  );

  // Without this, iOS draws the first section under the translucent header.
  expect(screen.getByTestId('settings-scroll').props.contentInsetAdjustmentBehavior).toBe(
    'automatic',
  );

  const light = await screen.findByRole('radio', { name: 'Claro' });
  await userEvent.setup().press(light);
  expect(light).toBeChecked();
  expect(colorScheme.set).toHaveBeenLastCalledWith('light');
});
