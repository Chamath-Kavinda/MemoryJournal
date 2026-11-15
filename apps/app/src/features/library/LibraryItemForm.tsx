import {
  checkLibraryDraft,
  libraryDraftMessage,
  libraryTypeLabel,
  type DayId,
  type LibraryItemType,
} from '@memory-journal/core';
import { useState } from 'react';
import { View } from 'react-native';

import { Text, TextInput } from '@/theme/themed';

import { ActionButton, usePalette } from '@/features/tags/ui';

interface Props {
  type: LibraryItemType;
  initial?: { title: string; date: DayId | null };
  submitLabel: string;
  onSubmit: (value: { title: string; date: DayId | null }) => void;
  onCancel: () => void;
}

/** Title and the optional date watched or read, for a new or an existing movie or book. */
export function LibraryItemForm({ type, initial, submitLabel, onSubmit, onCancel }: Props) {
  const palette = usePalette();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [error, setError] = useState<string | null>(null);

  const noun = libraryTypeLabel(type).toLowerCase();
  const verb = type === 'movie' ? 'watched' : 'read';
  const fieldStyle = {
    minHeight: 44,
    color: palette.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  } as const;

  function submit() {
    const checked = checkLibraryDraft({ type, title, date });
    if (!checked.ok) {
      setError(libraryDraftMessage(checked.error));
      return;
    }
    setError(null);
    onSubmit({ title: checked.value.title, date: checked.value.date });
  }

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        accessibilityLabel={`Title of the ${noun}`}
        placeholder="Title"
        placeholderTextColor={palette.muted}
        value={title}
        onChangeText={setTitle}
        style={fieldStyle}
      />
      <TextInput
        accessibilityLabel={`Date ${verb}`}
        placeholder={`Date ${verb} (yyyy-mm-dd, optional)`}
        placeholderTextColor={palette.muted}
        autoCapitalize="none"
        autoCorrect={false}
        value={date}
        onChangeText={setDate}
        style={fieldStyle}
      />
      {error !== null ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, fontSize: 14 }}>
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <ActionButton label={submitLabel} tone="primary" onPress={submit} />
        <ActionButton label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}
