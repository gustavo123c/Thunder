import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { colorScheme } from 'nativewind';
import { Pressable, Text } from 'react-native';

import { AppThemeProvider, useThemePreference } from '../AppThemeProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use import
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function Picker() {
  const { preference, setPreference } = useThemePreference();
  return (
    <>
      <Text>Preferência: {preference}</Text>
      <Pressable accessibilityRole="button" onPress={() => setPreference('light')}>
        <Text>Claro</Text>
      </Pressable>
    </>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(colorScheme, 'set').mockImplementation(() => undefined);
});

it('defaults to following the system', async () => {
  await render(
    <AppThemeProvider>
      <Picker />
    </AppThemeProvider>,
  );
  expect(await screen.findByText('Preferência: system')).toBeOnTheScreen();
  expect(colorScheme.set).toHaveBeenCalledWith('system');
});

it('restores and persists the chosen appearance', async () => {
  await AsyncStorage.setItem('thunder.theme-preference', 'dark');
  await render(
    <AppThemeProvider>
      <Picker />
    </AppThemeProvider>,
  );
  expect(await screen.findByText('Preferência: dark')).toBeOnTheScreen();

  await userEvent.setup().press(screen.getByRole('button', { name: 'Claro' }));
  expect(screen.getByText('Preferência: light')).toBeOnTheScreen();
  expect(colorScheme.set).toHaveBeenLastCalledWith('light');
  await waitFor(async () =>
    expect(await AsyncStorage.getItem('thunder.theme-preference')).toBe('light'),
  );
});
