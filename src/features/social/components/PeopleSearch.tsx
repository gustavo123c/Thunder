import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/theme/tokens';

import { useProfileSearch } from '../hooks/useSocial';
import { displayName } from './AuthorRow';
import { FollowButton } from './FollowButton';

export function PeopleSearch({ viewerId }: { viewerId: string }) {
  const [query, setQuery] = useState('');
  const search = useProfileSearch(query);
  const tooShort = query.trim().length < 2;

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <TextField
        label="Buscar corredores"
        value={query}
        onChangeText={setQuery}
        placeholder="Nome ou @usuário"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="search"
      />
      <FlatList
        data={tooShort ? [] : (search.data ?? [])}
        keyExtractor={(profile) => profile.id}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-3 pb-8"
        ListEmptyComponent={
          search.isFetching ? (
            <ActivityIndicator color={colors.bolt[500]} />
          ) : (
            <Text className="py-6 text-center text-base text-ink-500 dark:text-ink-300">
              {tooShort
                ? 'Digite pelo menos 2 letras.'
                : search.isError
                  ? 'Não foi possível buscar agora.'
                  : 'Ninguém encontrado com esse nome.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-3 rounded-2xl bg-white p-3 dark:bg-ink-800">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Perfil de ${displayName(item)}`}
              onPress={() => router.push(`/user/${item.id}`)}
              className="flex-1 flex-row items-center gap-3"
            >
              <Avatar name={displayName(item)} imageUrl={item.avatarUrl} size={44} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink-900 dark:text-ink-50">
                  {displayName(item)}
                </Text>
                {item.username ? (
                  <Text className="text-sm text-ink-400">@{item.username}</Text>
                ) : null}
              </View>
            </Pressable>
            <FollowButton viewerId={viewerId} targetId={item.id} isFollowing={item.isFollowing} />
          </View>
        )}
      />
    </View>
  );
}
