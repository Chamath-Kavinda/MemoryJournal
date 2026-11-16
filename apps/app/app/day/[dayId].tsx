import {
  contentEquals,
  contentOf,
  emptyContent,
  pickRevision,
  previousRevision,
  revisionOptions,
  type RevisionSelection,
  type TagDraft,
} from '@memory-journal/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/features/auth/authStore';
import { DayScreenView } from '@/features/day/DayScreenView';
import { DayWriter } from '@/features/day/DayWriter';
import { DraftStatus } from '@/features/day/DraftStatus';
import { draftStorage } from '@/features/day/draftStorage';
import { draftOwner } from '@/features/day/draftStore';
import { HighlightedDay } from '@/features/day/HighlightedDay';
import { HighlightSwitch } from '@/features/day/HighlightSwitch';
import { RevisionToggle } from '@/features/day/RevisionToggle';
import { SaveBar } from '@/features/day/SaveBar';
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

const noop = () => {};

export default function DayRoute() {
  const { dayId: rawDayId } = useLocalSearchParams<{ dayId: string }>();
  const dayId = Array.isArray(rawDayId) ? (rawDayId[0] ?? '') : (rawDayId ?? '');
  const router = useRouter();
  const { palette } = useTheme();
  const uid = useAuthStore((s) => s.user?.uid);
  const repository = useJournalRepository();
  const owner = draftOwner(uid);
  const access = useDayAccess(dayId);
  const editable = access?.state === 'open';

  const draft = useDayDraft({ uid: owner, dayId, storage: draftStorage });
  const { history, failed: historyFailed } = useDayHistory(repository, dayId);

  // Tags for the `@` picker. The writer works without them while they load.
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

  const [selection, setSelection] = useState<RevisionSelection>('latest');
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    setSelection('latest');
    setHighlight(false);
  }, [dayId]);

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

  const options = revisionOptions(history?.revisions.length ?? 0);
  // The saved pass on screen (for Latest too) and the pass before it, for the highlights.
  const target = history === null ? null : pickRevision(history.revisions, selection);
  const previous =
    history === null || target === null ? null : previousRevision(history.revisions, target.n);
  const highlighting = highlight && target !== null && previous !== null;
  const viewed = selection === 'latest' ? null : target;
  const savedContent = latest ? contentOf(latest) : emptyContent();
  const canSave = editable && !contentEquals(draft.content, savedContent);

  const showWriter =
    (access?.state === 'open' || access?.state === 'locked' || access?.state === 'clockWrong') &&
    draft.ready &&
    history !== null &&
    seededDay === dayId;

  // Leaving with unsaved writing asks first. Confirming drops the text and its stored draft.
  const back = useLeaveGuard({
    dirty: showWriter && canSave,
    leave: () => (router.canGoBack() ? router.back() : router.replace('/home')),
    message: 'Your unsaved changes to this day will be lost.',
    onDiscard: () => {
      draft.setContent(savedContent);
      draft.discard(savedContent);
    },
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <DayScreenView dayId={dayId} access={access} onBack={back} />
        {historyFailed ? (
          <Text
            accessibilityRole="alert"
            style={{ padding: 16, fontSize: 14, color: palette.danger, textAlign: 'center' }}
          >
            The saved passes of this day could not be loaded. Check your connection and open the day
            again.
          </Text>
        ) : null}
        {tagError !== null ? <ErrorBanner message={tagError} onDismiss={clearTagError} /> : null}
        {showWriter ? (
          <>
            <RevisionToggle options={options} selected={selection} onSelect={setSelection} />
            {options.length > 0 ? (
              <HighlightSwitch
                value={highlight}
                onChange={setHighlight}
                disabled={previous === null}
                readOnlyNote={selection === 'latest' && editable}
              />
            ) : null}
            {highlighting && target !== null && previous !== null ? (
              <HighlightedDay
                current={contentOf(target)}
                previous={contentOf(previous)}
                previousN={previous.n}
                names={tagNames}
              />
            ) : viewed === null ? (
              <>
                <DraftStatus state={draft.saveState} />
                {editable ? (
                  <SaveBar
                    canSave={canSave}
                    hasSaved={latest !== null}
                    saving={daySave.saving}
                    failed={daySave.failed}
                    pendingSync={history?.hasPendingWrites ?? false}
                    onSave={() => void daySave.save()}
                  />
                ) : null}
                <DayWriter
                  content={draft.content}
                  onChange={draft.setContent}
                  editable={editable}
                  tagging={tagging}
                />
              </>
            ) : (
              <DayWriter
                content={contentOf(viewed)}
                onChange={noop}
                editable={false}
                tagging={tagging}
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
