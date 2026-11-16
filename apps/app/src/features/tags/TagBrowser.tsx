import { filterTags, type Tag, type TagCategory } from '@memory-journal/core';
import { LayoutGrid, Plus, Settings2, Tag as TagGlyph } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { FadeUp } from '@/components/FadeUp';
import { Removable } from '@/components/Removable';
import { ResponsiveGrid } from '@/components/ResponsiveGrid';
import { SearchField } from '@/components/SearchField';
import { SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { useLayout } from '@/theme/useLayout';

import { categoryIcon } from './categoryIcon';
import { TagCard } from './TagCard';

interface Props {
  categories: readonly TagCategory[];
  tags: readonly Tag[];
  /** Mentions per tag id; empty while the counts load. */
  counts: ReadonlyMap<string, number>;
  onOpenTag: (tagId: string) => void;
  onNewTag: () => void;
  onManageCategories: () => void;
  /** Called after the person confirms the delete dialog of a card. */
  onDeleteTag: (tagId: string) => void;
}

/** The Tags list: search, filter by category, and a card per tag (sections 5.4 and 15.11). */
export function TagBrowser({
  categories,
  tags,
  counts,
  onOpenTag,
  onNewTag,
  onManageCategories,
  onDeleteTag,
}: Props) {
  const { palette } = useTheme();
  const layout = useLayout();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const visible = useMemo(() => filterTags(tags, { query, categoryId }), [tags, query, categoryId]);
  const categoryOf = (id: string) => categories.find((c) => c.id === id);
  // Changing the filter restarts the entrance stagger for the cards that appear.
  const filterKey = `${categoryId ?? 'all'}`;

  return (
    <View
      style={{
        width: '100%',
        maxWidth: layout.contentMaxWidth,
        alignSelf: 'center',
        padding: SPACING.lg,
        gap: SPACING.md,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
        <Button label="New tag" icon={Plus} onPress={onNewTag} testID="new-tag" />
        <Button
          label="Manage categories"
          icon={Settings2}
          variant="secondary"
          onPress={onManageCategories}
        />
      </View>

      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or alias"
        accessibilityLabel="Search tags"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <Chip
            label="All"
            icon={LayoutGrid}
            selected={categoryId === null}
            onPress={() => setCategoryId(null)}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              icon={categoryIcon(category)}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </View>
      </ScrollView>

      {tags.length === 0 ? (
        <EmptyState
          icon={TagGlyph}
          message="No tags yet. Save the people, places and numbers you want to remember, then pick them while you write."
          actionLabel="New tag"
          actionIcon={Plus}
          onAction={onNewTag}
          testID="tags-empty"
        />
      ) : visible.length === 0 ? (
        <Text style={{ color: palette.muted, fontSize: 15 }}>No tags match.</Text>
      ) : (
        <ResponsiveGrid columns={layout.columns}>
          {visible.map((tag, index) => (
            <Removable key={tag.id}>
              <FadeUp key={`${tag.id}-${filterKey}`} index={index}>
                <TagCard
                  tag={tag}
                  category={categoryOf(tag.categoryId)}
                  mentions={counts.get(tag.id) ?? (counts.size > 0 ? 0 : undefined)}
                  onOpen={() => onOpenTag(tag.id)}
                  onDelete={() => onDeleteTag(tag.id)}
                />
              </FadeUp>
            </Removable>
          ))}
        </ResponsiveGrid>
      )}
    </View>
  );
}
