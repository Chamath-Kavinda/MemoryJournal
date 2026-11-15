import { daysBetween, pickMessage } from '@memory-journal/core';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodayId } from '@/features/calendar/useTodayId';
import { InsightsView } from '@/features/insights/InsightsView';
import { useInsights } from '@/features/insights/useInsights';
import { ActionButton, ScreenHeader, usePalette } from '@/features/tags/ui';

export default function InsightsRoute() {
  const router = useRouter();
  const palette = usePalette();
  const todayId = useTodayId();
  const { insights, status, reload } = useInsights(todayId);

  // The sentence stays the same all day. The seed moves on with the date, so the same trigger
  // gives a different variant on the next day and the same sentence is not shown twice in a row.
  const message = useMemo(
    () =>
      insights === null
        ? null
        : pickMessage(insights.context, { seed: daysBetween('2000-01-01', todayId) }).text,
    [insights, todayId],
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader
          title="Insights"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        {insights !== null && message !== null ? (
          <InsightsView insights={insights} message={message} />
        ) : null}
        {status === 'loading' && insights === null ? (
          <View style={{ padding: 32 }}>
            <ActivityIndicator accessibilityLabel="Loading your insights" />
          </View>
        ) : null}
        {status === 'error' ? (
          <View style={{ alignItems: 'center', gap: 8, padding: 16 }}>
            <Text style={{ color: palette.text, fontSize: 15 }}>
              {insights === null
                ? 'Your insights could not be loaded.'
                : 'Your insights could not be refreshed. These numbers may be out of date.'}
            </Text>
            <ActionButton label="Try again" tone="primary" onPress={reload} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
