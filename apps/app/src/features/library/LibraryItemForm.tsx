import {
  checkLibraryDraft,
  libraryDraftMessage,
  libraryTypeLabel,
  type DayId,
  type LibraryItemType,
} from '@memory-journal/core';
import { Calendar, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useTodayId } from '@/features/calendar/useTodayId';
import { IconButton } from '@/components/IconButton';
import { useConfirm } from '@/components/useConfirm';
import { Text, TextInput } from '@/theme/themed';

import { ActionButton, usePalette } from '@/features/tags/ui';

import { DatePickerModal } from './DatePickerModal';

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
  const confirm = useConfirm();
  const [start] = useState(() => ({ title: initial?.title ?? '', date: initial?.date ?? '' }));
  const [title, setTitle] = useState(start.title);
  const [date, setDate] = useState(start.date);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const todayId = useTodayId();

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

  async function askCancel() {
    if (title === start.title && date === start.date) {
      onCancel();
      return;
    }
    const confirmed = await confirm({
      title: 'Discard changes?',
      message: initial
        ? `Your changes to ${initial.title} will not be saved.`
        : `This new ${noun} will not be saved.`,
      confirmLabel: 'Discard changes',
      icon: TriangleAlert,
    });
    if (confirmed) onCancel();
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 10,
          paddingLeft: 12,
        }}
      >
        <TextInput
          accessibilityLabel={`Date ${verb}`}
          placeholder={`Date ${verb} (yyyy-mm-dd, optional)`}
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
          autoCorrect={false}
          value={date}
          onChangeText={setDate}
          style={{ flex: 1, minHeight: 44, color: palette.text, fontSize: 16 }}
        />
        <IconButton
          icon={Calendar}
          accessibilityLabel={`Pick date ${verb}`}
          onPress={() => setPicking(true)}
        />
      </View>
      <DatePickerModal
        visible={picking}
        value={date}
        todayId={todayId}
        title={`Pick date ${verb}`}
        onPick={(dayId) => {
          setDate(dayId);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
      {error !== null ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, fontSize: 14 }}>
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <ActionButton label={submitLabel} tone="primary" onPress={submit} />
        <ActionButton label="Cancel" onPress={() => void askCancel()} />
      </View>
    </View>
  );
}
