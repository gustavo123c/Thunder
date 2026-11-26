import { useLocalSearchParams } from 'expo-router';

import { useUserId } from '@/features/auth';
import { GroupDetailView } from '@/features/social';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GroupDetailView groupId={id} viewerId={useUserId()} />;
}
