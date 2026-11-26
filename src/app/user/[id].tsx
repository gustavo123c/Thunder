import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useUserId } from '@/features/auth';
import { RunHistoryList } from '@/features/run-history';
import { AthleteHeader } from '@/features/social';

export default function AthleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewerId = useUserId();

  return (
    <View className="flex-1 bg-ink-900">
      <RunHistoryList
        userId={id}
        variant="athlete"
        header={<AthleteHeader userId={id} viewerId={viewerId} />}
      />
    </View>
  );
}
