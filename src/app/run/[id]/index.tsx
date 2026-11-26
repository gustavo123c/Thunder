import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useUserId } from '@/features/auth';
import { RunMediaSection } from '@/features/media';
import { RunDetailView } from '@/features/run-history';
import { CommentsPreview, SocialBar } from '@/features/social';

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();

  return (
    <RunDetailView
      runId={id}
      viewerId={userId}
      renderMedia={(detail) => (
        <RunMediaSection
          runId={detail.id}
          media={detail.media}
          ownerId={detail.userId === userId ? userId : null}
        />
      )}
      renderSocial={(detail) => (
        <View className="gap-6">
          <SocialBar run={detail} viewerId={userId} />
          <CommentsPreview runId={detail.id} viewerId={userId} />
        </View>
      )}
    />
  );
}
