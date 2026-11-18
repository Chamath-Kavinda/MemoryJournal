import { filterTags, sortCategories, type TagCategory, type TagDraft } from '@memory-journal/core';
import { Plus, Tag as TagGlyph } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppSheet } from '@/components/AppSheet';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { categoryIcon } from '@/features/tags/categoryIcon';
import { TagFormFields, useTagForm } from '@/features/tags/TagForm';
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
 * field that matches the name or an alias, the matching tags, and a Create new tag button that
 * opens the tag form without leaving the Day screen.
 *
 * The search field is pinned under the header and Create new tag sits in the fixed footer, so
 * both stay visible above the keyboard and the system buttons while the chips and the list scroll
 * (v0.2.5, sections 7 and 8.3).
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
      <NewTagSheet
        categories={categories}
        tags={tags}
        defaultName={hasSelection ? selectedText.trim() : search.trim()}
        defaultCategoryId={categoryId}
        onBack={() => setCreating(false)}
        onCreate={(draft) => {
          const id = createTag(draft);
          // A refused write gives no id; the tag banner on the screen explains why.
          if (id !== '') onChoose(id, draft.name, hasSelection);
          else setCreating(false);
        }}
      />
    );
  }

  const searchField = (
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
  );

  const footer = canCreate ? (
    <Button
      variant="secondary"
      icon={Plus}
      label={hasSelection ? 'Create tag from selection' : 'Create new tag'}
      accessibilityLabel="Create new tag"
      onPress={() => setCreating(true)}
      style={{ flexGrow: 1 }}
    />
  ) : undefined;

  return (
    <AppSheet
      title="Add tag"
      onClose={onClose}
      testID="add-tag-sheet"
      pinned={searchField}
      {...(footer ? { footer } : {})}
    >
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
    </AppSheet>
  );
}

interface NewTagProps {
  categories: readonly TagCategory[];
  tags: Tagging['tags'];
  defaultName: string;
  defaultCategoryId: string | null;
  onBack: () => void;
  onCreate: (draft: TagDraft) => void;
}

/** The tag form inside the sheet: the fields scroll and Create tag and Cancel stay in the footer. */
function NewTagSheet({
  categories,
  tags,
  defaultName,
  defaultCategoryId,
  onBack,
  onCreate,
}: NewTagProps) {
  const form = useTagForm({
    categories,
    tags,
    defaultName,
    ...(defaultCategoryId !== null ? { defaultCategoryId } : {}),
    onSubmit: onCreate,
    onCancel: onBack,
  });

  const footer = (
    <>
      <Button
        variant="secondary"
        label="Cancel"
        onPress={() => void form.askCancel()}
        style={{ flexGrow: 1, flexBasis: 120 }}
      />
      <Button
        label="Create tag"
        onPress={() => void form.submit()}
        style={{ flexGrow: 1, flexBasis: 120 }}
      />
    </>
  );

  return (
    <AppSheet title="New tag" onClose={onBack} testID="add-tag-sheet" footer={footer}>
      <TagFormFields form={form} categories={categories} />
    </AppSheet>
  );
}
