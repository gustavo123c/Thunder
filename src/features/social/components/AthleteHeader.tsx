import { Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';

import { useProfileStats } from '../hooks/useSocial';
import { displayName } from './AuthorRow';
import { ProfileStatsRow } from './ProfileStatsRow';

/** Header of another athlete's profile page: avatar, name, stats and follow button. */
export function AthleteHeader({ userId, viewerId }: { userId: string; viewerId: string }) {
  const { data: stats } = useProfileStats(userId);
  const profile = stats?.profile;
  const name = profile ? displayName(profile) : null;

  return (
    <View className="gap-5 pb-2">
      <View className="items-center gap-2">
        <Avatar name={name} imageUrl={profile?.avatarUrl} size={88} />
        <Text className="text-2xl font-bold text-ink-50">{name ?? ' '}</Text>
        {profile?.username ? (
          <Text className="text-base text-ink-400">@{profile.username}</Text>
        ) : null}
      </View>
      <ProfileStatsRow userId={userId} viewerId={viewerId} />
    </View>
  );
}
