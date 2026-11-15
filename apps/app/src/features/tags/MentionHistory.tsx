import { parseDayId, type DayId, type MentionedDay } from '@memory-journal/core';
import { format } from 'date-fns';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { MentionedDaysStatus } from './useMentionedDays';
import { usePalette } from './ui';

function dayLabel(dayId: DayId): string {
  const parts = parseDayId(dayId);
  if (!parts) return dayId;
  return format(new Date(parts.year, parts.month - 1, parts.day), 'EEEE d MMMM yyyy');
}

function wordsLabel(count: number): string {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
}

interface Props {
  days: readonly MentionedDay[];
  status: MentionedDaysStatus;
  onOpenDay: (dayId: DayId) => void;
}

/** The days that mention a tag, newest first. Movies and books join this list with the library. */
export function MentionHistory({ days, status, onOpenDay }: Props) {
  const palette = usePalette();

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 8,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}
      >
        Mentioned in
      </Text>
      {status === 'loading' ? <ActivityIndicator accessibilityLabel="Loading mentions" /> : null}
      {status === 'error' ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, fontSize: 14 }}>
          Could not load the days that mention this tag.
        </Text>
      ) : null}
      {status === 'ready' && days.length === 0 ? (
        <Text style={{ color: palette.muted, fontSize: 15 }}>
          No day mentions this tag yet. Type @ while writing to mention it.
        </Text>
      ) : null}
      {days.map((day) => {
        const label = dayLabel(day.dayId);
        const words = wordsLabel(day.wordCount);
        return (
          <Pressable
            key={day.dayId}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${words}`}
            onPress={() => onOpenDay(day.dayId)}
            style={{
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
          >
            <Text style={{ color: palette.text, fontSize: 16 }}>{label}</Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>{words}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
