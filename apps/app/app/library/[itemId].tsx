import {
  libraryContent,
  libraryTypeLabel,
  pickRevision,
  revisionOptions,
  toDayRevision,
  type RevisionSelection,
  type TagDraft,
} from '@memory-journal/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Text } from '@/theme/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/features/auth/authStore';
import { DraftStatus } from '@/features/day/DraftStatus';
import { draftStorage } from '@/features/day/draftStorage';
import { draftOwner } from '@/features/day/draftStore';
import { MentionInput } from '@/features/day/MentionInput';
import { RevisionToggle } from '@/features/day/RevisionToggle';
import { SaveBar } from '@/features/day/SaveBar';
import type { Tagging } from '@/features/day/tagging';
import { useDayDraft } from '@/features/day/useDayDraft';
import { LibraryItemForm } from '@/features/library/LibraryItemForm';
import { updateLibraryItemInfo } from '@/features/library/libraryService';
import { useLibraryHistory } from '@/features/library/useLibrary';
import {
  isLibraryDraftId,
  libraryDraftId,
  useLibrarySave,
} from '@/features/library/useLibrarySave';
import { useTagErrorStore, watchWrite } from '@/features/tags/tagErrors';
import { createTag } from '@/features/tags/tagService';
import { ActionButton, ErrorBanner, ScreenHeader, usePalette } from '@/features/tags/ui';
import { useTagData } from '@/features/tags/useTagData';
import { useJournalRepository } from '@/lib/journal';
import { useLeaveGuard } from '@/navigation/useLeaveGuard';

const noop = () => {};

export default function LibraryItemRoute() {
  const { itemId: rawItemId } = useLocalSearchParams<{ itemId: string }>();
  const itemId = Array.isArray(rawItemId) ? (rawItemId[0] ?? '') : (rawItemId ?? '');
  const router = useRouter();
  const palette = usePalette();
  const uid = useAuthStore((s) => s.user?.uid);
  const repository = useJournalRepository();
  const owner = draftOwner(uid);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/library'));

  const draft = useDayDraft({
    uid: owner,
    dayId: libraryDraftId(itemId),
    storage: draftStorage,
    isValidId: isLibraryDraftId,
  });
  const { history, failed: historyFailed } = useLibraryHistory(repository, itemId);
  const item = history?.item ?? null;

  // Tags for the `@` picker. The writer works without them while they load.
  const tagData = useTagData(repository);
  const tagError = useTagErrorStore((s) => s.message);
  const clearTagError = useTagErrorStore((s) => s.clear);
  const createTagNow = useCallback(
    (tagDraft: TagDraft) => {
      if (repository === null) return '';
      const { id, saved } = createTag(repository, tagDraft);
      watchWrite(saved, 'The new tag could not be saved.');
      return id;
    },
    [repository],
  );
  const tagging = useMemo<Tagging | undefined>(
    () =>
      tagData.status === 'ready' && repository !== null
        ? { tags: tagData.tags, categories: tagData.categories, createTag: createTagNow }
        : undefined,
    [tagData.status, tagData.tags, tagData.categories, repository, createTagNow],
  );

  const days = useMemo(() => history?.revisions.map(toDayRevision) ?? [], [history]);
  const latest = pickRevision(days, 'latest');
  const latestText = latest?.freeNotes ?? '';

  // The draft starts from the latest saved pass when the device has no draft of its own.
  const [seededItem, setSeededItem] = useState<string | null>(null);
  const seedDraft = draft.seed;
  useEffect(() => {
    if (!draft.ready || history === null || item === null || seededItem === itemId) return;
    if (latest !== null) seedDraft(libraryContent(latestText));
    setSeededItem(itemId);
  }, [draft.ready, history, item, latest, latestText, seededItem, itemId, seedDraft]);

  const [selection, setSelection] = useState<RevisionSelection>('latest');
  const [editingInfo, setEditingInfo] = useState(false);
  useEffect(() => {
    setSelection('latest');
    setEditingInfo(false);
  }, [itemId]);

  const text = draft.content.freeNotes;
  const save = useLibrarySave({
    repository,
    owner,
    itemId,
    history,
    text,
    discardDraft: draft.discard,
    storage: draftStorage,
  });

  const options = revisionOptions(days.length);
  const viewed = selection === 'latest' ? null : pickRevision(days, selection);
  const canSave = text !== latestText && (latest !== null || text.trim() !== '');
  const showPage = draft.ready && item !== null && seededItem === itemId;
  const detail = item
    ? [libraryTypeLabel(item.type), item.date].filter((part) => part !== null).join(' · ')
    : '';

  // Leaving with unsaved writing asks first. Confirming drops the text and its stored draft.
  const back = useLeaveGuard({
    dirty: showPage && canSave,
    leave,
    message: `Your unsaved changes to ${item?.title ?? 'this page'} will be lost.`,
    onDiscard: () => {
      draft.setContent(libraryContent(latestText));
      draft.discard(libraryContent(latestText));
    },
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <ScreenHeader title={item?.title ?? 'Library'} onBack={back} />
        {historyFailed ? (
          <Text
            accessibilityRole="alert"
            style={{ padding: 16, fontSize: 14, color: palette.danger, textAlign: 'center' }}
          >
            This page could not be loaded. Check your connection and open it again.
          </Text>
        ) : null}
        {history !== null && item === null ? (
          <Text style={{ padding: 16, textAlign: 'center', color: palette.text }}>
            This item no longer exists.
          </Text>
        ) : null}
        {repository === null ||
        (!historyFailed && !showPage && item === null && history === null) ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : null}
        {tagError !== null ? <ErrorBanner message={tagError} onDismiss={clearTagError} /> : null}

        {showPage && item !== null ? (
          <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 12 }}>
            {editingInfo ? (
              <LibraryItemForm
                type={item.type}
                initial={{ title: item.title, date: item.date }}
                submitLabel="Save details"
                onCancel={() => setEditingInfo(false)}
                onSubmit={(info) => {
                  if (repository !== null) {
                    watchWrite(
                      updateLibraryItemInfo(repository, itemId, info),
                      'The details could not be saved.',
                    );
                  }
                  setEditingInfo(false);
                }}
              />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={{ color: palette.muted, fontSize: 14 }}>{detail}</Text>
                <ActionButton label="Edit details" onPress={() => setEditingInfo(true)} />
              </View>
            )}

            <RevisionToggle options={options} selected={selection} onSelect={setSelection} />

            {viewed === null ? (
              <>
                <DraftStatus state={draft.saveState} />
                <SaveBar
                  canSave={canSave}
                  hasSaved={latest !== null}
                  saving={save.saving}
                  failed={save.failed}
                  pendingSync={history?.hasPendingWrites ?? false}
                  onSave={() => void save.save()}
                />
                <MentionInput
                  label={`Page of ${item.title}`}
                  value={text}
                  onChangeValue={(next) => draft.setContent(libraryContent(next))}
                  editable
                  tagging={tagging}
                  style={pageStyle(palette.text, palette.border)}
                />
              </>
            ) : (
              <MentionInput
                label={`Page of ${item.title}, ${viewed.n} pass`}
                value={viewed.freeNotes}
                onChangeValue={noop}
                editable={false}
                tagging={tagging}
                style={pageStyle(palette.text, palette.border)}
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function pageStyle(color: string, borderColor: string) {
  return {
    minHeight: 260,
    color,
    fontSize: 16,
    lineHeight: 23,
    borderWidth: 1,
    borderColor,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
  } as const;
}
