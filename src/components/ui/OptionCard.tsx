import { Pressable, Text, View } from 'react-native';

type OptionCardProps = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
};

/** Large selectable card for single-choice questions (level, goal…). */
export function OptionCard({ title, description, selected, onPress }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border-2 p-4 ${
        selected ? 'border-bolt-500 bg-bolt-500/10' : 'border-hairline bg-ink-800'
      }`}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
          selected ? 'border-bolt-500' : 'border-ink-300'
        }`}
      >
        {selected ? <View className="h-2.5 w-2.5 rounded-full bg-bolt-500" /> : null}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-ink-50">{title}</Text>
        {description ? <Text className="text-sm text-ink-300">{description}</Text> : null}
      </View>
    </Pressable>
  );
}
