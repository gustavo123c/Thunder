import { ScrollView, Text } from 'react-native';

import { useUserId } from '@/features/auth';
import { TermsView, useTermsAcceptance } from '@/features/legal';
import { formatRunDate } from '@/lib/format';

/** Read-only Terms of Use (Perfil > Configurações > Termos de Uso). */
export default function TermsScreen() {
  const userId = useUserId();
  const acceptance = useTermsAcceptance(userId);
  return (
    <ScrollView
      className="flex-1 bg-ink-900"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 px-4 pb-12 pt-4"
    >
      {acceptance.data ? (
        <Text className="text-xs text-ink-400">
          Aceite registrado: {formatRunDate(acceptance.data.acceptedAt)}.
        </Text>
      ) : null}
      <TermsView />
    </ScrollView>
  );
}
