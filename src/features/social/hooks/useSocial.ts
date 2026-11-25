import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { RunDetail } from '@/services/supabase/run-json';
import type { FeedItem } from '@/services/supabase/social-json';

import {
  addComment,
  deleteComment,
  type FeedCursor,
  fetchComments,
  fetchFeed,
  fetchProfileStats,
  follow,
  giveKudo,
  nextFeedCursor,
  removeKudo,
  searchProfiles,
  unfollow,
} from '../api/social.api';
import { applyKudo, applyKudoToPages } from '../kudos-cache';

export const socialKeys = {
  feed: ['runs', 'feed'] as const, // under ['runs'] so uploads refresh the feed too
  runDetail: (runId: string) => ['runs', 'detail', runId] as const,
  comments: (runId: string) => ['comments', runId] as const,
  search: (query: string) => ['profiles', 'search', query] as const,
  stats: (userId: string) => ['profiles', 'stats', userId] as const,
};

export function useFeed() {
  return useInfiniteQuery({
    queryKey: socialKeys.feed,
    queryFn: ({ pageParam }) => fetchFeed(pageParam),
    initialPageParam: null as FeedCursor,
    getNextPageParam: (lastPage) => nextFeedCursor(lastPage),
  });
}

type FeedData = { pages: FeedItem[][]; pageParams: unknown[] };

/**
 * Optimistic "Raio": the feed and the run detail update instantly and roll back
 * if the server rejects the change.
 */
export function useToggleKudo(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, liked }: { runId: string; liked: boolean }) =>
      liked ? giveKudo(runId, userId) : removeKudo(runId, userId),

    onMutate: async ({ runId, liked }) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.feed });
      await queryClient.cancelQueries({ queryKey: socialKeys.runDetail(runId) });

      const previousFeed = queryClient.getQueryData<FeedData>(socialKeys.feed);
      const previousDetail = queryClient.getQueryData<RunDetail>(socialKeys.runDetail(runId));

      queryClient.setQueryData<FeedData>(socialKeys.feed, (data) =>
        applyKudoToPages(data, runId, liked),
      );
      queryClient.setQueryData<RunDetail>(socialKeys.runDetail(runId), (data) =>
        data ? applyKudo(data, runId, liked) : data,
      );
      return { previousFeed, previousDetail };
    },

    onError: (_error, { runId }, context) => {
      queryClient.setQueryData(socialKeys.feed, context?.previousFeed);
      queryClient.setQueryData(socialKeys.runDetail(runId), context?.previousDetail);
    },
  });
}

export function useComments(runId: string) {
  return useQuery({ queryKey: socialKeys.comments(runId), queryFn: () => fetchComments(runId) });
}

function useRefreshAfterComment(runId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: socialKeys.comments(runId) }),
      queryClient.invalidateQueries({ queryKey: socialKeys.runDetail(runId) }),
      queryClient.invalidateQueries({ queryKey: socialKeys.feed }),
    ]);
}

export function useAddComment(runId: string, userId: string) {
  const refresh = useRefreshAfterComment(runId);
  return useMutation({
    mutationFn: (body: string) => addComment(runId, userId, body),
    onSuccess: refresh,
  });
}

export function useDeleteComment(runId: string) {
  const refresh = useRefreshAfterComment(runId);
  return useMutation({ mutationFn: deleteComment, onSuccess: refresh });
}

/** Debounces a value (e.g. a search box) so we don't query on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useProfileSearch(rawQuery: string) {
  const query = useDebouncedValue(rawQuery.trim());
  return useQuery({
    queryKey: socialKeys.search(query),
    queryFn: () => searchProfiles(query),
    enabled: query.length >= 2,
    placeholderData: (previous) => previous,
  });
}

export function useProfileStats(userId: string) {
  return useQuery({ queryKey: socialKeys.stats(userId), queryFn: () => fetchProfileStats(userId) });
}

export function useToggleFollow(viewerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetId, following }: { targetId: string; following: boolean }) =>
      following ? follow(viewerId, targetId) : unfollow(viewerId, targetId),
    onSettled: (_data, _error, { targetId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profiles'] }),
        queryClient.invalidateQueries({ queryKey: socialKeys.stats(targetId) }),
        queryClient.invalidateQueries({ queryKey: socialKeys.feed }),
      ]),
  });
}
