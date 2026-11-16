import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

import { easeIn } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { DURATION, SPRING } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { DrawCheck } from './DrawCheck';

/** How long a snackbar stays before it goes away on its own. */
export const SNACKBAR_DURATION = 3000;

export interface SnackbarProps {
  /** What happened, in a few words. Null hides the snackbar. */
  message: string | null;
  /** Changes with every new message, so the same words shown twice restart the timer. */
  id: number;
  onDismiss: () => void;
  duration?: number;
  /** Distance from the bottom edge of the parent. */
  bottom?: number;
  testID?: string;
}

/**
 * A short confirmation with a check that draws itself, for example after saving. It slides in
 * with the shared spring, fades out, and is read out politely by screen readers. With reduce
 * motion on it fades in and out in 100 ms.
 */
export function Snackbar({
  message,
  id,
  onDismiss,
  duration = SNACKBAR_DURATION,
  bottom = SPACING.lg,
  testID = 'snackbar',
}: SnackbarProps) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();

  useEffect(() => {
    if (message === null) return undefined;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, id, duration, onDismiss]);

  if (message === null) return null;

  const entering = reduce
    ? FadeIn.duration(DURATION.reduced)
    : SlideInDown.springify().damping(SPRING.damping).stiffness(SPRING.stiffness);
  const exiting = FadeOut.duration(reduce ? DURATION.reduced : DURATION.fast).easing(easeIn);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
      }}
    >
      <Animated.View
        key={id}
        testID={testID}
        entering={entering}
        exiting={exiting}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderRadius: RADIUS.pill,
          borderWidth: BORDER_WIDTH,
          borderColor: palette.border,
          backgroundColor: palette.surfaceRaised,
        }}
      >
        <DrawCheck color={palette.success} />
        <Text variant="body">{message}</Text>
      </Animated.View>
    </View>
  );
}
