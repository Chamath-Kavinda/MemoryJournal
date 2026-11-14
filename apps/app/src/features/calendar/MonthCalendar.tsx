import {
  buildMonthGrid,
  compareMonths,
  type CalendarCell,
  type DayId,
  type MonthRef,
} from '@memory-journal/core';
import { format } from 'date-fns';
import { Pressable, Text, View, useColorScheme } from 'react-native';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CELL_WIDTH = `${100 / 7}%` as const;

function palette(scheme: 'light' | 'dark' | null | undefined) {
  const dark = scheme === 'dark';
  return {
    text: dark ? '#f2f2f2' : '#1c1c1e',
    muted: dark ? '#8e8e93' : '#8e8e93',
    faint: dark ? '#48484a' : '#c7c7cc',
    accent: dark ? '#7fb2ff' : '#2563eb',
    writtenFill: dark ? '#1e3a66' : '#dbe7ff',
  };
}

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
  const colors = palette(useColorScheme());
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
          hitSlop={12}
          onPress={() => onChangeMonth(-1)}
        >
          <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}
        >
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canGoNext }}
          disabled={!canGoNext}
          hitSlop={12}
          onPress={() => onChangeMonth(1)}
        >
          <Text style={{ color: canGoNext ? colors.accent : colors.faint, fontSize: 24 }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((name) => (
          <Text
            key={name}
            style={{ width: CELL_WIDTH, textAlign: 'center', color: colors.muted, fontSize: 12 }}
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
                    borderColor: colors.accent,
                    backgroundColor: cell.hasWriting ? colors.writtenFill : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: cell.state === 'future' ? colors.faint : colors.text,
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
                        backgroundColor: colors.accent,
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
