import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { periodRange } from '@/domain/insights/activity';

import {
  createGroup,
  deleteGroup,
  fetchGroupFeed,
  fetchLeaderboard,
  fetchMyGroups,
  joinGroup,
  leaveGroup,
} from '../api/groups.api';
import { type FeedCursor, nextFeedCursor } from '../api/social.api';

export const groupKeys = {
  all: ['groups'] as const,
  mine: ['groups', 'mine'] as const,
  leaderboard: (groupId: string) => ['groups', groupId, 'leaderboard'] as const,
  feed: (groupId: string) => ['groups', groupId, 'feed'] as const,
};

export function useMyGroups() {
  return useQuery({ queryKey: groupKeys.mine, queryFn: fetchMyGroups });
}

export function useGroup(groupId: string) {
  const groups = useMyGroups();
  return { ...groups, data: groups.data?.find((g) => g.id === groupId) };
}

/** Weekly ranking (week starts on Monday, local time). */
export function useGroupLeaderboard(groupId: string) {
  return useQuery({
    queryKey: groupKeys.leaderboard(groupId),
    queryFn: () => fetchLeaderboard(groupId, periodRange('week', new Date()).start),
  });
}

export function useGroupFeed(groupId: string) {
  return useInfiniteQuery({
    queryKey: groupKeys.feed(groupId),
    queryFn: ({ pageParam }) => fetchGroupFeed(groupId, pageParam),
    initialPageParam: null as FeedCursor,
    getNextPageParam: (lastPage) => nextFeedCursor(lastPage),
  });
}

function useGroupMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export const useCreateGroup = () => useGroupMutation((name: string) => createGroup(name));
export const useJoinGroup = () => useGroupMutation((code: string) => joinGroup(code));
export const useDeleteGroup = () => useGroupMutation((groupId: string) => deleteGroup(groupId));
export const useLeaveGroup = (userId: string) =>
  useGroupMutation((groupId: string) => leaveGroup(groupId, userId));
