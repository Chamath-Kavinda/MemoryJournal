import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme/palette';
import { Text } from '@/theme/themed';

export type { Palette };

/** Colours for the screens, following the saved theme choice (or the system when it says so). */
export function usePalette(): Palette {
  return useTheme().palette;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'plain' | 'danger';
  disabled?: boolean;
}

export function ActionButton({ label, onPress, tone = 'plain', disabled = false }: ButtonProps) {
  const palette = usePalette();
  const filled = tone === 'primary';
  const color = filled ? palette.onAccent : tone === 'danger' ? palette.danger : palette.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: filled ? palette.accent : 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color, fontSize: 16, fontWeight: filled ? '600' : '500' }}>{label}</Text>
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** A pill used for filtering and for choosing a category. */
export function Chip({ label, selected, onPress }: ChipProps) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 40,
        paddingHorizontal: 14,
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: selected ? palette.accent : palette.border,
        backgroundColor: selected ? palette.accent : 'transparent',
      }}
    >
      <Text style={{ color: selected ? palette.onAccent : palette.text, fontSize: 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}

interface HeaderProps {
  title: string;
  onBack: () => void;
}

export function ScreenHeader({ title, onBack }: HeaderProps) {
  const palette = usePalette();
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
        paddingTop: 8,
      }}
    >
      <ActionButton label="Back" onPress={onBack} />
      <Text
        accessibilityRole="header"
        style={{ color: palette.text, fontSize: 22, fontWeight: '700' }}
      >
        {title}
      </Text>
    </View>
  );
}

interface BannerProps {
  message: string;
  onDismiss: () => void;
}

/** A refused or failed change, shown until the person dismisses it. */
export function ErrorBanner({ message, onDismiss }: BannerProps) {
  const palette = usePalette();
  return (
    <View
      accessibilityRole="alert"
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <Text style={{ flex: 1, color: palette.danger, fontSize: 14 }}>{message}</Text>
      <ActionButton label="Dismiss" onPress={onDismiss} />
    </View>
  );
}
