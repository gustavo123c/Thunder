import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';

import { RunCard } from '@/components/run/RunCard';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors } from '@/theme/tokens';

import { useUserRuns } from '../hooks/useRuns';
import { WeekSummary } from './WeekSummary';

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
          {isOwn ? (
            <Text className="text-3xl font-black text-ink-900 dark:text-ink-50">Histórico</Text>
          ) : null}
          {header}
          {isOwn && runs.length > 0 ? <WeekSummary runs={runs} /> : null}
        </View>
      }
      ListEmptyComponent={
        <View className="items-center gap-4 py-16">
          <Text className="text-5xl">🏃</Text>
          <Text className="text-center text-base text-ink-500 dark:text-ink-300">
            {isOwn ? 'Nenhuma corrida ainda. Que tal a primeira hoje?' : 'Nenhuma corrida visível.'}
          </Text>
          {isOwn ? (
            <Button label="Começar a correr" onPress={() => router.navigate('/record')} />
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <RunCard run={item} onPress={() => router.push(`/run/${item.id}`)} />
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
