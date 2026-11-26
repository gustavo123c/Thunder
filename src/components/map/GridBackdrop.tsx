import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

type GridBackdropProps = {
  /** Show the pulsing "you are here" marker in the center. */
  showLocation?: boolean;
  children?: ReactNode;
};

const CELL = 36;

/**
 * Stylized dark "map": fine grid, a few faint street-like strokes and an amber
 * glow around the runner. Used where no real map is available (Expo Go) and as
 * the idle background of the record screen.
 */
export function GridBackdrop({ showLocation = true, children }: GridBackdropProps) {
  const theme = useThemeColors();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  const cx = width / 2;
  const cy = height / 2;

  const verticals = Math.ceil(width / CELL);
  const horizontals = Math.ceil(height / CELL);

  return (
    <View
      className="flex-1 bg-ink-900"
      onLayout={(e) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      {width > 0 ? (
        <Svg width={width} height={height} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.brand} stopOpacity={0.16} />
              <Stop offset="1" stopColor={colors.brand} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {Array.from({ length: verticals + 1 }, (_, i) => (
            <Line
              key={`v${i}`}
              x1={i * CELL}
              y1={0}
              x2={i * CELL}
              y2={height}
              stroke={theme.ink[50]}
              strokeOpacity={theme.isDark ? 0.035 : 0.05}
            />
          ))}
          {Array.from({ length: horizontals + 1 }, (_, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={i * CELL}
              x2={width}
              y2={i * CELL}
              stroke={theme.ink[50]}
              strokeOpacity={theme.isDark ? 0.035 : 0.05}
            />
          ))}

          {/* Faint "streets" */}
          <Path
            d={`M -20 ${height * 0.72} C ${width * 0.3} ${height * 0.6}, ${width * 0.55} ${height * 0.78}, ${width + 20} ${height * 0.55}`}
            stroke={theme.ink[700]}
            strokeWidth={10}
            fill="none"
          />
          <Path
            d={`M ${width * 0.18} -20 L ${width * 0.34} ${height + 20}`}
            stroke={theme.ink[700]}
            strokeWidth={7}
            fill="none"
          />
          <Path
            d={`M ${width + 20} ${height * 0.18} L ${-20} ${height * 0.34}`}
            stroke={theme.ink[700]}
            strokeWidth={5}
            fill="none"
          />

          <Rect x={cx - 160} y={cy - 160} width={320} height={320} fill="url(#glow)" />

          {showLocation ? (
            <>
              <Circle
                cx={cx}
                cy={cy}
                r={44}
                stroke={colors.brand}
                strokeOpacity={0.15}
                fill="none"
              />
              <Circle cx={cx} cy={cy} r={24} fill={colors.brand} fillOpacity={0.15} />
              <Circle
                cx={cx}
                cy={cy}
                r={9}
                fill={colors.brand}
                stroke={theme.ink[900]}
                strokeWidth={3}
              />
            </>
          ) : null}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
