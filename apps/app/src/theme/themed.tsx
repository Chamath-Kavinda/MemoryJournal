import type { ComponentProps } from 'react';
import { Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import type { TextProps } from 'react-native';

import { useTheme } from './ThemeProvider';

/** Text that takes its colour from the theme unless the style sets one. */
export function Text({ style, ...rest }: TextProps) {
  const { palette } = useTheme();
  return <NativeText {...rest} style={[{ color: palette.text }, style]} />;
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
      style={[{ color: palette.text }, style]}
    />
  );
}
