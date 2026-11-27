import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  type BodyRegion,
  type BodySide,
  describeRegion,
  PAIN_PRESETS,
  painLevel,
} from '@/domain/health/body-regions';
import { allRegionTargets } from '@/domain/health/body-zones';
import { returningPainCount } from '@/domain/health/pain-history';
import type { BodySex } from '@/domain/types/profile';
import { useThemeColors } from '@/theme/theme';

import { useOpenPains, usePainHistory, useResolvePain, useSetPain } from '../hooks/usePains';
import { Body3D } from './body3d/Body3D';
import { BodyMap, PAIN_COLORS, PainLegend } from './BodyMap';
import { PainSheet } from './PainSheet';

/** "Como está seu corpo hoje?" — body map, active pains and the health notice. */
export function PainMapSection({ userId, sex }: { userId: string; sex: BodySex | null }) {
  const theme = useThemeColors();
  const pains = useOpenPains(userId);
  const setPain = useSetPain(userId);
  const resolve = useResolvePain(userId);
  const history = usePainHistory(userId);
  const [target, setTarget] = useState<{ region: BodyRegion; side: BodySide } | null>(null);
  // 3D body by default; the 2D drawing takes over if the device can't render it.
  const [use3D, setUse3D] = useState(true);
  const [showList, setShowList] = useState(false);

  const list = pains.data ?? [];
  const existing = target
    ? list.find((p) => p.region === target.region && p.side === target.side)
    : undefined;
  const saving = setPain.isPending || resolve.isPending;
  const returning = useMemo(
    () =>
      target && history.data
        ? returningPainCount(history.data, target.region, target.side, new Date())
        : 0,
    [history.data, target],
  );

  return (
    <View className="gap-4">
      <View className="gap-1">
        <View className="flex-row items-center justify-between gap-3">
          <Text accessibilityRole="header" className="flex-1 font-display text-[22px] text-ink-50">
            Como está seu corpo hoje?
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Histórico de dores"
            hitSlop={8}
            onPress={() => router.push('/pain-history')}
            className="flex-row items-center gap-1.5 rounded-full border border-hairline bg-ink-800 px-3 py-1.5 active:bg-ink-700"
          >
            <Ionicons name="time-outline" size={14} color={theme.ink[200]} />
            <Text className="text-xs font-semibold text-ink-200">Histórico</Text>
          </Pressable>
        </View>
        <Text className="text-sm leading-5 text-ink-400">
          Toque onde sente dor. O treino vai poupar essas regiões.
        </Text>
      </View>

      <HealthDisclaimer withPain={list.length > 0} />

      {pains.isPending ? (
        <Skeleton height={380} radius={24} />
      ) : use3D ? (
        <View className="gap-3">
          <Body3D
            sex={sex}
            pains={list}
            selected={target}
            onSelect={setTarget}
            onUnavailable={() => setUse3D(false)}
          />
          {/* Every region (the upper body is only here) and the screen-reader path. */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showList }}
            onPress={() => setShowList((v) => !v)}
            className="self-center"
          >
            <Text className="text-sm font-semibold text-accent">
              {showList ? 'Ocultar lista de regiões' : 'Escolher pela lista'}
            </Text>
          </Pressable>
          {showList ? (
            <View testID="region-list" className="flex-row flex-wrap gap-2">
              {allRegionTargets().map(({ region, side }) => {
                const pain = list.find((p) => p.region === region && p.side === side);
                const name = describeRegion(region, side);
                return (
                  <Pressable
                    key={`${region}:${side}`}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    onPress={() => setTarget({ region, side })}
                    className={`flex-row items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 ${
                      pain ? 'bg-bolt-500/10' : 'bg-ink-800'
                    }`}
                  >
                    {pain ? (
                      <View
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PAIN_COLORS[painLevel(pain.intensity)] }}
                      />
                    ) : null}
                    <Text className="text-sm text-ink-100">{name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <PainLegend />
        </View>
      ) : (
        <BodyMap sex={sex} pains={list} onSelect={(region, side) => setTarget({ region, side })} />
      )}

      {list.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {list.map((pain) => {
            const name = describeRegion(pain.region, pain.side);
            const level = painLevel(pain.intensity);
            return (
              <View
                key={pain.id}
                className="flex-row items-center rounded-full border border-hairline bg-ink-800"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar dor: ${name}`}
                  onPress={() => setTarget({ region: pain.region, side: pain.side })}
                  className="flex-row items-center gap-2 py-2 pl-3 pr-1 active:opacity-70"
                >
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PAIN_COLORS[level] }}
                  />
                  <Text className="text-sm font-semibold text-ink-100">{name}</Text>
                  <Text className="text-sm text-ink-400">
                    {PAIN_PRESETS[level].label.toLowerCase()}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover dor: ${name}`}
                  hitSlop={6}
                  disabled={saving}
                  onPress={() => resolve.mutate(pain.id)}
                  className="h-8 w-8 items-center justify-center rounded-full active:bg-ink-700"
                >
                  <Ionicons name="close" size={16} color={theme.ink[400]} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : pains.isSuccess ? (
        <Text className="text-center text-sm text-ink-400">Nenhuma dor registrada.</Text>
      ) : null}

      <PainSheet
        target={target}
        existing={existing}
        returningCount={returning}
        saving={saving}
        onClose={() => setTarget(null)}
        onChoose={(intensity) => {
          if (!target) return;
          setPain.mutate(
            { existing, region: target.region, side: target.side, intensity },
            { onSuccess: () => setTarget(null) },
          );
        }}
        onResolve={() => {
          if (!existing) return;
          resolve.mutate(existing.id, { onSuccess: () => setTarget(null) });
        }}
      />
    </View>
  );
}
