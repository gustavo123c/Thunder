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
        {target ? (
          <>
            <View className="gap-1">
              <Text className="text-xl font-bold text-ink-900 dark:text-ink-50">
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
                  className={`gap-0.5 rounded-2xl border-2 p-3 ${
                    selected ? 'border-bolt-500 bg-bolt-500/10' : 'border-hairline'
                  }`}
                >
                  <Text className="text-base font-semibold text-ink-900 dark:text-ink-50">
                    {PAIN_PRESETS[level].label}
                  </Text>
                  <Text className="text-sm text-ink-500 dark:text-ink-300">
                    {LEVEL_HINT[level]}
                  </Text>
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
