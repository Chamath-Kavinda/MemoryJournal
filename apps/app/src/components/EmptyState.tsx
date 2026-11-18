import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';

import { Button } from './Button';
import { FadeUp } from './FadeUp';
import { Icon } from './Icon';

/** Width and height of the tinted circle behind the icon. The icon inside is 48. */
const CIRCLE = 96;

export interface EmptyStateProps {
  /** A large icon that says what is missing, for example `Tag`. */
  icon: LucideIcon;
  /** One sentence. */
  message: string;
  /** The one primary action, for example New tag. Left out when there is nothing to do yet. */
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  testID?: string;
}

/**
 * What a list shows when it has nothing to list (section 15.11): a large icon in a gradient
 * tinted circle, one sentence and one primary action. The icon is still (v0.2.5: it no longer
 * floats up and down).
 */
export function EmptyState({
  icon,
  message,
  actionLabel,
  actionIcon,
  onAction,
  testID,
}: EmptyStateProps) {
  const { palette } = useTheme();
  return (
    <FadeUp {...(testID !== undefined ? { testID } : {})}>
      <View style={{ alignItems: 'center', gap: SPACING.lg, paddingVertical: SPACING.xl }}>
        <View
          style={{
            width: CIRCLE,
            height: CIRCLE,
            borderRadius: RADIUS.pill,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: BORDER_WIDTH,
            borderColor: palette.border,
            backgroundColor: palette.surfaceRaised,
          }}
        >
          {/* The tint: the brand gradient, kept faint so the icon stays the brightest thing. */}
          <LinearGradient
            pointerEvents="none"
            colors={[palette.primaryStart, palette.primaryEnd]}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={[StyleSheet.absoluteFill, { opacity: 0.22 }]}
          />
          <Icon icon={icon} size="empty" color={palette.neonViolet} />
        </View>
        <Text style={{ color: palette.muted, textAlign: 'center', maxWidth: 480 }}>{message}</Text>
        {actionLabel !== undefined && onAction !== undefined ? (
          <Button
            label={actionLabel}
            onPress={onAction}
            {...(actionIcon !== undefined ? { icon: actionIcon } : {})}
          />
        ) : null}
      </View>
    </FadeUp>
  );
}
