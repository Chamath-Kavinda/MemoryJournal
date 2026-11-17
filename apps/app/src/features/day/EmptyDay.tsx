import { PenLine } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  /** Starts editing, the same as the pencil in the header. */
  onWrite: () => void;
  /** True while the day cannot be written, for example today before 21:00. */
  disabled: boolean;
}

/** What View mode shows for a day with nothing written yet (section 18.2). */
export function EmptyDay({ onWrite, disabled }: Props) {
  const { palette } = useTheme();
  return (
    <View
      testID="empty-day"
      style={{
        alignItems: 'center',
        gap: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xxl,
      }}
    >
      <Icon icon={PenLine} size="empty" color={palette.muted} />
      <Text variant="body" style={{ color: palette.muted, textAlign: 'center' }}>
        Nothing written for this day yet.
      </Text>
      <Button label="Write" icon={PenLine} disabled={disabled} onPress={onWrite} />
    </View>
  );
}
