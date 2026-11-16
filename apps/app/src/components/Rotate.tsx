import { useEffect, useRef, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeIn, easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';

export interface RotateProps {
  children: ReactNode;
  /** False rests at 0 degrees, true at `degrees`. The turn animates when this changes. */
  turned: boolean;
  /** How far it turns; 180 flips a chevron. */
  degrees?: number;
  testID?: string;
}

/**
 * Turns its content when `turned` changes, for example the chevron of a row that opens. Opening
 * eases out and closing eases in. Nothing animates on the first render, and with reduce motion
 * on the content simply jumps to its final angle.
 */
export function Rotate({ children, turned, degrees = 180, testID }: RotateProps) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(turned ? 1 : 0);
  const first = useRef(true);

  useEffect(() => {
    const target = turned ? 1 : 0;
    if (first.current || reduce) {
      first.current = false;
      progress.value = target;
      return;
    }
    progress.value = withTiming(target, {
      duration: DURATION.base,
      easing: turned ? easeOut : easeIn,
    });
  }, [turned, reduce, progress]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * degrees}deg` }],
  }));

  return (
    <Animated.View testID={testID} style={animated}>
      {children}
    </Animated.View>
  );
}
