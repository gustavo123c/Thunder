import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { StatBlock } from '@/components/ui/StatBlock';
import type { Profile } from '@/domain/types/profile';
import { formatPaceValue } from '@/lib/format';
import { colors } from '@/theme/tokens';

import { GOAL_COPY, LEVEL_COPY } from '../labels';

function initialsOf(profile: Profile): string {
  const source = profile.fullName ?? profile.username ?? '?';
  const parts = source.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

type ProfileSummaryProps = {
  profile: Profile;
  /** Replaces the initials avatar (e.g. an editable avatar). */
  avatarSlot?: ReactNode;
};

export function ProfileSummary({ profile, avatarSlot }: ProfileSummaryProps) {
  const goal = profile.mainGoal ? GOAL_COPY[profile.mainGoal] : null;
  const weight =
    profile.weightKg === null
      ? '--'
      : (Math.round(profile.weightKg * 10) / 10).toString().replace('.', ',');

  return (
    <View className="gap-5">
      <View className="items-center gap-2">
        {avatarSlot ?? (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-bolt-500">
            <Text className="text-3xl font-extrabold text-ink-900">{initialsOf(profile)}</Text>
          </View>
        )}
        <Text className="text-2xl font-extrabold text-ink-50">
          {profile.fullName ?? profile.username}
        </Text>
        {profile.username ? (
          <Text className="text-base text-ink-400">@{profile.username}</Text>
        ) : null}
        {profile.level ? (
          <View className="rounded-full border border-bolt-500/40 bg-bolt-500/10 px-3 py-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-bolt-500">
              {LEVEL_COPY[profile.level].title}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row gap-3">
        <Card className="flex-1">
          <StatBlock size="medium" align="left" label="Peso" value={weight} unit="kg" />
        </Card>
        <Card className="flex-1">
          <StatBlock
            size="medium"
            align="left"
            label="Altura"
            value={profile.heightCm === null ? '--' : String(profile.heightCm)}
            unit="cm"
          />
        </Card>
      </View>

      {goal ? (
        <Card variant="highlight" className="gap-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="flag" size={14} color={colors.bolt[500]} />
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-bolt-500">
              Meta principal
            </Text>
          </View>
          <Text className="text-xl font-extrabold text-ink-50">{goal.title}</Text>
          {profile.goalTargetPaceSPerKm ? (
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-sm text-ink-300">Pace alvo</Text>
              <Text
                className="text-[28px] font-extrabold text-ink-50"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatPaceValue(profile.goalTargetPaceSPerKm)}
              </Text>
              <Text className="text-sm font-semibold text-ink-400">/km</Text>
            </View>
          ) : (
            <Text className="text-sm text-ink-300">{goal.description}</Text>
          )}
        </Card>
      ) : null}
    </View>
  );
}
