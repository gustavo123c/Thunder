import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

/**
 * Small "⚡ Thunder" wordmark for the top-left of tab screens. Nothing goes on the
 * right of this row: that corner stays free (Expo Go draws its tools button there).
 */
export function BrandHeader() {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Thunder"
      className="flex-row items-center gap-2"
    >
      <View className="h-7 w-7 items-center justify-center rounded-lg bg-bolt-500">
        <Ionicons name="flash" size={16} color={colors.onBolt} />
      </View>
      <Text className="text-xl font-bold tracking-tight text-ink-50">Thunder</Text>
    </View>
  );
}
