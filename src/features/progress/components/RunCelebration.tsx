import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { StatBlock } from '@/components/ui/StatBlock';
import {
  celebrationHighlights,
  type Highlight,
  medalsUnlockedBy,
} from '@/domain/insights/celebration';
import { formatDecimal, formatDuration, formatPaceValue } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import { ACHIEVEMENT_COPY, remainingToMedal } from '../achievements-copy';
import { useUnlockAchievements, useUnlockedAchievements } from '../hooks/useAchievements';
import { useActivity } from '../hooks/useActivity';

type IconName = keyof typeof Ionicons.glyphMap;

function describeHighlight(highlight: Highlight): { icon: IconName; text: string } {
  switch (highlight.kind) {
    case 'pace_vs_week':
      return {
        icon: 'trending-up',
        text: `Seu pace foi ${highlight.percentFaster}% mais rápido que a média da semana!`,
      };
    case 'longest_run':
      return { icon: 'resize', text: 'Sua corrida mais longa até agora!' };
    case 'best_pace':
      return { icon: 'flash', text: 'Novo recorde pessoal de pace!' };
    case 'next_medal':
      return {
        icon: 'medal-outline',
        text: remainingToMedal(highlight.achievement, highlight.remaining),
      };
  }
}

type RunCelebrationProps = {
  userId: string;
  runId: string;
  visible: boolean;
  onClose: () => void;
  /** All-time totals for cumulative medals (profile stats), when available. */
  allTime?: { runs: number; distanceM: number };
  /** Extra content, e.g. the post-workout check-in. */
  children?: ReactNode;
};

/** Full-screen celebration right after finishing a run: summary, new medals, highlights. */
export function RunCelebration({
  userId,
  runId,
  visible,
  onClose,
  allTime,
  children,
}: RunCelebrationProps) {
  const theme = useThemeColors();
  const activity = useActivity(userId);
  const unlock = useUnlockAchievements(userId);
  const stored = useUnlockedAchievements(userId);
  const [scale] = useState(() => new Animated.Value(0.4));
  const [fade] = useState(() => new Animated.Value(0));

  const run = activity.data?.find((e) => e.id === runId);

  // The run was just uploaded: make sure the activity list includes it.
  const { refetch } = activity;
  useEffect(() => {
    if (visible && activity.isSuccess && !run) void refetch();
  }, [visible, activity.isSuccess, run, refetch]);

  // New for this run, and not already stored (e.g. earned before the activity window).
  const medals = useMemo(() => {
    if (!activity.data || !run || !stored.isSuccess) return [];
    const already = new Set(stored.data.map((a) => a.id));
    return medalsUnlockedBy(activity.data, runId, allTime).filter((id) => !already.has(id));
  }, [activity.data, run, runId, allTime, stored.data, stored.isSuccess]);
  const highlights = useMemo(
    () =>
      activity.data && run
        ? celebrationHighlights(activity.data, runId, new Date(), allTime).map(describeHighlight)
        : [],
    [activity.data, run, runId, allTime],
  );

  // Store the new medals once.
  const savedMedals = useRef(false);
  const { mutate } = unlock;
  useEffect(() => {
    if (!visible || savedMedals.current || medals.length === 0) return;
    savedMedals.current = true;
    mutate({ ids: medals, runId });
  }, [visible, medals, mutate, runId]);

  useEffect(() => {
    if (!visible) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, fade]);

  const pace = run && run.distanceM > 0 ? run.movingTimeS / (run.distanceM / 1000) : null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView className="flex-1 bg-ink-900">
        <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-10">
          <Animated.View style={{ opacity: fade }} className="items-center gap-3">
            <Animated.View
              style={{ transform: [{ scale }] }}
              className="h-28 w-28 items-center justify-center rounded-full bg-bolt-500/15"
            >
              <View className="h-20 w-20 items-center justify-center rounded-full bg-bolt-500">
                <Ionicons name="trophy" size={38} color={colors.onBolt} />
              </View>
            </Animated.View>
            <Text accessibilityRole="header" className="text-3xl font-extrabold text-ink-50">
              Corrida concluída!
            </Text>
            <Text className="text-center text-sm text-ink-400">
              Mais um passo na sua evolução. Veja o que você conquistou.
            </Text>
          </Animated.View>

          {run ? (
            <View className="flex-row rounded-[20px] border border-hairline bg-ink-800 p-4">
              <View className="flex-1">
                <StatBlock
                  size="medium"
                  align="left"
                  label="Distância"
                  value={formatDecimal(run.distanceM / 1000, 2)}
                  unit="km"
                />
              </View>
              <View className="flex-1">
                <StatBlock
                  size="medium"
                  align="left"
                  label="Tempo"
                  value={formatDuration(run.movingTimeS)}
                />
              </View>
              <View className="flex-1">
                <StatBlock
                  size="medium"
                  align="left"
                  label="Pace"
                  value={formatPaceValue(pace)}
                  unit="/km"
                />
              </View>
            </View>
          ) : null}

          {medals.length > 0 ? (
            <View className="gap-3">
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-accent">
                {medals.length === 1 ? 'Nova medalha' : 'Novas medalhas'}
              </Text>
              {medals.map((id) => (
                <View
                  key={id}
                  className="flex-row items-center gap-3 rounded-[20px] border border-bolt-500/40 bg-bolt-500/10 p-4"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-bolt-500">
                    <Ionicons name={ACHIEVEMENT_COPY[id].icon} size={24} color={colors.onBolt} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-extrabold text-ink-50">
                      {ACHIEVEMENT_COPY[id].title}
                    </Text>
                    <Text className="text-xs text-ink-300">{ACHIEVEMENT_COPY[id].description}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {highlights.length > 0 ? (
            <View className="gap-2">
              {highlights.map((h) => (
                <View key={h.text} className="flex-row items-center gap-3 px-1">
                  <Ionicons name={h.icon} size={18} color={theme.accent} />
                  <Text className="flex-1 text-sm font-semibold leading-5 text-ink-100">
                    {h.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {children}

          <Button label="Ver resumo da corrida" icon="arrow-forward" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
