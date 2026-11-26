import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativeWindScheme, useColorScheme } from 'nativewind';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';

import { resolveScheme, type ThemePreference, THEME_PREFERENCES, themeVariables } from './theme';

const STORAGE_KEY = 'thunder.theme-preference';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

function isPreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

/**
 * Applies the user's appearance choice (Automático / Claro / Escuro), persists it on the
 * device and defines the themed CSS variables for everything below it.
 * Renders nothing until the stored choice is read (the splash screen is still up).
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference | null>(null);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .catch(() => null)
      .then((stored) => {
        if (cancelled) return;
        const initial = isPreference(stored) ? stored : 'system';
        nativeWindScheme.set(initial);
        setPreferenceState(initial);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    nativeWindScheme.set(next);
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  if (!preference) return null;

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference }}>
      <View style={[{ flex: 1 }, themeVariables[resolveScheme(colorScheme)]]}>{children}</View>
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  const value = useContext(ThemePreferenceContext);
  if (!value) throw new Error('useThemePreference must be used inside AppThemeProvider');
  return value;
}

/**
 * Re-applies the theme variables inside a <Modal>. Modals render outside the app's root
 * view (a separate native window / a portal on web), so they need their own scope.
 */
export function ThemeScope({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  return <View style={[{ flex: 1 }, themeVariables[resolveScheme(colorScheme)]]}>{children}</View>;
}
