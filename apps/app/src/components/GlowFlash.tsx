import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { easeIn, easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, RADIUS } from '@/theme/layout';
import { glowStyle } from '@/theme/glow';
import { DURATION } from '@/theme/motion';
import type { Scheme } from '@/theme/palette';

export interface GlowFlashProps {
  /** One flash each time this number changes. Nothing flashes the first time it is shown. */
  trigger: number;
  /** A colour from the palette. */
  color: string;
  scheme: Scheme;
  /** Corner radius of the thing that flashes; a card by default. */
  radius?: number;
  testID?: string;
}

/**
 * A short flash of coloured border and glow around its parent, for a card that has just become
 * available. It fills its parent, never takes touches, and does nothing with reduce motion on.
 */
export function GlowFlash({
  trigger,
  color,
  scheme,
  radius = RADIUS.card,
  testID,
}: GlowFlashProps) {
  const reduce = useReduceMotion();
  const level = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    level.value = withSequence(
      withTiming(1, { duration: DURATION.fast, easing: easeOut }),
      withTiming(0, { duration: DURATION.slow, easing: easeIn }),
    );
  }, [trigger, reduce, level]);

  const animated = useAnimatedStyle(() => ({ opacity: level.value }));

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: radius,
          borderWidth: BORDER_WIDTH,
          borderColor: color,
        },
        glowStyle(color, scheme, 20),
        animated,
      ]}
    />
  );
}
