import { View } from 'react-native';

import { useUserId } from '@/features/auth';
import { PeopleSearch } from '@/features/social';

export default function PeopleScreen() {
  const viewerId = useUserId();

  return (
    <View className="flex-1 bg-ink-900">
      <PeopleSearch viewerId={viewerId} />
    </View>
  );
}
