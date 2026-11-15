import { addMonths, monthOfDayId, type MonthRef } from '@memory-journal/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/features/calendar/MonthCalendar';
import { useTodayId } from '@/features/calendar/useTodayId';
import { useWrittenDays } from '@/features/calendar/useWrittenDays';
import { StatsBar } from '@/features/insights/StatsBar';
import { useInsights } from '@/features/insights/useInsights';
import { TabHeader } from '@/navigation/TabHeader';
import { CONTENT_MAX_WIDTH } from '@/theme/palette';
import { Text } from '@/theme/themed';

export default function HomeScreen() {
  const router = useRouter();
  const todayId = useTodayId();
  // Start on the current month, then follow the user's own navigation.
  const [month, setMonth] = useState<MonthRef>(() => monthOfDayId(todayId));
  const { writtenDays, status } = useWrittenDays(month);
  const { insights, status: insightsStatus, reload } = useInsights(todayId);

  // Home stays mounted under the Day screen, so read the numbers again when it regains focus.
  // The first focus is skipped because useInsights has just started its own read.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}>
          {/* The sections are the tabs of the bottom bar (or the sidebar), so Home has no link list. */}
          <TabHeader title="Memory Journal" />
          <StatsBar
            insights={insights}
            status={insightsStatus}
            onOpen={() => router.push('/insights')}
          />
          <MonthCalendar
            month={month}
            todayId={todayId}
            writtenDays={writtenDays}
            onChangeMonth={(delta) => setMonth((current) => addMonths(current, delta))}
            onSelectDay={(dayId) => router.push(`/day/${dayId}`)}
          />
          <View style={{ alignItems: 'center', gap: 12, marginTop: 8 }}>
            {status === 'loading' ? <ActivityIndicator /> : null}
            {status === 'error' ? (
              <Text>Could not load this month. Showing nothing for now.</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
