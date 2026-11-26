import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { useUserId } from '@/features/auth';
import { RunHistoryList } from '@/features/run-history';
import { PendingRunsBanner } from '@/features/run-tracking';
import { colors } from '@/theme/tokens';

function RetrospectiveButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retrospectiva"
      accessibilityHint="Abre sua sequência de treinos e o desempenho por período"
      hitSlop={8}
      onPress={() => router.push('/retrospective')}
      className="flex-row items-center gap-1.5 rounded-full border border-bolt-500/40 bg-bolt-500/10 px-3.5 py-2 active:opacity-70"
    >
      <Ionicons name="stats-chart" size={14} color={colors.bolt[500]} />
      <Text className="text-sm font-bold text-bolt-500">Retrospectiva</Text>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const userId = useUserId();

  return (
    <Screen className="px-0">
      <RunHistoryList
        userId={userId}
        titleAction={<RetrospectiveButton />}
        header={<PendingRunsBanner userId={userId} />}
      />
    </Screen>
  );
}
