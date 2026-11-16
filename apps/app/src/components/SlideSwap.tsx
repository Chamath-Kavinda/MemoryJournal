import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION, SLIDE_DISTANCE } from '@/theme/motion';

export interface SlideSwapProps {
  children: ReactNode;
  /** The content slides in again each time this changes, for example the month of a calendar. */
  swapKey: string | number;
  /** 1 slides in from the right (going forward), -1 from the left (going back). */
  direction: 1 | -1;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Fades and slides new content in from the side when its key changes. Nothing moves the first
 * time it is shown. With reduce motion on it is a plain 100 ms fade with no sideways movement.
 */
export function SlideSwap({ children, swapKey, direction, style, testID }: SlideSwapProps) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: reduce ? DURATION.reduced : DURATION.base,
      easing: easeOut,
    });
  }, [swapKey, reduce, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: reduce ? 0 : (1 - progress.value) * SLIDE_DISTANCE * direction }],
  }));

  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
