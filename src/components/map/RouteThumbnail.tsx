import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { type Position, projectToBox } from '@/domain/geo/geojson';
import { mapColors } from '@/theme/tokens';

type RouteThumbnailProps = {
  positions: readonly Position[];
  width: number;
  height: number;
};

/**
 * Route drawn as SVG — no map tiles, no network. Cheap enough for long lists (feed,
 * history) where one native map per row would be far too heavy.
 */
export function RouteThumbnail({ positions, width, height }: RouteThumbnailProps) {
  const points = useMemo(
    () => projectToBox(positions, width, height, 12),
    [positions, width, height],
  );

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="overflow-hidden rounded-2xl bg-ink-100 dark:bg-ink-800"
      style={{ width, height }}
    >
      {points.length >= 2 && first && last ? (
        <Svg width={width} height={height}>
          <Polyline
            points={points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke={mapColors.route}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={first[0]} cy={first[1]} r={5} fill={mapColors.start} />
          <Circle cx={last[0]} cy={last[1]} r={5} fill={mapColors.finish} />
        </Svg>
      ) : null}
    </View>
  );
}
