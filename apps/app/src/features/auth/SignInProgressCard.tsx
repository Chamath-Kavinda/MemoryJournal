import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { RADIUS, SPACING } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import type { SignInStep } from './signInFlow';

export const SIGN_IN_STEPS: { step: SignInStep; label: string }[] = [
  { step: 'signing-in', label: 'Signing in' },
  { step: 'adding', label: 'Adding your journal' },
  { step: 'cleaning', label: 'Cleaning up' },
];

interface Props {
  /** The step that is running now, or null before the first one starts. */
  current: SignInStep | null;
  /** True once every step has finished, so all three show a check. */
  finished?: boolean;
}

/** How many of the three steps are complete, from 0 to 3. */
export function completedSteps(current: SignInStep | null, finished: boolean): number {
  if (finished) return SIGN_IN_STEPS.length;
  if (current === null) return 0;
  return SIGN_IN_STEPS.findIndex((s) => s.step === current);
}

/**
 * The progress card shown while a guest journal is added to the account (docs section 15.6,
 * point 8, and section 15.16): three steps, a bar that fills, and a Check on each finished step.
 */
export function SignInProgressCard({ current, finished = false }: Props) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const done = completedSteps(current, finished);
  const fill = useSharedValue(0);

  useEffect(() => {
    // Each step in progress counts as half done, so the bar is never still at the start of a step.
    const target = finished ? 1 : (done + (current === null ? 0 : 0.5)) / SIGN_IN_STEPS.length;
    fill.value = withTiming(target, {
      duration: reduce ? DURATION.reduced : DURATION.base,
      easing: easeOut,
    });
  }, [current, finished, done, reduce, fill]);

  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <Card active testID="sign-in-progress" accessibilityLabel="Adding your journal to your account">
      <View style={{ gap: SPACING.md }}>
        <View
          testID="sign-in-progressbar"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: SIGN_IN_STEPS.length, now: done }}
          style={{
            height: 6,
            borderRadius: RADIUS.pill,
            overflow: 'hidden',
            backgroundColor: palette.border,
          }}
        >
          <Animated.View
            style={[
              { height: 6, borderRadius: RADIUS.pill, backgroundColor: palette.accent },
              barStyle,
            ]}
          />
        </View>
        {SIGN_IN_STEPS.map(({ step, label }, index) => {
          const complete = index < done;
          const running = !complete && step === current;
          return (
            <View
              key={step}
              testID={`sign-in-step-${step}`}
              accessibilityState={{ busy: running }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}
            >
              <View
                style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
              >
                {complete ? <Icon icon={Check} size="inline" color={palette.accent} /> : null}
              </View>
              <Text
                style={{
                  color: complete || running ? palette.text : palette.muted,
                  fontWeight: running ? '600' : '400',
                }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
