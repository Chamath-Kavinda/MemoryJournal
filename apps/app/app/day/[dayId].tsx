import {
  contentEquals,
  contentOf,
  emptyContent,
  isContentEmpty,
  pickRevision,
  previousRevision,
  revisionOptions,
  type RevisionSelection,
  type TagDraft,
} from '@memory-journal/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Snackbar } from '@/components/Snackbar';
import { useConfirm } from '@/components/useConfirm';
import { useAuthStore } from '@/features/auth/authStore';
import { DayPageView } from '@/features/day/DayPageView';
import { DayScreenView } from '@/features/day/DayScreenView';
import { DayWriter } from '@/features/day/DayWriter';
import { DraftStatus } from '@/features/day/DraftStatus';
import { draftStorage } from '@/features/day/draftStorage';
import { draftOwner } from '@/features/day/draftStore';
import { EmptyDay } from '@/features/day/EmptyDay';
import { showFirstSaveNoticeOnce } from '@/features/day/firstSaveNotice';
import { HighlightSwitch } from '@/features/day/HighlightSwitch';
import { RevisionToggle } from '@/features/day/RevisionToggle';
import { SAVE_BAR_CLEARANCE, SaveBar } from '@/features/day/SaveBar';
import type { Tagging } from '@/features/day/tagging';
import { useDayAccess } from '@/features/day/useDayAccess';
import { useDayDraft } from '@/features/day/useDayDraft';
import { useDayHistory } from '@/features/day/useDayHistory';
import { useDaySave } from '@/features/day/useDaySave';
import { useTagErrorStore, watchWrite } from '@/features/tags/tagErrors';
import { createTag } from '@/features/tags/tagService';
import { ErrorBanner } from '@/features/tags/ui';
import { useTagData } from '@/features/tags/useTagData';
import { useJournalRepository } from '@/lib/journal';
import { useLeaveGuard } from '@/navigation/useLeaveGuard';
import { SPACING } from '@/theme/layout';

