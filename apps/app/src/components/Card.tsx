import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';

export interface CardProps {
  children: ReactNode;
  /**
   * Draws the 1 px neon gradient border used on active and focused cards (section 15.7). Without
   * it the card has a plain 1 px border.
   */
  active?: boolean;
  /** Inner padding; 16 by default. Pass 0 for content that runs to the edges. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/** A surface with a 1 px border and a radius of 16, the container of most of the app. */
export function Card({
  children,
  active = false,
  padding = SPACING.lg,
  style,
  testID,
  accessibilityLabel,
}: CardProps) {
  const { palette } = useTheme();

  if (active) {
    // The gradient is the border: a gradient box with 1 px of padding around the card surface.
    return (
      <LinearGradient
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        colors={[palette.neonViolet, palette.neonBlue]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={[{ borderRadius: RADIUS.card, padding: BORDER_WIDTH }, style]}
      >
        <View
          style={{
            borderRadius: RADIUS.card - BORDER_WIDTH,
            backgroundColor: palette.surface,
            padding,
          }}
        >
          {children}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          borderRadius: RADIUS.card,
          borderWidth: BORDER_WIDTH,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
