import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useLoopProgress } from '@/motion/loops';
import { LOOP_DURATION } from '@/theme/motion';

export interface BreatheProps {
  children: ReactNode;
  /** Pass true while the screen is not focused so the loop stops. */
  paused?: boolean;
  /** Lowest opacity of the cycle. */
  minOpacity?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A slow breathing glow for the today ring and the streak flame (v0.2.5: opacity only, the size
 * never changes). It is a loop, so it takes one of the two loop slots and rests at full opacity
 * when none is free, when reduce motion is on, when paused, or when the app is in the background.
 */
export function Breathe({
  children,
  paused = false,
  minOpacity = 0.65,
  style,
  testID,
}: BreatheProps) {
  const progress = useLoopProgress(!paused, LOOP_DURATION.breathe);
  const animated = useAnimatedStyle(() => ({
    opacity: 1 - (1 - minOpacity) * progress.value,
  }));

  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
