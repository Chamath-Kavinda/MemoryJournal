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
import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, useColorScheme } from 'react-native';

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

function colorsFor(dark: boolean) {
  return {
    text: dark ? '#f2f2f2' : '#1c1c1e',
    muted: dark ? '#8e8e93' : '#6c6c70',
    border: dark ? '#38383a' : '#d1d1d6',
    surface: dark ? '#1c1c1e' : '#f7f7f9',
    accent: dark ? '#0a84ff' : '#007aff',
    error: dark ? '#ff453a' : '#d70015',
  };
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

/** Free Notes block followed by the 24 hourly rows. Empty rows stay collapsed. */
export function DayWriter({ content, onChange, editable, tagging }: Props) {
  const colors = colorsFor(useColorScheme() === 'dark');
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
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
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
      style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, gap: 20 }}
    >
      <View style={{ gap: 6 }}>
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}
        >
          Free notes
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
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
      </View>

      <View style={{ borderTopWidth: 1, borderColor: colors.border }}>
        {HOURS.map((hour) => {
          const label = hourLabel(hour);
          const preview = previewOf(content, hour, names);
          const hasText = hourHasText(content, hour);
          const expanded = expandedHour === hour;
          // A locked day only lets you open rows that already have text.
          const canOpen = editable || hasText;

          return (
            <View key={hour} style={{ borderBottomWidth: 1, borderColor: colors.border }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${preview || 'empty'}`}
                accessibilityState={{ expanded, disabled: !canOpen }}
                disabled={!canOpen}
                onPress={() => toggleRow(hour, expanded)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
              >
                <Text style={{ width: 52, color: colors.muted, fontVariant: ['tabular-nums'] }}>
                  {label}
                </Text>
                <Text numberOfLines={1} style={{ flex: 1, color: colors.text }}>
                  {preview}
                </Text>
              </Pressable>

              {expanded ? (
                <View style={{ paddingBottom: 12, gap: 12 }}>
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
                      <View key={minute} style={{ gap: 6 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text
                            style={{
                              color: colors.accent,
                              fontWeight: '600',
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {minuteLabel(minute)}
                          </Text>
                          {editable ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${time}`}
                              onPress={() => {
                                cursorRef.current = null;
                                onChange(removeMinuteMarker(content, hour, minute));
                              }}
                              hitSlop={8}
                            >
                              <Text style={{ color: colors.muted }}>Remove</Text>
                            </Pressable>
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add minute"
                      onPress={() => setAddingMinute(true)}
                      style={{ alignSelf: 'flex-start', paddingVertical: 6 }}
                    >
                      <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Add minute</Text>
                    </Pressable>
                  ) : null}

                  {editable && addingMinute ? (
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: colors.muted }}>{label.slice(0, 3)}</Text>
                        <TextInput
                          accessibilityLabel="Minute"
                          autoFocus
                          keyboardType="number-pad"
                          maxLength={3}
                          placeholder="0–59"
                          placeholderTextColor={colors.muted}
                          value={minuteInput}
                          onChangeText={(text) => {
                            setMinuteInput(text);
                            setMinuteError(null);
                          }}
                          onSubmitEditing={() => insertMinute(hour)}
                          style={{ ...inputStyle, width: 88, paddingVertical: 8 }}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Insert minute marker"
                          onPress={() => insertMinute(hour)}
                        >
                          <Text style={{ color: colors.accent, fontWeight: '600' }}>Insert</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Cancel adding a minute"
                          onPress={closeMinuteForm}
                        >
                          <Text style={{ color: colors.muted }}>Cancel</Text>
                        </Pressable>
                      </View>
                      {minuteError ? (
                        <Text accessibilityRole="alert" style={{ color: colors.error }}>
                          {minuteError}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
