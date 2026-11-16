import { addMonths, monthOfDayId, type MonthRef } from '@memory-journal/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorCard } from '@/components/ErrorCard';
import { FadeUp } from '@/components/FadeUp';
import { Skeleton } from '@/components/Skeleton';
import { GuestSignInBanner } from '@/features/auth/GuestSignInBanner';
import { SignInPill } from '@/features/auth/SignInPill';
import { MonthCalendar } from '@/features/calendar/MonthCalendar';
import { TodayCard } from '@/features/calendar/TodayCard';
import { useTodayId } from '@/features/calendar/useTodayId';
import { useWrittenDays } from '@/features/calendar/useWrittenDays';
import { StatsBar } from '@/features/insights/StatsBar';
import { useInsights } from '@/features/insights/useInsights';
import { TabHeader } from '@/navigation/TabHeader';
import { SPACING } from '@/theme/layout';
import { CONTENT_MAX_WIDTH } from '@/theme/palette';

export default function HomeScreen() {
  const router = useRouter();
  const todayId = useTodayId();
  // Start on the current month, then follow the user's own navigation.
  const [month, setMonth] = useState<MonthRef>(() => monthOfDayId(todayId));
  const { writtenDays, status, reload: reloadMonth } = useWrittenDays(month);
  const { insights, status: insightsStatus, reload } = useInsights(todayId);

  // Home stays mounted under the Day screen, so read the numbers again when it regains focus, and
  // let the looping animations rest while it is out of sight (section 15.16).
  // The first focus is skipped because useInsights has just started its own read.
  const [focused, setFocused] = useState(true);
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (firstFocus.current) {
        firstFocus.current = false;
      } else {
        reload();
      }
      return () => setFocused(false);
    }, [reload]),
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xxl }}>
        <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}>
          {/* The sections are the tabs of the bottom bar (or the sidebar), so Home has no link list. */}
          <TabHeader
            title="Memory Journal"
            trailing={<SignInPill onPress={() => router.push('/sign-in')} />}
          />
          <GuestSignInBanner onSignIn={() => router.push('/sign-in')} />

          <StatsBar
            insights={insights}
            status={insightsStatus}
            paused={!focused}
            onOpen={() => router.push('/insights')}
          />

          <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.md, gap: SPACING.md }}>
            <FadeUp index={2}>
              <MonthCalendar
                month={month}
                todayId={todayId}
                writtenDays={writtenDays}
                paused={!focused}
                onChangeMonth={(delta) => setMonth((current) => addMonths(current, delta))}
                onSelectDay={(dayId) => router.push(`/day/${dayId}`)}
              />
            </FadeUp>
            {status === 'loading' ? (
              <Skeleton
                testID="month-loading"
                width={96}
                height={8}
                paused={!focused}
                style={{ alignSelf: 'center' }}
              />
            ) : null}
            {status === 'error' ? (
              <ErrorCard
                message="Could not load this month. Showing nothing for now."
                onRetry={reloadMonth}
              />
            ) : null}
            <FadeUp index={3}>
              <TodayCard todayId={todayId} onWrite={() => router.push(`/day/${todayId}`)} />
            </FadeUp>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
