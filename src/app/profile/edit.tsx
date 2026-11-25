import { View } from 'react-native';

import { useUserId } from '@/features/auth';
import { EditProfileForm, useProfile } from '@/features/profile';

export default function EditProfileScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);

  if (!profile) return null;

  return (
    <View className="flex-1 bg-ink-50 dark:bg-ink-900">
      <EditProfileForm profile={profile} />
    </View>
  );
}
