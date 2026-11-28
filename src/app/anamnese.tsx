import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useUserId } from '@/features/auth';
import { AnamneseForm, useAnamnese, useDeleteAnamnese, useSaveAnamnese } from '@/features/health';
import { useHealthConsent, useProfile } from '@/features/profile';
import { ThemeScope } from '@/theme/AppThemeProvider';

export default function AnamneseScreen() {
  const userId = useUserId();
  const { data: existing } = useAnamnese(userId);
  const save = useSaveAnamnese(userId);
  const del = useDeleteAnamnese(userId);
  const { data: profile } = useProfile(userId);
  const consent = useHealthConsent(userId);

  if (profile && !profile.healthConsentAt) {
    return (
      <ThemeScope>
        <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink-900">
          <View className="flex-1 justify-center gap-4 px-6">
            <Text accessibilityRole="header" className="font-display text-[22px] text-ink-50">
              Questionário de saúde
            </Text>
            <Text className="text-sm leading-5 text-ink-300">
              Para preencher o questionário, autorize o uso dos seus dados de saúde. Você pode
              revogar quando quiser em Configurações.
            </Text>
            <Button
              label="Autorizar uso de dados de saúde"
              icon="shield-checkmark-outline"
              loading={consent.pending}
              onPress={consent.askToGrant}
            />
            <Button label="Agora não" variant="ghost" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </ThemeScope>
    );
  }

  return (
    <ThemeScope>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink-900">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <AnamneseForm
            initial={existing ?? undefined}
            onSave={async (draft) => {
              await save.mutateAsync(draft);
              router.back();
            }}
            onDelete={
              existing
                ? async () => {
                    await del.mutateAsync();
                    router.back();
                  }
                : undefined
            }
            onSkip={() => router.back()}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemeScope>
  );
}
