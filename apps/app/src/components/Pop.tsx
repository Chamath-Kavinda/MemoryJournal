import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION, POP_SCALE, SPRING } from '@/theme/motion';

export interface PopProps {
  children: ReactNode;
  /**
   * The content pops (scale 1, 1.2, 1) each time this value changes. A value of false does not
   * pop, so `trigger={done}` pops when something becomes done and stays still when it is undone.
   */
  trigger: boolean | number | string;
  /** Pop once when first shown, for a new minute marker or a freshly drawn check. */
  playOnMount?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** A short spring pop for icons and markers. With reduce motion on it does nothing. */
export function Pop({ children, trigger, playOnMount = false, style, testID }: PopProps) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (reduce || trigger === false) return;
    if (isFirst && !playOnMount) return;
    scale.value = withSequence(
      withTiming(POP_SCALE, { duration: DURATION.fast, easing: easeOut }),
      withSpring(1, SPRING),
    );
  }, [trigger, playOnMount, reduce, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
