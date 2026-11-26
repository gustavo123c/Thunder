import { useState } from 'react';
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
import type { BodySex } from '@/domain/types/profile';

import { useOpenPains, useResolvePain, useSetPain } from '../hooks/usePains';
import { BodyMap } from './BodyMap';
import { PainSheet } from './PainSheet';

/** "Como está seu corpo hoje?" — body map, active pains and the health notice. */
export function PainMapSection({ userId, sex }: { userId: string; sex: BodySex | null }) {
  const pains = useOpenPains(userId);
  const setPain = useSetPain(userId);
  const resolve = useResolvePain(userId);
  const [target, setTarget] = useState<{ region: BodyRegion; side: BodySide } | null>(null);

  const list = pains.data ?? [];
  const existing = target
    ? list.find((p) => p.region === target.region && p.side === target.side)
    : undefined;
  const saving = setPain.isPending || resolve.isPending;

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-xl font-bold text-ink-900 dark:text-ink-50">
          Como está seu corpo hoje?
        </Text>
        <Text className="text-sm text-ink-500 dark:text-ink-300">
          Toque onde sente dor ou desconforto. O treino gerado vai evitar sobrecarregar essas
          regiões.
        </Text>
      </View>

      <HealthDisclaimer withPain={list.length > 0} />

      {pains.isPending ? (
        <Skeleton height={380} radius={24} />
      ) : (
        <BodyMap sex={sex} pains={list} onSelect={(region, side) => setTarget({ region, side })} />
      )}

      {list.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {list.map((pain) => (
            <Pressable
              key={pain.id}
              accessibilityRole="button"
              accessibilityLabel={`Editar dor: ${describeRegion(pain.region, pain.side)}`}
              onPress={() => setTarget({ region: pain.region, side: pain.side })}
              className="flex-row items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 dark:bg-ink-700"
            >
              <Text className="text-sm text-ink-800 dark:text-ink-100">
                {describeRegion(pain.region, pain.side)} ·{' '}
                {PAIN_PRESETS[painLevel(pain.intensity)].label.toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : pains.isSuccess ? (
        <Text className="text-center text-sm text-ink-400">Nenhuma dor registrada.</Text>
      ) : null}

      <PainSheet
        target={target}
        existing={existing}
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
