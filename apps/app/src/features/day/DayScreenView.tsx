import { formatCountdown, parseDayId, type DayId, type GuestDayAccess } from '@memory-journal/core';
import { format } from 'date-fns';
import { Lock, LockOpen, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { SPACING } from '@/theme/layout';
import type { Palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { LockChip } from './LockChip';

interface Props {
  dayId: DayId;
  /** Null when the day id in the address is not a real date. */
  access: GuestDayAccess | null;
  onBack: () => void;
}

interface Banner {
  title: string;
  detail?: string;
  icon: LucideIcon;
  tone: (palette: Palette) => string;
}

function bannerFor(access: GuestDayAccess | null): Banner {
  if (!access) {
    return { title: 'This is not a valid day.', icon: TriangleAlert, tone: (p) => p.danger };
  }
  switch (access.state) {
    case 'future':
      return {
        title: 'This day has not arrived yet.',
        detail: 'Future days cannot be opened.',
        icon: Lock,
        tone: (p) => p.muted,
      };
    case 'locked':
      return {
        title: 'Read-only until 9:00 PM',
        detail: `Opens for writing in ${formatCountdown(access.msUntilUnlock)}`,
        icon: Lock,
        tone: (p) => p.warning,
      };
    case 'clockWrong':
      return {
        title: 'Your device clock looks wrong.',
        detail: 'Fix it to write today.',
        icon: TriangleAlert,
        tone: (p) => p.warning,
      };
    case 'open':
      return { title: 'This day is open for writing.', icon: LockOpen, tone: (p) => p.success };
  }
}

/**
 * Header of the Day screen: the Back icon, a lock chip with the countdown, the date and a status
 * banner with an icon. It fades up when the screen opens. The writer sits below it.
 */
export function DayScreenView({ dayId, access, onBack }: Props) {
  const { palette } = useTheme();
  const parts = parseDayId(dayId);
  const heading = parts
    ? format(new Date(parts.year, parts.month - 1, parts.day), 'EEEE, d MMMM yyyy')
    : dayId;
  const banner = bannerFor(access);
  const tone = banner.tone(palette);

  return (
    <FadeUp
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        padding: SPACING.lg,
        gap: SPACING.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton onBack={onBack} />
        <LockChip access={access} />
      </View>

      <Text accessibilityRole="header" variant="title">
        {heading}
      </Text>

      <View accessibilityRole="summary">
        <Card style={{ borderColor: tone }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <Icon icon={banner.icon} size="control" color={tone} />
            <View style={{ flex: 1, flexShrink: 1, gap: SPACING.xs }}>
              <Text variant="heading">{banner.title}</Text>
              {banner.detail ? (
                <Text variant="body" style={{ color: palette.muted }}>
                  {banner.detail}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      </View>
    </FadeUp>
  );
}
