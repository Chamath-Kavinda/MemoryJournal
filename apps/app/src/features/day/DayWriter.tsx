import {
  HOURS,
  PREVIEW_MAX_LENGTH,
  addMinuteMarker,
  blocksOfHour,
  getHourText,
  hasMinuteMarker,
  hourHasText,
  hourLabel,
  minuteBlocksOfHour,
  minuteLabel,
  parseMinute,
  removeMinuteMarker,
  setFreeNotes,
  setHourText,
  setMinuteText,
  timeLabel,
  toDisplayText,
  type DayContent,
} from '@memory-journal/core';
import { ChevronDown, Clock, NotebookPen, Timer, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pop } from '@/components/Pop';
import { PressableScale } from '@/components/PressableScale';
import { Reflow } from '@/components/Reflow';
import { Reveal } from '@/components/Reveal';
import { Rotate } from '@/components/Rotate';
import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, TextInput } from '@/theme/themed';

import { MentionInput } from './MentionInput';
import type { Tagging } from './tagging';

interface Props {
  content: DayContent;
  onChange: (content: DayContent) => void;
  /** False while today is locked: the text can be read but nothing can be typed. */
  editable: boolean;
  /** The user's tags. Leave out to write without the `@` picker. Mentions still show as names. */
  tagging?: Tagging | undefined;
}

/** The last known cursor of the open row: which block it was in and where (in stored text). */
interface Cursor {
  minute: number | null;
  offset: number;
}

/**
 * One line for a collapsed row: the first text of the hour as the person sees it (mentions as
 * `@Name`), cut with an ellipsis. Cut after the conversion so a mention is never split.
 */
function previewOf(content: DayContent, hour: number, names: ReadonlyMap<string, string>): string {
  const first = blocksOfHour(content, hour).find((block) => block.text.trim() !== '');
  if (!first) return '';
  const line = toDisplayText(first.text, names).replace(/\s+/g, ' ').trim();
  return line.length > PREVIEW_MAX_LENGTH
    ? `${line.slice(0, PREVIEW_MAX_LENGTH - 1).trimEnd()}…`
    : line;
}

