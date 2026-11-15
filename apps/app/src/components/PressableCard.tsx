import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { SPACING } from '@/theme/layout';

import { Card } from './Card';
import { PressableScale } from './PressableScale';

export interface PressableCardProps {
  children: ReactNode;
  onPress: () => void;
  /** What the screen reader says. Required because a card has no visible button label. */
  accessibilityLabel: string;
  /** Draws the 1 px neon gradient border, as on Card. */
  active?: boolean;
  padding?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
}

/** A card that can be tapped. It scales to 0.97 on press like every other control. */
export function PressableCard({
  children,
  onPress,
  accessibilityLabel,
  active = false,
  padding = SPACING.lg,
  disabled = false,
  style,
  testID,
}: PressableCardProps) {
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={style}
    >
      <Card active={active} padding={padding}>
        {children}
      </Card>
    </PressableScale>
  );
}
