import { validateTagInput, type Tag, type TagCategory, type TagDraft } from '@memory-journal/core';
import { TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useConfirm } from '@/components/useConfirm';
import { Text, TextInput } from '@/theme/themed';

import { ActionButton, Chip, usePalette } from './ui';

interface Props {
  categories: readonly TagCategory[];
  /** All tags, to refuse a duplicate name inside a category. */
  tags: readonly Tag[];
  /** The tag being edited. Leave out to create a new one. */
  initial?: Tag;
  /** Category chosen at first when creating. */
  defaultCategoryId?: string;
  /** Name filled in at first when creating, for example the text that was selected. */
  defaultName?: string;
  onSubmit: (draft: TagDraft) => void;
  onCancel: () => void;
  /** Only passed when editing. Called after the person confirms in the dialog. */
  onDelete?: () => void;
  /** Called with true while the form holds changes that are not saved, and false otherwise. */
  onDirtyChange?: (dirty: boolean) => void;
}

/** Create or edit a tag: name, category, optional note, optional aliases. */
export function TagForm({
  categories,
  tags,
  initial,
  defaultCategoryId,
  defaultName,
  onSubmit,
  onCancel,
  onDelete,
  onDirtyChange,
}: Props) {
  const palette = usePalette();
  const confirm = useConfirm();
  // What the form started with, to tell whether anything has changed.
  const [start] = useState(() => ({
    name: initial?.name ?? defaultName ?? '',
    categoryId: initial?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
    note: initial?.note ?? '',
    aliasesText: initial?.aliases.join(', ') ?? '',
  }));
  const [name, setName] = useState(start.name);
  const [categoryId, setCategoryId] = useState(start.categoryId);
  const [note, setNote] = useState(start.note);
  const [aliasesText, setAliasesText] = useState(start.aliasesText);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name !== start.name ||
    categoryId !== start.categoryId ||
    note !== start.note ||
    aliasesText !== start.aliasesText;

  // Lets the screen around the form ask before its own Back button leaves with changes unsaved.
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const submit = async () => {
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

    const removed = (initial?.aliases ?? []).filter(
      (alias) => !result.value.aliases.includes(alias),
    );
    if (initial && removed.length > 0) {
      const many = removed.length > 1;
      const confirmed = await confirm({
        title: many ? 'Remove aliases?' : 'Remove alias?',
        message: `${removed.join(', ')} will be removed from ${initial.name}.`,
        confirmLabel: many ? 'Remove aliases' : 'Remove alias',
        icon: TriangleAlert,
      });
      if (!confirmed) return;
    }
    onSubmit(result.value);
  };

  const askCancel = async () => {
    if (!dirty) {
      onCancel();
      return;
    }
    const confirmed = await confirm({
      title: 'Discard changes?',
      message: initial
        ? `Your changes to ${initial.name} will not be saved.`
        : 'This new tag will not be saved.',
      confirmLabel: 'Discard changes',
      icon: TriangleAlert,
    });
    if (confirmed) onCancel();
  };

  const askDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete tag?',
      message: `${initial?.name ?? 'This tag'} will be deleted. Mentions in your old entries stay as plain text.`,
      confirmLabel: 'Delete tag',
    });
    if (confirmed) onDelete?.();
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
          onPress={() => void submit()}
        />
        <ActionButton label="Cancel" onPress={() => void askCancel()} />
      </View>

      {onDelete ? (
        <View style={{ alignItems: 'flex-start', paddingTop: 8 }}>
          <ActionButton label="Delete tag" tone="danger" onPress={() => void askDelete()} />
        </View>
      ) : null}
    </View>
  );
}
