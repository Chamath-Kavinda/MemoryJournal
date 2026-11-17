import {
  addMonths,
  buildMonthGrid,
  compareMonths,
  isValidDayId,
  monthOfDayId,
  type CalendarCell,
  type DayId,
  type MonthRef,
} from '@memory-journal/core';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { ActionButton } from '@/features/tags/ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CELL_WIDTH = `${100 / 7}%` as const;
const NO_WRITING: ReadonlySet<DayId> = new Set();

export interface DatePickerModalProps {
  visible: boolean;
  /** The date now in the input. The picker opens on its month and marks it, if it is valid. */
  value: string;
  todayId: DayId;
  /** Names the dialog for screen readers, for example Pick date watched. */
  title: string;
  onPick: (dayId: DayId) => void;
  /** Cancel, the backdrop, hardware Back and Esc: closes without a change. */
  onClose: () => void;
}

function describeCell(cell: CalendarCell, month: MonthRef, selected: boolean): string {
  const date = format(new Date(month.year, month.month - 1, cell.day), 'd MMMM yyyy');
  const parts = [date];
  if (selected) parts.push('selected');
  if (cell.disabled) parts.push('not available yet');
  return parts.join(', ');
}

/**
 * A small month picker for the Library date field (section 16.3). It is built from the same month
 * grid helper as the Home calendar and uses no native library, so it works on Android, iOS, web
 * and Windows. Future dates cannot be picked.
 */
export function DatePickerModal({
  visible,
  value,
  todayId,
  title,
  onPick,
  onClose,
}: DatePickerModalProps) {
  const { palette } = useTheme();
  const selectedId = isValidDayId(value) ? (value as DayId) : null;
  const [month, setMonth] = useState<MonthRef>(() => monthOfDayId(selectedId ?? todayId));
  // Each time the picker opens, jump to the month of the date now in the input.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setMonth(monthOfDayId(selectedId ?? todayId));
  }

  const todayMonth = useMemo(() => monthOfDayId(todayId), [todayId]);
  const canGoNext = compareMonths(month, todayMonth) < 0;
  const weeks = buildMonthGrid({ month, todayId, writtenDays: NO_WRITING });
  const heading = format(new Date(month.year, month.month - 1, 1), 'MMMM yyyy');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: SPACING.lg,
        }}
      >
        <Pressable
          accessibilityLabel="Close date picker"
          accessibilityRole="button"
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={{
            width: '100%',
            maxWidth: 360,
            padding: SPACING.lg,
            borderRadius: RADIUS.sheet,
            borderWidth: BORDER_WIDTH,
            borderColor: palette.border,
            backgroundColor: palette.surfaceRaised,
          }}
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
              onPress={() => setMonth((current) => addMonths(current, -1))}
            />
            <Text accessibilityRole="header" variant="heading">
              {heading}
            </Text>
            <IconButton
              icon={ChevronRight}
              accessibilityLabel="Next month"
              color={canGoNext ? palette.neonViolet : palette.muted}
              disabled={!canGoNext}
              onPress={() => setMonth((current) => addMonths(current, 1))}
            />
          </View>

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

          {weeks.map((week, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: 'row' }}>
              {week.map((cell, columnIndex) => {
                if (!cell) {
                  return (
                    <View
                      key={`blank-${columnIndex}`}
                      style={{ width: CELL_WIDTH, aspectRatio: 1 }}
                    />
                  );
                }
                const selected = cell.dayId === selectedId;
                return (
                  <PressableScale
                    key={cell.dayId}
                    accessibilityLabel={describeCell(cell, month, selected)}
                    accessibilityState={{ disabled: cell.disabled, selected }}
                    disabled={cell.disabled}
                    onPress={() => onPick(cell.dayId)}
                    style={{ width: CELL_WIDTH, aspectRatio: 1, padding: 3 }}
                    innerStyle={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: RADIUS.pill,
                      backgroundColor: selected ? palette.primaryStart : 'transparent',
                      opacity: cell.disabled ? 0.35 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? palette.onGradient : palette.text,
                        fontWeight: selected || cell.isToday ? '700' : '400',
                      }}
                    >
                      {cell.day}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          ))}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACING.md }}>
            <ActionButton label="Cancel" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
