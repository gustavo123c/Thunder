import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import type { Profile } from '@/domain/types/profile';
import { useThemeColors } from '@/theme/theme';

import { LEVEL_COPY } from '../labels';

type IconName = keyof typeof Ionicons.glyphMap;

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      className="h-10 flex-row items-center gap-2 rounded-full border border-hairline bg-ink-800 px-4 active:bg-ink-700"
    >
      <Ionicons name={icon} size={17} color={theme.ink[100]} />
      <Text className="text-sm font-semibold text-ink-100">{label}</Text>
    </Pressable>
  );
}

/** Round "?" button that opens the help center. */
function HelpButton() {
  const theme = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ajuda"
      hitSlop={6}
      onPress={() => router.push('/help')}
      className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-ink-800 active:bg-ink-700"
    >
      <Ionicons name="help" size={20} color={theme.ink[100]} />
    </Pressable>
  );
}

type ProfileHeaderProps = {
  profile: Profile;
  /** Replaces the plain avatar (e.g. an editable avatar). */
  avatarSlot?: ReactNode;
};

/** Athlete header: gradient cover, ringed avatar, name, @username, level badge and actions. */
export function ProfileHeader({ profile, avatarSlot }: ProfileHeaderProps) {
  const theme = useThemeColors();
  const name = profile.fullName ?? profile.username;

  return (
    <View>
      <View className="h-28 overflow-hidden rounded-[24px] border border-hairline">
        <LinearGradient
          colors={theme.bannerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Oversized bolt as a watermark on the cover. */}
        <View className="absolute -bottom-10 -right-4 opacity-10" pointerEvents="none">
          <Ionicons name="flash" size={170} color={theme.accent} />
        </View>
      </View>

      <View className="-mt-12 items-center gap-1.5">
        {avatarSlot ?? (
          <View className="rounded-full border-[3px] border-bolt-500 bg-ink-900 p-[3px]">
            <Avatar name={name} imageUrl={profile.avatarUrl} size={88} />
          </View>
        )}
        <Text className="mt-1 font-display text-[22px] text-ink-50">{name}</Text>
        <View className="flex-row items-center gap-2">
          {profile.username ? (
            <Text className="text-sm text-ink-400">@{profile.username}</Text>
          ) : null}
          {profile.level ? (
            <View className="flex-row items-center gap-1 rounded-full bg-ink-700 px-2.5 py-0.5">
              <Ionicons name="flash" size={11} color={theme.accent} />
              <Text className="font-mono-medium text-[11px] uppercase tracking-wider text-accent">
                {LEVEL_COPY[profile.level].title}
              </Text>
            </View>
          ) : null}
        </View>
        {/* Actions sit below the name, away from the top-right corner where Expo Go's
            floating developer button covers the screen. */}
        <View className="mt-3 flex-row gap-2">
          <ActionButton
            icon="create-outline"
            label="Editar perfil"
            onPress={() => router.push('/profile/edit')}
          />
          <ActionButton
            icon="settings-outline"
            label="Configurações"
            onPress={() => router.push('/settings')}
          />
          <HelpButton />
        </View>
      </View>
    </View>
  );
}
