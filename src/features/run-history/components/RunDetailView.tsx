import { router } from 'expo-router';
import { type ReactNode, useMemo } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { RouteMap } from '@/components/map/RouteMap';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatBlock } from '@/components/ui/StatBlock';
import { boundsOf, type LineStringGeometry } from '@/domain/geo/geojson';
import { compareWithHistory } from '@/domain/insights/comparison';
import type { RunRecord } from '@/domain/types/run';
import { formatDistanceKm, formatDuration, formatRunDate, formatPaceTrack } from '@/lib/format';
import type { RunDetail } from '@/services/supabase/run-json';
import { useThemeColors } from '@/theme/theme';

import { RunNotFoundError } from '../api/runs.api';
import { describeComparison } from '../comparison-copy';
import { confirmDeleteRun } from '../confirm-delete';
import { useDeleteRun, useRunDetail, useUpdateRun } from '../hooks/useRuns';
import { VISIBILITY_COPY } from '../visibility';
import { InsightsCard } from './InsightsCard';
import { SplitsList } from './SplitsList';

type RunDetailViewProps = {
  runId: string;
  viewerId: string;
  /** Social section (kudos, comments) supplied by the screen. */
  renderSocial?: (detail: RunDetail) => ReactNode;
  /** Photos/videos section supplied by the screen. */
  renderMedia?: (detail: RunDetail) => ReactNode;
};

function StatsGrid({ detail }: { detail: RunDetail }) {
  const items = [
    { label: 'Pace médio', value: formatPaceTrack(detail.avgPaceSPerKm) },
    { label: 'Tempo em movimento', value: formatDuration(detail.movingTimeS) },
    { label: 'Melhor km', value: formatPaceTrack(detail.bestPaceSPerKm) },
    { label: 'Tempo total', value: formatDuration(detail.elapsedTimeS) },
    {
      label: 'Elevação',
      value: detail.elevationGainM === null ? '--' : `${Math.round(detail.elevationGainM)} m`,
    },
    {
      label: 'Calorias',
      value: detail.caloriesKcal === null ? '--' : `${detail.caloriesKcal} kcal`,
    },
  ];
  return (
    <View className="flex-row flex-wrap gap-y-5">
      {items.map((item) => (
        <View key={item.label} className="w-1/2">
          <StatBlock size="medium" align="left" label={item.label} value={item.value} />
        </View>
      ))}
    </View>
  );
}

function OwnerActions({ detail }: { detail: RunDetail }) {
  const updateRun = useUpdateRun(detail.id);
  const deleteRun = useDeleteRun();

  function chooseVisibility() {
    const options = (Object.keys(VISIBILITY_COPY) as RunRecord['visibility'][]).map((value) => ({
      text: VISIBILITY_COPY[value].label,
      onPress: () => updateRun.mutate({ visibility: value }),
    }));
    Alert.alert(
      'Quem pode ver esta corrida?',
      '"Seguidores e grupos": quem te segue e quem está nos seus grupos. "Só eu" nunca aparece em grupos.',
      [...options, { text: 'Cancelar', style: 'cancel' }],
    );
  }

  function confirmDelete() {
    confirmDeleteRun(() =>
      deleteRun.mutate(detail.id, {
        onSuccess: () => router.back(),
        onError: () => Alert.alert('Não foi possível apagar', 'Tente novamente.'),
      }),
    );
  }

  const visibility = VISIBILITY_COPY[detail.visibility];
  return (
    <View className="gap-3">
      <Button
        icon={visibility.icon}
        label={`Visível para: ${visibility.label}`}
        variant="secondary"
        onPress={chooseVisibility}
        loading={updateRun.isPending}
      />
      <Button
        label="Apagar corrida"
        variant="ghost"
        onPress={confirmDelete}
        loading={deleteRun.isPending}
      />
    </View>
  );
}

export function RunDetailView({ runId, viewerId, renderSocial, renderMedia }: RunDetailViewProps) {
  const theme = useThemeColors();
  const query = useRunDetail(runId);
  const detail = query.data;

  const route = useMemo<LineStringGeometry | null>(
    () =>
      detail && detail.route.length >= 2 ? { type: 'LineString', coordinates: detail.route } : null,
    [detail],
  );
  const insights = useMemo(
    () => (detail ? describeComparison(compareWithHistory(detail, detail.previousRuns)) : []),
    [detail],
  );

  if (query.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-900">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (query.isError || !detail) {
    const notFound = query.error instanceof RunNotFoundError;
    return (
      <ErrorState
        title={notFound ? 'Corrida não encontrada' : 'Não foi possível carregar a corrida'}
        description={
          notFound
            ? 'Ela pode ter sido excluída ou não estar visível para você.'
            : 'Verifique sua conexão e tente novamente.'
        }
        primaryAction={
          notFound
            ? { label: 'Voltar', onPress: () => router.back() }
            : { label: 'Tentar novamente', onPress: () => void query.refetch() }
        }
      />
    );
  }

  const isOwner = detail.userId === viewerId;
  const authorName = detail.author.fullName ?? detail.author.username ?? 'Corredor';

  return (
    <ScrollView
      className="flex-1 bg-ink-900"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-10"
    >
      {route ? (
        <View style={{ height: 280 }}>
          <RouteMap route={route} bounds={boundsOf(detail.route)} interactive={false} />
        </View>
      ) : null}

      <View className="gap-8 px-4 pt-6">
        <View className="gap-1">
          <Text className="text-sm text-ink-400">
            {isOwner ? 'Você' : authorName} · {formatRunDate(detail.startedAt)}
          </Text>
          <Text className="font-display text-[28px] text-ink-50">{detail.title}</Text>
        </View>

        <View className="flex-row justify-around rounded-[20px] border border-hairline bg-ink-800 py-5">
          <StatBlock label="Distância" value={formatDistanceKm(detail.distanceM)} />
          <StatBlock label="Pace" value={formatPaceTrack(detail.avgPaceSPerKm)} unit="/km" />
        </View>

        <StatsGrid detail={detail} />

        {renderMedia ? renderMedia(detail) : null}

        {renderSocial ? renderSocial(detail) : null}

        {isOwner ? <InsightsCard insights={insights} /> : null}

        <SplitsList splits={detail.splits} />

        {isOwner ? <OwnerActions detail={detail} /> : null}
      </View>
    </ScrollView>
  );
}
