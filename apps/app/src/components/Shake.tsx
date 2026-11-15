import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';

export interface ShakeProps {
  children: ReactNode;
  /** Shakes once each time this number changes. Add one to it to shake again. */
  trigger: number;
  /** Shake once when first shown, for an error card that appears already failed. */
  playOnMount?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The small sideways shake of an error card or a danger icon. Nothing happens with reduce motion. */
export function Shake({ children, trigger, playOnMount = false, style, testID }: ShakeProps) {
  const reduce = useReduceMotion();
  const offset = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (reduce) return;
    if (isFirst && !playOnMount) return;
    const step = { easing: easeOut };
    offset.value = withSequence(
      withTiming(-6, { duration: 40, ...step }),
      withTiming(6, { duration: 70, ...step }),
      withTiming(-4, { duration: 70, ...step }),
      withTiming(3, { duration: 60, ...step }),
      withTiming(0, { duration: 40, ...step }),
    );
  }, [trigger, playOnMount, reduce, offset]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
