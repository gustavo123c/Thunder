import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormMessage } from '@/components/ui/FormMessage';
import { formatRunDate } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import { MAX_COMMENT_LENGTH } from '../api/social.api';
import { useAddComment, useComments, useDeleteComment } from '../hooks/useSocial';
import { displayName } from './AuthorRow';

export function CommentsView({ runId, viewerId }: { runId: string; viewerId: string }) {
  const theme = useThemeColors();
  const comments = useComments(runId);
  const addComment = useAddComment(runId, viewerId);
  const deleteComment = useDeleteComment(runId);
  const [body, setBody] = useState('');

  const trimmed = body.trim();
  const canSend =
    trimmed.length > 0 && trimmed.length <= MAX_COMMENT_LENGTH && !addComment.isPending;

  function send() {
    if (!canSend) return;
    addComment.mutate(trimmed, { onSuccess: () => setBody('') });
  }

  function confirmDelete(commentId: string) {
    Alert.alert('Apagar comentário?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => deleteComment.mutate(commentId) },
    ]);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="flex-1 bg-ink-900"
    >
      {comments.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={comments.data ?? []}
          keyExtractor={(comment) => comment.id}
          contentContainerClassName="gap-4 p-4"
          ListEmptyComponent={
            <EmptyState
              compact
              icon={comments.isError ? 'cloud-offline-outline' : 'chatbubbles-outline'}
              title={comments.isError ? 'Não foi possível carregar' : 'Nenhum comentário ainda'}
              description={comments.isError ? undefined : 'Mande um incentivo ou deixe uma nota.'}
            />
          }
          renderItem={({ item }) => {
            const own = item.author.id === viewerId;
            return (
              <Pressable
                onLongPress={own ? () => confirmDelete(item.id) : undefined}
                accessibilityHint={own ? 'Toque e segure para apagar' : undefined}
                className="flex-row gap-3"
              >
                <Avatar
                  name={displayName(item.author)}
                  imageUrl={item.author.avatarUrl}
                  size={34}
                />
                <View className="flex-1 gap-1 rounded-2xl border border-hairline bg-ink-800 p-3">
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text className="font-semibold text-ink-50">
                      {own ? 'Você' : displayName(item.author)}
                    </Text>
                    <Text className="text-xs text-ink-400">{formatRunDate(item.createdAt)}</Text>
                  </View>
                  <Text className="text-base text-ink-100">{item.body}</Text>
                  {own ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Apagar comentário"
                      hitSlop={8}
                      onPress={() => confirmDelete(item.id)}
                      className="flex-row items-center gap-1 self-end"
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.ink[400]} />
                      <Text className="text-xs text-ink-400">Apagar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <SafeAreaView
        edges={['bottom']}
        className="gap-2 border-t border-hairline bg-ink-800 px-4 pt-3"
      >
        <FormMessage
          message={addComment.isError ? 'Não foi possível enviar. Tente novamente.' : null}
        />
        <View className="flex-row items-end gap-2 pb-2">
          <TextInput
            accessibilityLabel="Escreva um comentário"
            value={body}
            onChangeText={setBody}
            placeholder="Escreva um comentário…"
            placeholderTextColor={theme.ink[300]}
            maxLength={MAX_COMMENT_LENGTH}
            multiline
            className="max-h-28 min-h-11 flex-1 rounded-2xl bg-ink-900 px-4 py-3 text-base text-ink-50"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar comentário"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={send}
            className={`h-11 w-11 items-center justify-center rounded-full bg-bolt-500 ${canSend ? '' : 'opacity-40'}`}
          >
            {addComment.isPending ? (
              <ActivityIndicator color={colors.onBolt} />
            ) : (
              <Ionicons name="send" size={18} color={colors.onBolt} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
