import { formatCountdown, type GuestDayAccess } from '@memory-journal/core';
import { Lock, LockOpen } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Pop } from '@/components/Pop';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  /** The lock state of the day, or null while it is not known. */
  access: GuestDayAccess | null;
}

/**
 * A small chip in the header of the Day screen: a Lock with the live countdown while today is
 * closed, and a LockOpen when the day can be written. The open lock pops when a day unlocks
 * while it is on screen. Future days and unknown days have no chip.
 */
export function LockChip({ access }: Props) {
  const { palette } = useTheme();
  if (access === null || access.state === 'future') return null;

  const open = access.state === 'open';
  const countdown = access.state === 'locked' ? formatCountdown(access.msUntilUnlock) : null;
  const tone = open ? palette.success : palette.warning;
  const label = open ? 'Open' : (countdown ?? 'Closed');

  return (
    <View
      testID="lock-chip"
      accessibilityRole={countdown !== null ? 'timer' : 'text'}
      accessibilityLabel={
        open ? 'Open for writing' : countdown !== null ? `Opens in ${countdown}` : 'Closed'
      }
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: RADIUS.pill,
        borderWidth: BORDER_WIDTH,
        borderColor: tone,
        backgroundColor: palette.surfaceRaised,
      }}
    >
      <Pop trigger={open}>
        <Icon icon={open ? LockOpen : Lock} size={16} color={tone} />
      </Pop>
      <Text variant="caption" style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}
