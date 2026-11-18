import type { LucideIcon } from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

export interface ChipProps {
  label: string;
  /** Selected chips get a raised surface and a neon border; the text stays readable. */
  selected?: boolean;
  onPress: () => void;
  /** An icon before the label, for example the category icon. */
  icon?: LucideIcon;
  disabled?: boolean;
  /** Only needed when the screen reader should say more than the visible label. */
  accessibilityLabel?: string;
  /** Layout of the touchable area, for example `{ flex: 1 }` to share a row in equal widths. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** A small choice used for filtering and for picking a category. Radius 12, 1 px border. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: ChipProps) {
  const { palette } = useTheme();
  return (
    <PressableScale
      testID={testID}
      style={style}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      innerStyle={({ pressed }) => ({
        minHeight: MIN_TARGET,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.chip,
        borderWidth: BORDER_WIDTH,
        borderColor: selected ? palette.neonViolet : palette.border,
        backgroundColor: selected || pressed ? palette.surfaceRaised : 'transparent',
      })}
    >
      {icon ? (
        <Icon icon={icon} size="inline" color={selected ? palette.neonViolet : palette.muted} />
      ) : null}
      <Text style={{ color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '600' }}>
        {label}
      </Text>
    </PressableScale>
  );
}
