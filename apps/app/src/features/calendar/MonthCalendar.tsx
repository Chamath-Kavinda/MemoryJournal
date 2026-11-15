import {
  buildMonthGrid,
  compareMonths,
  type CalendarCell,
  type DayId,
  type MonthRef,
} from '@memory-journal/core';
import { format } from 'date-fns';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CELL_WIDTH = `${100 / 7}%` as const;

/** The month arrows are small glyphs, so their pressable area is padded to a full target. */
const ARROW_TARGET = {
  minWidth: 44,
  minHeight: 44,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

function describeCell(cell: CalendarCell, month: MonthRef): string {
  const date = format(new Date(month.year, month.month - 1, cell.day), 'd MMMM yyyy');
  const parts = [date];
  if (cell.isToday) parts.push('today');
  if (cell.hasWriting) parts.push('written');
  if (cell.disabled) parts.push('not available yet');
  return parts.join(', ');
}

interface Props {
  month: MonthRef;
  todayId: DayId;
  writtenDays: ReadonlySet<DayId>;
  onSelectDay: (dayId: DayId) => void;
  onChangeMonth: (delta: -1 | 1) => void;
}

/** Month calendar: a dot marks written days, a ring marks today, future days are disabled. */
export function MonthCalendar({ month, todayId, writtenDays, onSelectDay, onChangeMonth }: Props) {
  const { palette, scheme } = useTheme();
  // Future days are disabled, so they are exempt from the text contrast rule and stay faint.
  const faint = scheme === 'dark' ? '#48484a' : '#c7c7cc';
  const writtenFill = scheme === 'dark' ? '#1e3a66' : '#dbe7ff';
  const weeks = buildMonthGrid({ month, todayId, writtenDays });
  const todayMonth = { year: Number(todayId.slice(0, 4)), month: Number(todayId.slice(5, 7)) };
  const canGoNext = compareMonths(month, todayMonth) < 0;
  const title = format(new Date(month.year, month.month - 1, 1), 'MMMM yyyy');

  return (
    <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', padding: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => onChangeMonth(-1)}
          style={ARROW_TARGET}
        >
          <Text style={{ color: palette.accent, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}
        >
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canGoNext }}
          disabled={!canGoNext}
          onPress={() => onChangeMonth(1)}
          style={ARROW_TARGET}
        >
          <Text style={{ color: canGoNext ? palette.accent : faint, fontSize: 24 }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((name) => (
          <Text
            key={name}
            style={{ width: CELL_WIDTH, textAlign: 'center', color: palette.muted, fontSize: 12 }}
          >
            {name}
          </Text>
        ))}
      </View>

      {weeks.map((week, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row' }}>
          {week.map((cell, columnIndex) =>
            cell ? (
              <Pressable
                key={cell.dayId}
                accessibilityRole="button"
                accessibilityLabel={describeCell(cell, month)}
                accessibilityState={{ disabled: cell.disabled }}
                disabled={cell.disabled}
                onPress={() => onSelectDay(cell.dayId)}
                style={{ width: CELL_WIDTH, aspectRatio: 1, padding: 3 }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: cell.isToday ? 2 : 0,
                    borderColor: palette.accent,
                    backgroundColor: cell.hasWriting ? writtenFill : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: cell.state === 'future' ? faint : palette.text,
                      fontWeight: cell.isToday ? '700' : '400',
                    }}
                  >
                    {cell.day}
                  </Text>
                  {cell.hasWriting ? (
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        marginTop: 2,
                        backgroundColor: palette.accent,
                      }}
                    />
                  ) : null}
                </View>
              </Pressable>
            ) : (
              <View key={`blank-${columnIndex}`} style={{ width: CELL_WIDTH, aspectRatio: 1 }} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}
