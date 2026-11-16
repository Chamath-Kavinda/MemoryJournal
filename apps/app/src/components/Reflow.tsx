import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ROW_LAYOUT } from '@/motion/layout';
import { useReduceMotion } from '@/motion/useReduceMotion';

export interface ReflowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A container whose size and position animate when its content or its neighbours change size,
 * so a list of rows opens and closes smoothly instead of jumping. With reduce motion on it does
 * not animate and the change is instant.
 */
export function Reflow({ children, style, testID }: ReflowProps) {
  const reduce = useReduceMotion();
  return (
    <Animated.View testID={testID} style={style} {...(reduce ? {} : { layout: ROW_LAYOUT })}>
      {children}
    </Animated.View>
  );
}
