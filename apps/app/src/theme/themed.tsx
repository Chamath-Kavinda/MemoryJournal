import type { ComponentProps } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import type { TextProps } from 'react-native';

import { useTheme } from './ThemeProvider';
import { FONT_FAMILY, fontFamilyForWeight, variantStyle, type TextVariant } from './typography';

export interface ThemedTextProps extends TextProps {
  /** A size and weight from the type scale (display, title, heading, body, caption). */
  variant?: TextVariant;
}

/**
 * Text that takes its colour from the theme and its font from the type scale. A `fontWeight` in
 * the style picks the matching bundled weight, so existing screens get the new font unchanged.
 */
export function Text({ style, variant, ...rest }: ThemedTextProps) {
  const { palette } = useTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontFamily: variantFamily, ...variantRest } = variant ? variantStyle(variant) : {};

  // A family set in the style wins (for example a monospace font). Otherwise the family follows
  // the weight, and the weight itself is reset so the system does not thicken it a second time.
  const ownFamily = flat.fontFamily !== undefined;
  const family = ownFamily
    ? flat.fontFamily
    : flat.fontWeight !== undefined
      ? fontFamilyForWeight(flat.fontWeight)
      : (variantFamily ?? FONT_FAMILY.regular);

  return (
    <NativeText
      {...rest}
      style={[
        { color: palette.text },
        variantRest,
        style,
        ownFamily ? null : { fontFamily: family, fontWeight: 'normal' },
      ]}
    />
  );
}

/** A text field that is readable in both themes unless the style or props say otherwise. */
export function TextInput({
  style,
  placeholderTextColor,
  ...rest
}: ComponentProps<typeof NativeTextInput>) {
  const { palette, scheme } = useTheme();
  return (
    <NativeTextInput
      keyboardAppearance={scheme}
      placeholderTextColor={placeholderTextColor ?? palette.muted}
      {...rest}
      style={[{ color: palette.text, fontFamily: FONT_FAMILY.regular }, style]}
    />
  );
}
