import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import {
  type BodyRegion,
  type BodySide,
  describeRegion,
  PAIN_PRESETS,
  type PainLevel,
  painLevel,
} from '@/domain/health/body-regions';

import type { PainLog } from '../api/pain.api';
import { PAIN_COLORS } from './BodyMap';

type PainSheetProps = {
  target: { region: BodyRegion; side: BodySide } | null;
  existing: PainLog | undefined;
  saving: boolean;
  onChoose: (intensity: number) => void;
  onResolve: () => void;
  onClose: () => void;
};

const LEVEL_HINT: Record<PainLevel, string> = {
  mild: 'Incomoda, mas não atrapalha o movimento.',
  moderate: 'Atrapalha alguns movimentos ou piora com esforço.',
  severe: 'Dói muito ou impede movimentos — procure avaliação.',
};

/** Bottom sheet to set the pain level of a body region. */
export function PainSheet({
  target,
  existing,
  saving,
  onChoose,
  onResolve,
  onClose,
}: PainSheetProps) {
  const current = existing ? painLevel(existing.intensity) : null;

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Fechar" className="flex-1 bg-black/40" onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        className="gap-4 rounded-t-[28px] border-t border-hairline bg-ink-800 px-5 pb-4 pt-5"
      >
        <View className="-mt-2 mb-1 h-1 w-10 self-center rounded-full bg-ink-600" />
        {target ? (
          <>
            <View className="gap-1">
              <Text className="text-xl font-extrabold text-ink-50">
                {describeRegion(target.region, target.side)}
              </Text>
              <Text className="text-sm text-ink-500 dark:text-ink-300">
                Como está a dor ou desconforto nesta região?
              </Text>
            </View>

            {(Object.keys(PAIN_PRESETS) as PainLevel[]).map((level) => {
              const selected = current === level;
              return (
                <Pressable
                  key={level}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: saving }}
                  disabled={saving}
                  onPress={() => onChoose(PAIN_PRESETS[level].intensity)}
                  className={`flex-row items-center gap-3 rounded-2xl border p-3.5 active:opacity-80 ${
                    selected ? 'border-bolt-500 bg-bolt-500/10' : 'border-hairline bg-ink-900'
                  }`}
                >
                  <View
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: PAIN_COLORS[level] }}
                  />
                  <View className="flex-1 gap-0.5">
                    <Text className="text-base font-bold text-ink-50">
                      {PAIN_PRESETS[level].label}
                    </Text>
                    <Text className="text-sm text-ink-400">{LEVEL_HINT[level]}</Text>
                  </View>
                </Pressable>
              );
            })}

            {existing ? (
              <Button
                label="Não sinto mais dor aqui"
                variant="secondary"
                onPress={onResolve}
                loading={saving}
              />
            ) : null}
            <Button label="Cancelar" variant="ghost" onPress={onClose} />
          </>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
