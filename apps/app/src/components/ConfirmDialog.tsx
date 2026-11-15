import { Trash2, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { DIALOG_ENTER_SCALE, DURATION, SPRING } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, TextInput } from '@/theme/themed';
import { SCRIM } from '@/theme/tokens';

import { Button } from './Button';
import { Icon } from './Icon';
import { Shake } from './Shake';

/** A word or phrase the person has to type before the action button works. */
export interface TypedConfirmation {
  /** Names the field for screen readers and is shown as its placeholder. */
  label: string;
  matches: (typed: string) => boolean;
}

export interface ConfirmOptions {
  /** Names the action, for example Delete tag?. */
  title: string;
  /** One sentence that names the exact item and what happens to it. */
  message: string;
  /** A verb that names the action, for example Delete tag. Never OK or Yes. */
  confirmLabel: string;
  cancelLabel?: string;
  /** Trash2 for deleting, TriangleAlert for other risky actions. */
  icon?: LucideIcon;
  typed?: TypedConfirmation;
}

interface Props extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The one confirmation popup for every delete, remove, discard, erase and sign-out (section 15.10).
 * Tapping the backdrop, the hardware Back button and Esc all mean Cancel. Cancel comes first, so it
 * is the control focus lands on. Use it through `useConfirm()`, not directly.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon = Trash2,
  typed,
  onConfirm,
  onCancel,
}: Props) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const { height } = useWindowDimensions();
  const [typedText, setTypedText] = useState('');

  const backdrop = useSharedValue(0);
  const appear = useSharedValue(0);
  const scale = useSharedValue(DIALOG_ENTER_SCALE);

  useEffect(() => {
    if (reduce) {
      // Slides and scales become short fades.
      scale.value = 1;
      backdrop.value = withTiming(1, { duration: DURATION.reduced });
      appear.value = withTiming(1, { duration: DURATION.reduced });
      return;
    }
    backdrop.value = withTiming(1, { duration: DURATION.base, easing: easeOut });
    appear.value = withTiming(1, { duration: DURATION.base, easing: easeOut });
    scale.value = withSpring(1, SPRING);
  }, [reduce, backdrop, appear, scale]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: scale.value }],
  }));

  const canConfirm = typed === undefined || typed.matches(typedText);

  return (
    <Modal
      testID="confirm-modal"
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          testID="confirm-scrim"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }, backdropStyle]}
        />
        <Pressable
          testID="confirm-backdrop"
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <View
          pointerEvents="box-none"
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg }}
        >
          <Animated.View
            testID="confirm-dialog"
            role="alertdialog"
            aria-modal
            accessibilityViewIsModal
            style={[
              {
                width: '100%',
                maxWidth: 420,
                maxHeight: height - SPACING.lg * 2,
                borderRadius: RADIUS.sheet,
                borderWidth: BORDER_WIDTH,
                borderColor: palette.border,
                backgroundColor: palette.surfaceRaised,
              },
              dialogStyle,
            ]}
          >
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: SPACING.xl, gap: SPACING.md }}
            >
              <Shake trigger={0} playOnMount style={{ alignSelf: 'center' }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: RADIUS.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    // The danger colour at 15 percent, as a hex alpha.
                    backgroundColor: `${palette.danger}26`,
                  }}
                >
                  <Icon icon={icon} size="control" color={palette.danger} />
                </View>
              </Shake>

              <Text
                accessibilityRole="header"
                style={{ fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' }}
              >
                {title}
              </Text>
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 16,
                  lineHeight: 24,
                  textAlign: 'center',
                }}
              >
                {message}
              </Text>

              {typed ? (
                <TextInput
                  accessibilityLabel={typed.label}
                  placeholder={typed.label}
                  placeholderTextColor={palette.muted}
                  value={typedText}
                  onChangeText={setTypedText}
                  autoFocus
                  autoCorrect={false}
                  style={{
                    minHeight: MIN_TARGET,
                    paddingHorizontal: SPACING.md,
                    borderRadius: RADIUS.input,
                    borderWidth: BORDER_WIDTH,
                    borderColor: palette.border,
                    color: palette.text,
                    fontSize: 16,
                  }}
                />
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: SPACING.sm,
                  paddingTop: SPACING.sm,
                }}
              >
                {/* Cancel is first, so it is the first control focus reaches. */}
                <Button
                  variant="secondary"
                  label={cancelLabel}
                  onPress={onCancel}
                  style={{ flexGrow: 1, flexBasis: 120 }}
                />
                <Button
                  variant="danger"
                  label={confirmLabel}
                  onPress={onConfirm}
                  disabled={!canConfirm}
                  style={{ flexGrow: 1, flexBasis: 120 }}
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
