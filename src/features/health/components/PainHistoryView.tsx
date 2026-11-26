import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { describeRegion, PAIN_PRESETS, painLevel } from '@/domain/health/body-regions';
import { RECURRENCE_WINDOW_DAYS, recurringPains } from '@/domain/health/pain-history';
import { formatRunDate } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';

import { usePainHistory } from '../hooks/usePains';
import { PAIN_COLORS } from './BodyMap';

/** Recurring pains (last 30 days) and every reported episode (last 90 days). */
export function PainHistoryView({ userId }: { userId: string }) {
  const theme = useThemeColors();
  const history = usePainHistory(userId);
  const recurring = useMemo(
    () => (history.data ? recurringPains(history.data, new Date()) : []),
    [history.data],
  );

  if (history.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-900">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const episodes = history.data ?? [];

  return (
    <ScrollView
      className="flex-1 bg-ink-900"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-4 pb-12 pt-4"
    >
      {history.isError ? (
        <Text className="text-sm text-danger">Não foi possível carregar o histórico.</Text>
      ) : null}

      {recurring.length > 0 ? (
        <View className="gap-3">
          <Text className="px-1 text-[11px] font-medium uppercase tracking-[1.5px] text-ink-400">
            Dores recorrentes
          </Text>
          {recurring.map((r) => (
            <Card
              key={`${r.region}:${r.side}`}
              variant="highlight"
              className="flex-row items-center gap-3 border-hairline"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-bolt-500/15">
                <Ionicons name="repeat" size={20} color={theme.accent} />
              </View>
              <Text className="flex-1 text-sm leading-5 text-ink-100">
                Você relatou dor em{' '}
                <Text className="font-extrabold text-ink-50">
                  {describeRegion(r.region, r.side)}
                </Text>{' '}
                {r.count} vezes nos últimos {RECURRENCE_WINDOW_DAYS} dias.
              </Text>
            </Card>
          ))}
          <Text className="px-1 text-xs leading-4 text-ink-400">
            Dor que volta com frequência merece avaliação de um fisioterapeuta ou médico do esporte.
          </Text>
        </View>
      ) : null}

      <View className="gap-3">
        <Text className="px-1 text-[11px] font-medium uppercase tracking-[1.5px] text-ink-400">
          Últimos 90 dias
        </Text>
        {episodes.length === 0 ? (
          <EmptyState
            compact
            icon="body-outline"
            title="Nenhuma dor registrada"
            description="As dores que você marcar no mapa corporal aparecem aqui com data e intensidade."
          />
        ) : (
          episodes.map((episode) => {
            const level = painLevel(episode.intensity);
            return (
              <View
                key={episode.id}
                accessible
                accessibilityLabel={`${describeRegion(episode.region, episode.side)}, dor ${PAIN_PRESETS[
                  level
                ].label.toLowerCase()}, ${formatRunDate(episode.createdAt)}, ${
                  episode.resolvedAt ? 'resolvida' : 'em aberto'
                }`}
                className="flex-row items-center gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4"
              >
                <View
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: PAIN_COLORS[level] }}
                />
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-bold text-ink-50">
                    {describeRegion(episode.region, episode.side)}
                  </Text>
                  <Text className="text-xs text-ink-400">
                    {PAIN_PRESETS[level].label} · {formatRunDate(episode.createdAt)}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-2.5 py-1 ${
                    episode.resolvedAt ? 'bg-ink-700' : 'border border-hairline bg-bolt-500/10'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${episode.resolvedAt ? 'text-ink-300' : 'text-accent'}`}
                  >
                    {episode.resolvedAt ? 'Resolvida' : 'Em aberto'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
