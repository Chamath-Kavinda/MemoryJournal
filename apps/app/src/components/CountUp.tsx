import { useEffect, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';
import { Text, type ThemedTextProps } from '@/theme/themed';

export interface CountUpProps {
  /** The number to count up to. A new value counts from wherever the number is now. */
  value: number;
  /** Turns the number into the text shown, for example `3` into `3 days`. */
  format?: (value: number) => string;
  variant?: ThemedTextProps['variant'];
  /** Duration of the count in milliseconds. */
  duration?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * A number that counts up to its value. The count runs on the UI thread; the text is only updated
 * when the whole number changes, so a streak of 14 re-renders 14 times at most, never once per
 * frame. With reduce motion on the final value shows at once.
 */
export function CountUp({
  value,
  format = String,
  variant = 'title',
  duration = DURATION.slow,
  style,
  testID,
}: CountUpProps) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const current = useSharedValue(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      current.value = value;
      setShown(value);
      return;
    }
    current.value = withTiming(value, { duration, easing: easeOut });
  }, [value, reduce, duration, current]);

  useAnimatedReaction(
    () => Math.round(current.value),
    (next, previous) => {
      if (next !== previous) runOnJS(setShown)(next);
    },
  );

  return (
    <Text testID={testID} variant={variant} style={style}>
      {format(shown)}
    </Text>
  );
}
