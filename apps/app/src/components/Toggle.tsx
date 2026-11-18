import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, MIN_TARGET, RADIUS } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';

import { PressableScale } from './PressableScale';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB = 24;
/** Gap between the thumb and the inside edge of the track. */
const INSET = 3;
/** How far the thumb travels: the track inside its border, minus the thumb and both insets. */
const TRAVEL = TRACK_WIDTH - BORDER_WIDTH * 2 - THUMB - INSET * 2;

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Required: a switch has no visible text of its own. */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

/**
 * An on/off switch. The thumb is drawn in its new position at once (v0.2.5: nothing slides), and
 * the thumb colour and the brand gradient behind it fade over 150 ms (100 ms with reduce motion
 * on). The touch target is at least 44 high (48 on Android).
 */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  testID,
}: ToggleProps) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: reduce ? DURATION.reduced : DURATION.fast,
    });
  }, [value, reduce, progress]);

  const off = palette.textMuted;
  const on = palette.onGradient;

  const thumbStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]),
  }));
  const fillStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, progress.value)),
  }));

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
      innerStyle={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: RADIUS.pill,
        borderWidth: BORDER_WIDTH,
        borderColor: palette.border,
        backgroundColor: palette.surfaceRaised,
        overflow: 'hidden',
      }}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fillStyle]}>
        <LinearGradient
          colors={[palette.primaryStart, palette.primaryEnd]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        testID={testID ? `${testID}-thumb` : undefined}
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: INSET,
            left: INSET + (value ? TRAVEL : 0),
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
          },
          thumbStyle,
        ]}
      />
    </PressableScale>
  );
}
