import { Image } from 'expo-image';
import { Text, View } from 'react-native';

type AvatarProps = {
  name: string | null;
  imageUrl?: string | null;
  size?: number;
};

export function initialsOf(name: string | null): string {
  const parts = (name ?? '?').trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function Avatar({ name, imageUrl, size = 40 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (imageUrl) {
    return (
      <Image source={{ uri: imageUrl }} style={dimension} contentFit="cover" accessible={false} />
    );
  }

  return (
    <View className="items-center justify-center bg-bolt-500" style={dimension}>
      <Text className="font-bold text-ink-900" style={{ fontSize: size * 0.38 }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}
