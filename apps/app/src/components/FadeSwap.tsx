import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';

export interface FadeSwapProps {
  children: ReactNode;
  /** The content fades in again each time this changes, for example the month of a calendar. */
  swapKey: string | number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Fades new content in when its key changes (v0.2.5: nothing slides). Nothing animates the first
 * time it is shown. The fade lasts 150 ms, or 100 ms with reduce motion on.
 */
export function FadeSwap({ children, swapKey, style, testID }: FadeSwapProps) {
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
      duration: reduce ? DURATION.reduced : DURATION.fast,
      easing: easeOut,
    });
  }, [swapKey, reduce, progress]);

  const animated = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
