import { Text, View } from 'react-native';

type HealthDisclaimerProps = {
  /** Extra emphasis when the user reported pain. */
  withPain?: boolean;
};

/** Health/legal notice shown wherever the app suggests training adjustments. */
export function HealthDisclaimer({ withPain = false }: HealthDisclaimerProps) {
  return (
    <View
      accessibilityRole="alert"
      className="flex-row gap-3 rounded-2xl border border-info/40 bg-sky-50 p-4 dark:border-info/30 dark:bg-ink-800"
    >
      <Text className="text-xl">🩺</Text>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-bold text-ink-900 dark:text-ink-50">
          Aviso importante sobre sua saúde
        </Text>
        <Text className="text-sm text-ink-600 dark:text-ink-200">
          Os treinos sugeridos são gerados automaticamente. Inteligência artificial e algoritmos não
          são uma ciência exata e não substituem avaliação clínica nem prescrição individual.
        </Text>
        <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">
          Procure um profissional de Educação Física, treinador ou médico especialista antes de
          iniciar ou adaptar sua rotina de treinos
          {withPain ? ' — especialmente agora que você relatou dor.' : '.'}
        </Text>
      </View>
    </View>
  );
}
