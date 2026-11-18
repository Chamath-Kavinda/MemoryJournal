import { validateTagInput, type Tag, type TagCategory, type TagDraft } from '@memory-journal/core';
import { TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useConfirm } from '@/components/useConfirm';
import { Text, TextInput } from '@/theme/themed';

import { ActionButton, Chip, usePalette } from './ui';

interface Options {
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

/** Everything the form fields and the action buttons share. */
export interface TagFormModel {
  name: string;
  setName: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  aliasesText: string;
  setAliasesText: (value: string) => void;
  error: string | null;
  editing: boolean;
  /** Checks the form, asks before removing aliases, then calls `onSubmit`. */
  submit: () => Promise<void>;
  /** Cancels at once, or asks first when there are changes that would be lost. */
  askCancel: () => Promise<void>;
  askDelete: () => Promise<void>;
}

/**
 * The state and the actions of the tag form. `TagForm` draws them in a screen with its buttons
 * under the fields; the Add tag sheet draws the fields in its body and the buttons in its fixed
 * footer, so the buttons are never under a system button (v0.2.5, section 7).
 */
export function useTagForm({
  categories,
  tags,
  initial,
  defaultCategoryId,
  defaultName,
  onSubmit,
  onCancel,
  onDelete,
  onDirtyChange,
}: Options): TagFormModel {
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

  return {
    name,
    setName,
    categoryId,
    setCategoryId,
    note,
    setNote,
    aliasesText,
    setAliasesText,
    error,
    editing: initial !== undefined,
    submit,
    askCancel,
    askDelete,
  };
}

/** Name, category, optional note, optional aliases and the error line. No buttons. */
export function TagFormFields({
  form,
  categories,
}: {
  form: TagFormModel;
  categories: readonly TagCategory[];
}) {
  const palette = usePalette();

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
    <View style={{ gap: 12 }}>
      <Text style={label}>Name</Text>
      <TextInput
        accessibilityLabel="Name"
        placeholder="For example Ravi, Galle Fort or 0771234567"
        placeholderTextColor={palette.muted}
        value={form.name}
        onChangeText={form.setName}
        style={input}
      />

      <Text style={label}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={form.categoryId === category.id}
            onPress={() => form.setCategoryId(category.id)}
          />
        ))}
      </View>

      <Text style={label}>Note (optional)</Text>
      <TextInput
        accessibilityLabel="Note"
        placeholder="For example where you met"
        placeholderTextColor={palette.muted}
        value={form.note}
        onChangeText={form.setNote}
        multiline
        style={{ ...input, minHeight: 88, textAlignVertical: 'top' }}
      />

      <Text style={label}>Aliases (optional)</Text>
      <TextInput
        accessibilityLabel="Aliases"
        placeholder="Other names, separated by commas"
        placeholderTextColor={palette.muted}
        value={form.aliasesText}
        onChangeText={form.setAliasesText}
        autoCorrect={false}
        style={input}
      />

      {form.error !== null ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, fontSize: 14 }}>
          {form.error}
        </Text>
      ) : null}
    </View>
  );
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
}: Options) {
  const form = useTagForm({
    categories,
    tags,
    ...(initial ? { initial } : {}),
    ...(defaultCategoryId !== undefined ? { defaultCategoryId } : {}),
    ...(defaultName !== undefined ? { defaultName } : {}),
    onSubmit,
    onCancel,
    ...(onDelete ? { onDelete } : {}),
    ...(onDirtyChange ? { onDirtyChange } : {}),
  });

  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 12 }}>
      <TagFormFields form={form} categories={categories} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ActionButton
          label={form.editing ? 'Save changes' : 'Create tag'}
          tone="primary"
          onPress={() => void form.submit()}
        />
        <ActionButton label="Cancel" onPress={() => void form.askCancel()} />
      </View>

      {onDelete ? (
        <View style={{ alignItems: 'flex-start', paddingTop: 8 }}>
          <ActionButton label="Delete tag" tone="danger" onPress={() => void form.askDelete()} />
        </View>
      ) : null}
    </View>
  );
}
