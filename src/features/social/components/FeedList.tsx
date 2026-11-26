import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { RunMediaGallery } from '@/components/media/RunMediaGallery';
import { RunCard } from '@/components/run/RunCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useThemeColors } from '@/theme/theme';

import { useFeed } from '../hooks/useSocial';
import { AuthorRow } from './AuthorRow';
import { SocialBar } from './SocialBar';

export function FeedList({ viewerId }: { viewerId: string }) {
  const theme = useThemeColors();
  const feed = useFeed();
  const items = feed.data?.pages.flat() ?? [];

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
      ListHeaderComponent={
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-3xl font-extrabold text-ink-50">Feed</Text>
            <Ionicons name="flash" size={22} color={theme.accent} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Encontrar corredores"
            hitSlop={8}
            onPress={() => router.push('/people')}
            className="h-11 w-11 items-center justify-center rounded-full border border-hairline bg-ink-800"
          >
            <Ionicons name="person-add-outline" size={20} color={theme.accent} />
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="people-outline"
          title="Seu feed está vazio"
          description="Siga outros corredores para ver os treinos deles aqui e dar aquele Raio de incentivo."
          action={
            <Button
              label="Encontrar corredores"
              icon="person-add-outline"
              onPress={() => router.push('/people')}
            />
          }
        />
      }
      renderItem={({ item }) => (
        <RunCard
          run={item}
          onPress={() => router.push(`/run/${item.id}`)}
          header={<AuthorRow author={item.author} isViewer={item.userId === viewerId} />}
          media={
            item.media.length > 0 ? (
              <RunMediaGallery media={item.media} size={84} maxVisible={4} />
            ) : undefined
          }
          footer={<SocialBar run={item} viewerId={viewerId} />}
        />
      )}
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
