import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { CountUp } from './CountUp';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 168;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface ScoreRingProps {
  /** The recall score, from 0 to 100. */
  score: number;
  testID?: string;
}

/**
 * The recall score as a ring that draws from 0 to its value while the number in the middle counts
 * up (section 15.16). The stroke is the neon gradient. With reduce motion on both show the final
 * value at once.
 */
export function ScoreRing({ score, testID }: ScoreRingProps) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const value = Math.min(100, Math.max(0, Math.round(score)));
  const progress = useSharedValue(reduce ? value / 100 : 0);

  useEffect(() => {
    progress.value = reduce
      ? value / 100
      : withTiming(value / 100, { duration: DURATION.hero, easing: easeOut });
  }, [value, reduce, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Recall score ${value} out of 100`}
      style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="score-ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.neonViolet} />
            <Stop offset="1" stopColor={palette.neonBlue} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={palette.border}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          {...(testID === undefined ? {} : { testID: `${testID}-arc` })}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="url(#score-ring)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          rotation={-90}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <CountUp
        value={value}
        duration={DURATION.hero}
        style={{ color: palette.text, fontSize: 44, fontWeight: '700', lineHeight: 52 }}
      />
      <Text style={{ color: palette.muted, fontSize: 14 }}>out of 100</Text>
    </View>
  );
}
