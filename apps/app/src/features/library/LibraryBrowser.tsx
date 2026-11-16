import {
  LIBRARY_TYPES,
  libraryItemsOfType,
  libraryTypeLabel,
  type DayId,
  type LibraryItem,
  type LibraryItemType,
} from '@memory-journal/core';
import { BookOpen, Calendar, Film, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorCard } from '@/components/ErrorCard';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { PressableCard } from '@/components/PressableCard';
import { Removable } from '@/components/Removable';
import { SegmentedControl, type Segment } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { SPACING } from '@/theme/layout';
import { CONTENT_MAX_WIDTH } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { LibraryItemForm } from './LibraryItemForm';
import type { LoadStatus } from './useLibrary';

interface Props {
  items: readonly LibraryItem[];
  status: LoadStatus;
  onOpen: (itemId: string) => void;
  onCreate: (draft: { type: LibraryItemType; title: string; date: DayId | null }) => void;
}

const TYPE_ICON = { movie: Film, book: BookOpen } as const;

const SEGMENTS: readonly Segment<LibraryItemType>[] = LIBRARY_TYPES.map((type) => ({
  value: type,
  label: libraryTypeLabel(type, true),
  icon: TYPE_ICON[type],
}));

function wordsLabel(count: number): string {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
}

/** The Movies and Books switch: a list of item cards and a form to add one. */
export function LibraryBrowser({ items, status, onOpen, onCreate }: Props) {
  const { palette } = useTheme();
  const [type, setType] = useState<LibraryItemType>('movie');
  const [adding, setAdding] = useState(false);
  const shown = libraryItemsOfType(items, type);
  const noun = libraryTypeLabel(type).toLowerCase();

  return (
    <View
      style={{
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        alignSelf: 'center',
        padding: SPACING.lg,
        gap: SPACING.md,
      }}
      accessibilityLabel="Library"
    >
      <SegmentedControl
        testID="library-switch"
        accessibilityLabel="Library type"
        segments={SEGMENTS}
        value={type}
        onChange={(next) => {
          setType(next);
          setAdding(false);
        }}
      />

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
          <Button label={`Add ${noun}`} icon={Plus} onPress={() => setAdding(true)} />
        </View>
      )}

      {status === 'loading' ? (
        <View
          testID="library-loading"
          accessibilityLabel="Loading library"
          style={{ gap: SPACING.sm }}
        >
          <Skeleton height={64} radius={16} />
          <Skeleton height={64} radius={16} />
          <Skeleton height={64} radius={16} />
        </View>
      ) : null}
      {status === 'error' ? <ErrorCard message="Could not load your library." /> : null}
      {status === 'ready' && shown.length === 0 ? (
        <EmptyState
          icon={TYPE_ICON[type]}
          message={`No ${libraryTypeLabel(type, true).toLowerCase()} yet. Add one to start its page.`}
          testID="library-empty"
        />
      ) : null}

      <View style={{ gap: SPACING.sm }}>
        {shown.map((item, index) => {
          const words = item.latestRevision > 0 ? wordsLabel(item.wordCount) : null;
          const detail = [item.date, words]
            .filter((part): part is string => part !== null)
            .join(' · ');
          return (
            <Removable key={item.id}>
              <FadeUp key={`${item.id}-${type}`} index={index}>
                <PressableCard
                  testID={`library-item-${item.id}`}
                  accessibilityLabel={detail === '' ? item.title : `${item.title}, ${detail}`}
                  onPress={() => onOpen(item.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                    <Icon icon={TYPE_ICON[item.type]} size="control" color={palette.neonViolet} />
                    <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
                      <Text style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>
                        {item.title}
                      </Text>
                      {item.date !== null || words !== null ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: SPACING.sm,
                          }}
                        >
                          {item.date !== null ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon icon={Calendar} size={14} color={palette.muted} />
                              <Text style={{ color: palette.muted, fontSize: 13 }}>
                                {item.date}
                              </Text>
                            </View>
                          ) : null}
                          {words !== null ? (
                            <Text style={{ color: palette.muted, fontSize: 13 }}>{words}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </PressableCard>
              </FadeUp>
            </Removable>
          );
        })}
      </View>
    </View>
  );
}
