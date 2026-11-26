import { useEffect, useState } from 'react';
import { Animated, type DimensionValue } from 'react-native';

type SkeletonProps = {
  width?: DimensionValue;
  height: number;
  radius?: number;
};

/** Pulsing placeholder shown while content loads or uploads. */
export function Skeleton({ width = '100%', height, radius = 12 }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityLabel="Carregando"
      className="bg-ink-200 dark:bg-ink-700"
      style={{ width, height, borderRadius: radius, opacity }}
    />
  );
}