/** Free Notes card followed by the 24 hourly rows. Empty rows stay collapsed. */
export function DayWriter({ content, onChange, editable, tagging }: Props) {
  const { palette } = useTheme();
  const [expandedHour, setExpandedHour] = useState<number | null>(null);
  const [addingMinute, setAddingMinute] = useState(false);
  const [minuteInput, setMinuteInput] = useState('');
  const [minuteError, setMinuteError] = useState<string | null>(null);
  const [focusMinute, setFocusMinute] = useState<number | null>(null);
  // Kept in a ref: the cursor moves with every key press and must not re-render the day.
  const cursorRef = useRef<Cursor | null>(null);

  const tags = tagging?.tags;
  const names = useMemo(
    () => new Map((tags ?? []).map((tag) => [tag.id, tag.name] as const)),
    [tags],
  );

  const inputStyle = {
    color: palette.text,
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderWidth: BORDER_WIDTH,
    borderRadius: RADIUS.input,
    padding: SPACING.md,
    textAlignVertical: 'top' as const,
  };

  function toggleRow(hour: number, expanded: boolean) {
    setExpandedHour(expanded ? null : hour);
    setAddingMinute(false);
    setMinuteInput('');
    setMinuteError(null);
    setFocusMinute(null);
    cursorRef.current = null;
  }

  function closeMinuteForm() {
    setAddingMinute(false);
    setMinuteInput('');
    setMinuteError(null);
  }

  function insertMinute(hour: number) {
    const minute = parseMinute(minuteInput);
    if (minute === null) {
      setMinuteError('Enter a minute from 0 to 59.');
      return;
    }
    if (hasMinuteMarker(content, hour, minute)) {
      setMinuteError(`${timeLabel(hour, minute)} already has a marker.`);
      return;
    }
    const cursor = cursorRef.current;
    const split = cursor ? { minute: cursor.minute, cursor: cursor.offset } : undefined;
    onChange(addMinuteMarker(content, hour, minute, split));
    setFocusMinute(minute);
    cursorRef.current = null;
    closeMinuteForm();
  }

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.lg,
      }}
    >
      <Card style={{ gap: SPACING.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <Icon icon={NotebookPen} size="control" color={palette.accent} />
          <Text accessibilityRole="header" variant="heading">
            Free notes
          </Text>
        </View>
        <Text variant="caption" style={{ color: palette.muted }}>
          Things you remember but cannot place in time.
        </Text>
        <MentionInput
          label="Free notes"
          editable={editable}
          tagging={tagging}
          value={content.freeNotes}
          onChangeValue={(text) => onChange(setFreeNotes(content, text))}
          style={{ ...inputStyle, minHeight: 88 }}
        />
      </Card>

      <View style={{ gap: SPACING.sm }}>
        {HOURS.map((hour) => {
          const label = hourLabel(hour);
          const preview = previewOf(content, hour, names);
          const hasText = hourHasText(content, hour);
          const expanded = expandedHour === hour;
          // A locked day only lets you open rows that already have text.
          const canOpen = editable || hasText;

          return (
            <Reflow
              key={hour}
              style={{
                borderRadius: RADIUS.card,
                borderWidth: BORDER_WIDTH,
                borderColor: expanded ? palette.accent : palette.border,
                backgroundColor: palette.surface,
                overflow: 'hidden',
              }}
            >
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${preview || 'empty'}`}
                accessibilityState={{ expanded, disabled: !canOpen }}
                disabled={!canOpen}
                dimmed={false}
                onPress={() => toggleRow(hour, expanded)}
                innerStyle={{
                  minHeight: MIN_TARGET,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACING.md,
                  paddingHorizontal: SPACING.md,
                  paddingVertical: SPACING.sm,
                }}
              >
                <Icon icon={Clock} color={hasText ? palette.accent : palette.muted} />
                <Text style={{ width: 52, color: palette.muted, fontVariant: ['tabular-nums'] }}>
                  {label}
                </Text>
                <Text numberOfLines={1} style={{ flex: 1, color: palette.text }}>
                  {preview}
                </Text>
                <Rotate turned={expanded}>
                  <Icon icon={ChevronDown} color={palette.muted} />
                </Rotate>
              </PressableScale>

              {expanded ? (
                <Reveal style={{ padding: SPACING.md, paddingTop: 0, gap: SPACING.md }}>
                  <MentionInput
                    label={`Notes for ${label}`}
                    autoFocus={editable && focusMinute === null}
                    editable={editable}
                    tagging={tagging}
                    value={getHourText(content, hour)}
                    onChangeValue={(text) => onChange(setHourText(content, hour, text))}
                    onCursorChange={(offset) => {
                      cursorRef.current = { minute: null, offset };
                    }}
                    style={{ ...inputStyle, minHeight: 96 }}
                  />

                  {minuteBlocksOfHour(content, hour).map((block) => {
                    // Marker blocks always have a minute; the filter above removes the whole-hour block.
                    const minute = block.minute as number;
                    const time = timeLabel(hour, minute);
                    return (
                      <View key={minute} style={{ gap: SPACING.xs }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Pop
                            trigger={minute}
                            playOnMount={focusMinute === minute}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}
                          >
                            <Icon icon={Timer} color={palette.accent} />
                            <Text
                              style={{
                                color: palette.accent,
                                fontWeight: '600',
                                fontVariant: ['tabular-nums'],
                              }}
                            >
                              {minuteLabel(minute)}
                            </Text>
                          </Pop>
                          {editable ? (
                            <IconButton
                              icon={X}
                              accessibilityLabel={`Remove ${time}`}
                              color={palette.muted}
                              onPress={() => {
                                cursorRef.current = null;
                                onChange(removeMinuteMarker(content, hour, minute));
                              }}
                            />
                          ) : null}
                        </View>
                        <MentionInput
                          label={`Notes at ${time}`}
                          autoFocus={editable && focusMinute === minute}
                          editable={editable}
                          tagging={tagging}
                          value={block.text}
                          onChangeValue={(text) =>
                            onChange(setMinuteText(content, hour, minute, text))
                          }
                          onCursorChange={(offset) => {
                            cursorRef.current = { minute, offset };
                          }}
                          style={{ ...inputStyle, minHeight: 64 }}
                        />
                      </View>
                    );
                  })}

                  {editable && !addingMinute ? (
                    <Button
                      label="Add minute"
                      icon={Timer}
                      variant="ghost"
                      onPress={() => setAddingMinute(true)}
                      style={{ alignSelf: 'flex-start' }}
                    />
                  ) : null}

                  {editable && addingMinute ? (
                    <View style={{ gap: SPACING.xs }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: SPACING.md,
                        }}
                      >
                        <Text style={{ color: palette.muted }}>{label.slice(0, 3)}</Text>
                        <TextInput
                          accessibilityLabel="Minute"
                          autoFocus
                          keyboardType="number-pad"
                          maxLength={3}
                          placeholder="0–59"
                          placeholderTextColor={palette.muted}
                          value={minuteInput}
                          onChangeText={(text) => {
                            setMinuteInput(text);
                            setMinuteError(null);
                          }}
                          onSubmitEditing={() => insertMinute(hour)}
                          onKeyPress={(event) => {
                            if (event.nativeEvent.key === 'Escape') closeMinuteForm();
                          }}
                          style={{ ...inputStyle, width: 88, paddingVertical: SPACING.sm }}
                        />
                        <Button
                          label="Insert"
                          accessibilityLabel="Insert minute marker"
                          onPress={() => insertMinute(hour)}
                        />
                        <Button
                          label="Cancel"
                          accessibilityLabel="Cancel adding a minute"
                          variant="ghost"
                          onPress={closeMinuteForm}
                        />
                      </View>
                      {minuteError ? (
                        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
                          {minuteError}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </Reveal>
              ) : null}
            </Reflow>
          );
        })}
      </View>
    </View>
  );
}
