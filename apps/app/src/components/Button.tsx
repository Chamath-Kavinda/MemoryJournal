import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import type { Palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';

import { Icon } from './Icon';

/**
 * primary: the brand gradient with white text, for the one main action of a screen.
 * secondary: a raised surface with a border.
 * ghost: text only, for quiet actions such as Maybe later.
 * danger: a danger coloured outline, for actions that delete or remove.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** An icon drawn before the label. Buttons that act always keep their text label. */
  icon?: LucideIcon;
  disabled?: boolean;
  /** Shows a spinner and ignores presses until the work is done. */
  loading?: boolean;
  /** Fully round ends, for pills such as the Sign in button in the top bar. */
  pill?: boolean;
  fullWidth?: boolean;
  /** Only needed when the screen reader should say more than the visible label. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface Look {
  /** Colour of the label, the icon and the spinner. */
  content: string;
  /** Fill, or null when the button is drawn with the gradient or has no fill. */
  fill: string | null;
  /** Border colour, or null for none. */
  border: string | null;
}

function lookOf(variant: ButtonVariant, palette: Palette): Look {
  switch (variant) {
    case 'primary':
      return { content: palette.onGradient, fill: null, border: null };
    case 'secondary':
      return { content: palette.text, fill: palette.surfaceRaised, border: palette.border };
    case 'danger':
      return { content: palette.danger, fill: null, border: palette.danger };
    case 'ghost':
      return { content: palette.accent, fill: null, border: null };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  pill = false,
  fullWidth = false,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const { palette } = useTheme();
  const look = lookOf(variant, palette);
  const inactive = disabled || loading;
  const radius = pill ? RADIUS.pill : RADIUS.input;

  const body = {
    // No fixed height: the label can wrap when the system font is scaled up.
    minHeight: MIN_TARGET,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: radius,
    borderWidth: look.border ? BORDER_WIDTH : 0,
    borderColor: look.border ?? 'transparent',
    backgroundColor: look.fill ?? 'transparent',
  } as const;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={look.content} />
      ) : icon ? (
        <Icon icon={icon} size="inline" color={look.content} />
      ) : null}
      <Text
        style={{
          color: look.content,
          fontSize: 16,
          lineHeight: 24,
          fontWeight: '600',
          flexShrink: 1,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </>
  );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: radius,
          overflow: 'hidden',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        fullWidth ? { width: '100%' } : null,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[palette.primaryStart, palette.primaryEnd]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={body}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={body}>{content}</View>
      )}
    </Pressable>
  );
}
