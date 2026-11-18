import { X } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { MEDIUM_BREAKPOINT } from '@/theme/sizeClass';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { SCRIM } from '@/theme/tokens';

import { IconButton } from './IconButton';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * A panel for a short task: a bottom sheet on a phone and a centered dialog from 600 wide.
 * The backdrop, the hardware Back button and Esc all close it. With reduce motion on it only
 * fades.
 */
export function Sheet({ title, onClose, children, testID = 'sheet' }: Props) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const centered = width >= MEDIUM_BREAKPOINT;

  const backdrop = useSharedValue(0);
  const appear = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      backdrop.value = withTiming(1, { duration: DURATION.reduced });
      appear.value = withTiming(1, { duration: DURATION.reduced });
      return;
    }
    // The panel appears in place; only the backdrop and the panel opacity fade (v0.2.5, section 4).
    backdrop.value = withTiming(1, { duration: DURATION.fast, easing: easeOut });
    appear.value = withTiming(1, { duration: DURATION.fast, easing: easeOut });
  }, [reduce, backdrop, appear]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, appear.value)),
  }));

  return (
    <Modal
      testID={`${testID}-modal`}
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }, backdropStyle]}
        />
        <Pressable
          testID={`${testID}-backdrop`}
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: centered ? 'center' : 'flex-end',
            padding: centered ? SPACING.lg : 0,
          }}
        >
          <Animated.View
            testID={testID}
            role="dialog"
            aria-modal
            accessibilityViewIsModal
            accessibilityLabel={title}
            style={[
              {
                width: '100%',
                maxWidth: centered ? 480 : undefined,
                maxHeight: height * 0.85,
                borderWidth: BORDER_WIDTH,
                borderColor: palette.border,
                backgroundColor: palette.surfaceRaised,
                borderRadius: centered ? RADIUS.sheet : 0,
                borderTopLeftRadius: RADIUS.sheet,
                borderTopRightRadius: RADIUS.sheet,
              },
              panelStyle,
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: SPACING.xl,
                paddingRight: SPACING.sm,
                paddingTop: SPACING.sm,
              }}
            >
              <Text accessibilityRole="header" variant="heading">
                {title}
              </Text>
              <IconButton
                testID={`${testID}-close`}
                icon={X}
                accessibilityLabel="Close"
                color={palette.muted}
                onPress={onClose}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: SPACING.xl,
                paddingTop: SPACING.md,
                gap: SPACING.md,
              }}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
