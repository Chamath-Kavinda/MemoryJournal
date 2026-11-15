import {
  activeMention,
  displaySegments,
  displayToStoredOffset,
  fromDisplayText,
  mentionTargets,
  mentionToken,
  replaceDisplayRange,
  suggestTags,
  toDisplayText,
  type Tag,
  type TagCategory,
  type TagGroup,
} from '@memory-journal/core';
import { useMemo, useState } from 'react';
import { Pressable, View, type StyleProp, type TextStyle } from 'react-native';

import { Text, TextInput } from '@/theme/themed';

import { TagForm } from '@/features/tags/TagForm';
import { ActionButton, usePalette, type Palette } from '@/features/tags/ui';

import type { Tagging } from './tagging';

const NO_TAGS: readonly Tag[] = [];
const NO_CATEGORIES: readonly TagCategory[] = [];
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** How many tags the picker lists at most. */
const PICKER_LIMIT = 50;

interface Range {
  start: number;
  end: number;
}

/** What is open under the field besides the `@` suggestions. */
type Panel =
  { kind: 'pick'; at: number; search: string } | { kind: 'create'; range: Range; name: string };

interface Props {
  /** Accessibility label of the text field. */
  label: string;
  /** The stored text, with mentions as `{{tag:ID|Name}}` tokens. */
  value: string;
  onChangeValue: (stored: string) => void;
  editable: boolean;
  /** Leave out to write without tags. */
  tagging?: Tagging | undefined;
  autoFocus?: boolean;
  style: StyleProp<TextStyle>;
  /** Called as the cursor moves, with its position in the stored text. */
  onCursorChange?: (storedOffset: number) => void;
}

