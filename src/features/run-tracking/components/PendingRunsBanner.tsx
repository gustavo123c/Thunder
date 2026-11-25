import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { formatDistanceKm } from '@/lib/format';

import { usePendingRuns, useRetryPendingRuns } from '../hooks/usePendingRuns';

/** Shows runs saved offline and lets the user retry the upload. Hidden when there are none. */
export function PendingRunsBanner({ userId }: { userId: string }) {
  const { data: pending = [] } = usePendingRuns(userId);
  const retry = useRetryPendingRuns(userId);

  if (pending.length === 0) return null;

  const distance = pending.reduce((sum, run) => sum + (run.summary?.distanceM ?? 0), 0);
  const label =
    pending.length === 1
      ? '1 corrida aguardando envio'
      : `${pending.length} corridas aguardando envio`;

  return (
    <View className="gap-3 rounded-2xl border border-bolt-500 bg-bolt-50 p-4 dark:bg-ink-800">
      <View className="gap-1">
        <Text className="text-base font-semibold text-ink-900 dark:text-ink-50">📶 {label}</Text>
        <Text className="text-sm text-ink-600 dark:text-ink-300">
          {formatDistanceKm(distance)} salvos no aparelho. Enviaremos automaticamente quando houver
          conexão.
        </Text>
        {retry.data && retry.data.failed > 0 ? (
          <Text className="text-sm text-danger">
            Ainda sem conexão. Tente novamente mais tarde.
          </Text>
        ) : null}
      </View>
      <Button
        label="Enviar agora"
        variant="secondary"
        onPress={() => retry.mutate()}
        loading={retry.isPending}
      />
    </View>
  );
}
