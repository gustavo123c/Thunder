import '../../global.css';
// Registers the background location task at global scope (required by TaskManager).
import '@/features/run-tracking';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/ErrorState';
import { AuthProvider, useSignOut } from '@/features/auth';
import { queryClient } from '@/lib/query-client';
import { useAppGate } from '@/navigation/useAppGate';
import { initMapbox } from '@/services/mapbox/init';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();
initMapbox();
// "Performance Dark": the app always uses the dark palette.
colorScheme.set('dark');

function RootNavigator() {
  const { gate, profileQuery } = useAppGate();
  const signOut = useSignOut();

  useEffect(() => {
    if (gate !== 'loading') SplashScreen.hide();
  }, [gate]);

  if (gate === 'loading') return null; // splash screen stays visible

  if (gate === 'error') {
    return (
      <ErrorState
        title="Não conseguimos carregar seu perfil"
        description={
          __DEV__ && profileQuery.error
            ? `Verifique sua conexão e tente novamente.\n\n[dev] ${profileQuery.error.message}`
            : 'Verifique sua conexão e tente novamente.'
        }
        primaryAction={{
          label: 'Tentar novamente',
          onPress: () => void profileQuery.refetch(),
          loading: profileQuery.isFetching,
        }}
        secondaryAction={{ label: 'Sair', onPress: () => signOut.mutate() }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={gate === 'signed_out'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={gate === 'onboarding'}>
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack.Protected>

      <Stack.Protected guard={gate === 'ready'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="run/[id]/index"
          options={{ headerShown: true, title: 'Corrida', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="run/[id]/comments"
          options={{ headerShown: true, title: 'Comentários', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{ headerShown: true, title: 'Atleta', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="retrospective"
          options={{ headerShown: true, title: 'Retrospectiva', headerBackTitle: 'Histórico' }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: true, title: 'Configurações', headerBackTitle: 'Perfil' }}
        />
        <Stack.Screen
          name="people"
          options={{ headerShown: true, title: 'Encontrar corredores', presentation: 'modal' }}
        />
        <Stack.Screen
          name="profile/edit"
          options={{ headerShown: true, title: 'Editar perfil', presentation: 'modal' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

/** Navigation chrome (headers, screen backgrounds) in the Performance Dark palette. */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.bolt[500],
    background: colors.ink[900],
    card: colors.ink[900],
    text: colors.ink[50],
    border: colors.hairline,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
