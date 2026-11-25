import {
  asArray,
  asObject,
  num,
  parseAuthor,
  parseRunRecord,
  type RunAuthor,
  str,
} from './run-json';

import type { RunRecord } from '@/domain/types/run';

export type FeedItem = RunRecord & { author: RunAuthor; hasKudo: boolean };

export type RunComment = {
  id: string;
  runId: string;
  body: string;
  createdAt: string;
  author: RunAuthor;
};

export type ProfileSearchResult = RunAuthor & { isFollowing: boolean };

export type ProfileStats = {
  profile: RunAuthor;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  runsCount: number;
  totalDistanceM: number;
};

export function parseFeed(value: unknown): FeedItem[] {
  return asArray(value, 'feed').map((item) => {
    const obj = asObject(item, 'feed_item');
    return {
      ...parseRunRecord(obj),
      author: parseAuthor(obj.author),
      hasKudo: obj.has_kudo === true,
    };
  });
}

export function parseComments(value: unknown): RunComment[] {
  return asArray(value, 'comments').map((item) => {
    const obj = asObject(item, 'comment');
    return {
      id: str(obj, 'id'),
      runId: str(obj, 'run_id'),
      body: str(obj, 'body'),
      createdAt: str(obj, 'created_at'),
      author: parseAuthor(obj.author),
    };
  });
}

export function parseProfileSearch(value: unknown): ProfileSearchResult[] {
  return asArray(value, 'profiles').map((item) => {
    const obj = asObject(item, 'profile');
    return { ...parseAuthor(obj), isFollowing: obj.is_following === true };
  });
}

export function parseProfileStats(value: unknown): ProfileStats {
  const obj = asObject(value, 'stats');
  return {
    profile: parseAuthor(obj.profile),
    followersCount: num(obj, 'followers_count'),
    followingCount: num(obj, 'following_count'),
    isFollowing: obj.is_following === true,
    runsCount: num(obj, 'runs_count'),
    totalDistanceM: num(obj, 'total_distance_m'),
  };
}
