import type { Insights } from '@memory-journal/core';
import { Pressable, View } from 'react-native';

import { Text } from '@/theme/themed';

import { usePalette } from '@/features/tags/ui';

import type { InsightsStatus } from './useInsights';

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

interface Props {
  /** The numbers from the last successful read, or null before the first one. */
  insights: Insights | null;
  status: InsightsStatus;
  onOpen: () => void;
}

/**
 * The top bar of the home screen: the current streak and the latest recall score. Tapping it opens
 * the Insights screen. Before the first read (or when it failed) the values show a dash instead of
 * a number, so a wrong zero is never shown.
 */
export function StatsBar({ insights, status, onOpen }: Props) {
  const palette = usePalette();
  const streak = insights === null ? '\u2013' : plural(insights.streak.currentStreak, 'day');
  const score = insights === null || insights.score === null ? '\u2013' : String(insights.score);

  const spokenStreak =
    insights === null
      ? 'Streak not available'
      : `Streak ${plural(insights.streak.currentStreak, 'day')}`;
  const spokenScore =
    insights === null
      ? 'Recall score not available'
      : insights.score === null
        ? 'No recall score yet'
        : `Recall score ${insights.score} out of 100`;
  const state =
    status === 'loading' && insights === null
      ? ' Loading.'
      : status === 'error'
        ? ' Could not be refreshed.'
        : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${spokenStreak}. ${spokenScore}.${state} Open insights`}
      onPress={onOpen}
      style={{
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 16,
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: palette.muted, fontSize: 13 }}>Streak</Text>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{streak}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: palette.muted, fontSize: 13 }}>Recall score</Text>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{score}</Text>
      </View>
    </Pressable>
  );
}
