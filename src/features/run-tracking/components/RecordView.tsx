import { router } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/map/RouteMap';
import { FormMessage } from '@/components/ui/FormMessage';
import { LightningFlash } from '@/components/ui/LightningFlash';
import { samplesToMultiLineString } from '@/domain/geo/geojson';
import { isActive } from '@/domain/run-session/run-session';
import { hasRecordedDistance } from '@/domain/metrics/recorded-distance';
import { isExpoGo } from '@/lib/runtime';
import { useThemeColors } from '@/theme/theme';

import { useLiveMetrics } from '../hooks/useLiveMetrics';
import { useLocationPermission, useRunControls } from '../hooks/useRunTracking';
import { useRunSessionStore } from '../store/run-session.store';
import { LiveStats } from './LiveStats';
import { PermissionNotice } from './PermissionNotice';
import { RunControls } from './RunControls';

/** Runs shorter than this are probably accidental; offer to discard instead of saving. */

type RecordViewProps = {
  userId: string;
  weightKg: number | null;
};

export function RecordView({ userId, weightKg }: RecordViewProps) {
  const theme = useThemeColors();
  const run = useRunSessionStore((s) => s.run);
  const samples = useRunSessionStore((s) => s.samples);
  const ready = useRunSessionStore((s) => s.ready);
  const metrics = useLiveMetrics(weightKg);
  const controls = useRunControls({ userId, weightKg });
  const { permission, request } = useLocationPermission();

  const route = useMemo(() => samplesToMultiLineString(samples), [samples]);
  const active = isActive(run?.session);
  const status = run?.session.status ?? null;

  // Expo Go records only while the app is open: keep the screen on during a run.
  useEffect(() => {
    if (!isExpoGo || !active) return;
    const tag = 'thunder-run';
    void activateKeepAwakeAsync(tag);
    return () => {
      void deactivateKeepAwake(tag);
    };
  }, [active]);

  const [flash, setFlash] = useState(0);

  async function handleStart() {
    const current = permission === 'denied' || permission === null ? await request() : permission;
    if (current === 'denied') return;
    // Storm flash when the run actually starts (the start haptic already fired).
    if (await controls.start()) setFlash((n) => n + 1);
  }

  async function finishAndNavigate() {
    const outcome = await controls.finish();
    if (!outcome) return;
    if (outcome.status === 'uploaded') {
      router.push({ pathname: '/run/[id]', params: { id: outcome.runId, celebrate: '1' } });
    } else {
      Alert.alert(
        'Corrida salva no aparelho',
        'Sem conexão agora. Vamos enviá-la automaticamente assim que possível.',
      );
      router.push('/history');
    }
  }

  function confirmFinish() {
    if (!hasRecordedDistance(metrics.distanceM)) {
      // Nothing was recorded: discarding is the suggested (emphasized) choice.
      Alert.alert(
        'Nenhuma distância registrada',
        'O GPS registrou menos de 50 m. Descartar esta corrida?',
        [
          { text: 'Continuar correndo', style: 'cancel' },
          { text: 'Salvar mesmo assim', onPress: () => void finishAndNavigate() },
          {
            text: 'Descartar',
            style: 'destructive',
            isPreferred: true,
            onPress: () => void controls.discard(),
          },
        ],
      );
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
    <View className="flex-1 bg-ink-900">
      <View className="flex-1">
        <RouteMap route={active ? route : null} followUser />
        {isExpoGo ? (
          <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 items-center">
            <View className="mt-2 flex-row items-center gap-1.5 rounded-full border border-hairline bg-ink-900/80 px-3 py-1.5">
              <Ionicons name="flask-outline" size={12} color={theme.ink[400]} />
              <Text className="text-[11px] text-ink-300">
                Modo de teste · mantenha o app aberto durante a corrida
              </Text>
            </View>
          </SafeAreaView>
        ) : null}
      </View>

      <View className="-mt-6 gap-5 rounded-t-[28px] border-t border-hairline bg-ink-800 px-4 pb-6 pt-6">
        <LiveStats
          metrics={metrics}
          status={active ? (status === 'paused' ? 'paused' : 'running') : 'idle'}
        />
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
      </View>
      <LightningFlash trigger={flash} haptic={false} />
    </View>
  );
}
