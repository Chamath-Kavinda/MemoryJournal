import type { ReactNode } from 'react';
import {
  Pressable,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION, PRESS_SCALE, SPRING } from '@/theme/motion';

export interface PressState {
  pressed: boolean;
}

export interface PressableScaleProps {
  /** Content, or a function of the press state so the colour can change while pressed. */
  children: ReactNode | ((state: PressState) => ReactNode);
  onPress?: (() => void) | undefined;
  onLongPress?: (() => void) | undefined;
  disabled?: boolean | undefined;
  /** Draws the control at half strength. Follows disabled unless told otherwise. */
  dimmed?: boolean | undefined;
  accessibilityRole?: AccessibilityRole | undefined;
  accessibilityLabel?: string | undefined;
  accessibilityState?: AccessibilityState | undefined;
  /** Layout of the touchable area (width, margin, flex). */
  style?: StyleProp<ViewStyle>;
  /** Look of the part that scales: size, radius, border and fill. */
  innerStyle?: StyleProp<ViewStyle> | ((state: PressState) => StyleProp<ViewStyle>);
  testID?: string | undefined;
  /** Pointer and keyboard focus, used by the navigation tooltips on the web build. */
  onHoverIn?: (() => void) | undefined;
  onHoverOut?: (() => void) | undefined;
  onFocus?: (() => void) | undefined;
  onBlur?: (() => void) | undefined;
}

/**
 * The shared press feedback: scale to 0.97 on press with a quick ease-out and a spring back on
 * release. With reduce motion on, nothing scales and the control dims for 100 ms instead.
 * The control stays tappable while it animates; the animation runs on the UI thread.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  dimmed = disabled,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  style,
  innerStyle,
  testID,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
}: PressableScaleProps) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const dim = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 1 - dim.value * 0.15,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    if (reduce) {
      dim.value = withTiming(1, { duration: DURATION.reduced });
    } else {
      scale.value = withTiming(PRESS_SCALE, { duration: DURATION.fast, easing: easeOut });
    }
  };

  const handlePressOut = () => {
    if (reduce) {
      dim.value = withTiming(0, { duration: DURATION.reduced });
    } else {
      scale.value = withSpring(1, SPRING);
    }
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, ...accessibilityState }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      onFocus={onFocus}
      onBlur={onBlur}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, dimmed ? { opacity: 0.5 } : null]}
    >
      {({ pressed }) => (
        <Animated.View
          testID={testID ? `${testID}-scale` : undefined}
          style={[
            typeof innerStyle === 'function' ? innerStyle({ pressed }) : innerStyle,
            animated,
          ]}
        >
          {typeof children === 'function' ? children({ pressed }) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}
