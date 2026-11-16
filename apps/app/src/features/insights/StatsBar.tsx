import type { Insights } from '@memory-journal/core';
import { Flame, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Breathe } from '@/components/Breathe';
import { Card } from '@/components/Card';
import { CountUp } from '@/components/CountUp';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import type { InsightsStatus } from './useInsights';

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** What the streak shows when it cannot be read, and what the score shows until there is one. */
const NO_STREAK = '–';
const NO_SCORE = '––';

interface Props {
  /** The numbers from the last successful read, or null before the first one. */
  insights: Insights | null;
  status: InsightsStatus;
  onOpen: () => void;
  /** Pass true while the screen is not focused so the flame stops flickering. */
  paused?: boolean;
}

interface StatCardProps {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}

/** One of the two cards: a gradient border, an icon and label on top, the number below. */
function StatCard({ label, icon, children }: StatCardProps) {
  const { palette } = useTheme();
  return (
    <Card active padding={SPACING.md} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        {icon}
        <Text variant="caption" style={{ flexShrink: 1, color: palette.muted }}>
          {label}
        </Text>
      </View>
      <View style={{ marginTop: SPACING.xs }}>{children}</View>
    </Card>
  );
}

/**
 * The two stat cards at the top of Home (section 15.11): Streak with a Flame and Recall score with
 * Sparkles, side by side. They fade up one after the other and the numbers count up. Tapping
 * either opens the Insights screen. Before the first read (or when it failed) the values show
 * dashes instead of numbers, so a wrong zero is never shown.
 */
export function StatsBar({ insights, status, onOpen, paused = false }: Props) {
  const { palette } = useTheme();
  const streak = insights === null ? null : insights.streak.currentStreak;
  const score = insights === null ? null : insights.score;

  const spokenStreak = streak === null ? 'Streak not available' : `Streak ${plural(streak, 'day')}`;
  const spokenScore =
    insights === null
      ? 'Recall score not available'
      : score === null
        ? 'No recall score yet'
        : `Recall score ${score} out of 100`;
  const state =
    status === 'loading' && insights === null
      ? ' Loading.'
      : status === 'error'
        ? ' Could not be refreshed.'
        : '';

  const flame = (
    <Icon
      icon={Flame}
      size="control"
      color={streak !== null && streak > 0 ? palette.warning : palette.muted}
    />
  );

  return (
    <PressableScale
      accessibilityLabel={`${spokenStreak}. ${spokenScore}.${state} Open insights`}
      onPress={onOpen}
      style={{ marginHorizontal: SPACING.lg, marginTop: SPACING.sm }}
      innerStyle={{ flexDirection: 'row', gap: SPACING.md }}
    >
      <FadeUp index={0} style={{ flex: 1 }}>
        <StatCard
          label="Streak"
          icon={
            streak !== null && streak > 0 ? (
              <Breathe paused={paused} minOpacity={0.7} maxScale={1.1}>
                {flame}
              </Breathe>
            ) : (
              flame
            )
          }
        >
          {streak === null ? (
            <Text variant="title">{NO_STREAK}</Text>
          ) : (
            <CountUp value={streak} format={(days) => plural(days, 'day')} />
          )}
        </StatCard>
      </FadeUp>
      <FadeUp index={1} style={{ flex: 1 }}>
        <StatCard
          label="Recall score"
          icon={<Icon icon={Sparkles} size="control" color={palette.neonCyan} />}
        >
          {score === null ? <Text variant="title">{NO_SCORE}</Text> : <CountUp value={score} />}
        </StatCard>
      </FadeUp>
    </PressableScale>
  );
}
