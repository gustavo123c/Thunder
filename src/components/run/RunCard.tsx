import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RouteThumbnail } from '@/components/map/RouteThumbnail';
import { BibNotch, BibTag } from '@/components/ui/Card';
import { hasRecordedDistance } from '@/domain/metrics/recorded-distance';
import type { RunRecord } from '@/domain/types/run';
import {
  formatDecimal,
  formatDuration,
  formatPaceTrack,
  formatRunDate,
  formatRunStamp,
} from '@/lib/format';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

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
  /** Shows the amber "Recorde" badge (longest run or best pace). */
  record?: boolean;
};

const THUMB = 64;

function RecordBadge() {
  return (
    <View className="flex-row items-center gap-1 rounded-md bg-bolt-500 px-1.5 py-0.5">
      <Ionicons name="flash" size={10} color={colors.onBolt} />
      <Text className="font-mono text-[10px] uppercase tracking-[1.2px] text-onbolt">Recorde</Text>
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="font-mono-medium text-[10.5px] uppercase tracking-[1.6px] text-ink-400">
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text
          className="font-mono text-[22px] text-ink-50"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
        {unit ? <Text className="font-mono-medium text-[11px] text-ink-400">{unit}</Text> : null}
      </View>
    </View>
  );
}

/**
 * A run as a race bib: stamp tag (cut corner), route thumbnail, title and the three key
 * numbers in stopwatch type.
 */
export function RunCard({
  run,
  onPress,
  header,
  footer,
  onDelete,
  media,
  record = false,
}: RunCardProps) {
  const theme = useThemeColors();
  const recorded = hasRecordedDistance(run.distanceM);
  const distance = formatDecimal(run.distanceM / 1000, 2);

  return (
    <View className="gap-3 overflow-hidden rounded-[20px] border border-hairline bg-ink-800 p-4">
      {header}
      <View className="flex-row items-center justify-between gap-2 pr-6">
        <BibTag>{formatRunStamp(run.startedAt)}</BibTag>
        {record ? <RecordBadge /> : null}
      </View>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${run.title}, ${formatRunDate(run.startedAt)}, ${
          recorded ? `${distance} km` : 'sem distância registrada'
        }${record ? ', recorde' : ''}`}
        onPress={onPress}
        disabled={!onPress}
        className="gap-3 active:opacity-80"
      >
        <View className="flex-row items-center gap-3">
          <RouteThumbnail positions={run.route} width={THUMB} height={THUMB} radius={12} />
          <View className="flex-1 gap-1">
            <Text className="text-base font-semibold text-ink-50" numberOfLines={1}>
              {run.title}
            </Text>
            {recorded ? null : (
              <View className="flex-row items-center gap-1.5">
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
              className="h-9 w-9 items-center justify-center rounded-full active:bg-ink-700"
            >
              <Ionicons name="trash-outline" size={18} color={theme.ink[400]} />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-3 border-t border-dashed border-hairline pt-3">
          {recorded ? (
            <>
              <Metric label="Dist" value={distance} unit="km" />
              <Metric label="Pace" value={formatPaceTrack(run.avgPaceSPerKm)} unit="/km" />
              <Metric label="Tempo" value={formatDuration(run.movingTimeS)} />
            </>
          ) : (
            // GPS recorded nothing: time is the only reliable number.
            <>
              <Metric label="Tempo" value={formatDuration(run.movingTimeS)} />
              <Text className="flex-[2] self-end pb-1 text-xs leading-4 text-ink-400">
                O GPS não registrou o trajeto. Você pode apagar esta corrida.
              </Text>
            </>
          )}
        </View>
        {media}
      </Pressable>
      {footer}
      <BibNotch />
    </View>
  );
}
