import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, View } from 'react-native';

import { RunCard } from '@/components/run/RunCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors } from '@/theme/tokens';

import { confirmDeleteRun } from '../confirm-delete';
import { useDeleteRun, useUserRuns } from '../hooks/useRuns';

type RunHistoryListProps = {
  userId: string;
  /** Rendered above the list (e.g. pending uploads banner, athlete header). */
  header?: ReactElement | null;
  /** Own history shows a title, the weekly summary and a call to action. */
  variant?: 'own' | 'athlete';
};

export function RunHistoryList({ userId, header = null, variant = 'own' }: RunHistoryListProps) {
  const isOwn = variant === 'own';
  const query = useUserRuns(userId);
  const deleteRun = useDeleteRun();
  const runs = query.data?.pages.flat() ?? [];

  if (query.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.bolt[500]} />
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
    <FlatList
      data={runs}
      keyExtractor={(run) => run.id}
      contentContainerClassName="gap-4 px-4 pb-8 pt-4"
      ListHeaderComponent={
        <View className="gap-4">
          {isOwn ? <Text className="text-3xl font-extrabold text-ink-50">Histórico</Text> : null}
          {header}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={isOwn ? 'walk-outline' : 'eye-off-outline'}
          title={isOwn ? 'Nenhuma corrida ainda' : 'Nenhuma corrida visível'}
          description={
            isOwn
              ? 'Sua primeira corrida aparece aqui com mapa, splits e evolução.'
              : 'Este atleta ainda não tem corridas que você possa ver.'
          }
          action={
            isOwn ? (
              <Button
                label="Começar a correr"
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
        query.isFetchingNextPage ? <ActivityIndicator color={colors.bolt[500]} /> : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={colors.bolt[500]}
        />
      }
    />
  );
}
