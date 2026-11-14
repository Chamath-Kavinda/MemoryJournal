import {
  HOURS,
  getHourText,
  hourHasText,
  hourLabel,
  hourPreview,
  setFreeNotes,
  setHourText,
  type DayContent,
} from '@memory-journal/core';
import { useState } from 'react';
import { Pressable, Text, TextInput, View, useColorScheme } from 'react-native';

interface Props {
  content: DayContent;
  onChange: (content: DayContent) => void;
  /** False while today is locked: the text can be read but nothing can be typed. */
  editable: boolean;
}

function colorsFor(dark: boolean) {
  return {
    text: dark ? '#f2f2f2' : '#1c1c1e',
    muted: dark ? '#8e8e93' : '#6c6c70',
    border: dark ? '#38383a' : '#d1d1d6',
    surface: dark ? '#1c1c1e' : '#f7f7f9',
  };
}

/** Free Notes block followed by the 24 hourly rows. Empty rows stay collapsed. */
export function DayWriter({ content, onChange, editable }: Props) {
  const colors = colorsFor(useColorScheme() === 'dark');
  const [expandedHour, setExpandedHour] = useState<number | null>(null);

  const inputStyle = {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top' as const,
  };

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
        <TextInput
          accessibilityLabel="Free notes"
          multiline
          editable={editable}
          value={content.freeNotes}
          onChangeText={(text) => onChange(setFreeNotes(content, text))}
          style={{ ...inputStyle, minHeight: 88 }}
        />
      </View>

      <View style={{ borderTopWidth: 1, borderColor: colors.border }}>
        {HOURS.map((hour) => {
          const label = hourLabel(hour);
          const preview = hourPreview(content, hour);
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
                onPress={() => setExpandedHour(expanded ? null : hour)}
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
                <View style={{ paddingBottom: 12 }}>
                  <TextInput
                    accessibilityLabel={`Notes for ${label}`}
                    multiline
                    autoFocus={editable}
                    editable={editable}
                    value={getHourText(content, hour)}
                    onChangeText={(text) => onChange(setHourText(content, hour, text))}
                    style={{ ...inputStyle, minHeight: 96 }}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
