import { X } from 'lucide-react-native';
import { useContext, useEffect, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { useKeyboardHeight } from '@/platform/useKeyboardHeight';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { SCRIM } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { sheetLayoutFor, type Insets, type SheetKind } from './sheetLayout';

const NO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

interface Props {
  /** Names the panel for screen readers. A `sheet` also shows it in the header. */
  title: string;
  onClose: () => void;
  /** The scrolling body. */
  children: ReactNode;
  /**
   * Fixed under the header and never scrolled away, for example the search field of a long list.
   */
  pinned?: ReactNode;
  /** Fixed at the bottom and always clear of the system buttons: Cancel, Insert and the like. */
  footer?: ReactNode;
  /**
   * `sheet` (the default) has a header with a close icon and is a bottom sheet on a phone.
   * `dialog` has no header, is always centered and is announced as an alert, for confirmations.
   */
  kind?: SheetKind;
  /** The prefix of the test ids `-modal`, `-backdrop`, `-scrim`, `-close` and `-footer`. */
  testID?: string;
  /** Test id of the panel itself. Defaults to `testID`. */
  panelTestID?: string;
  /** Overrides the widest the centered dialog grows. */
  maxWidth?: number;
}

/**
 * The one panel for every short task and popup (v0.2.5, section 7): a bottom sheet on a phone and
 * a centered dialog from 600 wide or in landscape. It has a fixed header, a body that scrolls and
 * a fixed footer, so the buttons are never under a system button and stay reachable at large
 * font sizes. The backdrop, the hardware Back button and Esc all close it. It fades in place and
 * never slides or scales.
 *
 * The React Native `Modal` draws in its own window, which does not receive the insets of the
 * screen behind it, so the content gets its own `SafeAreaProvider`. The modal is translucent
 * behind the status and navigation bars so it draws to the same edges as the app.
 */
export function AppSheet({ testID = 'sheet', ...rest }: Props) {
  // The insets of the app window. They are the starting point until the modal window reports its own.
  const parent = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const { width, height } = useWindowDimensions();

  return (
    <Modal
      testID={`${testID}-modal`}
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={rest.onClose}
    >
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets: parent }}>
        <SheetLayer testID={testID} {...rest} />
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetLayer({
  title,
  onClose,
  children,
  pinned,
  footer,
  kind = 'sheet',
  testID = 'sheet',
  panelTestID,
  maxWidth,
}: Props) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const layout = sheetLayoutFor({
    width,
    height,
    insets,
    keyboard,
    kind,
    ...(maxWidth !== undefined ? { maxWidth } : {}),
  });

  const backdrop = useSharedValue(0);
  const appear = useSharedValue(0);

  // The panel appears in place; only the backdrop and the panel opacity fade (v0.2.5, section 4).
  useEffect(() => {
    const duration = reduce ? DURATION.reduced : DURATION.fast;
    backdrop.value = withTiming(1, { duration, easing: easeOut });
    appear.value = withTiming(1, { duration, easing: easeOut });
  }, [reduce, backdrop, appear]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, appear.value)),
  }));

  const hasHeader = kind === 'sheet';
  // Without a footer the body itself keeps clear of the system buttons.
  const bodyBottom = footer ? SPACING.md : layout.footerPaddingBottom;

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        testID={`${testID}-scrim`}
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
          justifyContent: layout.centered ? 'center' : 'flex-end',
          paddingTop: layout.outer.top,
          paddingBottom: layout.outer.bottom,
          paddingLeft: layout.outer.left,
          paddingRight: layout.outer.right,
        }}
      >
        <Animated.View
          testID={panelTestID ?? testID}
          role={kind === 'dialog' ? 'alertdialog' : 'dialog'}
          aria-modal
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[
            {
              width: '100%',
              maxWidth: layout.maxWidth,
              maxHeight: layout.maxHeight,
              borderWidth: BORDER_WIDTH,
              borderColor: palette.border,
              backgroundColor: palette.surfaceRaised,
              borderRadius: layout.centered ? RADIUS.sheet : 0,
              borderTopLeftRadius: RADIUS.sheet,
              borderTopRightRadius: RADIUS.sheet,
            },
            panelStyle,
          ]}
        >
          {hasHeader ? (
            <View
              testID={`${testID}-header`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: SPACING.xl,
                paddingRight: SPACING.sm,
                paddingTop: SPACING.sm,
              }}
            >
              <Text accessibilityRole="header" variant="heading" style={{ flexShrink: 1 }}>
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
          ) : null}

          {pinned ? (
            <View
              testID={`${testID}-pinned`}
              style={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.md }}
            >
              {pinned}
            </View>
          ) : null}

          <ScrollView
            bounces={false}
            // Takes the room the header and footer leave, and scrolls when the content is taller.
            style={{ flexGrow: 0, flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: SPACING.xl,
              paddingTop: hasHeader || pinned ? SPACING.md : SPACING.xl,
              paddingBottom: bodyBottom,
              gap: SPACING.md,
            }}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View
              testID={`${testID}-footer`}
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: SPACING.sm,
                paddingHorizontal: SPACING.xl,
                paddingTop: SPACING.md,
                paddingBottom: layout.footerPaddingBottom,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}
