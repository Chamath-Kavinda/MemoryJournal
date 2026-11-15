import { libraryTypeLabel, type MentionedLibraryItem } from '@memory-journal/core';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { LoadStatus } from '@/features/library/useLibrary';

import { usePalette } from './ui';

function wordsLabel(count: number): string {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
}

interface Props {
  items: readonly MentionedLibraryItem[];
  status: LoadStatus;
  onOpenItem: (itemId: string) => void;
}

/** The movies and books that mention a tag, below the days. Dated items come first. */
export function LibraryMentions({ items, status, onOpenItem }: Props) {
  const palette = usePalette();

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 8,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}
      >
        Mentioned in movies and books
      </Text>
      {status === 'loading' ? (
        <ActivityIndicator accessibilityLabel="Loading library mentions" />
      ) : null}
      {status === 'error' ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, fontSize: 14 }}>
          Could not load the movies and books that mention this tag.
        </Text>
      ) : null}
      {status === 'ready' && items.length === 0 ? (
        <Text style={{ color: palette.muted, fontSize: 15 }}>
          No movie or book mentions this tag yet.
        </Text>
      ) : null}
      {items.map((item) => {
        const detail = [libraryTypeLabel(item.type), item.date, wordsLabel(item.wordCount)]
          .filter((part): part is string => part !== null)
          .join(' · ');
        return (
          <Pressable
            key={item.itemId}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${detail}`}
            onPress={() => onOpenItem(item.itemId)}
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
            <Text style={{ color: palette.muted, fontSize: 13 }}>{detail}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
