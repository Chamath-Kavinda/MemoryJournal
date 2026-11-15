import { nextMilestone, type Insights, type TrendPoint } from '@memory-journal/core';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/theme/themed';

import { ActionButton, usePalette } from '@/features/tags/ui';

const CHART_HEIGHT = 96;
const MIN_BAR_HEIGHT = 4;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** How the score moved against a week ago, or null when there is nothing to compare. */
function deltaText(delta: number | null): string | null {
  if (delta === null) return null;
  if (delta === 0) return 'Same as a week ago';
  return `${delta > 0 ? '+' : '\u2212'}${Math.abs(delta)} compared with a week ago`;
}

/** A spoken summary of the trend, which a screen reader cannot get from the bars. */
function trendSummary(trend: readonly TrendPoint[]): string {
  const scores = trend.flatMap((point) => (point.score === null ? [] : [point.score]));
  const first = scores[0];
  const last = scores[scores.length - 1];
  if (first === undefined || last === undefined) {
    return 'No scores yet. The trend fills in as you write.';
  }
  return `Recall score over the last 30 days: ${first} at the start, ${last} now.`;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const palette = usePalette();
  return (
    <View
      style={{
        gap: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      <Text accessibilityRole="header" style={{ color: palette.muted, fontSize: 14 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ScoreCard({ score, delta }: Pick<Insights, 'score'> & { delta: number | null }) {
  const palette = usePalette();
  const [showInfo, setShowInfo] = useState(false);
  const change = deltaText(delta);

  return (
    <Card title="Recall score">
      {score === null ? (
        <Text style={{ color: palette.text, fontSize: 16 }}>
          No score yet. Write your first day and your recall score appears here.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text
            accessibilityLabel={`Recall score ${score} out of 100`}
            style={{ color: palette.text, fontSize: 48, fontWeight: '700' }}
          >
            {score}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 16 }}>out of 100</Text>
        </View>
      )}
      {change === null ? null : (
        <Text style={{ color: palette.muted, fontSize: 14 }}>{change}</Text>
      )}
      <View style={{ alignItems: 'flex-start' }}>
        <ActionButton
          label={showInfo ? 'Hide score info' : 'About the score'}
          onPress={() => setShowInfo((shown) => !shown)}
        />
      </View>
      {showInfo ? (
        <Text style={{ color: palette.text, fontSize: 14, lineHeight: 20 }}>
          The recall score is a motivation tool, not a medical measure. It is the mean of your last
          14 written days. Each day earns points for detail, coverage of the hours, precision,
          details you add later and how consistently you write. It only compares you with your own
          history.
        </Text>
      ) : null}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function StreakCard({ streak }: Pick<Insights, 'streak'>) {
  const palette = usePalette();
  const next = nextMilestone(streak.currentStreak);
  return (
    <Card title="Streak">
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Current" value={plural(streak.currentStreak, 'day')} />
        <Stat label="Longest" value={plural(streak.longestStreak, 'day')} />
        <Stat label="Freezes banked" value={String(streak.freezeCount)} />
      </View>
      <Text style={{ color: palette.text, fontSize: 14 }}>
        {next === null
          ? 'You have reached every milestone.'
          : `Next milestone: ${plural(next, 'day')} (${next - streak.currentStreak} to go).`}
      </Text>
      <Text style={{ color: palette.muted, fontSize: 13 }}>
        A freeze covers one missed day automatically. You earn one every 7 days in a row, up to 2.
      </Text>
    </Card>
  );
}

function TrendCard({ trend }: Pick<Insights, 'trend'>) {
  const palette = usePalette();
  const summary = trendSummary(trend);
  return (
    <Card title="Last 30 days">
      <View
        accessible
        accessibilityLabel={summary}
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: CHART_HEIGHT }}
      >
        {trend.map((point) => (
          <View
            key={point.dayId}
            style={{
              flex: 1,
              height:
                point.score === null
                  ? MIN_BAR_HEIGHT
                  : Math.max(MIN_BAR_HEIGHT, Math.round((point.score / 100) * CHART_HEIGHT)),
              borderRadius: 2,
              backgroundColor: point.score === null ? palette.border : palette.accent,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: palette.muted, fontSize: 12 }}>30 days ago</Text>
        <Text style={{ color: palette.muted, fontSize: 12 }}>Today</Text>
      </View>
      <Text style={{ color: palette.text, fontSize: 14 }}>{summary}</Text>
    </Card>
  );
}

interface Props {
  insights: Insights;
  /** The sentence chosen by pickMessage. */
  message: string;
}

/** The Insights screen: one message, the recall score, the streak and a 30-day trend. */
export function InsightsView({ insights, message }: Props) {
  const palette = usePalette();
  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 16, padding: 16 }}>
      <Text style={{ color: palette.text, fontSize: 18, lineHeight: 26 }}>{message}</Text>
      <ScoreCard score={insights.score} delta={insights.scoreDelta} />
      <StreakCard streak={insights.streak} />
      <TrendCard trend={insights.trend} />
    </View>
  );
}
