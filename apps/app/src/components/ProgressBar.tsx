import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { RADIUS } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';

const HEIGHT = 8;

export interface ProgressBarProps {
  /** How far along, from 0 to 1. Values outside the range are clamped. */
  progress: number;
  /** What the bar measures, for screen readers, for example `Lessons done`. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * A thin track with a neon gradient fill that fills from the left (section 15.16). With reduce
 * motion on the fill is drawn at its final width at once.
 */
export function ProgressBar({ progress, accessibilityLabel, testID }: ProgressBarProps) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const target = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const fill = useSharedValue(reduce ? target : 0);

  useEffect(() => {
    fill.value = reduce ? target : withTiming(target, { duration: DURATION.slow, easing: easeOut });
  }, [target, reduce, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      style={{
        height: HEIGHT,
        borderRadius: RADIUS.pill,
        overflow: 'hidden',
        backgroundColor: palette.surfaceRaised,
      }}
    >
      <Animated.View
        {...(testID === undefined ? {} : { testID: `${testID}-fill` })}
        style={[{ height: '100%', borderRadius: RADIUS.pill, overflow: 'hidden' }, fillStyle]}
      >
        <LinearGradient
          colors={[palette.primaryStart, palette.primaryEnd]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
