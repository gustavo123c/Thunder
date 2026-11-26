import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { useUserId } from '@/features/auth';
import { ProgressDashboard, WinStreakCard } from '@/features/progress';
import { RunHistoryList } from '@/features/run-history';
import { PendingRunsBanner } from '@/features/run-tracking';

export default function HistoryScreen() {
  const userId = useUserId();

  return (
    <Screen className="px-0">
      <RunHistoryList
        userId={userId}
        header={
          <View className="gap-4">
            <PendingRunsBanner userId={userId} />
            <WinStreakCard userId={userId} />
            <ProgressDashboard userId={userId} />
          </View>
        }
      />
    </Screen>
  );
}
