import * as ImagePicker from 'expo-image-picker';
import { Alert, Text, View } from 'react-native';

import { RunMediaGallery } from '@/components/media/RunMediaGallery';
import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import { Skeleton } from '@/components/ui/Skeleton';
import { MEDIA_LIMITS } from '@/domain/media/media-rules';
import type { RunMediaItem } from '@/domain/types/run';

import { useAddRunMedia, useRemoveRunMedia } from '../hooks/useMedia';
import { describeMediaError } from '../media-errors';

type RunMediaSectionProps = {
  runId: string;
  media: readonly RunMediaItem[];
  /** The run owner can add and remove media. */
  ownerId: string | null;
};

export function RunMediaSection({ runId, media, ownerId }: RunMediaSectionProps) {
  const isOwner = ownerId !== null;
  const add = useAddRunMedia(ownerId ?? '', runId);
  const remove = useRemoveRunMedia();
  const remaining = MEDIA_LIMITS.maxItemsPerRun - media.length;

  if (!isOwner && media.length === 0) return null;

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      videoMaxDuration: MEDIA_LIMITS.videoMaxDurationS,
    });
    if (!result.canceled && result.assets.length > 0) {
      add.mutate({ assets: result.assets, existingCount: media.length });
    }
  }

  function confirmRemove(item: RunMediaItem) {
    Alert.alert(item.type === 'video' ? 'Remover vídeo?' : 'Remover foto?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => remove.mutate(item) },
    ]);
  }

  const failures = add.data?.failed ?? [];
  const uploadingCount = add.isPending ? (add.variables?.assets.length ?? 1) : 0;

  return (
    <View className="gap-3">
      <Text className="text-lg font-bold text-ink-900 dark:text-ink-50">Fotos e vídeos</Text>

      <RunMediaGallery media={media} onRemove={isOwner ? confirmRemove : undefined} />

      {uploadingCount > 0 ? (
        <View className="flex-row gap-2">
          {Array.from({ length: Math.min(uploadingCount, 4) }, (_, i) => (
            <Skeleton key={i} width={96} height={96} radius={16} />
          ))}
        </View>
      ) : null}

      {failures.length > 0 ? (
        <FormMessage
          message={`${failures.length === 1 ? '1 arquivo não foi enviado' : `${failures.length} arquivos não foram enviados`}: ${describeMediaError(failures[0])}`}
        />
      ) : null}

      {isOwner && remaining > 0 ? (
        <Button
          label={media.length === 0 ? '📷 Adicionar fotos e vídeos' : '📷 Adicionar mais'}
          variant="secondary"
          onPress={() => void pick()}
          loading={add.isPending}
        />
      ) : null}
      {isOwner && media.length > 0 ? (
        <Text className="text-xs text-ink-400">
          Toque e segure uma foto ou vídeo para remover. Máx. {MEDIA_LIMITS.maxItemsPerRun} por
          corrida.
        </Text>
      ) : null}
    </View>
  );
}
