import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';

export interface RevealProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Content that fades in when it is first shown, for the inside of a row that has just opened.
 * Opacity only (v0.2.5). With reduce motion on the fade lasts 100 ms.
 */
export function Reveal({ children, style, testID }: RevealProps) {
  const reduce = useReduceMotion();
  return (
    <Animated.View
      testID={testID}
      style={style}
      entering={FadeIn.duration(reduce ? DURATION.reduced : DURATION.base).easing(easeOut)}
    >
      {children}
    </Animated.View>
  );
}
