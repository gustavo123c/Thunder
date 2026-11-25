import '../../global.css';
// Registers the background location task at global scope (required by TaskManager).
import '@/features/run-tracking';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/ErrorState';
import { AuthProvider, useSignOut } from '@/features/auth';
import { queryClient } from '@/lib/query-client';
import { useAppGate } from '@/navigation/useAppGate';
import { initMapbox } from '@/services/mapbox/init';

void SplashScreen.preventAutoHideAsync();
initMapbox();

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
        description="Verifique sua conexão e tente novamente."
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
          name="run/[id]"
          options={{ headerShown: true, title: 'Corrida', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="profile/edit"
          options={{ headerShown: true, title: 'Editar perfil', presentation: 'modal' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
