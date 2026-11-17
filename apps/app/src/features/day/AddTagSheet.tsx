import { filterTags, sortCategories } from '@memory-journal/core';
import { Plus, Tag as TagGlyph } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Sheet } from '@/components/Sheet';
import { categoryIcon } from '@/features/tags/categoryIcon';
import { TagForm } from '@/features/tags/TagForm';
import { BORDER_WIDTH, MIN_TARGET, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, TextInput } from '@/theme/themed';

import type { Tagging } from './tagging';

/** How many tags the sheet lists at most, so a long list stays quick to draw. */
const LIST_LIMIT = 50;

interface Props {
  tagging: Tagging;
  /** Text selected in the page. Creating a tag from this sheet names it after the selection. */
  selectedText: string;
  /** Inserts the mention. `replaceSelection` is true for a tag made from selected text. */
  onChoose: (id: string, name: string, replaceSelection: boolean) => void;
  onClose: () => void;
}

/**
 * The Add tag sheet (section 18.4): chips for All and every category with its icon, a search
 * field that matches the name or an alias, the matching tags, and a Create new tag row that opens
 * the tag form without leaving the Day screen.
 */
export function AddTagSheet({ tagging, selectedText, onChoose, onClose }: Props) {
  const { palette } = useTheme();
  const { tags, categories, createTag } = tagging;
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const ordered = useMemo(() => sortCategories(categories), [categories]);
  const listed = useMemo(
    () => filterTags(tags, { query: search, categoryId }).slice(0, LIST_LIMIT),
    [tags, search, categoryId],
  );
  const canCreate = createTag !== undefined && categories.length > 0;
  const hasSelection = selectedText.trim() !== '';

  if (creating && createTag !== undefined) {
    return (
      <Sheet title="New tag" onClose={() => setCreating(false)} testID="add-tag-sheet">
        <TagForm
          categories={categories}
          tags={tags}
          defaultName={hasSelection ? selectedText.trim() : search.trim()}
          {...(categoryId !== null ? { defaultCategoryId: categoryId } : {})}
          onCancel={() => setCreating(false)}
          onSubmit={(draft) => {
            const id = createTag(draft);
            // A refused write gives no id; the tag banner on the screen explains why.
            if (id !== '') onChoose(id, draft.name, hasSelection);
            else setCreating(false);
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet title="Add tag" onClose={onClose} testID="add-tag-sheet">
      <View
        accessibilityLabel="Tag categories"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}
      >
        <Chip
          testID="tag-category-all"
          label="All"
          icon={TagGlyph}
          selected={categoryId === null}
          onPress={() => setCategoryId(null)}
        />
        {ordered.map((category) => (
          <Chip
            key={category.id}
            testID={`tag-category-${category.id}`}
            label={category.name}
            icon={categoryIcon(category)}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </View>

      <TextInput
        accessibilityLabel="Search tags"
        autoCorrect={false}
        placeholder="Search tags"
        value={search}
        onChangeText={setSearch}
        style={{
          minHeight: MIN_TARGET,
          paddingHorizontal: SPACING.md,
          borderRadius: RADIUS.input,
          borderWidth: BORDER_WIDTH,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          color: palette.text,
          fontSize: 16,
        }}
      />

      <View accessibilityLabel="Tags" style={{ gap: SPACING.xs }}>
        {listed.map((tag) => (
          <PressableScale
            key={tag.id}
            accessibilityRole="button"
            accessibilityLabel={`Mention ${tag.name}`}
            onPress={() => onChoose(tag.id, tag.name, false)}
            innerStyle={{
              minHeight: MIN_TARGET,
              flexDirection: 'row',
              alignItems: 'center',
              gap: SPACING.md,
              paddingHorizontal: SPACING.sm,
            }}
          >
            <Icon
              icon={categoryIcon(categories.find((category) => category.id === tag.categoryId))}
              size="inline"
              color={palette.accent}
            />
            <Text style={{ flex: 1, fontSize: 16 }}>{tag.name}</Text>
          </PressableScale>
        ))}
        {listed.length === 0 ? (
          <Text style={{ color: palette.muted, paddingVertical: SPACING.sm }}>No tags found.</Text>
        ) : null}
      </View>

      {canCreate ? (
        <Button
          variant="secondary"
          icon={Plus}
          label={hasSelection ? 'Create tag from selection' : 'Create new tag'}
          accessibilityLabel="Create new tag"
          onPress={() => setCreating(true)}
        />
      ) : null}
    </Sheet>
  );
}
