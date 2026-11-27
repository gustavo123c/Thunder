import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserId } from '@/features/auth';
import { AnamneseForm, useAnamnese, useDeleteAnamnese, useSaveAnamnese } from '@/features/health';
import { ThemeScope } from '@/theme/AppThemeProvider';

export default function AnamneseScreen() {
  const userId = useUserId();
  const { data: existing } = useAnamnese(userId);
  const save = useSaveAnamnese(userId);
  const del = useDeleteAnamnese(userId);

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
