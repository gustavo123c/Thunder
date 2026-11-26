import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme/theme';

type HealthDisclaimerProps = {
  /** Extra emphasis when the user reported pain. */
  withPain?: boolean;
  /** Collapsible one-line banner (default) or the full text (settings). */
  variant?: 'banner' | 'full';
};

const BODY =
  'Os treinos sugeridos são gerados automaticamente. Inteligência artificial e algoritmos não são uma ciência exata e não substituem avaliação clínica nem prescrição individual.';

function recommendation(withPain: boolean) {
  return `Procure um profissional de Educação Física, treinador ou médico especialista antes de iniciar ou adaptar sua rotina de treinos${
    withPain ? ' — especialmente agora que você relatou dor.' : '.'
  }`;
}

/** Health/legal notice shown wherever the app suggests training adjustments. */
export function HealthDisclaimer({ withPain = false, variant = 'banner' }: HealthDisclaimerProps) {
  const theme = useThemeColors();
  const [expanded, setExpanded] = useState(variant === 'full');

  if (variant === 'full') {
    return (
      <View className="gap-2">
        <Text className="text-sm text-ink-300">{BODY}</Text>
        <Text className="text-sm font-semibold text-ink-100">{recommendation(withPain)}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Aviso importante sobre sua saúde"
      accessibilityState={{ expanded }}
      accessibilityHint={expanded ? 'Toque para recolher' : 'Toque para ler o aviso completo'}
      onPress={() => setExpanded((v) => !v)}
      className="gap-2 rounded-2xl border border-hairline bg-ink-800 px-4 py-3"
    >
      <View className="flex-row items-center gap-2.5">
        <Ionicons
          name="medkit-outline"
          size={16}
          color={withPain ? theme.accent : theme.ink[300]}
        />
        <Text className="flex-1 text-xs font-semibold text-ink-200">
          Aviso de saúde · não substitui um profissional
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.ink[400]}
        />
      </View>
      {expanded ? (
        <View className="gap-1.5">
          <Text className="text-xs leading-5 text-ink-300">{BODY}</Text>
          <Text className="text-xs font-semibold leading-5 text-ink-100">
            {recommendation(withPain)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
