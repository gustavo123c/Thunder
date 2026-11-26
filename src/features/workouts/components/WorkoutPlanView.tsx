import { Text, View } from 'react-native';

import type { WorkoutBlock, WorkoutItem, WorkoutPlan } from '@/domain/training/workout-generator';

const PHASE_STYLE: Record<WorkoutBlock['phase'], { emoji: string; accent: string }> = {
  warmup: { emoji: '🔥', accent: 'border-bolt-400' },
  main: { emoji: '⚡', accent: 'border-bolt-600' },
  cooldown: { emoji: '🧘', accent: 'border-info' },
};

function itemMeta(item: WorkoutItem): string {
  const parts: string[] = [];
  if (item.sets && item.reps) parts.push(`${item.sets} × ${item.reps}`);
  else if (item.reps) parts.push(item.reps);
  if (item.durationMin) parts.push(`${item.durationMin} min`);
  if (item.restS) parts.push(`descanso ${item.restS} s`);
  return parts.join(' · ');
}

function Item({ item }: { item: WorkoutItem }) {
  const meta = itemMeta(item);
  return (
    <View className="gap-1 border-t border-ink-100 py-3 dark:border-ink-700">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="flex-1 text-base font-semibold text-ink-900 dark:text-ink-50">
          {item.name}
        </Text>
        {meta ? (
          <Text className="text-sm font-semibold text-bolt-700 dark:text-bolt-400">{meta}</Text>
        ) : null}
      </View>
      <Text className="text-sm text-ink-500 dark:text-ink-300">{item.detail}</Text>
      {item.target ? (
        <Text className="text-sm text-ink-700 dark:text-ink-100">🎯 Ritmo alvo: {item.target}</Text>
      ) : null}
    </View>
  );
}

/** Structured workout: warm-up, main set and cool-down, plus adaptations and safety notes. */
export function WorkoutPlanView({ plan }: { plan: WorkoutPlan }) {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-2xl font-black text-ink-900 dark:text-ink-50">{plan.title}</Text>
        <Text className="text-sm text-ink-500 dark:text-ink-300">{plan.summary}</Text>
      </View>

      {plan.adaptations.length > 0 ? (
        <View className="gap-2 rounded-2xl bg-bolt-50 p-4 dark:bg-ink-700">
          <Text className="text-sm font-bold text-ink-900 dark:text-ink-50">
            Adaptado para você
          </Text>
          {plan.adaptations.map((text) => (
            <Text key={text} className="text-sm text-ink-700 dark:text-ink-100">
              • {text}
            </Text>
          ))}
        </View>
      ) : null}

      {plan.blocks.map((block) => (
        <View
          key={block.phase}
          className={`rounded-2xl border-l-4 bg-white px-4 py-2 dark:bg-ink-800 ${PHASE_STYLE[block.phase].accent}`}
        >
          <View className="flex-row items-center justify-between pt-2">
            <Text className="text-lg font-bold text-ink-900 dark:text-ink-50">
              {PHASE_STYLE[block.phase].emoji} {block.title}
            </Text>
            <Text className="text-sm text-ink-400">{block.minutes} min</Text>
          </View>
          {block.items.map((item) => (
            <Item key={`${block.phase}-${item.name}`} item={item} />
          ))}
        </View>
      ))}

      <View className="gap-1.5 rounded-2xl bg-ink-100 p-4 dark:bg-ink-800">
        {plan.safetyNotes.map((note) => (
          <Text key={note} className="text-xs text-ink-600 dark:text-ink-300">
            ⚠️ {note}
          </Text>
        ))}
      </View>
    </View>
  );
}
