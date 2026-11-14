import { formatCountdown, parseDayId, type DayAccess, type DayId } from '@memory-journal/core';
import { format } from 'date-fns';
import { Pressable, Text, View, useColorScheme } from 'react-native';

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
  const dark = useColorScheme() === 'dark';
  const parts = parseDayId(dayId);
  const heading = parts
    ? format(new Date(parts.year, parts.month - 1, parts.day), 'EEEE, d MMMM yyyy')
    : dayId;
  const banner = bannerFor(access);
  const open = access?.state === 'open';

  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={onBack}>
        <Text style={{ color: dark ? '#7fb2ff' : '#2563eb', fontSize: 16 }}>‹ Back</Text>
      </Pressable>

      <Text
        accessibilityRole="header"
        style={{ color: dark ? '#f2f2f2' : '#1c1c1e', fontSize: 22, fontWeight: '700' }}
      >
        {heading}
      </Text>

      <View
        accessibilityRole="summary"
        style={{
          borderRadius: 12,
          padding: 14,
          gap: 4,
          backgroundColor: open ? (dark ? '#1e3a2a' : '#dcf5e4') : dark ? '#3a3320' : '#fff3cd',
        }}
      >
        <Text style={{ color: dark ? '#f2f2f2' : '#1c1c1e', fontWeight: '600' }}>
          {banner.title}
        </Text>
        {banner.detail ? (
          <Text style={{ color: dark ? '#d1d1d6' : '#3c3c43' }}>{banner.detail}</Text>
        ) : null}
      </View>
    </View>
  );
}
