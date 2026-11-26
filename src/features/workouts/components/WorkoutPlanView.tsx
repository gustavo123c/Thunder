import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { StatBlock } from '@/components/ui/StatBlock';
import type { WorkoutBlock, WorkoutItem, WorkoutPlan } from '@/domain/training/workout-generator';
import { formatRest } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';
import { colors, type ThemeColors } from '@/theme/tokens';

const phaseStyle = (
  theme: ThemeColors,
): Record<
  WorkoutBlock['phase'],
  { icon: 'flame-outline' | 'flash' | 'leaf-outline'; accent: string; iconColor: string }
> => ({
  warmup: { icon: 'flame-outline', accent: 'bg-bolt-500/10', iconColor: theme.accent },
  main: { icon: 'flash', accent: 'bg-bolt-500', iconColor: colors.onBolt },
  cooldown: { icon: 'leaf-outline', accent: 'bg-info/15', iconColor: colors.info },
});

function itemMeta(item: WorkoutItem): string {
  const parts: string[] = [];
  if (item.sets && item.reps) parts.push(`${item.sets} × ${item.reps}`);
  else if (item.reps) parts.push(item.reps);
  if (item.durationMin) parts.push(`${item.durationMin} min`);
  if (item.restS) parts.push(`descanso ${formatRest(item.restS)}`);
  return parts.join(' · ');
}

function Item({ item }: { item: WorkoutItem }) {
  const theme = useThemeColors();
  const meta = itemMeta(item);
  return (
    <View className="gap-1 border-t border-hairline py-3">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="flex-1 text-base font-bold text-ink-50">{item.name}</Text>
        {meta ? (
          <Text className="text-sm font-bold text-accent" style={{ fontVariant: ['tabular-nums'] }}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Text className="text-sm leading-5 text-ink-300">{item.detail}</Text>
      {item.target ? (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="speedometer-outline" size={14} color={theme.ink[300]} />
          <Text className="text-sm text-ink-100">{item.target}</Text>
        </View>
      ) : null}
    </View>
  );
}

const PHASE_LABEL: Record<WorkoutBlock['phase'], string> = {
  warmup: 'Etapa 1',
  main: 'Bloco principal',
  cooldown: 'Etapa final',
};

/** Structured workout sheet: summary, warm-up, main set and cool-down cards, safety notes. */
export function WorkoutPlanView({ plan }: { plan: WorkoutPlan }) {
  const theme = useThemeColors();
  const mainMinutes = plan.blocks.find((block) => block.phase === 'main')?.minutes ?? 0;
  const reduction = plan.loadReductionPct ?? 0;

  return (
    <View className="gap-4">
      <Card variant="highlight" className="gap-4">
        <View className="gap-1">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="document-text" size={13} color={theme.accent} />
            <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-accent">
              Ficha de treino de corrida
            </Text>
          </View>
          <Text accessibilityRole="header" className="text-2xl font-bold text-ink-50">
            {plan.title}
          </Text>
          <Text className="text-sm text-ink-300">{plan.summary}</Text>
        </View>
        <View className="flex-row border-t border-hairline pt-3">
          <View className="flex-1">
            <StatBlock
              size="medium"
              align="left"
              label="Duração"
              value={String(plan.totalMinutes)}
              unit="min"
            />
          </View>
          <View className="flex-1">
            <StatBlock
              size="medium"
              align="left"
              label="Principal"
              value={String(mainMinutes)}
              unit="min"
            />
          </View>
          <View className="flex-1">
            <StatBlock
              size="medium"
              align="left"
              label="Carga"
              value={`${100 - reduction}%`}
              accent={reduction === 0}
            />
          </View>
        </View>
      </Card>

      {plan.adaptations.length > 0 ? (
        <Card className="gap-2 border-hairline">
          <View className="flex-row items-center gap-2">
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.accent} />
            <Text className="text-sm font-bold text-ink-50">Adaptado para você</Text>
          </View>
          {plan.adaptations.map((text) => (
            <Text key={text} className="text-sm leading-5 text-ink-200">
              • {text}
            </Text>
          ))}
        </Card>
      ) : null}

      {plan.blocks.map((block) => {
        const style = phaseStyle(theme)[block.phase];
        return (
          <Card
            key={block.phase}
            className={`pb-1 ${block.phase === 'main' ? 'border-hairline' : ''}`}
          >
            <View className="flex-row items-center gap-3 pb-3">
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${style.accent}`}
              >
                <Ionicons name={style.icon} size={18} color={style.iconColor} />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-ink-400">
                  {PHASE_LABEL[block.phase]}
                </Text>
                <Text className="text-lg font-semibold text-ink-50">{block.title}</Text>
              </View>
              <View className="items-end">
                <Text
                  className="text-[22px] font-extrabold text-ink-50"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {block.minutes}
                </Text>
                <Text className="text-[11px] font-medium uppercase text-ink-400">min</Text>
              </View>
            </View>
            {block.items.map((item) => (
              <Item key={`${block.phase}-${item.name}`} item={item} />
            ))}
          </Card>
        );
      })}

      <View className="gap-2 px-1">
        {plan.safetyNotes.map((note) => (
          <View key={note} className="flex-row gap-2">
            <Ionicons name="alert-circle-outline" size={14} color={theme.ink[400]} />
            <Text className="flex-1 text-xs leading-4 text-ink-400">{note}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
