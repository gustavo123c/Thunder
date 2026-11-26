import { View } from 'react-native';

/** Three thin parallel lines, like track lanes — a section divider. */
export function Lanes({ className = '' }: { className?: string }) {
  return (
    <View className={`gap-[3.5px] ${className}`} accessibilityElementsHidden>
      <View className="h-px bg-hairline" />
      <View className="h-px bg-hairline" />
      <View className="h-px bg-hairline" />
    </View>
  );
}

/** Progress drawn as a lane: a track line with the covered part in amber. */
export function LaneProgress({ value, label }: { value: number; label?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      className="h-3 justify-center"
    >
      <View className="absolute left-0 right-0 top-0 h-px bg-hairline" />
      <View className="absolute bottom-0 left-0 right-0 h-px bg-hairline" />
      <View className="h-[5px] rounded-sm bg-ink-700">
        <View
          className="h-[5px] rounded-sm bg-bolt-500"
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </View>
    </View>
  );
}
