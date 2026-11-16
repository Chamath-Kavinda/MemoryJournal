import { useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A little longer than the path (about 20.5), so the last bit is fully drawn at the end. */
const PATH_LENGTH = 21;

export interface DrawCheckProps {
  /** A colour from the palette, for example `palette.success`. */
  color: string;
  size?: number;
  strokeWidth?: number;
  testID?: string;
}

/**
 * A check mark that draws itself when it appears. With reduce motion on it is drawn at once.
 * It is decoration: the text next to it says what happened.
 */
export function DrawCheck({ color, size = 20, strokeWidth = 2.5, testID }: DrawCheckProps) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    progress.value = reduce ? 1 : withTiming(1, { duration: DURATION.base, easing: easeOut });
  }, [reduce, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: PATH_LENGTH * (1 - progress.value),
  }));

  return (
    <Svg
      {...(testID === undefined ? {} : { testID })}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AnimatedPath
        d="M5 12.5 L10 17.5 L19 7.5"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={PATH_LENGTH}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
