import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

const W = 200;
const H = 140;
const CELL = 20;

/**
 * Empty-state art built from the app's own "map grid": a dashed amber route that
 * starts at a dot and ends in a location pin.
 */
export function RouteIllustration({ width = W }: { width?: number }) {
  const theme = useThemeColors();
  const height = (width * H) / W;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} accessibilityElementsHidden>
      {Array.from({ length: W / CELL + 1 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={i * CELL}
          y1={0}
          x2={i * CELL}
          y2={H}
          stroke={theme.ink[50]}
          strokeOpacity={0.06}
        />
      ))}
      {Array.from({ length: H / CELL + 1 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={0}
          y1={i * CELL}
          x2={W}
          y2={i * CELL}
          stroke={theme.ink[50]}
          strokeOpacity={0.06}
        />
      ))}
      {/* faint "streets" */}
      <Path
        d="M0 104 C 60 96, 90 120, 200 92"
        stroke={theme.ink[600]}
        strokeWidth={6}
        fill="none"
      />
      <Path d="M70 0 C 76 50, 60 90, 82 140" stroke={theme.ink[600]} strokeWidth={6} fill="none" />
      {/* the route */}
      <Path
        d="M28 112 C 52 70, 84 92, 104 66 S 140 30, 160 44"
        stroke={colors.brand}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="2 9"
        fill="none"
      />
      <Circle cx={28} cy={112} r={6} fill={colors.brand} />
      <Circle cx={28} cy={112} r={12} fill={colors.brand} fillOpacity={0.18} />
      {/* end pin */}
      <Path
        d="M160 50 C 160 50, 146 34, 146 25 a 14 14 0 0 1 28 0 C 174 34, 160 50, 160 50 Z"
        fill={colors.brand}
      />
      <Circle cx={160} cy={25} r={5} fill={colors.onBolt} />
    </Svg>
  );
}
