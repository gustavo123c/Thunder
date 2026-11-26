import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/theme/tokens';

import { useUploadAvatar } from '../hooks/useMedia';
import { describeMediaError } from '../media-errors';

type AvatarEditorProps = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  size?: number;
  /** Shows "Alterar foto" under the avatar. */
  showLabel?: boolean;
  /** Wraps the avatar in a highlighted ring (profile header). */
  ringed?: boolean;
};

/** Avatar with "change photo": pick, crop square (native editor), upload. */
export function AvatarEditor({
  userId,
  name,
  avatarUrl,
  size = 96,
  showLabel = true,
  ringed = false,
}: AvatarEditorProps) {
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
        <View
          className={ringed ? 'rounded-full border-[3px] border-bolt-500 bg-ink-900 p-[3px]' : ''}
        >
          {upload.isPending ? (
            <Skeleton width={size} height={size} radius={size / 2} />
          ) : (
            <Avatar name={name} imageUrl={avatarUrl} size={size} />
          )}
        </View>
        <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-ink-900 bg-bolt-500">
          <Ionicons name="camera" size={15} color={colors.ink[900]} />
        </View>
      </Pressable>
      {showLabel || upload.isPending ? (
        <Text className="text-sm font-semibold text-bolt-500">
          {upload.isPending ? 'Enviando foto…' : 'Alterar foto'}
        </Text>
      ) : null}
      {upload.isError ? (
        <Text className="text-center text-sm text-danger">{describeMediaError(upload.error)}</Text>
      ) : null}
    </View>
  );
}
