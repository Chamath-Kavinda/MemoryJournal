import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useLoopProgress } from '@/motion/loops';
import { RADIUS } from '@/theme/layout';
import { LOOP_DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** Pass true while the screen is not focused so the shimmer stops. */
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A placeholder block shown while data loads. It shimmers by pulsing its opacity, and rests as a
 * still block when reduce motion is on or no loop slot is free.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = RADIUS.input,
  paused = false,
  style,
  testID,
}: SkeletonProps) {
  const { palette } = useTheme();
  const progress = useLoopProgress(!paused, LOOP_DURATION.shimmer);
  const animated = useAnimatedStyle(() => ({ opacity: 0.45 + 0.4 * progress.value }));

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: palette.surfaceRaised },
        style,
        animated,
      ]}
    />
  );
}
