import {
  buildMonthGrid,
  compareMonths,
  holidaysByDay,
  holidaysInMonth,
  parseDayId,
  type CalendarCell,
  type DayId,
  type Holiday,
  type MonthRef,
} from '@memory-journal/core';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { Breathe } from '@/components/Breathe';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { Ripple } from '@/components/Ripple';
import { SlideSwap } from '@/components/SlideSwap';
import { glowStyle } from '@/theme/glow';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { CALENDAR_CELL_MAX } from '@/theme/sizeClass';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CELL_WIDTH = `${100 / 7}%` as const;

/** On a compact window the grid never grows past seven cells of the largest size (15.9). */
const CALENDAR_GRID_MAX_WIDTH = CALENDAR_CELL_MAX * 7;

/** The card around the grid: the grid plus the card padding. Compact windows only (17.3). */
const CALENDAR_CARD_MAX_WIDTH = CALENDAR_GRID_MAX_WIDTH + SPACING.lg * 2;

/** On medium and expanded windows a date is a rounded rectangle this tall (section 17.3). */
const WIDE_CELL_HEIGHT = 72;

/** Thickness of the gradient ring around today. */
const RING_WIDTH = 2;

/** Size of the small dots for written days and holidays. */
const DOT_SIZE = 6;

const NO_HOLIDAYS: readonly Holiday[] = [];
const NO_NAMES: readonly string[] = [];

function describeCell(
  cell: CalendarCell,
  month: MonthRef,
  holidayNames: readonly string[],
): string {
  const date = format(new Date(month.year, month.month - 1, cell.day), 'd MMMM yyyy');
  const parts = [date];
  if (cell.isToday) parts.push('today');
  if (cell.hasWriting) parts.push('written');
  if (holidayNames.length > 0) parts.push(`holiday: ${holidayNames.join(', ')}`);
  if (cell.disabled) parts.push('not available yet');
  return parts.join(', ');
}

function HolidayDot() {
  const { palette } = useTheme();
  return (
    <View
      style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: palette.warning,
      }}
    />
  );
}

interface DayCellProps {
  cell: CalendarCell;
  month: MonthRef;
  onSelect: (dayId: DayId) => void;
  /** True while the screen is not focused, so the ring stops breathing. */
  paused: boolean;
  /** Names of the public holidays on this day, if any. */
  holidayNames: readonly string[];
  /** True on medium and expanded windows: a taller rectangle. */
  wide: boolean;
}

/**
 * One date. Today has a gradient ring that breathes with a soft glow, a written day has a
 * gradient dot, a holiday has a `warning` dot, an empty past day is muted and a future day is
 * faded and disabled. A tap ripples over the date and opens the day at once, so the ripple never
 * delays the next screen. Holidays are display only: they never change what a day allows.
 */
function DayCell({ cell, month, onSelect, paused, holidayNames, wide }: DayCellProps) {
  const { palette, scheme } = useTheme();
  const [ripple, setRipple] = useState(0);
  const holiday = holidayNames.length > 0;
  const quiet = !cell.isToday && !cell.hasWriting;
  const radius = wide ? RADIUS.card : RADIUS.pill;

  const face = (
    <View
      style={{
        flex: 1,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: cell.hasWriting ? palette.surfaceRaised : 'transparent',
      }}
    >
      <Text
        style={{
          color: quiet ? palette.muted : palette.text,
          fontWeight: cell.isToday ? '700' : '400',
        }}
      >
        {cell.day}
      </Text>
      {cell.hasWriting || holiday ? (
        <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: 2 }}>
          {cell.hasWriting ? (
            <LinearGradient
              colors={[palette.neonViolet, palette.neonBlue]}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 }}
            />
          ) : null}
          {holiday ? <HolidayDot /> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <PressableScale
      accessibilityLabel={describeCell(cell, month, holidayNames)}
      accessibilityState={{ disabled: cell.disabled }}
      disabled={cell.disabled}
      onPress={() => {
        setRipple((count) => count + 1);
        onSelect(cell.dayId);
      }}
      style={
        wide
          ? { width: CELL_WIDTH, height: WIDE_CELL_HEIGHT, padding: 3 }
          : { width: CELL_WIDTH, aspectRatio: 1, padding: 3 }
      }
      innerStyle={{ flex: 1 }}
    >
      <Ripple trigger={ripple} color={palette.neonViolet} />
      {cell.isToday ? (
        <Breathe
          paused={paused}
          style={[{ flex: 1, borderRadius: radius }, glowStyle(palette.neonViolet, scheme, 10)]}
        >
          <LinearGradient
            colors={[palette.neonViolet, palette.neonBlue]}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={{ flex: 1, borderRadius: radius, padding: RING_WIDTH }}
          >
            <View style={{ flex: 1, borderRadius: radius, backgroundColor: palette.surface }}>
              {face}
            </View>
          </LinearGradient>
        </Breathe>
      ) : (
        face
      )}
    </PressableScale>
  );
}

function LegendItem({ label, children }: { label: string; children: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
      <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
      <Text variant="caption" style={{ color: palette.muted }}>
        {label}
      </Text>
    </View>
  );
}

/** What each kind of date looks like, so the ring and the dots never need explaining. */
function Legend() {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: SPACING.lg,
        rowGap: SPACING.xs,
        marginTop: SPACING.md,
      }}
    >
      <LegendItem label="Today">
        <LinearGradient
          colors={[palette.neonViolet, palette.neonBlue]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={{ width: 16, height: 16, borderRadius: 8, padding: RING_WIDTH }}
        >
          <View style={{ flex: 1, borderRadius: 6, backgroundColor: palette.surface }} />
        </LinearGradient>
      </LegendItem>
      <LegendItem label="Written">
        <LinearGradient
          colors={[palette.neonViolet, palette.neonBlue]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 }}
        />
      </LegendItem>
      <LegendItem label="Holiday">
        <HolidayDot />
      </LegendItem>
      <LegendItem label="Empty">
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: BORDER_WIDTH,
            borderColor: palette.border,
          }}
        />
      </LegendItem>
    </View>
  );
}

