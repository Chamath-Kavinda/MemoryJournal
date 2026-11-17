import { daysBetween, pickMessage } from '@memory-journal/core';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorCard } from '@/components/ErrorCard';
import { Skeleton } from '@/components/Skeleton';
import { useTodayId } from '@/features/calendar/useTodayId';
import { InsightsView } from '@/features/insights/InsightsView';
import { useInsights } from '@/features/insights/useInsights';
import { TabHeader } from '@/navigation/TabHeader';
import { useTabScreenEdges } from '@/navigation/useTabScreenEdges';

import { SPACING } from '@/theme/layout';
import { useLayout } from '@/theme/useLayout';

export default function InsightsRoute() {
  const { contentMaxWidth } = useLayout();
  const edges = useTabScreenEdges();

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
    <SafeAreaView edges={edges} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <TabHeader title="Insights" />
        {insights !== null && message !== null ? (
          <InsightsView insights={insights} message={message} />
        ) : null}
        {status === 'loading' && insights === null ? (
          <View
            testID="insights-loading"
            accessibilityLabel="Loading your insights"
            style={{
              width: '100%',
              maxWidth: contentMaxWidth,
              alignSelf: 'center',
              padding: SPACING.lg,
              gap: SPACING.md,
            }}
          >
            <Skeleton height={48} radius={16} />
            <Skeleton height={240} radius={16} />
            <Skeleton height={140} radius={16} />
            <Skeleton height={160} radius={16} />
          </View>
        ) : null}
        {status === 'error' ? (
          <View
            style={{
              width: '100%',
              maxWidth: contentMaxWidth,
              alignSelf: 'center',
              padding: SPACING.lg,
            }}
          >
            <ErrorCard
              message={
                insights === null
                  ? 'Your insights could not be loaded.'
                  : 'Your insights could not be refreshed. These numbers may be out of date.'
              }
              onRetry={reload}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
