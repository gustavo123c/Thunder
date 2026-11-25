import { Text, View } from 'react-native';

import type { Profile } from '@/domain/types/profile';
import { formatPace, formatWeightKg } from '@/lib/format';

import { GOAL_COPY, LEVEL_COPY } from '../labels';

function initialsOf(profile: Profile): string {
  const source = profile.fullName ?? profile.username ?? '?';
  const parts = source.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-1 rounded-2xl bg-white p-4 dark:bg-ink-800">
      <Text className="text-sm text-ink-400">{label}</Text>
      <Text className="text-xl font-bold text-ink-900 dark:text-ink-50">{value}</Text>
    </View>
  );
}

export function ProfileSummary({ profile }: { profile: Profile }) {
  const goal = profile.mainGoal ? GOAL_COPY[profile.mainGoal] : null;

  return (
    <View className="gap-6">
      <View className="items-center gap-2">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-bolt-500">
          <Text className="text-3xl font-bold text-ink-900">{initialsOf(profile)}</Text>
        </View>
        <Text className="text-2xl font-bold text-ink-900 dark:text-ink-50">
          {profile.fullName ?? profile.username}
        </Text>
        {profile.username ? (
          <Text className="text-base text-ink-500 dark:text-ink-300">@{profile.username}</Text>
        ) : null}
        {profile.level ? (
          <View className="rounded-full bg-ink-900 px-3 py-1 dark:bg-bolt-500">
            <Text className="text-sm font-semibold text-bolt-400 dark:text-ink-900">
              {LEVEL_COPY[profile.level].title}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row gap-3">
        <StatTile label="Peso" value={formatWeightKg(profile.weightKg)} />
        <StatTile
          label="Altura"
          value={profile.heightCm === null ? '--' : `${profile.heightCm} cm`}
        />
      </View>

      {goal ? (
        <View className="gap-1 rounded-2xl border-2 border-bolt-500 bg-bolt-50 p-4 dark:bg-ink-800">
          <Text className="text-sm font-medium text-bolt-700 dark:text-bolt-400">
            Meta principal
          </Text>
          <Text className="text-lg font-bold text-ink-900 dark:text-ink-50">{goal.title}</Text>
          <Text className="text-sm text-ink-500 dark:text-ink-300">
            {profile.goalTargetPaceSPerKm
              ? `Pace alvo: ${formatPace(profile.goalTargetPaceSPerKm)}`
              : goal.description}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
