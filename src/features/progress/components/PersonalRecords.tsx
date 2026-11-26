import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { activityWindowStart } from '@/domain/insights/activity';
import { formatDecimal, formatDuration, formatPaceValue, formatRunDate } from '@/lib/format';
import { colors } from '@/theme/tokens';

import { useRecords } from '../hooks/useRecords';

type IconName = keyof typeof Ionicons.glyphMap;

function RecordCard({
  icon,
  label,
  value,
  unit,
  detail,
  runId,
}: {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  detail: string;
  runId: string | null;
}) {
  return (
    <Pressable
      accessibilityRole={runId ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}. ${detail}`}
      disabled={!runId}
      onPress={() => runId && router.push(`/run/${runId}`)}
      className="flex-row items-center gap-4 rounded-[20px] border border-hairline bg-ink-800 p-4 active:opacity-80"
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-2xl ${
          runId ? 'bg-bolt-500/15' : 'bg-ink-700'
        }`}
      >
        <Ionicons name={icon} size={22} color={runId ? colors.bolt[500] : colors.ink[400]} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-400">
          {label}
        </Text>
        <View className="flex-row items-baseline gap-1">
          <Text
            className="text-[32px] font-extrabold leading-[38px] text-ink-50"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {value}
          </Text>
          {unit ? <Text className="text-sm font-semibold text-ink-400">{unit}</Text> : null}
        </View>
        <Text className="text-xs text-ink-400">{detail}</Text>
      </View>
      {runId ? <Ionicons name="chevron-forward" size={18} color={colors.ink[500]} /> : null}
    </Pressable>
  );
}

/** PR cards: best pace, longest run, best 5K (tap to open the run). */
export function PersonalRecords({ userId }: { userId: string }) {
  const { data, isError } = useRecords(userId);

  if (!data) {
    return isError ? (
      <Text className="text-sm text-danger">Não foi possível carregar seus recordes.</Text>
    ) : (
      <View className="gap-3">
        <Skeleton height={96} radius={20} />
        <Skeleton height={96} radius={20} />
        <Skeleton height={96} radius={20} />
      </View>
    );
  }

  const { bestPace, longestRun, best5k } = data.records;
  if (!bestPace && !longestRun && !best5k) {
    return (
      <EmptyState
        compact
        icon="podium-outline"
        title="Sem recordes ainda"
        description="Suas marcas pessoais aparecem aqui depois das primeiras corridas."
      />
    );
  }

  const since = activityWindowStart(new Date()).getFullYear();

  return (
    <View className="gap-3">
      <RecordCard
        icon="flash"
        label="Melhor pace"
        value={formatPaceValue(bestPace?.paceSPerKm)}
        unit="/km"
        detail={bestPace ? formatRunDate(bestPace.startedAt) : 'Corra pelo menos 1 km'}
        runId={bestPace?.runId ?? null}
      />
      <RecordCard
        icon="trending-up"
        label="Maior distância"
        value={longestRun ? formatDecimal(longestRun.distanceM / 1000, 2) : '--'}
        unit="km"
        detail={longestRun ? formatRunDate(longestRun.startedAt) : 'Nenhuma corrida ainda'}
        runId={longestRun?.runId ?? null}
      />
      <RecordCard
        icon="stopwatch"
        label="Melhor 5K"
        value={best5k ? formatDuration(best5k.timeS) : '--'}
        detail={
          best5k
            ? `${formatRunDate(best5k.startedAt)} · pelo pace médio da corrida`
            : 'Corra 5 km ou mais para registrar'
        }
        runId={best5k?.runId ?? null}
      />
      <Text className="px-1 text-xs text-ink-500">Considerando corridas desde {since}.</Text>
    </View>
  );
}
