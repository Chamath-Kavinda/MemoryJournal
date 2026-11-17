import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { DURATION, SPRING_CALM } from '@/theme/motion';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/** The gap between the thumb and the inside edge of the track. */
const INSET = 3;

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

export interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, for example Library type. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * A row of two or more choices where exactly one is selected, such as Movies and Books. A
 * gradient thumb slides to the selected segment with the calm spring, which has no visible bounce
 * (sections 15.16 and 16.3). With
 * reduce motion on the thumb does not slide: it appears at the new segment with a 100 ms fade.
 * Every segment keeps its text label next to its icon, and is at least 44 high (48 on Android).
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  testID,
}: SegmentedControlProps<T>) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  );

  const position = useSharedValue(index);
  const fade = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) {
      position.value = index;
      fade.value = 0;
      fade.value = withTiming(1, { duration: DURATION.reduced });
    } else {
      position.value = withSpring(index, SPRING_CALM);
    }
  }, [index, reduce, position, fade]);

  const count = Math.max(segments.length, 1);
  const thumbWidth = Math.max(0, (trackWidth - BORDER_WIDTH * 2 - INSET * 2) / count);

  const thumbStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: position.value * thumbWidth }],
  }));

  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        padding: INSET,
        borderRadius: RADIUS.pill,
        borderWidth: BORDER_WIDTH,
        borderColor: palette.border,
        backgroundColor: palette.surfaceRaised,
      }}
    >
      <Animated.View
        testID={testID ? `${testID}-thumb` : undefined}
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: INSET,
            bottom: INSET,
            left: INSET,
            width: thumbWidth,
            borderRadius: RADIUS.pill,
            overflow: 'hidden',
          },
          thumbStyle,
        ]}
      >
        <LinearGradient
          colors={[palette.primaryStart, palette.primaryEnd]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {segments.map((segment) => {
        const selected = segment.value === value;
        const color = selected ? palette.onGradient : palette.textMuted;
        return (
          <PressableScale
            key={segment.value}
            testID={testID ? `${testID}-${segment.value}` : undefined}
            accessibilityRole="tab"
            accessibilityLabel={segment.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(segment.value)}
            style={{ flex: 1 }}
            innerStyle={{
              minHeight: MIN_TARGET - INSET * 2 - BORDER_WIDTH * 2,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.sm,
              paddingHorizontal: SPACING.md,
            }}
          >
            {segment.icon ? <Icon icon={segment.icon} size="inline" color={color} /> : null}
            <Text style={{ color, fontSize: 15, lineHeight: 22, fontWeight: '600' }}>
              {segment.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
