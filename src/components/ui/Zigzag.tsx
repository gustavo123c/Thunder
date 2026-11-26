import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/** "Storm" divider: a thin amber zigzag, for highlight moments only. */
export function Zigzag({ height = 10 }: { height?: number }) {
  const [width, setWidth] = useState(0);
  const step = 10;
  const points: string[] = [];
  for (let x = 0, up = true; x <= width; x += step, up = !up) {
    points.push(`${x},${up ? 1 : height - 1}`);
  }
  return (
    <View
      accessibilityElementsHidden
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Polyline
            points={points.join(' ')}
            fill="none"
            stroke={colors.brand}
            strokeOpacity={0.6}
            strokeWidth={1.5}
          />
        </Svg>
      ) : null}
    </View>
  );
}
