import { formatCountdown, parseDayId, type DayAccess, type DayId } from '@memory-journal/core';
import { format } from 'date-fns';
import { View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  dayId: DayId;
  /** Null when the day id in the address is not a real date. */
  access: DayAccess | null;
  onBack: () => void;
}

function bannerFor(access: DayAccess | null): { title: string; detail?: string } {
  if (!access) return { title: 'This is not a valid day.' };
  switch (access.state) {
    case 'future':
      return { title: 'This day has not arrived yet.', detail: 'Future days cannot be opened.' };
    case 'locked':
      return {
        title: 'Read-only until 9:00 PM',
        detail: `Opens for writing in ${formatCountdown(access.msUntilUnlock)}`,
      };
    case 'open':
      return { title: 'This day is open for writing.' };
  }
}

/** Date header and status banner of the Day screen. The writer itself arrives in later commits. */
export function DayScreenView({ dayId, access, onBack }: Props) {
  const { palette, scheme } = useTheme();
  const dark = scheme === 'dark';
  const parts = parseDayId(dayId);
  const heading = parts
    ? format(new Date(parts.year, parts.month - 1, parts.day), 'EEEE, d MMMM yyyy')
    : dayId;
  const banner = bannerFor(access);
  const open = access?.state === 'open';

  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 16 }}>
      <View style={{ alignSelf: 'flex-start' }}>
        <BackButton onBack={onBack} />
      </View>

      <Text
        accessibilityRole="header"
        style={{ color: palette.text, fontSize: 22, fontWeight: '700' }}
      >
        {heading}
      </Text>

      {/* The banner keeps its own tinted fill; its text colours are checked against both. */}
      <View
        accessibilityRole="summary"
        style={{
          borderRadius: 12,
          padding: 14,
          gap: 4,
          backgroundColor: open ? (dark ? '#1e3a2a' : '#dcf5e4') : dark ? '#3a3320' : '#fff3cd',
        }}
      >
        <Text style={{ color: palette.text, fontWeight: '600' }}>{banner.title}</Text>
        {banner.detail ? (
          <Text style={{ color: dark ? '#d1d1d6' : '#3c3c43' }}>{banner.detail}</Text>
        ) : null}
      </View>
    </View>
  );
}
