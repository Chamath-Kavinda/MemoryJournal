import { Clock, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { AppSheet } from '@/components/AppSheet';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { SegmentedControl, type Segment } from '@/components/SegmentedControl';
import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, TextInput } from '@/theme/themed';

type Kind = 'hour' | 'minutes';

const KINDS: readonly Segment<Kind>[] = [
  { value: 'hour', label: 'Hour only', icon: Clock },
  { value: 'minutes', label: 'Hour and minutes', icon: Timer },
];

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const QUICK_MINUTES = [0, 15, 30, 45] as const;

/** From this window width up the grid has 8 columns (three rows); below it, 6 (four rows). */
const WIDE_FROM = 600;

/** Columns of the hour grid for a window width. Both counts divide 24, so every row is full. */
export function hourColumns(windowWidth: number): number {
  return windowWidth >= WIDE_FROM ? 8 : 6;
}

/** Splits the 24 hours into rows of equal length. */
export function hourRows(columns: number): number[][] {
  const rows: number[][] = [];
  for (let start = 0; start < HOURS.length; start += columns) {
    rows.push(HOURS.slice(start, start + columns));
  }
  return rows;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** A minute from 0 to 59, or null for anything else. */
function parseMinute(text: string): number | null {
  if (!/^\d{1,2}$/.test(text.trim())) return null;
  const value = Number(text);
  return value <= 59 ? value : null;
}

interface Props {
  /** The device's current time. Both choices start from it (section 18.3). */
  now: Date;
  onInsert: (hour: number, minute: number | null) => void;
  onClose: () => void;
}

/**
 * The Add time sheet (section 18.3, grid rules of v0.2.5 section 8.2): an hour from a grid of 24
 * with equal cells, and optionally a minute typed or picked from quick chips. Insert is enabled
 * when everything the chosen kind needs is chosen.
 */
export function AddTimeSheet({ now, onInsert, onClose }: Props) {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const [kind, setKind] = useState<Kind>('hour');
  const [hour, setHour] = useState<number | null>(now.getHours());
  const [minuteText, setMinuteText] = useState(pad(now.getMinutes()));

  const minute = parseMinute(minuteText);
  const ready = hour !== null && (kind === 'hour' || minute !== null);
  const minuteInvalid = kind === 'minutes' && minuteText !== '' && minute === null;
  const rows = hourRows(hourColumns(width));

  function insert() {
    if (!ready || hour === null) return;
    onInsert(hour, kind === 'hour' ? null : minute);
  }

  const footer = (
    <>
      <Button
        variant="secondary"
        label="Cancel"
        onPress={onClose}
        style={{ flexGrow: 1, flexBasis: 120 }}
      />
      <Button
        label="Insert"
        accessibilityLabel="Insert time"
        disabled={!ready}
        onPress={insert}
        style={{ flexGrow: 1, flexBasis: 120 }}
      />
    </>
  );

  return (
    <AppSheet title="Add time" onClose={onClose} testID="add-time-sheet" footer={footer}>
      <SegmentedControl
        accessibilityLabel="Kind of time"
        segments={KINDS}
        value={kind}
        onChange={setKind}
        testID="add-time-kind"
      />

      <Text style={{ color: palette.muted }}>Hour</Text>
      <View accessibilityLabel="Hour" style={{ gap: SPACING.sm }}>
        {rows.map((row) => (
          <View key={row[0]} style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {row.map((value) => (
              // Every cell takes an equal share of the row and is never sized by its text.
              <Chip
                key={value}
                style={{ flex: 1, flexBasis: 0, minWidth: 0 }}
                testID={`hour-${pad(value)}`}
                label={pad(value)}
                accessibilityLabel={`Hour ${pad(value)}`}
                selected={hour === value}
                onPress={() => setHour(value)}
              />
            ))}
          </View>
        ))}
      </View>

      {kind === 'minutes' ? (
        <View style={{ gap: SPACING.sm }}>
          <Text style={{ color: palette.muted }}>Minute</Text>
          <TextInput
            accessibilityLabel="Minute"
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0–59"
            value={minuteText}
            onChangeText={(text) => setMinuteText(text.replace(/\D/g, ''))}
            onSubmitEditing={insert}
            style={{
              width: 88,
              minHeight: MIN_TARGET,
              paddingHorizontal: SPACING.md,
              borderRadius: RADIUS.input,
              borderWidth: BORDER_WIDTH,
              borderColor: minuteInvalid ? palette.danger : palette.border,
              backgroundColor: palette.surface,
              color: palette.text,
              fontSize: 16,
            }}
          />
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {QUICK_MINUTES.map((value) => (
              <Chip
                key={value}
                style={{ flex: 1, flexBasis: 0, minWidth: 0 }}
                testID={`minute-${pad(value)}`}
                label={`:${pad(value)}`}
                accessibilityLabel={`Minute ${pad(value)}`}
                selected={minute === value}
                onPress={() => setMinuteText(pad(value))}
              />
            ))}
          </View>
          {minuteInvalid ? (
            <Text accessibilityRole="alert" style={{ color: palette.danger }}>
              Enter a minute from 0 to 59.
            </Text>
          ) : null}
        </View>
      ) : null}
    </AppSheet>
  );
}
