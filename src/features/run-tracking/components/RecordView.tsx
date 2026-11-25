import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/map/RouteMap';
import { FormMessage } from '@/components/ui/FormMessage';
import { samplesToMultiLineString } from '@/domain/geo/geojson';
import { isActive } from '@/domain/run-session/run-session';

import { useLiveMetrics } from '../hooks/useLiveMetrics';
import { useLocationPermission, useRunControls } from '../hooks/useRunTracking';
import { useRunSessionStore } from '../store/run-session.store';
import { LiveStats } from './LiveStats';
import { PermissionNotice } from './PermissionNotice';
import { RunControls } from './RunControls';

/** Runs shorter than this are probably accidental; offer to discard instead of saving. */
const MIN_SAVE_DISTANCE_M = 50;

type RecordViewProps = {
  userId: string;
  weightKg: number | null;
};

export function RecordView({ userId, weightKg }: RecordViewProps) {
  const run = useRunSessionStore((s) => s.run);
  const samples = useRunSessionStore((s) => s.samples);
  const ready = useRunSessionStore((s) => s.ready);
  const metrics = useLiveMetrics(weightKg);
  const controls = useRunControls({ userId, weightKg });
  const { permission, request } = useLocationPermission();

  const route = useMemo(() => samplesToMultiLineString(samples), [samples]);
  const active = isActive(run?.session);
  const status = run?.session.status ?? null;

  async function handleStart() {
    const current = permission === 'denied' || permission === null ? await request() : permission;
    if (current === 'denied') return;
    await controls.start();
  }

  async function finishAndNavigate() {
    const outcome = await controls.finish();
    if (!outcome) return;
    if (outcome.status === 'uploaded') {
      router.push(`/run/${outcome.runId}`);
    } else {
      Alert.alert(
        'Corrida salva no aparelho',
        'Sem conexão agora. Vamos enviá-la automaticamente assim que possível.',
      );
      router.push('/history');
    }
  }

  function confirmFinish() {
    if (metrics.distanceM < MIN_SAVE_DISTANCE_M) {
      Alert.alert('Corrida muito curta', 'Deseja descartar esta corrida?', [
        { text: 'Continuar correndo', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => void controls.discard() },
        { text: 'Salvar mesmo assim', onPress: () => void finishAndNavigate() },
      ]);
      return;
    }
    Alert.alert('Finalizar corrida?', 'Você poderá ver o resumo em seguida.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => confirmDiscard() },
      { text: 'Finalizar', onPress: () => void finishAndNavigate() },
    ]);
  }

  function confirmDiscard() {
    Alert.alert('Descartar corrida?', 'Os dados desta corrida serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => void controls.discard() },
    ]);
  }

  if (!ready) return null;

  return (
    <View className="flex-1 bg-ink-50 dark:bg-ink-900">
      <View className={active ? 'h-[38%]' : 'flex-1'}>
        <RouteMap route={active ? route : null} followUser />
      </View>

      <SafeAreaView edges={['bottom']} className="gap-6 px-4 pb-4 pt-6">
        {active ? <LiveStats metrics={metrics} paused={status === 'paused'} /> : null}
        {!active ? (
          <PermissionNotice permission={permission} onRequest={() => void request()} />
        ) : null}
        <FormMessage message={controls.error} />
        <RunControls
          status={status}
          pending={controls.pending}
          onStart={() => void handleStart()}
          onPause={() => void controls.pause()}
          onResume={() => void controls.resume()}
          onFinish={confirmFinish}
        />
      </SafeAreaView>
    </View>
  );
}
