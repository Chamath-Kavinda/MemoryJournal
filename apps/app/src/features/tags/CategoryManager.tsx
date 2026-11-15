import {
  canDeleteCategory,
  canRenameCategory,
  validateCategoryName,
  type Tag,
  type TagCategory,
} from '@memory-journal/core';
import { useState } from 'react';
import { View } from 'react-native';

import { Text, TextInput } from '@/theme/themed';

import { ActionButton, usePalette } from './ui';

interface Props {
  categories: readonly TagCategory[];
  tags: readonly Tag[];
  onCreate: (name: string) => void;
  onRename: (categoryId: string, name: string) => void;
  onDelete: (categoryId: string) => void;
}

/** Add, rename and delete categories. People, Places and Numbers are fixed. */
export function CategoryManager({ categories, tags, onCreate, onRename, onDelete }: Props) {
  const palette = usePalette();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const input = {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.text,
    fontSize: 16,
  } as const;

  const add = () => {
    const result = validateCategoryName(newName, categories);
    if (!result.ok) return setMessage(result.error);
    setMessage(null);
    setNewName('');
    onCreate(result.value);
  };

  const startRename = (category: TagCategory) => {
    const allowed = canRenameCategory(category);
    if (!allowed.ok) return setMessage(allowed.error);
    setMessage(null);
    setConfirmingId(null);
    setEditingId(category.id);
    setEditName(category.name);
  };

  const saveRename = (category: TagCategory) => {
    const result = validateCategoryName(editName, categories, category.id);
    if (!result.ok) return setMessage(result.error);
    setMessage(null);
    setEditingId(null);
    if (result.value !== category.name) onRename(category.id, result.value);
  };

  const askDelete = (category: TagCategory) => {
    const allowed = canDeleteCategory(category, tags);
    if (!allowed.ok) return setMessage(allowed.error);
    setMessage(null);
    setEditingId(null);
    setConfirmingId(category.id);
  };

  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          accessibilityLabel="New category name"
          placeholder="New category, for example Songs"
          placeholderTextColor={palette.muted}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={add}
          style={input}
        />
        <ActionButton label="Add" tone="primary" onPress={add} />
      </View>

      {message !== null ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, fontSize: 14 }}>
          {message}
        </Text>
      ) : null}

      <View accessibilityRole="list">
        {categories.map((category) => {
          const count = tags.filter((t) => t.categoryId === category.id).length;
          return (
            <View
              key={category.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: palette.border,
                gap: 6,
              }}
            >
              {editingId === category.id ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    accessibilityLabel={`Rename ${category.name}`}
                    value={editName}
                    onChangeText={setEditName}
                    onSubmitEditing={() => saveRename(category)}
                    autoFocus
                    style={input}
                  />
                  <ActionButton label="Save" tone="primary" onPress={() => saveRename(category)} />
                  <ActionButton label="Cancel" onPress={() => setEditingId(null)} />
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: palette.text, fontSize: 17 }}>{category.name}</Text>
                    <Text style={{ color: palette.muted, fontSize: 14 }}>
                      {count === 1 ? '1 tag' : `${count} tags`}
                    </Text>
                  </View>
                  {category.isDefault ? (
                    <Text style={{ color: palette.muted, fontSize: 13 }}>Built in</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <ActionButton
                        label={`Rename ${category.name}`}
                        onPress={() => startRename(category)}
                      />
                      <ActionButton
                        label={`Delete ${category.name}`}
                        tone="danger"
                        onPress={() => askDelete(category)}
                      />
                    </View>
                  )}
                </>
              )}

              {confirmingId === category.id ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: palette.text, fontSize: 15 }}>
                    Delete the category {category.name}?
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <ActionButton
                      label="Confirm delete"
                      tone="danger"
                      onPress={() => {
                        setConfirmingId(null);
                        onDelete(category.id);
                      }}
                    />
                    <ActionButton label="Keep category" onPress={() => setConfirmingId(null)} />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
