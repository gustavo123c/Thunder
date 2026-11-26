import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRunDate } from '@/lib/format';

import { useComments } from '../hooks/useSocial';
import { displayName } from './AuthorRow';

const PREVIEW_COUNT = 3;

/** Latest comments shown inline on the run detail, with a link to the full thread. */
export function CommentsPreview({ runId, viewerId }: { runId: string; viewerId: string }) {
  const comments = useComments(runId);
  const list = comments.data ?? [];
  const latest = list.slice(-PREVIEW_COUNT);

  return (
    <View className="gap-3">
      <Text className="text-lg font-bold text-ink-900 dark:text-ink-50">
        Comentários{list.length > 0 ? ` (${list.length})` : ''}
      </Text>

      {comments.isPending ? <Skeleton height={56} /> : null}

      {latest.map((comment) => (
        <View key={comment.id} className="flex-row gap-3">
          <Avatar
            name={displayName(comment.author)}
            imageUrl={comment.author.avatarUrl}
            size={30}
          />
          <View className="flex-1 gap-0.5 rounded-2xl border border-hairline bg-ink-800 p-3">
            <View className="flex-row items-baseline justify-between gap-2">
              <Text className="font-semibold text-ink-900 dark:text-ink-50">
                {comment.author.id === viewerId ? 'Você' : displayName(comment.author)}
              </Text>
              <Text className="text-xs text-ink-400">{formatRunDate(comment.createdAt)}</Text>
            </View>
            <Text className="text-base text-ink-700 dark:text-ink-100">{comment.body}</Text>
          </View>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/run/${runId}/comments`)}
        className="items-center rounded-2xl border border-ink-200 py-3 active:bg-ink-100 dark:border-ink-700 dark:active:bg-ink-800"
      >
        <Text className="font-semibold text-bolt-600">
          {list.length > PREVIEW_COUNT
            ? `Ver todos os ${list.length} comentários`
            : list.length > 0
              ? 'Ver comentários e responder'
              : 'Escrever um comentário ou nota'}
        </Text>
      </Pressable>
    </View>
  );
}
