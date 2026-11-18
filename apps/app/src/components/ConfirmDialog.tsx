import { Info, Trash2, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, TextInput } from '@/theme/themed';

import { AppSheet } from './AppSheet';
import { Button } from './Button';
import { Icon } from './Icon';

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
  /** Trash2 for deleting, TriangleAlert for other risky actions, Info for a notice. */
  icon?: LucideIcon;
  /**
   * A one-button notice instead of a question: no Cancel, a primary confirm button and a neutral
   * tint. For one-time information such as the guest warning on a first save.
   */
  notice?: boolean;
  /**
   * A third button between Cancel and the confirm button, such as Export guest data in the guest
   * merge dialog. It closes the dialog with the `alternative` choice (see `useChoice`).
   */
  alternativeLabel?: string;
  /** A calm question that is not destructive: an accent tint and a primary confirm button. */
  neutral?: boolean;
  typed?: TypedConfirmation;
}

interface Props extends ConfirmOptions {
  onConfirm: () => void;
  onAlternative?: () => void;
  onCancel: () => void;
}

/** The widest the confirmation dialog grows. */
const CONFIRM_MAX_WIDTH = 420;

/**
 * The one confirmation popup for every delete, remove, discard, erase and sign-out (section 15.10).
 * Tapping the backdrop, the hardware Back button and Esc all mean Cancel. Cancel comes first, so it
 * is the control focus lands on. Use it through `useConfirm()`, not directly.
 *
 * It is built on `AppSheet` (v0.2.5, section 7): the text scrolls when it is long or the font is
 * large, and the buttons sit in a fixed footer that stays clear of the system buttons. It fades in
 * place, and nothing scales, slides or springs.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon,
  notice = false,
  alternativeLabel,
  neutral = false,
  typed,
  onConfirm,
  onAlternative,
  onCancel,
}: Props) {
  const { palette } = useTheme();
  const [typedText, setTypedText] = useState('');

  const canConfirm = typed === undefined || typed.matches(typedText);
  const calm = notice || neutral;
  const shownIcon = icon ?? (calm ? Info : Trash2);
  const tint = calm ? palette.accent : palette.danger;

  const footer = (
    <>
      {/* Cancel is first, so it is the first control focus reaches. A notice has no Cancel. */}
      {notice ? null : (
        <Button
          variant="secondary"
          label={cancelLabel}
          onPress={onCancel}
          style={{ flexGrow: 1, flexBasis: 120 }}
        />
      )}
      {alternativeLabel && onAlternative ? (
        <Button
          variant="secondary"
          label={alternativeLabel}
          onPress={onAlternative}
          style={{ flexGrow: 1, flexBasis: 120 }}
        />
      ) : null}
      <Button
        variant={calm ? 'primary' : 'danger'}
        label={confirmLabel}
        onPress={onConfirm}
        disabled={!canConfirm}
        style={{ flexGrow: 1, flexBasis: 120 }}
      />
    </>
  );

  return (
    <AppSheet
      kind="dialog"
      title={title}
      onClose={onCancel}
      testID="confirm"
      panelTestID="confirm-dialog"
      maxWidth={CONFIRM_MAX_WIDTH}
      footer={footer}
    >
      <View style={{ alignSelf: 'center' }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: RADIUS.pill,
            alignItems: 'center',
            justifyContent: 'center',
            // The tint colour at 15 percent, as a hex alpha.
            backgroundColor: `${tint}26`,
          }}
        >
          <Icon icon={shownIcon} size="control" color={tint} />
        </View>
      </View>

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
    </AppSheet>
  );
}
