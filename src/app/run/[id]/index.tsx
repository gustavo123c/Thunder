import { useLocalSearchParams } from 'expo-router';

import { useUserId } from '@/features/auth';
import { RunDetailView } from '@/features/run-history';
import { SocialBar } from '@/features/social';

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();

  return (
    <RunDetailView
      runId={id}
      viewerId={userId}
      renderSocial={(detail) => <SocialBar run={detail} viewerId={userId} />}
    />
  );
}
