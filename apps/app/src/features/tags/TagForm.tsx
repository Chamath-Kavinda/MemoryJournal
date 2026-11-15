import { validateTagInput, type Tag, type TagCategory, type TagDraft } from '@memory-journal/core';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { ActionButton, Chip, usePalette } from './ui';

interface Props {
  categories: readonly TagCategory[];
  /** All tags, to refuse a duplicate name inside a category. */
  tags: readonly Tag[];
  /** The tag being edited. Leave out to create a new one. */
  initial?: Tag;
  /** Category chosen at first when creating. */
  defaultCategoryId?: string;
  onSubmit: (draft: TagDraft) => void;
  onCancel: () => void;
  /** Only passed when editing. */
  onDelete?: () => void;
}

/** Create or edit a tag: name, category, optional note, optional aliases. */
export function TagForm({
  categories,
  tags,
  initial,
  defaultCategoryId,
  onSubmit,
  onCancel,
  onDelete,
}: Props) {
  const palette = usePalette();
  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [aliasesText, setAliasesText] = useState(initial?.aliases.join(', ') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const submit = () => {
    const result = validateTagInput(
      { name, categoryId, note, aliasesText },
      categories,
      tags,
      initial?.id,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onSubmit(result.value);
  };

  const input = {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.text,
    fontSize: 16,
  } as const;
  const label = { color: palette.text, fontSize: 15, fontWeight: '600' } as const;

  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 12 }}>
      <Text style={label}>Name</Text>
      <TextInput
        accessibilityLabel="Name"
        placeholder="For example Ravi, Galle Fort or 0771234567"
        placeholderTextColor={palette.muted}
        value={name}
        onChangeText={setName}
        style={input}
      />

      <Text style={label}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </View>

      <Text style={label}>Note (optional)</Text>
      <TextInput
        accessibilityLabel="Note"
        placeholder="For example where you met"
        placeholderTextColor={palette.muted}
        value={note}
        onChangeText={setNote}
        multiline
        style={{ ...input, minHeight: 88, textAlignVertical: 'top' }}
      />

      <Text style={label}>Aliases (optional)</Text>
      <TextInput
        accessibilityLabel="Aliases"
        placeholder="Other names, separated by commas"
        placeholderTextColor={palette.muted}
        value={aliasesText}
        onChangeText={setAliasesText}
        autoCorrect={false}
        style={input}
      />

      {error !== null ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, fontSize: 14 }}>
          {error}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ActionButton
          label={initial ? 'Save changes' : 'Create tag'}
          tone="primary"
          onPress={submit}
        />
        <ActionButton label="Cancel" onPress={onCancel} />
      </View>

      {onDelete ? (
        confirmingDelete ? (
          <View style={{ gap: 8, paddingTop: 8 }}>
            <Text style={{ color: palette.text, fontSize: 15 }}>
              Delete this tag? Entries that mention it keep their text.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ActionButton label="Delete tag" tone="danger" onPress={onDelete} />
              <ActionButton label="Keep tag" onPress={() => setConfirmingDelete(false)} />
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'flex-start', paddingTop: 8 }}>
            <ActionButton
              label="Delete tag"
              tone="danger"
              onPress={() => setConfirmingDelete(true)}
            />
          </View>
        )
      ) : null}
    </View>
  );
}
