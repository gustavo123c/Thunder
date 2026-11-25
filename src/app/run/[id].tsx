import { useLocalSearchParams } from 'expo-router';

import { useUserId } from '@/features/auth';
import { RunDetailView } from '@/features/run-history';

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();

  return <RunDetailView runId={id} viewerId={userId} />;
}
