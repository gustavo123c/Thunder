import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import type { RunMediaItem } from '@/domain/types/run';

import { MediaViewer } from './MediaViewer';
import { useSignedMediaUrls } from './useSignedMediaUrls';

type RunMediaGalleryProps = {
  media: readonly RunMediaItem[];
  /** Thumbnail edge in px. */
  size?: number;
  /** Show at most this many, with a "+N" badge on the last one. */
  maxVisible?: number;
  /** Owner actions: long-press a thumbnail to remove it. */
  onRemove?: (item: RunMediaItem) => void;
};

/** Horizontal strip of photo/video thumbnails; tap to open, videos play in the viewer. */
export function RunMediaGallery({
  media,
  size = 96,
  maxVisible = 10,
  onRemove,
}: RunMediaGalleryProps) {
  const urls = useSignedMediaUrls(media.map((m) => m.path));
  const [open, setOpen] = useState<RunMediaItem | null>(null);

  if (media.length === 0) return null;

  const visible = media.slice(0, maxVisible);
  const hidden = media.length - visible.length;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {visible.map((item, index) => {
          const url = urls.data?.[item.path];
          const isLast = index === visible.length - 1 && hidden > 0;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.type === 'video' ? 'Abrir vídeo' : 'Abrir foto'}
              accessibilityHint={onRemove ? 'Toque e segure para remover' : undefined}
              onPress={() => setOpen(item)}
              onLongPress={onRemove ? () => onRemove(item) : undefined}
              className="overflow-hidden rounded-2xl bg-ink-700"
              style={{ width: size, height: size }}
            >
              {url ? (
                item.type === 'image' ? (
                  <Image
                    source={{ uri: url }}
                    style={{ width: size, height: size }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center bg-ink-900">
                    <Ionicons name="play-circle" size={size * 0.4} color="#fff" />
                  </View>
                )
              ) : (
                <Skeleton width={size} height={size} radius={16} />
              )}
              {item.type === 'video' && url ? (
                <View className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5">
                  <Text className="text-[10px] font-semibold text-white">
                    {item.durationS ? `${Math.round(item.durationS)}s` : 'vídeo'}
                  </Text>
                </View>
              ) : null}
              {isLast ? (
                <View className="absolute inset-0 items-center justify-center bg-black/50">
                  <Text className="text-xl font-bold text-white">+{hidden}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <MediaViewer
        item={open}
        url={open ? urls.data?.[open.path] : undefined}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
