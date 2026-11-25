import { Text, View } from 'react-native';

import { formatDistanceKm } from '@/lib/format';

import { useProfileStats } from '../hooks/useSocial';
import { FollowButton } from './FollowButton';

type ProfileStatsRowProps = {
  userId: string;
  viewerId: string;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className="text-xl font-bold text-ink-900 dark:text-ink-50">{value}</Text>
      <Text className="text-xs text-ink-400">{label}</Text>
    </View>
  );
}

/** Followers / following / runs / km, plus a follow button when viewing someone else. */
export function ProfileStatsRow({ userId, viewerId }: ProfileStatsRowProps) {
  const { data: stats } = useProfileStats(userId);
  const isViewer = userId === viewerId;

  return (
    <View className="gap-4">
      <View className="flex-row rounded-2xl bg-white py-4 dark:bg-ink-800">
        <Stat label="Seguidores" value={stats ? String(stats.followersCount) : '–'} />
        <Stat label="Seguindo" value={stats ? String(stats.followingCount) : '–'} />
        <Stat label="Corridas" value={stats ? String(stats.runsCount) : '–'} />
        <Stat label="Total" value={stats ? formatDistanceKm(stats.totalDistanceM) : '–'} />
      </View>
      {!isViewer && stats ? (
        <View className="items-center">
          <FollowButton viewerId={viewerId} targetId={userId} isFollowing={stats.isFollowing} />
        </View>
      ) : null}
    </View>
  );
}
