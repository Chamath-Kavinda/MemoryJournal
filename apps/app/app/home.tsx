import { addMonths, monthOfDayId, type MonthRef } from '@memory-journal/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/features/calendar/MonthCalendar';
import { useTodayId } from '@/features/calendar/useTodayId';
import { useWrittenDays } from '@/features/calendar/useWrittenDays';
import { StatsBar } from '@/features/insights/StatsBar';
import { useInsights } from '@/features/insights/useInsights';
import { signOut } from '@/platform/auth/google';

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
          {/* The full navigation (Tags, Library, Insights, Learn, Settings) arrives in commit 38. */}
          <Pressable accessibilityRole="button" onPress={() => router.push('/tags')}>
            <Text>Tags</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/library')}>
            <Text>Library</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/insights')}>
            <Text>Insights</Text>
          </Pressable>
          {/* Sign out moves to Settings in a later commit. */}
          <Pressable accessibilityRole="button" onPress={() => void signOut()}>
            <Text>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
