import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import type { RunAuthor } from '@/services/supabase/run-json';

export function displayName(author: Pick<RunAuthor, 'fullName' | 'username'>): string {
  return author.fullName ?? author.username ?? 'Corredor';
}

export function AuthorRow({ author, isViewer }: { author: RunAuthor; isViewer: boolean }) {
  const name = isViewer ? 'Você' : displayName(author);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Perfil de ${name}`}
      onPress={() => router.push(isViewer ? '/profile' : `/user/${author.id}`)}
      className="flex-row items-center gap-3"
    >
      <Avatar name={displayName(author)} imageUrl={author.avatarUrl} size={36} />
      <View>
        <Text className="text-base font-semibold text-ink-50">{name}</Text>
        {author.username && !isViewer ? (
          <Text className="text-xs text-ink-400">@{author.username}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