export default function DayRoute() {
  const { dayId: rawDayId, mode: rawMode } = useLocalSearchParams<{
    dayId: string;
    mode?: string | string[];
  }>();
  const dayId = Array.isArray(rawDayId) ? (rawDayId[0] ?? '') : (rawDayId ?? '');
  const wantsEdit = (Array.isArray(rawMode) ? rawMode[0] : rawMode) === 'edit';
  const router = useRouter();
  const { palette } = useTheme();
  const uid = useAuthStore((s) => s.user?.uid);
  const repository = useJournalRepository();
  const owner = draftOwner(uid);
  const access = useDayAccess(dayId);
  const editable = access?.state === 'open';

  const draft = useDayDraft({ uid: owner, dayId, storage: draftStorage });
  const { history, failed: historyFailed } = useDayHistory(repository, dayId);

  // Tags for the `@` picker and the tag chips. The screen works without them while they load.
  const tagData = useTagData(repository);
  const tagError = useTagErrorStore((s) => s.message);
  const clearTagError = useTagErrorStore((s) => s.clear);
  const createTagNow = useCallback(
    (tagDraft: TagDraft) => {
      if (repository === null) return '';
      // The mention is inserted at once; a refused write is reported in the banner below.
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
  const tagNames = useMemo(
    () => new Map(tagData.tags.map((tag) => [tag.id, tag.name] as const)),
    [tagData.tags],
  );

  // The draft starts from the latest saved pass when the device has no draft of its own.
  const [seededDay, setSeededDay] = useState<string | null>(null);
  const latest = history ? pickRevision(history.revisions, 'latest') : null;
  const seedDraft = draft.seed;
  useEffect(() => {
    if (!draft.ready || history === null || seededDay === dayId) return;
    if (latest !== null) seedDraft(contentOf(latest));
    setSeededDay(dayId);
  }, [draft.ready, history, latest, seededDay, dayId, seedDraft]);

  // The page is on screen once the day is known, its draft is ready and its passes are loaded.
  const ready =
    (access?.state === 'open' || access?.state === 'locked' || access?.state === 'clockWrong') &&
    draft.ready &&
    history !== null &&
    seededDay === dayId;

  // A day opens in View mode. The pencil switches the same screen to editing (section 18.2).
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<RevisionSelection>('latest');
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    setSelection('latest');
    setHighlight(false);
    setEditing(false);
  }, [dayId]);

  // Home's Write today opens the day already in edit mode, once the day is writable.
  const [pendingEdit, setPendingEdit] = useState(wantsEdit);
  useEffect(() => {
    if (!pendingEdit || !ready) return;
    if (editable) setEditing(true);
    setPendingEdit(false);
  }, [pendingEdit, ready, editable]);

  const daySave = useDaySave({
    repository,
    owner,
    dayId,
    history,
    content: draft.content,
    discardDraft: draft.discard,
    editable,
    storage: draftStorage,
  });

  // A short confirmation after a save. The id changes with every save so the timer restarts.
  const [snack, setSnack] = useState<{ message: string | null; id: number }>({
    message: null,
    id: 0,
  });
  const dismissSnack = useCallback(() => setSnack((s) => ({ ...s, message: null })), []);

  // A guest is told once, after their first revision is really saved, where the journal lives.
  // A finished save returns to View mode on the latest pass.
  const confirm = useConfirm();
  const saveAndNotify = async () => {
    const saved = await daySave.save();
    if (saved) {
      setSnack((s) => ({ message: 'Saved', id: s.id + 1 }));
      setEditing(false);
    }
    if (saved && uid === undefined) await showFirstSaveNoticeOnce(draftStorage, confirm);
  };

  const options = revisionOptions(history?.revisions.length ?? 0);
  // The saved pass on screen (for Latest too) and the pass before it, for the highlights.
  const target = history === null ? null : pickRevision(history.revisions, selection);
  const previous =
    history === null || target === null ? null : previousRevision(history.revisions, target.n);
  const highlighting = highlight && target !== null && previous !== null;
  const savedContent = latest ? contentOf(latest) : emptyContent();
  const canSave = editable && !contentEquals(draft.content, savedContent);

  const showEditor = ready && editing;
  // The Save bar sticks to the bottom while the draft is being edited.
  const showSaveBar = showEditor && editable;
  // The pencil belongs to the Latest pass in View mode. Older passes are always read-only.
  const showPencil = ready && !editing && selection === 'latest';
  const startEdit = () => {
    if (editable && selection === 'latest') setEditing(true);
  };

  // Leaving with unsaved writing asks first. Confirming drops the text and its stored draft.
  const back = useLeaveGuard({
    dirty: showEditor && canSave,
    leave: () => (router.canGoBack() ? router.back() : router.replace('/home')),
    message: 'Your unsaved changes to this day will be lost.',
    onDiscard: () => {
      draft.setContent(savedContent);
      draft.discard(savedContent);
    },
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingBottom: showSaveBar ? SAVE_BAR_CLEARANCE : SPACING.xl }}
        >
          <DayScreenView
            dayId={dayId}
            access={access}
            onBack={back}
            onEdit={showPencil ? startEdit : undefined}
            editDisabled={!editable}
          />
          {historyFailed ? (
            <Text
              accessibilityRole="alert"
              style={{ padding: 16, fontSize: 14, color: palette.danger, textAlign: 'center' }}
            >
              The saved passes of this day could not be loaded. Check your connection and open the
              day again.
            </Text>
          ) : null}
          {tagError !== null ? <ErrorBanner message={tagError} onDismiss={clearTagError} /> : null}
          {ready && editing ? (
            <>
              <DraftStatus state={draft.saveState} />
              <DayWriter
                content={draft.content}
                onChange={draft.setContent}
                editable={editable}
                tagging={tagging}
              />
            </>
          ) : null}
          {ready && !editing ? (
            <>
              <RevisionToggle options={options} selected={selection} onSelect={setSelection} />
              {options.length > 0 ? (
                <HighlightSwitch
                  value={highlight}
                  onChange={setHighlight}
                  disabled={previous === null}
                  readOnlyNote={false}
                />
              ) : null}
              {target === null || isContentEmpty(contentOf(target)) ? (
                <EmptyDay onWrite={startEdit} disabled={!editable} />
              ) : (
                <DayPageView
                  content={contentOf(target)}
                  previous={highlighting && previous !== null ? contentOf(previous) : null}
                  previousN={previous?.n}
                  names={tagNames}
                  onOpenTag={(tagId) => router.push(`/tags/${tagId}`)}
                />
              )}
            </>
          ) : null}
        </ScrollView>
        {showSaveBar ? (
          <SaveBar
            canSave={canSave}
            saving={daySave.saving}
            failed={daySave.failed}
            pendingSync={history?.hasPendingWrites ?? false}
            onSave={() => void saveAndNotify()}
          />
        ) : null}
        <Snackbar message={snack.message} id={snack.id} onDismiss={dismissSnack} />
      </View>
    </SafeAreaView>
  );
}