function TagGroups({
  groups,
  palette,
  onChoose,
}: {
  groups: readonly TagGroup[];
  palette: Palette;
  onChoose: (tag: Tag) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <View key={group.category.id}>
          <Text style={{ color: palette.muted, fontSize: 12, fontWeight: '600', paddingTop: 6 }}>
            {group.category.name}
          </Text>
          {group.tags.map((tag) => (
            <Pressable
              key={tag.id}
              accessibilityRole="button"
              accessibilityLabel={`Mention ${tag.name}`}
              onPress={() => onChoose(tag)}
              style={{ minHeight: 40, justifyContent: 'center' }}
            >
              <Text style={{ color: palette.text, fontSize: 16 }}>{tag.name}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </>
  );
}

/**
 * A text field for a day's notes that understands tag mentions. The stored text keeps
 * `{{tag:ID|Name}}` tokens; the field shows `@Name`. Typing `@` lists matching tags, the
 * toolbar opens the full picker, and selected text can be saved as a new tag.
 */
export function MentionInput({
  label,
  value,
  onChangeValue,
  editable,
  tagging,
  autoFocus,
  style,
  onCursorChange,
}: Props) {
  const palette = usePalette();
  const tags = tagging?.tags ?? NO_TAGS;
  const categories = tagging?.categories ?? NO_CATEGORIES;
  const createTag = tagging?.createTag;
  const canCreate = createTag !== undefined && categories.length > 0;

  const names = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.name])), [tags]);
  const targets = useMemo(() => mentionTargets(tags, value), [tags, value]);
  const display = useMemo(() => toDisplayText(value, names), [value, names]);

  const [selection, setSelection] = useState<Range>({ start: 0, end: 0 });
  // Moves the cursor after an insertion; cleared by the next selection event.
  const [forced, setForced] = useState<Range | null>(null);
  const [touched, setTouched] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);

  const typed =
    editable && tagging !== undefined && panel === null && selection.start === selection.end
      ? activeMention(display, selection.end, targets)
      : null;
  const typedGroups = typed ? suggestTags(tags, categories, typed.query) : [];
  const typedRange: Range | null = typed
    ? { start: typed.start, end: typed.start + 1 + typed.query.length }
    : null;

  const selectedText = display.slice(selection.start, selection.end).trim();

  /** Puts a mention in place of `range` (editor text) and moves the cursor behind it. */
  function insertMention(range: Range, id: string, name: string) {
    const before = range.start > 0 ? display.charAt(range.start - 1) : '';
    const after = display.charAt(range.end);
    // A mention must not touch a letter or digit on either side, or it stops being one.
    const lead = LETTER_OR_DIGIT.test(before) ? ' ' : '';
    const trail = /\s/.test(after) ? '' : ' ';
    onChangeValue(
      replaceDisplayRange(display, targets, range, `${lead}${mentionToken(id, name)}${trail}`),
    );
    const cursor = range.start + lead.length + 1 + name.length + trail.length;
    setForced({ start: cursor, end: cursor });
    setPanel(null);
  }

  function handleSelection(next: Range) {
    setSelection(next);
    setForced(null);
    onCursorChange?.(displayToStoredOffset(displaySegments(display, targets), next.start));
  }

  const pickGroups =
    panel?.kind === 'pick' ? suggestTags(tags, categories, panel.search, PICKER_LIMIT) : [];
  const panelStyle = {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  } as const;

  return (
    <View style={{ gap: 6 }}>
      <TextInput
        accessibilityLabel={label}
        multiline
        autoFocus={autoFocus}
        editable={editable}
        value={display}
        onChangeText={(text) => onChangeValue(fromDisplayText(text, targets))}
        onFocus={() => setTouched(true)}
        onSelectionChange={(event) => handleSelection(event.nativeEvent.selection)}
        selection={forced ?? undefined}
        style={style}
      />

      {editable && tagging !== undefined && (touched || panel !== null) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <ActionButton
            label="Insert tag"
            onPress={() => setPanel({ kind: 'pick', at: selection.end, search: '' })}
          />
          <ActionButton
            label="Save as tag"
            disabled={!canCreate || selectedText === ''}
            onPress={() =>
              setPanel({
                kind: 'create',
                range: { start: selection.start, end: selection.end },
                name: selectedText,
              })
            }
          />
        </View>
      ) : null}

      {typed !== null && typedRange !== null && (typedGroups.length > 0 || canCreate) ? (
        <View accessibilityLabel="Tag suggestions" style={panelStyle}>
          <TagGroups
            groups={typedGroups}
            palette={palette}
            onChoose={(tag) => insertMention(typedRange, tag.id, tag.name)}
          />
          {canCreate && typed.query.trim() !== '' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Create new tag ${typed.query}`}
              onPress={() => setPanel({ kind: 'create', range: typedRange, name: typed.query })}
              style={{ minHeight: 40, justifyContent: 'center' }}
            >
              <Text style={{ color: palette.accent, fontSize: 16 }}>
                Create new tag “{typed.query}”
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {panel?.kind === 'pick' ? (
        <View accessibilityLabel="Tag picker" style={panelStyle}>
          <TextInput
            accessibilityLabel="Search tags"
            autoFocus
            autoCorrect={false}
            placeholder="Search tags"
            placeholderTextColor={palette.muted}
            value={panel.search}
            onChangeText={(search) => setPanel({ ...panel, search })}
            onKeyPress={(event) => {
              if (event.nativeEvent.key === 'Escape') setPanel(null);
            }}
            style={{
              minHeight: 40,
              color: palette.text,
              fontSize: 16,
              borderBottomWidth: 1,
              borderColor: palette.border,
            }}
          />
          <TagGroups
            groups={pickGroups}
            palette={palette}
            onChoose={(tag) => insertMention({ start: panel.at, end: panel.at }, tag.id, tag.name)}
          />
          {pickGroups.length === 0 ? (
            <Text style={{ color: palette.muted, paddingVertical: 8 }}>No tags found.</Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {canCreate ? (
              <ActionButton
                label="Create new tag"
                onPress={() =>
                  setPanel({
                    kind: 'create',
                    range: { start: panel.at, end: panel.at },
                    name: panel.search.trim(),
                  })
                }
              />
            ) : null}
            <ActionButton label="Close" onPress={() => setPanel(null)} />
          </View>
        </View>
      ) : null}

      {panel?.kind === 'create' && createTag !== undefined ? (
        <View style={panelStyle}>
          <TagForm
            categories={categories}
            tags={tags}
            defaultName={panel.name}
            onCancel={() => setPanel(null)}
            onSubmit={(draft) => {
              const id = createTag(draft);
              if (id === '') setPanel(null);
              else insertMention(panel.range, id, draft.name);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
