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
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A fade-in entrance (v0.2.5): opacity only, nothing rises or moves. List items stagger by 50 ms
 * for at most 8 items. With reduce motion on it is a plain 100 ms fade with no stagger. The name
 * is kept so call sites do not change.
 */
export function FadeUp({ children, index = 0, style, testID }: FadeUpProps) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduce
      ? withTiming(1, { duration: DURATION.reduced })
      : withDelay(staggerDelay(index), withTiming(1, { duration: DURATION.base, easing: easeOut }));
  }, [reduce, index, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
