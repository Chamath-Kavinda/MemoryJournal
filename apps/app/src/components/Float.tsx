import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useLoopProgress } from '@/motion/loops';
import { LOOP_DURATION } from '@/theme/motion';

export interface FloatProps {
  children: ReactNode;
  /** Pass true while the screen is not focused so the loop stops. */
  paused?: boolean;
  /** How far, in points, the content rises at the top of the cycle. */
  amplitude?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The slow up and down float of an empty-state icon. A loop, so it follows the loop rules. */
export function Float({ children, paused = false, amplitude = 6, style, testID }: FloatProps) {
  const progress = useLoopProgress(!paused, LOOP_DURATION.float);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: -amplitude * progress.value }],
  }));

  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
