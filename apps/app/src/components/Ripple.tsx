import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION, RIPPLE_END_SCALE, RIPPLE_START_SCALE } from '@/theme/motion';

export interface RippleProps {
  /** A ring of colour spreads out and fades each time this number changes. */
  trigger: number;
  /** A colour from the palette. */
  color: string;
  testID?: string;
}

/**
 * The ripple of a tapped date: a round wash of colour that grows and fades out over the cell.
 * It fills its parent, never takes touches, and does nothing with reduce motion on.
 */
export function Ripple({ trigger, color, testID }: RippleProps) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION.base, easing: easeOut });
  }, [trigger, reduce, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - progress.value),
    transform: [
      { scale: RIPPLE_START_SCALE + (RIPPLE_END_SCALE - RIPPLE_START_SCALE) * progress.value },
    ],
  }));

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { borderRadius: 999, backgroundColor: color }, animated]}
    />
  );
}
