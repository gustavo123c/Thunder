import { Text, View } from 'react-native';

import { formatDecimal } from '@/lib/format';

import { useProfileStats } from '../hooks/useSocial';
import { FollowButton } from './FollowButton';

type ProfileStatsRowProps = {
  userId: string;
  viewerId: string;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text
        className="text-[22px] font-extrabold text-ink-50"
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text className="text-[11px] uppercase tracking-wider text-ink-400">{label}</Text>
    </View>
  );
}

/** Followers / following / runs / km, plus a follow button when viewing someone else. */
export function ProfileStatsRow({ userId, viewerId }: ProfileStatsRowProps) {
  const { data: stats } = useProfileStats(userId);
  const isViewer = userId === viewerId;

  return (
    <View className="gap-4">
      <View className="flex-row rounded-[20px] border border-hairline bg-ink-800 py-4">
        <Stat label="Seguidores" value={stats ? String(stats.followersCount) : '–'} />
        <Stat label="Seguindo" value={stats ? String(stats.followingCount) : '–'} />
        <Stat label="Corridas" value={stats ? String(stats.runsCount) : '–'} />
        <Stat label="Km totais" value={stats ? formatDecimal(stats.totalDistanceM / 1000) : '–'} />
      </View>
      {!isViewer && stats ? (
        <View className="items-center">
          <FollowButton viewerId={viewerId} targetId={userId} isFollowing={stats.isFollowing} />
        </View>
      ) : null}
    </View>
  );
}
