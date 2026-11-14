import { emptyContent, type DayContent } from '@memory-journal/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayScreenView } from '@/features/day/DayScreenView';
import { DayWriter } from '@/features/day/DayWriter';
import { useDayAccess } from '@/features/day/useDayAccess';

export default function DayRoute() {
  const { dayId: rawDayId } = useLocalSearchParams<{ dayId: string }>();
  const dayId = Array.isArray(rawDayId) ? (rawDayId[0] ?? '') : (rawDayId ?? '');
  const router = useRouter();
  const access = useDayAccess(dayId);
  // The draft lives in memory for now; autosave and saving revisions come in commits 21 and 22.
  const [content, setContent] = useState<DayContent>(emptyContent);

  const showWriter = access?.state === 'open' || access?.state === 'locked';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <DayScreenView
          dayId={dayId}
          access={access}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        {showWriter ? (
          <DayWriter content={content} onChange={setContent} editable={access?.state === 'open'} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
