import { useLocalSearchParams } from 'expo-router';

import { useUserId } from '@/features/auth';
import { CommentsView } from '@/features/social';

export default function RunCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();

  return <CommentsView runId={id} viewerId={userId} />;
}
