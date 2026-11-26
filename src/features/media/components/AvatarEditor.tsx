import * as ImagePicker from 'expo-image-picker';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';

import { useUploadAvatar } from '../hooks/useMedia';
import { describeMediaError } from '../media-errors';

type AvatarEditorProps = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
};

const SIZE = 96;

/** Avatar with "change photo": pick, crop square (native editor), upload. */
export function AvatarEditor({ userId, name, avatarUrl }: AvatarEditorProps) {
  const upload = useUploadAvatar(userId);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) upload.mutate(asset);
  }

  return (
    <View className="items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Alterar foto de perfil"
        onPress={() => void pick()}
        disabled={upload.isPending}
      >
        {upload.isPending ? (
          <Skeleton width={SIZE} height={SIZE} radius={SIZE / 2} />
        ) : (
          <Avatar name={name} imageUrl={avatarUrl} size={SIZE} />
        )}
        <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-ink-50 bg-bolt-500 dark:border-ink-900">
          <Text className="text-sm">📷</Text>
        </View>
      </Pressable>
      <Text className="text-sm font-semibold text-bolt-600">
        {upload.isPending ? 'Enviando foto…' : 'Alterar foto'}
      </Text>
      {upload.isError ? (
        <Text className="text-center text-sm text-danger">{describeMediaError(upload.error)}</Text>
      ) : null}
    </View>
  );
}
