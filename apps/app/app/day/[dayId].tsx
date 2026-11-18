import {
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
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Snackbar } from '@/components/Snackbar';
import { useConfirm } from '@/components/useConfirm';
import { useAuthStore } from '@/features/auth/authStore';
import {
  DayPageEditor,
  DayPageSheets,
  DayPageToolbar,
  useDayPageTools,
} from '@/features/day/DayPageEditor';
import { DayPageView } from '@/features/day/DayPageView';
import { DayScreenView } from '@/features/day/DayScreenView';
import { DraftStatus } from '@/features/day/DraftStatus';
import { draftStorage } from '@/features/day/draftStorage';
import { draftOwner } from '@/features/day/draftStore';
import { EmptyDay } from '@/features/day/EmptyDay';
import { showFirstSaveNoticeOnce } from '@/features/day/firstSaveNotice';
import { HighlightSwitch } from '@/features/day/HighlightSwitch';
import { contentToSave, draftAfterTyping, draftText, pageChanged } from '@/features/day/pageDraft';
import { RevisionToggle } from '@/features/day/RevisionToggle';
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

  // The latest saved pass, which the writing is compared with (section 18.5).
  const savedContent = latest ? contentOf(latest) : emptyContent();
  const canSave = editable && pageChanged(draft.content, savedContent);

  // A day opens in View mode. The pencil switches the same screen to editing (section 18.2).
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<RevisionSelection>('latest');
  const [highlight, setHighlight] = useState(false);
  const [restoreChecked, setRestoreChecked] = useState(false);
  useEffect(() => {
    setSelection('latest');
    setHighlight(false);
    setEditing(false);
    setRestoreChecked(false);
  }, [dayId]);

  // Home's Write today opens the day already in edit mode, once the day is writable.
  const [pendingEdit, setPendingEdit] = useState(wantsEdit);
  useEffect(() => {
    if (!pendingEdit || !ready) return;
    if (editable) setEditing(true);
    setPendingEdit(false);
  }, [pendingEdit, ready, editable]);

  // A draft restored from the device (the app closed before Save) opens straight in edit mode.
  useEffect(() => {
    if (!ready || restoreChecked) return;
    setRestoreChecked(true);
    if (editable && pageChanged(draft.content, savedContent)) setEditing(true);
  }, [ready, restoreChecked, editable, draft.content, savedContent]);

  // The Clock and Tag buttons and their sheets (sections 18.3 and 18.4).
  const tools = useDayPageTools();
  const closeSheet = tools.close;

  const daySave = useDaySave({
    repository,
    owner,
    dayId,
    history,
    // The page as it would be stored. Unchanged writing gives back the saved pass itself, so a
    // day written before v0.2.4 is not rewritten without an edit (section 18.7).
    content: contentToSave(draft.content, savedContent),
    discardDraft: () => draft.discard(draft.content),
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
  // A finished save returns to View mode on the latest pass. With nothing changed, Save just
  // returns to View mode.
  const confirm = useConfirm();
  const saveAndNotify = async () => {
    if (!canSave) {
      closeSheet();
      setEditing(false);
      return;
    }
    const saved = await daySave.save();
    if (saved) {
      setSnack((s) => ({ message: 'All changes saved', id: s.id + 1 }));
      closeSheet();
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

  const showEditor = ready && editing && editable;
  // The pencil belongs to the Latest pass in View mode. Older passes are always read-only.
  const showPencil = ready && !editing && selection === 'latest';
  const startEdit = () => {
    if (editable && selection === 'latest') setEditing(true);
  };

  // Cancel (X) and Back with unsaved changes ask first. Confirming drops the text and its stored
  // draft and returns to View mode. Without changes, Cancel returns at once. In View mode Back
  // leaves the screen.
  const back = useLeaveGuard({
    dirty: showEditor && canSave,
    leave: () => {
      if (editing) {
        closeSheet();
        setEditing(false);
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace('/home');
    },
    message: 'Your unsaved changes to this day will be lost.',
    keepLabel: 'Keep editing',
    onDiscard: () => {
      draft.setContent(savedContent);
      draft.discard(savedContent);
    },
  });

  const pendingSync = history?.hasPendingWrites ?? false;
  let saveNote = '';
  if (daySave.failed) saveNote = 'Could not save. Your text is still on this device.';
  else if (pendingSync) saveNote = 'Saved on this device. It will sync when you are online.';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          // In edit mode the Clock and Tag row is the second child, right under the date, and
          // stays at the top of the window while the page scrolls (v0.2.5, section 8.1).
          stickyHeaderIndices={showEditor ? [1] : undefined}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.xl }}
        >
          <DayScreenView
            dayId={dayId}
            access={access}
            onBack={back}
            onEdit={showPencil ? startEdit : undefined}
            editDisabled={!editable}
            editing={showEditor}
            onCancel={back}
            onSave={() => void saveAndNotify()}
            saving={daySave.saving && !pendingSync}
            cancelShortcut={tools.sheet === null}
          />
          {showEditor ? <DayPageToolbar tools={tools} canTag={tagging !== undefined} /> : null}
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
          {showEditor ? (
            <>
              <DraftStatus state={draft.saveState} />
              {saveNote !== '' ? (
                <Text
                  variant="caption"
                  accessibilityRole={daySave.failed ? 'alert' : undefined}
                  accessibilityLiveRegion="polite"
                  style={{
                    paddingHorizontal: SPACING.lg,
                    paddingBottom: SPACING.sm,
                    textAlign: 'center',
                    color: daySave.failed ? palette.danger : palette.muted,
                  }}
                >
                  {saveNote}
                </Text>
              ) : null}
              <DayPageEditor
                text={draftText(draft.content)}
                onChange={(text) => draft.setContent(draftAfterTyping(text))}
                editable={editable}
                tagging={tagging}
                tools={tools}
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
        {showEditor ? <DayPageSheets tools={tools} tagging={tagging} /> : null}
        <Snackbar message={snack.message} id={snack.id} onDismiss={dismissSnack} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
