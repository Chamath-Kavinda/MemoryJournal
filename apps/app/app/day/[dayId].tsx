import {
  contentEquals,
  contentOf,
  emptyContent,
  pickRevision,
  previousRevision,
  revisionOptions,
  type RevisionSelection,
} from '@memory-journal/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/features/auth/authStore';
import { DayScreenView } from '@/features/day/DayScreenView';
import { DayWriter } from '@/features/day/DayWriter';
import { DraftStatus } from '@/features/day/DraftStatus';
import { draftStorage } from '@/features/day/draftStorage';
import { HighlightedDay } from '@/features/day/HighlightedDay';
import { HighlightSwitch } from '@/features/day/HighlightSwitch';
import { RevisionToggle } from '@/features/day/RevisionToggle';
import { SaveBar } from '@/features/day/SaveBar';
import { useDayAccess } from '@/features/day/useDayAccess';
import { useDayDraft } from '@/features/day/useDayDraft';
import { useDayHistory } from '@/features/day/useDayHistory';
import { useDaySave } from '@/features/day/useDaySave';

const noop = () => {};

export default function DayRoute() {
  const { dayId: rawDayId } = useLocalSearchParams<{ dayId: string }>();
  const dayId = Array.isArray(rawDayId) ? (rawDayId[0] ?? '') : (rawDayId ?? '');
  const router = useRouter();
  const uid = useAuthStore((s) => s.user?.uid);
  const access = useDayAccess(dayId);
  const editable = access?.state === 'open';

  const draft = useDayDraft({ uid, dayId, storage: draftStorage });
  const { history, failed: historyFailed } = useDayHistory(uid, dayId);

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
    uid,
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
    (access?.state === 'open' || access?.state === 'locked') &&
    draft.ready &&
    history !== null &&
    seededDay === dayId;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <DayScreenView
          dayId={dayId}
          access={access}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        {historyFailed ? (
          <Text
            accessibilityRole="alert"
            style={{ padding: 16, fontSize: 14, color: '#d70015', textAlign: 'center' }}
          >
            The saved passes of this day could not be loaded. Check your connection and open the day
            again.
          </Text>
        ) : null}
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
                />
              </>
            ) : (
              <DayWriter content={contentOf(viewed)} onChange={noop} editable={false} />
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
