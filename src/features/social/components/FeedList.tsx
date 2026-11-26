import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { hasRecordedDistance } from '@/domain/metrics/recorded-distance';
import { useThemeColors } from '@/theme/theme';

import { useFeed } from '../hooks/useSocial';
import { FeedRunCard } from './FeedRunCard';

type FeedListProps = {
  viewerId: string;
  /** Rendered above the runs (the screen header with the Feed | Grupos switch). */
  header?: ReactElement | null;
};

export function FeedList({ viewerId, header = null }: FeedListProps) {
  const theme = useThemeColors();
  const feed = useFeed();
  // Runs where the GPS recorded nothing stay in the owner's history, not in feeds.
  const items = (feed.data?.pages.flat() ?? []).filter((item) =>
    hasRecordedDistance(item.distanceM),
  );

  if (feed.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (feed.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o feed"
        description="Verifique sua conexão e tente novamente."
        primaryAction={{ label: 'Tentar novamente', onPress: () => void feed.refetch() }}
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerClassName="gap-4 px-4 pb-8 pt-4"
      ListHeaderComponent={header ?? undefined}
      ListEmptyComponent={
        <EmptyState
          icon="people-outline"
          illustration="route"
          title="Seu feed está esperando a primeira largada"
          description="Siga corredores ou crie um grupo com amigos para ver os treinos de todo mundo aqui."
          action={
            <>
              <Button
                label="Encontrar corredores"
                icon="person-add-outline"
                onPress={() => router.push('/people')}
              />
              <Button
                label="Criar um grupo"
                icon="people-outline"
                variant="secondary"
                onPress={() => router.push('/group/new')}
              />
            </>
          }
        />
      }
      renderItem={({ item }) => <FeedRunCard item={item} viewerId={viewerId} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      }}
      ListFooterComponent={
        feed.isFetchingNextPage ? <ActivityIndicator color={theme.accent} /> : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => void feed.refetch()}
          tintColor={theme.accent}
        />
      }
    />
  );
}
