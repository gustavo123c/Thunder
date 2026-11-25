import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { type Position, projectToBox } from '@/domain/geo/geojson';
import { colors, mapColors } from '@/theme/tokens';

import type { RouteMapProps } from './MapboxRouteMap';

/**
 * Map-less fallback for Expo Go: draws the route as SVG (one polyline per segment,
 * so pauses show as gaps), scaled to the available space.
 */
export function RouteSketch({ route, followUser, style }: RouteMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const lines = useMemo(() => {
    if (!route) return [] as Position[][];
    return route.type === 'LineString' ? [route.coordinates] : route.coordinates;
  }, [route]);

  // Project all lines together so they share one scale.
  const projected = useMemo(() => {
    const all = lines.flat();
    if (all.length < 2 || size.width === 0) return [];
    const points = projectToBox(all, size.width, size.height, 24);
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

  return (
    <View
      style={style ?? { flex: 1 }}
      className="bg-ink-100 dark:bg-ink-800"
      onLayout={(event) =>
        setSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
    >
      {projected.length > 0 && first && last ? (
        <Svg width={size.width} height={size.height}>
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
          <Circle cx={last[0]} cy={last[1]} r={followUser ? 8 : 6} fill={mapColors.finish} />
        </Svg>
      ) : (
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Ionicons name="navigate-circle-outline" size={44} color={colors.bolt[500]} />
          <Text className="text-center text-sm text-ink-500 dark:text-ink-300">
            {followUser
              ? 'Sua rota aparecerá aqui assim que você começar a correr.'
              : 'Sem trajeto de GPS nesta corrida.'}
          </Text>
        </View>
      )}
      <Text className="absolute bottom-2 left-3 text-xs text-ink-400">
        Modo de teste (Expo Go) · mapa completo na versão instalada
      </Text>
    </View>
  );
}
