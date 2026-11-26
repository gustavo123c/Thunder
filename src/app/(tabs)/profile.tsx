import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useUserId } from '@/features/auth';
import { AvatarEditor } from '@/features/media';
import { BodyStatsGrid, GOAL_COPY, ProfileHeader, useProfile } from '@/features/profile';
import {
  AchievementsGrid,
  GoalProgressCard,
  PersonalRecords,
  WinStreakCard,
} from '@/features/progress';
import { ProfileStatsRow, useProfileStats } from '@/features/social';

type ProfileTab = 'summary' | 'records' | 'achievements';

const TABS = [
  { value: 'summary', label: 'Resumo' },
  { value: 'records', label: 'Recordes' },
  { value: 'achievements', label: 'Conquistas' },
] as const satisfies readonly { value: ProfileTab; label: string }[];

export default function ProfileScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);
  const { data: stats } = useProfileStats(userId);
  const [tab, setTab] = useState<ProfileTab>('summary');

  if (!profile) return null;

  const goal = profile.mainGoal;

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-5 pb-10 pt-3" showsVerticalScrollIndicator={false}>
        <ProfileHeader
          profile={profile}
          avatarSlot={
            <AvatarEditor
              userId={userId}
              name={profile.fullName ?? profile.username}
              avatarUrl={profile.avatarUrl}
              size={88}
              showLabel={false}
              ringed
            />
          }
        />
        <ProfileStatsRow userId={userId} viewerId={userId} />

        <SegmentedControl
          role="tab"
          accessibilityLabel="Seções do perfil"
          options={TABS}
          value={tab}
          onChange={setTab}
        />

        {tab === 'summary' ? (
          <View className="gap-4">
            <WinStreakCard userId={userId} />
            {goal ? (
              <GoalProgressCard
                userId={userId}
                goal={goal}
                goalTitle={GOAL_COPY[goal].title}
                goalDescription={GOAL_COPY[goal].description}
                targetPaceSPerKm={profile.goalTargetPaceSPerKm}
              />
            ) : null}
            <BodyStatsGrid profile={profile} />
          </View>
        ) : null}

        {tab === 'records' ? <PersonalRecords userId={userId} /> : null}

        {tab === 'achievements' ? (
          <AchievementsGrid
            userId={userId}
            totals={stats ? { runs: stats.runsCount, distanceM: stats.totalDistanceM } : undefined}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
