import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { useTheme } from '@/theme/ThemeProvider';

/** About 24 dots for 1.2 seconds (section 15.16). */
export const BURST_DOTS = 24;
export const BURST_DURATION = 1200;
const DISTANCE = 84;
const DOT = 7;

interface DotProps {
  index: number;
  progress: SharedValue<number>;
  color: string;
}

function Dot({ index, progress, color }: DotProps) {
  const angle = (index / BURST_DOTS) * Math.PI * 2;
  // Every other dot flies a little shorter, so the burst looks scattered and not like a circle.
  const reach = DISTANCE * (index % 2 === 0 ? 1 : 0.7);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * reach * progress.value },
      { translateY: Math.sin(angle) * reach * progress.value },
      { scale: 1 - progress.value * 0.5 },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: DOT,
          height: DOT,
          marginLeft: -DOT / 2,
          marginTop: -DOT / 2,
          borderRadius: DOT / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export interface BurstProps {
  testID?: string;
}

/**
 * A short burst of neon dots that flies out from its centre and fades, for reaching a streak
 * milestone. It is drawn with plain animated views, no extra library. Reduce motion removes it:
 * it is large motion with no information of its own.
 */
export function Burst({ testID }: BurstProps) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    progress.value = withTiming(1, { duration: BURST_DURATION, easing: easeOut });
  }, [reduce, progress]);

  if (reduce) return null;

  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}
    >
      {Array.from({ length: BURST_DOTS }, (_, index) => (
        <Dot
          key={index}
          index={index}
          progress={progress}
          color={index % 2 === 0 ? palette.neonViolet : palette.neonBlue}
        />
      ))}
    </View>
  );
}
