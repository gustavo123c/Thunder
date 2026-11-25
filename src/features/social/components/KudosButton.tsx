import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Pressable, Text } from 'react-native';

import { colors } from '@/theme/tokens';

type KudosButtonProps = {
  liked: boolean;
  count: number;
  onToggle: (liked: boolean) => void;
  /** You can't give a Raio to your own run. */
  disabled?: boolean;
};

export function KudosButton({ liked, count, onToggle, disabled = false }: KudosButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? `Remover raio. ${count} raios` : `Dar raio. ${count} raios`}
      accessibilityState={{ selected: liked, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        void Haptics.selectionAsync();
        onToggle(!liked);
      }}
      className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${liked ? 'bg-bolt-100 dark:bg-ink-700' : ''}`}
    >
      <Ionicons
        name={liked ? 'flash' : 'flash-outline'}
        size={20}
        color={liked ? colors.bolt[500] : colors.ink[400]}
      />
      <Text
        className={`text-sm font-semibold ${liked ? 'text-bolt-700 dark:text-bolt-400' : 'text-ink-500 dark:text-ink-300'}`}
      >
        {count}
      </Text>
    </Pressable>
  );
}
