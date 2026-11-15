import { filterTags, type Tag, type TagCategory } from '@memory-journal/core';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text, TextInput } from '@/theme/themed';

import { ActionButton, Chip, usePalette } from './ui';

interface Props {
  categories: readonly TagCategory[];
  tags: readonly Tag[];
  onOpenTag: (tagId: string) => void;
  onNewTag: () => void;
  onManageCategories: () => void;
}

/** The Tags list: search, filter by category, and a row per tag (section 5.4). */
export function TagBrowser({ categories, tags, onOpenTag, onNewTag, onManageCategories }: Props) {
  const palette = usePalette();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const visible = useMemo(() => filterTags(tags, { query, categoryId }), [tags, query, categoryId]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'No category';

  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <ActionButton label="New tag" tone="primary" onPress={onNewTag} />
        <ActionButton label="Manage categories" onPress={onManageCategories} />
      </View>

      <TextInput
        accessibilityLabel="Search tags"
        placeholder="Search by name or alias"
        placeholderTextColor={palette.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        style={{
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: palette.border,
          color: palette.text,
          fontSize: 16,
        }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="All" selected={categoryId === null} onPress={() => setCategoryId(null)} />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </View>
      </ScrollView>

      {tags.length === 0 ? (
        <Text style={{ color: palette.muted, fontSize: 15 }}>
          No tags yet. Save the people, places and numbers you want to remember, then pick them
          while you write.
        </Text>
      ) : visible.length === 0 ? (
        <Text style={{ color: palette.muted, fontSize: 15 }}>No tags match.</Text>
      ) : (
        <View accessibilityRole="list">
          {visible.map((tag) => (
            <Pressable
              key={tag.id}
              accessibilityRole="button"
              accessibilityLabel={`${tag.name}, ${categoryName(tag.categoryId)}`}
              onPress={() => onOpenTag(tag.id)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: palette.border,
                gap: 2,
              }}
            >
              <Text style={{ color: palette.text, fontSize: 17 }}>{tag.name}</Text>
              <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 14 }}>
                {[categoryName(tag.categoryId), tag.note].filter(Boolean).join(' · ')}
              </Text>
              {tag.aliases.length > 0 ? (
                <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 13 }}>
                  Also: {tag.aliases.join(', ')}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
