import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { type Position, projectToBox } from '@/domain/geo/geojson';
import { useThemeColors } from '@/theme/theme';
import { mapColors } from '@/theme/tokens';

type RouteThumbnailProps = {
  positions: readonly Position[];
  width: number;
  height: number;
  /** Corner radius (default 16). */
  radius?: number;
};

const CELL = 12;

/**
 * Route drawn as SVG — no map tiles, no network. Cheap enough for long lists (feed,
 * history) where one native map per row would be far too heavy.
 */
export function RouteThumbnail({ positions, width, height, radius = 16 }: RouteThumbnailProps) {
  const theme = useThemeColors();
  const small = width < 120;
  const points = useMemo(
    () => projectToBox(positions, width, height, small ? 8 : 12),
    [positions, width, height, small],
  );

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center overflow-hidden border border-hairline bg-ink-900"
      style={{ width, height, borderRadius: radius }}
    >
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        {Array.from({ length: Math.ceil(width / CELL) + 1 }, (_, i) => (
          <Line
            key={`v${i}`}
            x1={i * CELL}
            y1={0}
            x2={i * CELL}
            y2={height}
            stroke={theme.ink[50]}
            strokeOpacity={0.05}
          />
        ))}
        {Array.from({ length: Math.ceil(height / CELL) + 1 }, (_, i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={i * CELL}
            x2={width}
            y2={i * CELL}
            stroke={theme.ink[50]}
            strokeOpacity={0.05}
          />
        ))}
        {points.length >= 2 && first && last ? (
          <>
            <Polyline
              points={points.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke={mapColors.route}
              strokeWidth={small ? 3 : 4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx={first[0]} cy={first[1]} r={small ? 3.5 : 5} fill={mapColors.start} />
            <Circle cx={last[0]} cy={last[1]} r={small ? 3.5 : 5} fill={mapColors.finish} />
          </>
        ) : null}
      </Svg>
      {points.length >= 2 ? null : (
        // No GPS track: a crossed-out pin keeps every card the same shape.
        <View className="items-center justify-center">
          <Ionicons name="location-outline" size={small ? 22 : 30} color={theme.ink[500]} />
          <View
            className="absolute h-[2px] bg-ink-500"
            style={{ width: small ? 30 : 42, transform: [{ rotate: '-45deg' }] }}
          />
        </View>
      )}
    </View>
  );
}
