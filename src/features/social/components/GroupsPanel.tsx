import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useThemeColors } from '@/theme/theme';

import { useMyGroups } from '../hooks/useGroups';

/** "Grupos" tab of the feed: my running groups + create / join. */
export function GroupsPanel({ header = null }: { header?: ReactElement | null }) {
  const theme = useThemeColors();
  const groups = useMyGroups();

  return (
    <FlatList
      data={groups.data ?? []}
      keyExtractor={(group) => group.id}
      contentContainerClassName="gap-3 px-4 pb-8 pt-4"
      ListHeaderComponent={
        <View className="gap-4 pb-1">
          {header}
          <Text className="text-sm text-ink-400">
            Corra com amigos: ranking semanal e feed só do grupo.
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Criar grupo" icon="add" onPress={() => router.push('/group/new')} />
            </View>
            <View className="flex-1">
              <Button
                label="Entrar com código"
                icon="key-outline"
                variant="secondary"
                onPress={() => router.push('/group/join')}
              />
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        groups.isPending ? (
          <ActivityIndicator color={theme.accent} />
        ) : groups.isError ? (
          <Text className="py-6 text-center text-sm text-danger">
            Não foi possível carregar seus grupos.
          </Text>
        ) : (
          <EmptyState
            compact
            icon="people-circle-outline"
            title="Você ainda não está em um grupo"
            description="Crie um grupo e mande o código para seus amigos, ou entre com o código de alguém."
          />
        )
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Grupo ${item.name}, ${item.memberCount} membros`}
          onPress={() => router.push(`/group/${item.id}`)}
          className="flex-row items-center gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4 active:opacity-80"
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-bolt-500/15">
            <Ionicons name="people" size={22} color={theme.accent} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-semibold text-ink-50" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-xs text-ink-400">
              {item.memberCount} {item.memberCount === 1 ? 'membro' : 'membros'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.ink[400]} />
        </Pressable>
      )}
      refreshControl={
        <RefreshControl
          refreshing={groups.isRefetching}
          onRefresh={() => void groups.refetch()}
          tintColor={theme.accent}
        />
      }
    />
  );
}
