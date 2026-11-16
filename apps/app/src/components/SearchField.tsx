import { LinearGradient } from 'expo-linear-gradient';
import { Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { TextInput } from '@/theme/themed';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';

import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Names the field for screen readers, for example Search tags. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * A search box with a Search icon and, once something is typed, a clear X. Its border is the
 * plain 1 px border while idle and fades to the neon gradient when the field has focus
 * (section 15.16); with reduce motion on the fade lasts 100 ms.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  testID,
}: SearchFieldProps) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, {
      duration: reduce ? DURATION.reduced : DURATION.base,
      easing: easeOut,
    });
  }, [focused, reduce, focus]);

  const gradientStyle = useAnimatedStyle(() => ({ opacity: focus.value }));
  const outer = RADIUS.input;

  return (
    <View style={{ minHeight: MIN_TARGET, borderRadius: outer }}>
      {/* Two border layers under the field: the plain one, and the gradient that fades in. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: outer, borderWidth: BORDER_WIDTH, borderColor: palette.border },
        ]}
      />
      <Animated.View
        testID={testID ? `${testID}-border` : undefined}
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: outer, overflow: 'hidden' },
          gradientStyle,
        ]}
      >
        <LinearGradient
          colors={[palette.neonViolet, palette.neonBlue]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        style={{
          flex: 1,
          minHeight: MIN_TARGET - BORDER_WIDTH * 2,
          margin: BORDER_WIDTH,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: SPACING.md,
          borderRadius: outer - BORDER_WIDTH,
          backgroundColor: palette.surfaceRaised,
        }}
      >
        <Icon icon={Search} size="inline" color={focused ? palette.neonViolet : palette.muted} />
        <TextInput
          testID={testID}
          accessibilityLabel={accessibilityLabel}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            flex: 1,
            minHeight: MIN_TARGET - BORDER_WIDTH * 2,
            paddingHorizontal: SPACING.sm,
            color: palette.text,
            fontSize: 16,
          }}
        />
        {value !== '' ? (
          <IconButton
            icon={X}
            accessibilityLabel="Clear search"
            color={palette.muted}
            onPress={() => onChangeText('')}
          />
        ) : null}
      </View>
    </View>
  );
}
