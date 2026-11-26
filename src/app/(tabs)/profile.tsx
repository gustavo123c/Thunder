import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useSignOut, useUserId } from '@/features/auth';
import { ProfileSummary, useProfile } from '@/features/profile';
import { WinStreakCard } from '@/features/progress';
import { ProfileStatsRow } from '@/features/social';

export default function ProfileScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);
  const signOut = useSignOut();

  if (!profile) return null;

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-8 py-6">
        <ProfileSummary profile={profile} />
        <ProfileStatsRow userId={userId} viewerId={userId} />
        <WinStreakCard userId={userId} />
        <View className="gap-3">
          <Button
            label="Editar perfil"
            variant="secondary"
            onPress={() => router.push('/profile/edit')}
          />
          <Button
            label="Sair"
            variant="ghost"
            onPress={() => signOut.mutate()}
            loading={signOut.isPending}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
