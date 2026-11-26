import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useUserId } from '@/features/auth';
import { AvatarEditor } from '@/features/media';
import { ProfileSummary, useProfile } from '@/features/profile';
import { WinStreakCard } from '@/features/progress';
import { ProfileStatsRow } from '@/features/social';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);

  if (!profile) return null;

  return (
    <Screen>
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-3xl font-extrabold text-ink-50">Perfil</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          hitSlop={12}
          onPress={() => router.push('/settings')}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-ink-800"
        >
          <Ionicons name="settings-outline" size={22} color={colors.ink[300]} />
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="gap-6 pb-10 pt-4" showsVerticalScrollIndicator={false}>
        <ProfileSummary
          profile={profile}
          avatarSlot={
            <AvatarEditor
              userId={userId}
              name={profile.fullName ?? profile.username}
              avatarUrl={profile.avatarUrl}
            />
          }
        />
        <ProfileStatsRow userId={userId} viewerId={userId} />
        <WinStreakCard userId={userId} />
        <Button
          label="Editar perfil"
          icon="create-outline"
          variant="secondary"
          onPress={() => router.push('/profile/edit')}
        />
      </ScrollView>
    </Screen>
  );
}
