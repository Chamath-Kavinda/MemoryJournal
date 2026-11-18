import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { easeIn } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';

export interface RemovableProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * One item of a list that can lose items: a deleted card, or a card that a filter hides. When
 * the item is removed it fades out (ease-in, 250 ms) and the list updates (v0.2.5: the items
 * around it no longer glide into the gap). With reduce motion on the item fades out in 100 ms.
 *
 * Give every `Removable` of a list a stable `key`, so only the items that really leave animate.
 */
export function Removable({ children, style, testID }: RemovableProps) {
  const reduce = useReduceMotion();
  return (
    <Animated.View
      testID={testID}
      style={style}
      exiting={FadeOut.duration(reduce ? DURATION.reduced : DURATION.base).easing(easeIn)}
    >
      {children}
    </Animated.View>
  );
}
