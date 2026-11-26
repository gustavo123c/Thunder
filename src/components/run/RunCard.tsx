import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RouteThumbnail } from '@/components/map/RouteThumbnail';
import { hasRecordedDistance } from '@/domain/metrics/recorded-distance';
import type { RunRecord } from '@/domain/types/run';
import { formatDecimal, formatDuration, formatPaceValue, formatRunDate } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';

type RunCardProps = {
  run: Pick<
    RunRecord,
    'title' | 'startedAt' | 'distanceM' | 'movingTimeS' | 'avgPaceSPerKm' | 'route'
  >;
  onPress?: () => void;
  /** e.g. author row in the feed */
  header?: ReactNode;
  /** e.g. kudos/comments in the feed */
  footer?: ReactNode;
  /** Shows a delete button (own runs in the history). */
  onDelete?: () => void;
  /** e.g. photo/video strip */
  media?: ReactNode;
};

const THUMB = 72;

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-[11px] font-medium uppercase tracking-wider text-ink-400">{label}</Text>
      <View className="flex-row items-baseline gap-1">
        <Text
          className="text-[22px] font-extrabold text-ink-50"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
        {unit ? <Text className="text-xs font-medium text-ink-400">{unit}</Text> : null}
      </View>
    </View>
  );
}

/** Summary card of a run: route thumbnail, title, date and the three key numbers. */
export function RunCard({ run, onPress, header, footer, onDelete, media }: RunCardProps) {
  const theme = useThemeColors();
  const recorded = hasRecordedDistance(run.distanceM);
  const distance = formatDecimal(run.distanceM / 1000, 2);

  return (
    <View className="gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4">
      {header}
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${run.title}, ${formatRunDate(run.startedAt)}, ${
          recorded ? `${distance} km` : 'sem distância registrada'
        }`}
        onPress={onPress}
        disabled={!onPress}
        className="gap-4 active:opacity-80"
      >
        <View className="flex-row items-center gap-3">
          <RouteThumbnail positions={run.route} width={THUMB} height={THUMB} radius={14} />
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-semibold text-ink-50" numberOfLines={1}>
              {run.title}
            </Text>
            <Text className="text-[13px] text-ink-400">{formatRunDate(run.startedAt)}</Text>
            {recorded ? null : (
              <View className="mt-1 flex-row items-center gap-1.5">
                <Ionicons name="alert-circle-outline" size={13} color={theme.ink[400]} />
                <Text className="text-xs text-ink-400">Sem distância registrada</Text>
              </View>
            )}
          </View>
          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Apagar corrida ${run.title}`}
              hitSlop={10}
              onPress={onDelete}
              className="h-9 w-9 items-center justify-center self-start rounded-full active:bg-ink-700"
            >
              <Ionicons name="trash-outline" size={18} color={theme.ink[400]} />
            </Pressable>
          ) : null}
        </View>

        {recorded ? (
          <View className="flex-row gap-3">
            <Metric label="Distância" value={distance} unit="km" />
            <Metric label="Pace" value={formatPaceValue(run.avgPaceSPerKm)} unit="/km" />
            <Metric label="Tempo" value={formatDuration(run.movingTimeS)} />
          </View>
        ) : (
          // GPS recorded nothing: time is the only reliable number.
          <View className="flex-row items-end gap-3">
            <Metric label="Tempo" value={formatDuration(run.movingTimeS)} />
            <Text className="flex-[2] pb-1 text-xs leading-4 text-ink-400">
              O GPS não registrou o trajeto. Você pode apagar esta corrida.
            </Text>
          </View>
        )}
        {media}
      </Pressable>
      {footer}
    </View>
  );
}
