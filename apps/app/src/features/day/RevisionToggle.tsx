import type { RevisionOption, RevisionSelection } from '@memory-journal/core';
import { LinearGradient } from 'expo-linear-gradient';
import { History } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';

interface Props {
  options: RevisionOption[];
  selected: RevisionSelection;
  onSelect: (selection: RevisionSelection) => void;
}

interface Box {
  x: number;
  width: number;
}

/** Space between the control's edge and its options, which the thumb also keeps. */
const INSET = 4;

/**
 * Switches between the passes of a day: Latest, 1st, 2nd and so on. Choosing a pass shows
 * the day as it was then. A gradient thumb is drawn behind the chosen pass at once and fades in
 * over 150 ms (v0.2.5: it no longer slides). A day with a single pass has no options, so
 * nothing is drawn.
 */
export function RevisionToggle({ options, selected, onSelect }: Props) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const fade = useSharedValue(1);
  const placed = useRef(false);

  const box = boxes[String(selected)];
  const boxX = box?.x;
  useEffect(() => {
    if (boxX === undefined) return;
    if (!placed.current) {
      placed.current = true;
      return;
    }
    fade.value = 0.3;
    fade.value = withTiming(1, { duration: reduce ? DURATION.reduced : DURATION.fast });
  }, [boxX, reduce, fade]);

  const thumbStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (options.length === 0) return null;

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
      }}
      accessibilityRole="tablist"
      accessibilityLabel="Revisions"
    >
      <Icon icon={History} size="control" color={palette.muted} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <View
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
            testID="revision-thumb"
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: box?.x ?? 0,
                width: box?.width ?? 0,
                top: INSET,
                bottom: INSET,
              },
              thumbStyle,
            ]}
          >
            <LinearGradient
              colors={[palette.primaryStart, palette.primaryEnd]}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={{ flex: 1, borderRadius: RADIUS.pill }}
            />
          </Animated.View>
          {options.map((option) => {
            const active = option.key === selected;
            const key = String(option.key);
            return (
              <View
                key={key}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  setBoxes((current) => {
                    const known = current[key];
                    return known !== undefined && known.x === x && known.width === width
                      ? current
                      : { ...current, [key]: { x, width } };
                  });
                }}
              >
                <PressableScale
                  accessibilityRole="tab"
                  accessibilityLabel={option.key === 'latest' ? 'Latest' : `${option.label} pass`}
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(option.key)}
                  innerStyle={{
                    minHeight: MIN_TARGET - INSET,
                    paddingHorizontal: SPACING.lg,
                    justifyContent: 'center',
                    borderRadius: RADIUS.pill,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: active ? '600' : '400',
                      color: active ? palette.onGradient : palette.text,
                    }}
                  >
                    {option.label}
                  </Text>
                </PressableScale>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