/**
 * The holidays of the shown month. A date only shows a dot, so the names are read here (section 17.2).
 */
function HolidayList({ holidays }: { holidays: readonly Holiday[] }) {
  const { palette } = useTheme();
  if (holidays.length === 0) return null;
  return (
    <View style={{ marginTop: SPACING.md, gap: SPACING.xs }}>
      <Text variant="caption" style={{ color: palette.muted }}>
        Holidays
      </Text>
      {holidays.map((holiday) => {
        const parts = parseDayId(holiday.dayId);
        const when = parts
          ? format(new Date(parts.year, parts.month - 1, parts.day), 'EEE d')
          : holiday.dayId;
        return (
          <View
            key={`${holiday.dayId}|${holiday.name}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}
          >
            <HolidayDot />
            <Text variant="caption" style={{ color: palette.muted, minWidth: 48 }}>
              {when}
            </Text>
            <Text variant="caption" style={{ flex: 1 }}>
              {holiday.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

interface Props {
  month: MonthRef;
  todayId: DayId;
  writtenDays: ReadonlySet<DayId>;
  onSelectDay: (dayId: DayId) => void;
  onChangeMonth: (delta: -1 | 1) => void;
  /** Pass true while the screen is not focused so the ring on today stops breathing. */
  paused?: boolean;
  /** Public holidays of the shown year, from `useHolidays`. Empty when none are known. */
  holidays?: readonly Holiday[];
}

/**
 * Month calendar card (sections 15.11 and 17): chevron buttons around the month title, a grid
 * that slides left or right when the month changes, a small legend and the month's holidays.
 * On a compact window it keeps square dates and stops growing at 56 px cells; on a medium or
 * expanded window it fills the content width with 72 px tall dates. Future days are disabled.
 */
export function MonthCalendar({
  month,
  todayId,
  writtenDays,
  onSelectDay,
  onChangeMonth,
  paused = false,
  holidays = NO_HOLIDAYS,
}: Props) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const wide = sizeClass !== 'compact';
  const weeks = buildMonthGrid({ month, todayId, writtenDays });
  const todayMonth = { year: Number(todayId.slice(0, 4)), month: Number(todayId.slice(5, 7)) };
  const canGoNext = compareMonths(month, todayMonth) < 0;
  const title = format(new Date(month.year, month.month - 1, 1), 'MMMM yyyy');

  const namesByDay = useMemo(() => holidaysByDay(holidays), [holidays]);
  const monthHolidays = useMemo(
    () => holidaysInMonth(holidays, month),
    // The month is a small object that may be a new one on every render of the parent.
    [holidays, month.year, month.month],
  );

  // Which way the grid slides in follows the way the month moved. Derived while rendering, so
  // the direction is already right on the render that shows the new month.
  const [shown, setShown] = useState<{ month: MonthRef; direction: 1 | -1 }>({
    month,
    direction: 1,
  });
  const moved = compareMonths(month, shown.month);
  if (moved !== 0) setShown({ month, direction: moved > 0 ? 1 : -1 });

  return (
    <Card
      style={
        wide
          ? { width: '100%' }
          : { width: '100%', maxWidth: CALENDAR_CARD_MAX_WIDTH, alignSelf: 'center' }
      }
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.sm,
        }}
      >
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Previous month"
          color={palette.neonViolet}
          onPress={() => onChangeMonth(-1)}
        />
        <Text accessibilityRole="header" variant="heading">
          {title}
        </Text>
        <IconButton
          icon={ChevronRight}
          accessibilityLabel="Next month"
          color={canGoNext ? palette.neonViolet : palette.muted}
          disabled={!canGoNext}
          onPress={() => onChangeMonth(1)}
        />
      </View>

      {/* The seven columns share the width, so a date cell is the width divided by seven. On a
          compact window the grid stops at 7 * 56; on wider windows it fills the card. */}
      <View
        style={
          wide
            ? { width: '100%' }
            : { width: '100%', maxWidth: CALENDAR_GRID_MAX_WIDTH, alignSelf: 'center' }
        }
      >
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((name) => (
            <Text
              key={name}
              variant="caption"
              style={{ width: CELL_WIDTH, textAlign: 'center', color: palette.muted }}
            >
              {name}
            </Text>
          ))}
        </View>

        <SlideSwap swapKey={`${month.year}-${month.month}`} direction={shown.direction}>
          {weeks.map((week, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: 'row' }}>
              {week.map((cell, columnIndex) =>
                cell ? (
                  <DayCell
                    key={cell.dayId}
                    cell={cell}
                    month={month}
                    onSelect={onSelectDay}
                    paused={paused}
                    holidayNames={namesByDay.get(cell.dayId) ?? NO_NAMES}
                    wide={wide}
                  />
                ) : (
                  <View
                    key={`blank-${columnIndex}`}
                    style={
                      wide
                        ? { width: CELL_WIDTH, height: WIDE_CELL_HEIGHT }
                        : { width: CELL_WIDTH, aspectRatio: 1 }
                    }
                  />
                ),
              )}
            </View>
          ))}
        </SlideSwap>
      </View>

      <Legend />
      <HolidayList holidays={monthHolidays} />
    </Card>
  );
}
