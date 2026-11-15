import type { LucideIcon } from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { MIN_TARGET, RADIUS } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: LucideIcon;
  /** Required: there is no visible text, so the screen reader reads this (for example Back). */
  accessibilityLabel: string;
  onPress: () => void;
  /** A colour from the palette; the text colour when it is not given. */
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** A round icon-only button with a target of at least 44 by 44 (48 on Android). */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color,
  disabled = false,
  style,
  testID,
}: IconButtonProps) {
  const { palette } = useTheme();
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={style}
      innerStyle={({ pressed }) => ({
        width: MIN_TARGET,
        height: MIN_TARGET,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.pill,
        backgroundColor: pressed ? palette.surfaceRaised : 'transparent',
      })}
    >
      <Icon icon={icon} size="control" color={color ?? palette.text} />
    </PressableScale>
  );
}
