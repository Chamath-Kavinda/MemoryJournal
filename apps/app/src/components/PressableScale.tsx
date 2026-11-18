import type { ReactNode } from 'react';
import {
  Pressable,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';

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
  /** Look of the inner part: size, radius, border and fill. */
  innerStyle?: StyleProp<ViewStyle> | ((state: PressState) => StyleProp<ViewStyle>);
  testID?: string | undefined;
  /** Pointer and keyboard focus, used by the navigation tooltips on the web build. */
  onHoverIn?: (() => void) | undefined;
  onHoverOut?: (() => void) | undefined;
  onFocus?: (() => void) | undefined;
  onBlur?: (() => void) | undefined;
}

/**
 * The shared press feedback (v0.2.5): nothing moves, scales or springs. The control dims a
 * little while pressed, with a 150 ms fade (100 ms with reduce motion on), and callers can
 * change colour through the `pressed` state. The name is kept so call sites do not change.
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
  const dim = useSharedValue(0);
  const duration = reduce ? DURATION.reduced : DURATION.fast;

  const animated = useAnimatedStyle(() => ({
    opacity: 1 - dim.value * 0.15,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    dim.value = withTiming(1, { duration });
  };

  const handlePressOut = () => {
    dim.value = withTiming(0, { duration });
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
