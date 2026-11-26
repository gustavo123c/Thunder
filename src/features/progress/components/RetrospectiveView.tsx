import { Text, View } from 'react-native';

import { ProgressDashboard } from './ProgressDashboard';
import { WinStreakCard } from './WinStreakCard';

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="gap-0.5 px-1">
      <Text accessibilityRole="header" className="text-lg font-extrabold text-ink-50">
        {title}
      </Text>
      <Text className="text-sm text-ink-400">{subtitle}</Text>
    </View>
  );
}

/** Retrospective screen body: consistency (win streak) and period-over-period performance. */
export function RetrospectiveView({ userId }: { userId: string }) {
  return (
    <>
      <SectionTitle title="Constância" subtitle="Semanas seguidas e treinos na semana e no mês." />
      <WinStreakCard userId={userId} />
      <SectionTitle
        title="Evolução"
        subtitle="Compare pace, distância e treinos com o período anterior."
      />
      <ProgressDashboard userId={userId} />
    </>
  );
}
