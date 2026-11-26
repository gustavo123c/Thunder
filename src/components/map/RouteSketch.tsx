import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { type Position, projectToBox } from '@/domain/geo/geojson';
import { useThemeColors } from '@/theme/theme';
import { colors, mapColors } from '@/theme/tokens';

import { GridBackdrop } from './GridBackdrop';
import type { RouteMapProps } from './MapboxRouteMap';

/**
 * Map-less route view (Expo Go): the route drawn on the stylized grid backdrop,
 * one polyline per segment so pauses show as gaps.
 */
export function RouteSketch({ route, followUser, style }: RouteMapProps) {
  const theme = useThemeColors();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const lines = useMemo(() => {
    if (!route) return [] as Position[][];
    return route.type === 'LineString' ? [route.coordinates] : route.coordinates;
  }, [route]);

  // Project all lines together so they share one scale.
  const projected = useMemo(() => {
    const all = lines.flat();
    if (all.length < 2 || size.width === 0) return [];
    const points = projectToBox(all, size.width, size.height, 32);
    let offset = 0;
    return lines.map((line) => {
      const slice = points.slice(offset, offset + line.length);
      offset += line.length;
      return slice;
    });
  }, [lines, size]);

  const first = projected[0]?.[0];
  const lastLine = projected[projected.length - 1];
  const last = lastLine?.[lastLine.length - 1];
  const hasRoute = projected.length > 0 && first && last;
  const hasRouteData = lines.flat().length >= 2;

  return (
    <View
      style={style ?? { flex: 1 }}
      onLayout={(event) =>
        setSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
    >
      <GridBackdrop showLocation={!hasRouteData && Boolean(followUser)}>
        {hasRoute ? (
          <Svg width={size.width} height={size.height} style={{ position: 'absolute' }}>
            {projected.map((line, index) => (
              <Polyline
                key={index}
                points={line.map(([x, y]) => `${x},${y}`).join(' ')}
                fill="none"
                stroke={mapColors.route}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            <Circle cx={first[0]} cy={first[1]} r={6} fill={mapColors.start} />
            <Circle
              cx={last[0]}
              cy={last[1]}
              r={followUser ? 9 : 6}
              fill={followUser ? colors.brand : mapColors.finish}
              stroke={theme.ink[900]}
              strokeWidth={followUser ? 3 : 0}
            />
          </Svg>
        ) : !followUser && !hasRouteData ? (
          <View className="flex-1 items-center justify-center gap-2 px-6">
            <Ionicons name="navigate-outline" size={28} color={theme.ink[400]} />
            <Text className="text-center text-sm text-ink-400">
              Sem trajeto de GPS nesta corrida.
            </Text>
          </View>
        ) : null}
      </GridBackdrop>
    </View>
  );
}
