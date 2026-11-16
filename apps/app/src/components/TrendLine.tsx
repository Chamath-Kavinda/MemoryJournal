import { useEffect, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const HEIGHT = 112;
const PAD = 8;
const STROKE = 3;

export interface TrendLineProps {
  /** One value from 0 to 100 per day, oldest first; null for a day without a score. */
  scores: readonly (number | null)[];
  /** What the chart says, for screen readers. */
  accessibilityLabel: string;
  testID?: string;
}

interface Point {
  x: number;
  y: number;
}

/** The points of the days that have a score, placed across `width`. */
export function trendPoints(scores: readonly (number | null)[], width: number): Point[] {
  const count = scores.length;
  const inner = Math.max(0, width - PAD * 2);
  return scores.flatMap((score, index) =>
    score === null
      ? []
      : [
          {
            x: PAD + (count <= 1 ? inner / 2 : (index / (count - 1)) * inner),
            y: PAD + (1 - Math.min(100, Math.max(0, score)) / 100) * (HEIGHT - PAD * 2),
          },
        ],
  );
}

function pathOf(points: readonly Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function lengthOf(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/**
 * The last 30 days of recall scores as a neon gradient line that draws from left to right
 * (section 15.16). Days without a score are skipped, so the line joins the days that have one.
 * With reduce motion on the line is drawn at once.
 */
export function TrendLine({ scores, accessibilityLabel, testID }: TrendLineProps) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const points = useMemo(() => trendPoints(scores, width), [scores, width]);
  const length = Math.ceil(lengthOf(points)) + 1;
  const progress = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION.hero, easing: easeOut });
  }, [length, reduce, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const last = points[points.length - 1];

  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={{ width: '100%', height: HEIGHT }}
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient
              id="trend-line"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2={width}
              y2="0"
            >
              <Stop offset="0" stopColor={palette.neonViolet} />
              <Stop offset="1" stopColor={palette.neonBlue} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M${PAD} ${HEIGHT - PAD} L${width - PAD} ${HEIGHT - PAD}`}
            stroke={palette.border}
            strokeWidth={1}
          />
          {points.length > 1 ? (
            <AnimatedPath
              {...(testID === undefined ? {} : { testID: `${testID}-line` })}
              d={pathOf(points)}
              fill="none"
              stroke="url(#trend-line)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={length}
              animatedProps={animatedProps}
            />
          ) : null}
          {last === undefined ? null : (
            <Circle cx={last.x} cy={last.y} r={STROKE + 1} fill={palette.neonBlue} />
          )}
        </Svg>
      ) : null}
    </View>
  );
}
