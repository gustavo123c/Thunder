import { router } from 'expo-router';
import { type ReactElement, useMemo } from 'react';
import { ActivityIndicator, Alert, RefreshControl, SectionList, Text, View } from 'react-native';

import { RunCard } from '@/components/run/RunCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDistanceKm } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';
import { ScreenTitle } from '@/components/ui/Typography';

import { confirmDeleteRun } from '../confirm-delete';
import { groupRunsByMonth } from '../group-by-month';
import { useDeleteRun, useUserRuns } from '../hooks/useRuns';

type RunHistoryListProps = {
  userId: string;
  /** Rendered above the list (e.g. pending uploads banner, athlete header). */
  header?: ReactElement | null;
  /** Own history shows a title, the weekly summary and a call to action. */
  variant?: 'own' | 'athlete';
  /** Rendered next to the title of the own history (e.g. the retrospective button). */
  titleAction?: ReactElement | null;
};

export function RunHistoryList({
  userId,
  header = null,
  variant = 'own',
  titleAction = null,
}: RunHistoryListProps) {
  const theme = useThemeColors();
  const isOwn = variant === 'own';
  const query = useUserRuns(userId);
  const deleteRun = useDeleteRun();
  const pages = query.data?.pages;
  const sections = useMemo(() => groupRunsByMonth(pages?.flat() ?? []), [pages]);

  if (query.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar seu histórico"
        description="Verifique sua conexão e tente novamente."
        primaryAction={{ label: 'Tentar novamente', onPress: () => void query.refetch() }}
      />
    );
  }

  return (
    <SectionList
      // Under a stack header (athlete page) iOS must inset the list below the bar.
      contentInsetAdjustmentBehavior={isOwn ? 'never' : 'automatic'}
      sections={sections}
      keyExtractor={(run) => run.id}
      stickySectionHeadersEnabled={false}
      contentContainerClassName="px-4 pb-8 pt-4"
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListHeaderComponent={
        <View className="gap-4 pb-2">
          {isOwn ? (
            // The action sits under the title: the top-right corner stays free.
            <View className="items-start gap-3">
              <ScreenTitle>Histórico</ScreenTitle>
              {titleAction}
            </View>
          ) : null}
          {header}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View
          accessibilityRole="header"
          className="flex-row items-baseline justify-between pb-3 pt-5"
        >
          <Text className="text-[13px] font-semibold uppercase tracking-[1.5px] text-ink-200">
            {section.title}
          </Text>
          <Text
            className="text-xs font-semibold text-ink-400"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {section.data.length} {section.data.length === 1 ? 'corrida' : 'corridas'} ·{' '}
            {formatDistanceKm(section.totalDistanceM)}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          icon={isOwn ? 'walk-outline' : 'eye-off-outline'}
          illustration={isOwn ? 'route' : undefined}
          title={isOwn ? 'Sua primeira rota começa aqui' : 'Nenhuma corrida visível'}
          description={
            isOwn
              ? 'Grave uma corrida e ela aparece aqui com mapa, ritmo, parciais e sua evolução.'
              : 'Este atleta ainda não tem corridas que você possa ver.'
          }
          action={
            isOwn ? (
              <Button
                label="Fazer minha primeira corrida"
                icon="play"
                onPress={() => router.navigate('/record')}
              />
            ) : undefined
          }
        />
      }
      renderItem={({ item }) => (
        <RunCard
          run={item}
          onPress={() => router.push(`/run/${item.id}`)}
          onDelete={
            isOwn
              ? () =>
                  confirmDeleteRun(() =>
                    deleteRun.mutate(item.id, {
                      onError: () => Alert.alert('Não foi possível apagar', 'Tente novamente.'),
                    }),
                  )
              : undefined
          }
        />
      )}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      ListFooterComponent={
        query.isFetchingNextPage ? <ActivityIndicator color={theme.accent} /> : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={theme.accent}
        />
      }
    />
  );
}
