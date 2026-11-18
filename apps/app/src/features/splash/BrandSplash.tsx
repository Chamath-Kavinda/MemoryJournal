import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeIn, easeOut } from '@/motion/easing';
import { useLoopProgress } from '@/motion/loops';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION, SPLASH_FADE_MS } from '@/theme/motion';
import { RADIUS, SPACING } from '@/theme/layout';
import { DARK_TOKENS, GRADIENT_END, GRADIENT_START, SPLASH_BACKGROUND } from '@/theme/tokens';
import { FONT_FAMILY } from '@/theme/typography';

import { hideNativeSplash } from './nativeSplash';

const TRACK_WIDTH = 160;
const BAR_HEIGHT = 4;
/** Half cycle of the loading bar brightening and dimming. */
const PULSE_MS = 700;
/** The loading bar never dims below this opacity. */
const PULSE_MIN_OPACITY = 0.35;

export interface BrandSplashProps {
  /** True while the splash fades out into the app. */
  fading?: boolean;
}

/**
 * The first React screen (section 15.5 and 16.3): the name Memory Journal with a soft violet glow
 * and a thin indeterminate loading bar with the violet to blue gradient. It always uses the dark
 * palette, whichever theme is saved, on the same colour as the native splash so the hand-off is
 * invisible. It uses no image and waits for nothing itself: the layout decides when it leaves.
 * Nothing moves or scales (v0.2.5): the name fades in and the bar pulses in opacity only.
 * With reduce motion on, the bar is static and the caption says Loading.
 */
export function BrandSplash({ fading = false }: BrandSplashProps) {
  const reduce = useReduceMotion();
  const pulse = useLoopProgress(!fading, PULSE_MS);
  const enter = useSharedValue(reduce ? 1 : 0);
  const opacity = useSharedValue(1);

  // The name fades in.
  useEffect(() => {
    enter.value = withTiming(1, {
      duration: reduce ? DURATION.reduced : DURATION.slow,
      easing: easeOut,
    });
  }, [enter, reduce]);

  // The whole splash fades out, then the layout removes it.
  useEffect(() => {
    if (!fading) return;
    opacity.value = withTiming(0, {
      duration: reduce ? DURATION.reduced : SPLASH_FADE_MS,
      easing: easeIn,
    });
  }, [fading, reduce, opacity]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: enter.value }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: PULSE_MIN_OPACITY + (1 - PULSE_MIN_OPACITY) * pulse.value,
  }));

  return (
    <Animated.View
      testID="brand-splash"
      pointerEvents={fading ? 'none' : 'auto'}
      // The native splash is hidden once this screen is really on screen, so there is no flash.
      onLayout={hideNativeSplash}
      accessibilityRole="progressbar"
      accessibilityLabel="Memory Journal, loading"
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
    >
      <Animated.Text accessibilityRole="header" style={[styles.name, nameStyle]}>
        Memory Journal
      </Animated.Text>

      <View style={styles.track}>
        {reduce ? (
          <Gradient style={StyleSheet.absoluteFill} />
        ) : (
          <Animated.View style={[StyleSheet.absoluteFill, barStyle]}>
            <Gradient style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
      </View>

      {reduce ? <Animated.Text style={styles.caption}>Loading</Animated.Text> : null}
    </Animated.View>
  );
}

function Gradient({ style }: { style: object }) {
  return (
    <LinearGradient
      colors={[DARK_TOKENS.primaryStart, DARK_TOKENS.primaryEnd]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: SPLASH_BACKGROUND,
  },
  name: {
    color: DARK_TOKENS.text,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
    // A soft violet glow behind the letters.
    textShadowColor: DARK_TOKENS.neonViolet,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  track: {
    width: TRACK_WIDTH,
    height: BAR_HEIGHT,
    overflow: 'hidden',
    borderRadius: RADIUS.pill,
    backgroundColor: DARK_TOKENS.border,
  },
  caption: {
    color: DARK_TOKENS.textMuted,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
