import {
  LIBRARY_TYPES,
  libraryItemsOfType,
  libraryTypeLabel,
  type DayId,
  type LibraryItem,
  type LibraryItemType,
} from '@memory-journal/core';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ActionButton, Chip, usePalette } from '@/features/tags/ui';

import { LibraryItemForm } from './LibraryItemForm';
import type { LoadStatus } from './useLibrary';

interface Props {
  items: readonly LibraryItem[];
  status: LoadStatus;
  onOpen: (itemId: string) => void;
  onCreate: (draft: { type: LibraryItemType; title: string; date: DayId | null }) => void;
}

function wordsLabel(count: number): string {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
}

/** The Movies and Books tabs: a list of items and a form to add one. */
export function LibraryBrowser({ items, status, onOpen, onCreate }: Props) {
  const palette = usePalette();
  const [type, setType] = useState<LibraryItemType>('movie');
  const [adding, setAdding] = useState(false);
  const shown = libraryItemsOfType(items, type);
  const noun = libraryTypeLabel(type).toLowerCase();

  return (
    <View
      style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 12 }}
      accessibilityLabel="Library"
    >
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>
        {LIBRARY_TYPES.map((tab) => (
          <Chip
            key={tab}
            label={libraryTypeLabel(tab, true)}
            selected={tab === type}
            onPress={() => {
              setType(tab);
              setAdding(false);
            }}
          />
        ))}
      </View>

      {adding ? (
        <LibraryItemForm
          // A new key clears the form when the tab changes.
          key={type}
          type={type}
          submitLabel={`Add ${noun}`}
          onCancel={() => setAdding(false)}
          onSubmit={(value) => {
            onCreate({ type, ...value });
            setAdding(false);
          }}
        />
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <ActionButton label={`Add ${noun}`} tone="primary" onPress={() => setAdding(true)} />
        </View>
      )}

      {status === 'loading' ? <ActivityIndicator accessibilityLabel="Loading library" /> : null}
      {status === 'error' ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, fontSize: 14 }}>
          Could not load your library.
        </Text>
      ) : null}
      {status === 'ready' && shown.length === 0 ? (
        <Text style={{ color: palette.muted, fontSize: 15 }}>
          {`No ${libraryTypeLabel(type, true).toLowerCase()} yet. Add one to start its page.`}
        </Text>
      ) : null}

      {shown.map((item) => {
        const detail = [item.date, item.latestRevision > 0 ? wordsLabel(item.wordCount) : null]
          .filter((part): part is string => part !== null)
          .join(' · ');
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={detail === '' ? item.title : `${item.title}, ${detail}`}
            onPress={() => onOpen(item.id)}
            style={{
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
          >
            <Text style={{ color: palette.text, fontSize: 16 }}>{item.title}</Text>
            {detail !== '' ? (
              <Text style={{ color: palette.muted, fontSize: 13 }}>{detail}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
