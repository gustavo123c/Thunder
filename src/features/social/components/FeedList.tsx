import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { RunCard } from '@/components/run/RunCard';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors } from '@/theme/tokens';

import { useFeed } from '../hooks/useSocial';
import { AuthorRow } from './AuthorRow';
import { SocialBar } from './SocialBar';

export function FeedList({ viewerId }: { viewerId: string }) {
  const feed = useFeed();
  const items = feed.data?.pages.flat() ?? [];

  if (feed.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.bolt[500]} />
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
      ListHeaderComponent={
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-black text-ink-900 dark:text-ink-50">
            Feed <Text className="text-bolt-500">⚡</Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Encontrar corredores"
            hitSlop={8}
            onPress={() => router.push('/people')}
            className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-ink-800"
          >
            <Ionicons name="person-add-outline" size={20} color={colors.bolt[600]} />
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <View className="items-center gap-4 py-16">
          <Text className="text-5xl">👟</Text>
          <Text className="text-center text-base text-ink-500 dark:text-ink-300">
            Siga outros corredores para ver os treinos deles aqui — e dar aquele raio de incentivo.
          </Text>
          <Button label="Encontrar corredores" onPress={() => router.push('/people')} />
        </View>
      }
      renderItem={({ item }) => (
        <RunCard
          run={item}
          onPress={() => router.push(`/run/${item.id}`)}
          header={<AuthorRow author={item.author} isViewer={item.userId === viewerId} />}
          footer={<SocialBar run={item} viewerId={viewerId} />}
        />
      )}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      }}
      ListFooterComponent={
        feed.isFetchingNextPage ? <ActivityIndicator color={colors.bolt[500]} /> : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => void feed.refetch()}
          tintColor={colors.bolt[500]}
        />
      }
    />
  );
}
