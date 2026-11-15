import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION, staggerDelay } from '@/theme/motion';

export interface FadeUpProps {
  children: ReactNode;
  /** Position in a list. Items stagger by 50 ms, and items past the eighth appear together. */
  index?: number;
  /** How far, in points, the content rises while it fades in. */
  distance?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Fades its content in while moving up. With reduce motion on it is a plain 100 ms fade with no
 * movement and no stagger.
 */
export function FadeUp({ children, index = 0, distance = 12, style, testID }: FadeUpProps) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduce
      ? withTiming(1, { duration: DURATION.reduced })
      : withDelay(staggerDelay(index), withTiming(1, { duration: DURATION.base, easing: easeOut }));
  }, [reduce, index, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduce ? 0 : (1 - progress.value) * distance }],
  }));

  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
