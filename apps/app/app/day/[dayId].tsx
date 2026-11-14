import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/features/auth/authStore';
import { DayScreenView } from '@/features/day/DayScreenView';
import { DayWriter } from '@/features/day/DayWriter';
import { DraftStatus } from '@/features/day/DraftStatus';
import { draftStorage } from '@/features/day/draftStorage';
import { useDayAccess } from '@/features/day/useDayAccess';
import { useDayDraft } from '@/features/day/useDayDraft';

export default function DayRoute() {
  const { dayId: rawDayId } = useLocalSearchParams<{ dayId: string }>();
  const dayId = Array.isArray(rawDayId) ? (rawDayId[0] ?? '') : (rawDayId ?? '');
  const router = useRouter();
  const uid = useAuthStore((s) => s.user?.uid);
  const access = useDayAccess(dayId);
  // The draft is kept on the device while typing; saving it as a revision comes in commit 22.
  const draft = useDayDraft({ uid, dayId, storage: draftStorage });

  const showWriter = (access?.state === 'open' || access?.state === 'locked') && draft.ready;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <DayScreenView
          dayId={dayId}
          access={access}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        {showWriter ? (
          <>
            <DraftStatus state={draft.saveState} />
            <DayWriter
              content={draft.content}
              onChange={draft.setContent}
              editable={access?.state === 'open'}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
