import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors } from '@/theme/tokens';

import { useToggleFollow } from '../hooks/useSocial';

type FollowButtonProps = {
  viewerId: string;
  targetId: string;
  isFollowing: boolean;
};

export function FollowButton({ viewerId, targetId, isFollowing }: FollowButtonProps) {
  const toggle = useToggleFollow(viewerId);
  // Show the intended state while the request is in flight.
  const following = toggle.isPending ? (toggle.variables?.following ?? isFollowing) : isFollowing;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={following ? 'Deixar de seguir' : 'Seguir'}
      accessibilityState={{ selected: following, busy: toggle.isPending }}
      disabled={toggle.isPending}
      onPress={() => toggle.mutate({ targetId, following: !following })}
      className={`h-10 min-w-24 items-center justify-center rounded-full px-4 ${
        following ? 'border border-ink-200 dark:border-ink-600' : 'bg-bolt-500'
      }`}
    >
      {toggle.isPending ? (
        <ActivityIndicator color={colors.ink[600]} />
      ) : (
        <Text
          className={`text-sm font-semibold ${following ? 'text-ink-700 dark:text-ink-200' : 'text-ink-900'}`}
        >
          {following ? 'Seguindo' : 'Seguir'}
        </Text>
      )}
    </Pressable>
  );
}
