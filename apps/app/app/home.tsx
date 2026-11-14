import { addMonths, monthOfDayId, type MonthRef } from '@memory-journal/core';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/features/calendar/MonthCalendar';
import { useTodayId } from '@/features/calendar/useTodayId';
import { useWrittenDays } from '@/features/calendar/useWrittenDays';
import { signOut } from '@/platform/auth/google';

export default function HomeScreen() {
  const todayId = useTodayId();
  // Start on the current month, then follow the user's own navigation.
  const [month, setMonth] = useState<MonthRef>(() => monthOfDayId(todayId));
  const { writtenDays, status } = useWrittenDays(month);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <MonthCalendar
          month={month}
          todayId={todayId}
          writtenDays={writtenDays}
          onChangeMonth={(delta) => setMonth((current) => addMonths(current, delta))}
          // The Day screen arrives in commit 18; until then a tap has nowhere to go.
          onSelectDay={() => undefined}
        />
        <View style={{ alignItems: 'center', gap: 12, marginTop: 8 }}>
          {status === 'loading' ? <ActivityIndicator /> : null}
          {status === 'error' ? (
            <Text>Could not load this month. Showing nothing for now.</Text>
          ) : null}
          {/* Sign out moves to Settings in a later commit. */}
          <Pressable accessibilityRole="button" onPress={() => void signOut()}>
            <Text>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
