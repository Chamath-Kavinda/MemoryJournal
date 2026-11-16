import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface ThemeFadeProps {
  /** Optional: place the component as the last child of a screen-sized view to fade over it. */
  children?: ReactNode;
}

/**
 * Cross-fades the colours when the theme changes (section 15.16): the screen shows the new theme
 * at once while a layer in the old background colour fades out over 250 ms on top of it, so the
 * change melts instead of flipping. With reduce motion on the fade lasts 100 ms. The layer never
 * takes touches, so nothing is blocked while it fades.
 */
export function ThemeFade({ children }: ThemeFadeProps) {
  const { scheme, palette } = useTheme();
  const reduce = useReduceMotion();
  const previous = useRef({ scheme, background: palette.background });
  const [from, setFrom] = useState<string | null>(null);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (previous.current.scheme === scheme) return undefined;
    const old = previous.current.background;
    previous.current = { scheme, background: palette.background };

    const duration = reduce ? DURATION.reduced : DURATION.base;
    setFrom(old);
    opacity.value = 1;
    opacity.value = withTiming(0, { duration, easing: easeOut });
    const timer = setTimeout(() => setFrom(null), duration + 50);
    return () => clearTimeout(timer);
  }, [scheme, palette.background, reduce, opacity]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      {children}
      {from ? (
        <Animated.View
          testID="theme-fade-layer"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: from }, layerStyle]}
        />
      ) : null}
    </>
  );
}
