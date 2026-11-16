import { TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Shake } from './Shake';

export interface ErrorCardProps {
  /** What went wrong, in one sentence. */
  message: string;
  /** Shown as a Retry button when it is given. */
  onRetry?: () => void;
  testID?: string;
}

/**
 * An inline error: a TriangleAlert, one sentence and a Retry button, with a danger border. The
 * card shakes once when it appears (section 15.16); reduce motion turns the shake off.
 */
export function ErrorCard({ message, onRetry, testID }: ErrorCardProps) {
  const { palette } = useTheme();
  return (
    <View accessibilityRole="alert" testID={testID}>
      <Shake trigger={0} playOnMount>
        <Card style={{ borderColor: palette.danger, gap: SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <Icon icon={TriangleAlert} size="control" color={palette.danger} />
            <Text style={{ flex: 1, flexShrink: 1 }}>{message}</Text>
          </View>
          {onRetry ? <Button label="Retry" variant="secondary" onPress={onRetry} /> : null}
        </Card>
      </Shake>
    </View>
  );
}
