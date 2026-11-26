import { Pressable, Text, View } from 'react-native';

export type TrainingStep = 'body' | 'workout';

const STEPS: readonly { value: TrainingStep; label: string }[] = [
  { value: 'body', label: 'Check-up' },
  { value: 'workout', label: 'Treino' },
];

/** Two-step header of the training tab; steps stay tappable to jump back and forth. */
export function TrainingStepper({
  step,
  onChange,
}: {
  step: TrainingStep;
  onChange: (step: TrainingStep) => void;
}) {
  const activeIndex = STEPS.findIndex((s) => s.value === step);
  return (
    <View accessibilityRole="tablist" className="flex-row gap-2">
      {STEPS.map((item, index) => {
        const active = index === activeIndex;
        const done = index < activeIndex;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Etapa ${index + 1}: ${item.label}`}
            onPress={() => onChange(item.value)}
            className="flex-1 gap-2"
          >
            <View className={`h-1 rounded-full ${active || done ? 'bg-bolt-500' : 'bg-ink-700'}`} />
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`text-xs font-bold ${active ? 'text-accent' : 'text-ink-400'}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {index + 1}
              </Text>
              <Text className={`text-sm font-bold ${active ? 'text-ink-50' : 'text-ink-400'}`}>
                {item.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
