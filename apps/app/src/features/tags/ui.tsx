import { Pressable, Text, View, useColorScheme } from 'react-native';

export interface Palette {
  text: string;
  muted: string;
  border: string;
  surface: string;
  accent: string;
  onAccent: string;
  danger: string;
}

/** Colours for the tag screens, following the system light or dark setting. */
export function usePalette(): Palette {
  const dark = useColorScheme() === 'dark';
  return {
    text: dark ? '#f2f2f2' : '#1c1c1e',
    muted: dark ? '#8e8e93' : '#6c6c70',
    border: dark ? '#3a3a3c' : '#d1d1d6',
    surface: dark ? '#2c2c2e' : '#f2f2f7',
    accent: dark ? '#0a84ff' : '#0a60d6',
    onAccent: '#ffffff',
    danger: dark ? '#ff453a' : '#d70015',
  };
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
