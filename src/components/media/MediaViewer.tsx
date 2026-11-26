import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RunMediaItem } from '@/domain/types/run';

function VideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="contain"
      nativeControls
    />
  );
}

type MediaViewerProps = {
  item: RunMediaItem | null;
  url: string | undefined;
  onClose: () => void;
};

/** Full-screen photo viewer / video player. */
export function MediaViewer({ item, url, onClose }: MediaViewerProps) {
  return (
    <Modal visible={item !== null} animationType="fade" onRequestClose={onClose} transparent>
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onClose}
            hitSlop={12}
            className="z-10 m-3 h-10 w-10 items-center justify-center self-end rounded-full bg-white/20"
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <View className="flex-1 items-center justify-center">
            {item && url ? (
              item.type === 'video' ? (
                <VideoPlayer url={url} />
              ) : (
                <Image
                  source={{ uri: url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  accessibilityLabel="Foto da corrida"
                />
              )
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
