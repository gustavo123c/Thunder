import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

/** True when the user asked the OS to reduce motion (flashes are skipped then). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setReduce(value))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * "Storm" flash: a ~300 ms amber glow with a bolt, fired each time `trigger` changes
 * (> 0). Always paired with a haptic; with reduced motion only the haptic remains.
 */
export function LightningFlash({ trigger, haptic = true }: { trigger: number; haptic?: boolean }) {
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    if (trigger <= 0) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    if (reduceMotion) return;
    opacity.setValue(0);
    scale.setValue(0.6);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [trigger, haptic, reduceMotion, opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, styles.center, { opacity }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.glow]} />
      <Animated.View style={{ transform: [{ scale }, { rotate: '-8deg' }] }}>
        <Ionicons name="flash" size={140} color={colors.brand} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: { backgroundColor: colors.brand, opacity: 0.28 },
});
