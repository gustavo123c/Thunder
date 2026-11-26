import { asArray, asObject, num, parseAuthor, type RunAuthor, str } from './run-json';

export type RunGroup = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberCount: number;
  createdAt: string;
};

export type LeaderboardRow = {
  author: RunAuthor;
  distanceM: number;
  runs: number;
  movingTimeS: number;
};

/** Output of the list_my_groups RPC. */
export function parseGroups(value: unknown): RunGroup[] {
  return asArray(value, 'groups').map((item) => {
    const obj = asObject(item, 'group');
    return {
      id: str(obj, 'id'),
      name: str(obj, 'name'),
      inviteCode: str(obj, 'invite_code'),
      ownerId: str(obj, 'owner_id'),
      memberCount: num(obj, 'member_count'),
      createdAt: str(obj, 'created_at'),
    };
  });
}

/** Output of the group_leaderboard RPC (already sorted, best first). */
export function parseLeaderboard(value: unknown): LeaderboardRow[] {
  return asArray(value, 'leaderboard').map((item) => {
    const obj = asObject(item, 'leaderboard_row');
    return {
      author: parseAuthor(obj.author),
      distanceM: num(obj, 'distance_m'),
      runs: num(obj, 'runs'),
      movingTimeS: num(obj, 'moving_time_s'),
    };
  });
}
