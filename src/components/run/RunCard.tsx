import type { ReactNode } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { RouteThumbnail } from '@/components/map/RouteThumbnail';
import type { RunRecord } from '@/domain/types/run';
import { formatDistanceKm, formatDuration, formatPace, formatRunDate } from '@/lib/format';

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
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-xs text-ink-400">{label}</Text>
      <Text
        className="text-lg font-bold text-ink-900 dark:text-ink-50"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}

/** Summary card of a run: title, date, key metrics and a route thumbnail. */
export function RunCard({ run, onPress, header, footer }: RunCardProps) {
  const { width } = useWindowDimensions();
  const thumbnailWidth = Math.min(width - 64, 520);

  return (
    <View className="gap-3 rounded-3xl bg-white p-4 dark:bg-ink-800">
      {header}
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${run.title}, ${formatRunDate(run.startedAt)}, ${formatDistanceKm(run.distanceM)}`}
        onPress={onPress}
        disabled={!onPress}
        className="gap-3 active:opacity-80"
      >
        <View className="gap-0.5">
          <Text className="text-lg font-bold text-ink-900 dark:text-ink-50">{run.title}</Text>
          <Text className="text-sm text-ink-400">{formatRunDate(run.startedAt)}</Text>
        </View>
        <View className="flex-row gap-3">
          <Metric label="Distância" value={formatDistanceKm(run.distanceM)} />
          <Metric label="Pace" value={formatPace(run.avgPaceSPerKm)} />
          <Metric label="Tempo" value={formatDuration(run.movingTimeS)} />
        </View>
        {run.route.length >= 2 ? (
          <RouteThumbnail positions={run.route} width={thumbnailWidth} height={140} />
        ) : null}
      </Pressable>
      {footer}
    </View>
  );
}
