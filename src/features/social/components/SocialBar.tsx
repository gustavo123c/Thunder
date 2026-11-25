import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { useToggleKudo } from '../hooks/useSocial';
import { KudosButton } from './KudosButton';

type SocialBarProps = {
  run: { id: string; userId: string; hasKudo: boolean; kudosCount: number; commentsCount: number };
  viewerId: string;
};

/** Raio + comments row used on feed cards and the run detail. */
export function SocialBar({ run, viewerId }: SocialBarProps) {
  const toggleKudo = useToggleKudo(viewerId);
  const isOwn = run.userId === viewerId;

  return (
    <View className="flex-row items-center gap-2 border-t border-ink-100 pt-2 dark:border-ink-700">
      <KudosButton
        liked={run.hasKudo}
        count={run.kudosCount}
        disabled={isOwn}
        onToggle={(liked) => toggleKudo.mutate({ runId: run.id, liked })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Comentários: ${run.commentsCount}`}
        hitSlop={8}
        onPress={() => router.push(`/run/${run.id}/comments`)}
        className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
      >
        <Ionicons name="chatbubble-outline" size={19} color={colors.ink[400]} />
        <Text className="text-sm font-semibold text-ink-500 dark:text-ink-300">
          {run.commentsCount}
        </Text>
      </Pressable>
    </View>
  );
}
