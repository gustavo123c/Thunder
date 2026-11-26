import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LightningFlash, useReduceMotion } from '@/components/ui/LightningFlash';
import { StatBlock } from '@/components/ui/StatBlock';
import { Zigzag } from '@/components/ui/Zigzag';
import {
  celebrationHighlights,
  type Highlight,
  medalsUnlockedBy,
} from '@/domain/insights/celebration';
import { hasRecordedDistance } from '@/domain/metrics/recorded-distance';
import { formatDecimal, formatDuration, formatPaceTrack, formatRunStamp } from '@/lib/format';
import { ThemeScope } from '@/theme/AppThemeProvider';
import { colors } from '@/theme/tokens';

import { ACHIEVEMENT_COPY, MEDAL_FACE, remainingToMedal } from '../achievements-copy';
import { useUnlockAchievements, useUnlockedAchievements } from '../hooks/useAchievements';
import { useActivity } from '../hooks/useActivity';

type IconName = keyof typeof Ionicons.glyphMap;

/** Technical, calm wording (no hype). */
function describeHighlight(highlight: Highlight): { icon: IconName; text: string } {
  switch (highlight.kind) {
    case 'pace_vs_week':
      return {
        icon: 'trending-up',
        text: `Pace ${highlight.percentFaster}% abaixo da sua média da semana.`,
      };
    case 'longest_run':
      return { icon: 'resize', text: 'Maior distância registrada até hoje.' };
    case 'best_pace':
      return { icon: 'flash', text: 'Melhor pace registrado até hoje.' };
    case 'next_medal':
      return {
        icon: 'medal-outline',
        text: remainingToMedal(highlight.achievement, highlight.remaining),
      };
  }
}

/** Counts a number up from zero like a stopwatch display (skipped with reduced motion). */
function useCountUp(target: number, reduceMotion: boolean, durationMs = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setValue(v * target));
    Animated.timing(anim, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [target, reduceMotion, durationMs]);
  return reduceMotion ? target : value;
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

/**
 * Full-screen celebration after finishing a run ("Pista na Tempestade"): a bolt strikes
 * the medal disc with a short flash, then the run as a race bib, highlights and medals.
 */
export function RunCelebration({
  userId,
  runId,
  visible,
  onClose,
  allTime,
  children,
}: RunCelebrationProps) {
  const reduceMotion = useReduceMotion();
  const activity = useActivity(userId);
  const unlock = useUnlockAchievements(userId);
  const stored = useUnlockedAchievements(userId);
  const [boltY] = useState(() => new Animated.Value(-70));
  const [fade] = useState(() => new Animated.Value(0));
  const [flash, setFlash] = useState(0);

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

  // The bolt drops onto the disc, then one flash.
  useEffect(() => {
    if (!visible) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (reduceMotion) {
      boltY.setValue(0);
      fade.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(boltY, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setFlash((n) => n + 1));
  }, [visible, reduceMotion, boltY, fade]);

  const pace = run && run.distanceM > 0 ? run.movingTimeS / (run.distanceM / 1000) : null;
  const distanceKm = useCountUp(run ? run.distanceM / 1000 : 0, reduceMotion);
  const featured = medals[0];
  const face = featured ? MEDAL_FACE[featured] : null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <ThemeScope>
        <SafeAreaView className="flex-1 bg-ink-900">
          <LinearGradient
            colors={['rgba(250,204,21,0.20)', 'rgba(250,204,21,0.04)', 'rgba(7,10,16,0)']}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 380 }}
          />
          <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-8">
            <Animated.View style={{ opacity: fade }}>
              <View className="items-center">
                <View className="h-[170px] w-[150px] items-center justify-end">
                  <View className="h-[118px] w-[118px] items-center justify-center rounded-full bg-bolt-500/15">
                    <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-bolt-500">
                      {face ? (
                        <View className="items-center">
                          <Text className="font-mono-heavy text-[34px] leading-[38px] text-onbolt">
                            {face.value}
                          </Text>
                          <Text className="font-mono text-[10px] tracking-[1.6px] text-onbolt">
                            {face.unit}
                          </Text>
                        </View>
                      ) : (
                        <Ionicons name="trophy" size={40} color={colors.onBolt} />
                      )}
                    </View>
                  </View>
                  <Animated.View
                    style={{
                      position: 'absolute',
                      top: 0,
                      transform: [{ translateY: boltY }, { rotate: '-10deg' }],
                    }}
                  >
                    <Ionicons name="flash" size={60} color={colors.brand} />
                  </Animated.View>
                </View>

                <Text className="mt-4 font-mono-medium text-[11px] uppercase tracking-[1.8px] text-accent">
                  {featured
                    ? medals.length > 1
                      ? `${medals.length} novas medalhas`
                      : 'Nova medalha'
                    : 'Corrida concluída'}
                </Text>
                <Text
                  accessibilityRole="header"
                  className="mt-1 text-center font-display text-[26px] text-ink-50"
                >
                  {featured ? ACHIEVEMENT_COPY[featured].title : 'Corrida concluída'}
                </Text>
                {run ? (
                  <Text className="mt-1 font-mono-medium text-[12px] text-ink-300">
                    {formatRunStamp(run.startedAt)}
                  </Text>
                ) : null}
              </View>
            </Animated.View>

            <Zigzag />

            {run ? (
              <Card
                variant="bib"
                tag={hasRecordedDistance(run.distanceM) ? 'Resumo' : 'Sem distância registrada'}
              >
                <View className="flex-row">
                  <View className="flex-1">
                    <StatBlock
                      size="medium"
                      align="left"
                      label="Dist"
                      value={formatDecimal(distanceKm, 2)}
                      unit="km"
                    />
                  </View>
                  <View className="flex-1">
                    <StatBlock
                      size="medium"
                      align="left"
                      label="Pace"
                      value={formatPaceTrack(pace)}
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
                </View>
              </Card>
            ) : null}

            {highlights.length > 0 ? (
              <View className="gap-2.5">
                {highlights.map((h) => (
                  <View key={h.text} className="flex-row items-center gap-3 px-1">
                    <View className="h-1.5 w-1.5 rounded-[1px] bg-bolt-500" />
                    <Text className="flex-1 text-sm leading-5 text-ink-100">{h.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {medals.length > 1 ? (
              <View className="gap-2">
                {medals.slice(1).map((id) => (
                  <View
                    key={id}
                    className="flex-row items-center gap-3 rounded-2xl border border-hairline bg-ink-800 p-3"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-bolt-500">
                      <Ionicons name={ACHIEVEMENT_COPY[id].icon} size={20} color={colors.onBolt} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-ink-50">
                        {ACHIEVEMENT_COPY[id].title}
                      </Text>
                      <Text className="text-xs text-ink-400">
                        {ACHIEVEMENT_COPY[id].description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {children}

            <Button label="Ver resumo da corrida" icon="arrow-forward" onPress={onClose} />
          </ScrollView>
          <LightningFlash trigger={flash} haptic={false} />
        </SafeAreaView>
      </ThemeScope>
    </Modal>
  );
}
