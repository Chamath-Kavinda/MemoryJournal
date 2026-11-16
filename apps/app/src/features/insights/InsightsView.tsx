import {
  nextMilestone,
  STREAK_MILESTONES,
  type Insights,
  type TrendPoint,
} from '@memory-journal/core';
import {
  Flame,
  Info,
  Minus,
  ShieldCheck,
  Snowflake,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInLeft } from 'react-native-reanimated';

import { Burst } from '@/components/Burst';
import { Card } from '@/components/Card';
import { CountUp } from '@/components/CountUp';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { ScoreRing } from '@/components/ScoreRing';
import { TrendLine } from '@/components/TrendLine';
import { easeOut } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { CONTENT_MAX_WIDTH } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** How the score moved against a week ago, or null when there is nothing to compare. */
function deltaText(delta: number | null): string | null {
  if (delta === null) return null;
  if (delta === 0) return 'Same as a week ago';
  return `${delta > 0 ? '+' : '\u2212'}${Math.abs(delta)} compared with a week ago`;
}

/** A spoken summary of the trend, which a screen reader cannot get from the line. */
function trendSummary(trend: readonly TrendPoint[]): string {
  const scores = trend.flatMap((point) => (point.score === null ? [] : [point.score]));
  const first = scores[0];
  const last = scores[scores.length - 1];
  if (first === undefined || last === undefined) {
    return 'No scores yet. The trend fills in as you write.';
  }
  return `Recall score over the last 30 days: ${first} at the start, ${last} now.`;
}

/** The milestone before `streak`, or 0, so the bar shows progress inside the current stretch. */
function previousMilestone(streak: number): number {
  return [...STREAK_MILESTONES].reverse().find((milestone) => milestone <= streak) ?? 0;
}

interface SectionProps {
  icon: LucideIcon;
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}

function Section({ icon, title, trailing, children }: SectionProps) {
  const { palette } = useTheme();
  return (
    <Card style={{ gap: SPACING.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <Icon icon={icon} size="inline" color={palette.neonViolet} />
        <Text
          accessibilityRole="header"
          style={{ flex: 1, color: palette.muted, fontSize: 14, fontWeight: '600' }}
        >
          {title}
        </Text>
        {trailing}
      </View>
      {children}
    </Card>
  );
}

/** The weekly change: an arrow that slides in beside the sentence. */
function WeeklyChange({ delta }: { delta: number }) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  const text = deltaText(delta);
  const icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color = delta > 0 ? palette.success : delta < 0 ? palette.danger : palette.muted;
  const entering = reduce
    ? FadeIn.duration(DURATION.reduced)
    : FadeInLeft.duration(DURATION.base).easing(easeOut);
  return (
    <View
      testID="score-change"
      style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}
    >
      <Animated.View entering={entering}>
        <Icon icon={icon} size="inline" color={color} />
      </Animated.View>
      <Text style={{ color: palette.muted, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

function ScoreCard({ score, delta }: Pick<Insights, 'score'> & { delta: number | null }) {
  const { palette } = useTheme();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <Section
      icon={Sparkles}
      title="Recall score"
      trailing={
        <IconButton
          testID="score-info"
          icon={Info}
          accessibilityLabel={showInfo ? 'Hide score info' : 'About the score'}
          color={palette.muted}
          onPress={() => setShowInfo((shown) => !shown)}
        />
      }
    >
      {score === null ? (
        <Text style={{ color: palette.text, fontSize: 16 }}>
          No score yet. Write your first day and your recall score appears here.
        </Text>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <ScoreRing score={score} testID="score-ring" />
        </View>
      )}
      {delta === null ? null : <WeeklyChange delta={delta} />}
      {showInfo ? (
        <Text style={{ color: palette.text, fontSize: 14, lineHeight: 20 }}>
          The recall score is a motivation tool, not a medical measure. It is the mean of your last
          14 written days. Each day earns points for detail, coverage of the hours, precision,
          details you add later and how consistently you write. It only compares you with your own
          history.
        </Text>
      ) : null}
    </Section>
  );
}

interface StatProps {
  icon: LucideIcon;
  label: string;
  value: string;
  children?: ReactNode;
}

function Stat({ icon, label, value, children }: StatProps) {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon icon={icon} size={16} color={palette.muted} />
        <Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text>
      </View>
      {children ?? (
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{value}</Text>
      )}
    </View>
  );
}

function StreakCard({ streak }: Pick<Insights, 'streak'>) {
  const { palette } = useTheme();
  const next = nextMilestone(streak.currentStreak);
  const previous = previousMilestone(streak.currentStreak);
  const progress = next === null ? 1 : (streak.currentStreak - previous) / (next - previous);
  const atMilestone = streak.currentStreak > 0 && STREAK_MILESTONES.includes(streak.currentStreak);
  return (
    <Section icon={Flame} title="Streak">
      <View style={{ flexDirection: 'row', gap: SPACING.md }}>
        <Stat icon={Flame} label="Current" value={plural(streak.currentStreak, 'day')}>
          <CountUp
            value={streak.currentStreak}
            format={(n) => plural(n, 'day')}
            style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}
          />
        </Stat>
        <Stat icon={Trophy} label="Longest" value={plural(streak.longestStreak, 'day')} />
        <Stat icon={Snowflake} label="Freezes banked" value={String(streak.freezeCount)} />
      </View>
      <View>
        <ProgressBar
          testID="streak-progress"
          progress={progress}
          accessibilityLabel="Progress to the next milestone"
        />
        {atMilestone ? <Burst testID="milestone-burst" /> : null}
      </View>
      <Text style={{ color: palette.text, fontSize: 14 }}>
        {next === null
          ? 'You have reached every milestone.'
          : `Next milestone: ${plural(next, 'day')} (${next - streak.currentStreak} to go).`}
      </Text>
      <Text style={{ color: palette.muted, fontSize: 13 }}>
        A freeze covers one missed day automatically. You earn one every 7 days in a row, up to 2.
      </Text>
    </Section>
  );
}

function TrendCard({ trend }: Pick<Insights, 'trend'>) {
  const { palette } = useTheme();
  const summary = trendSummary(trend);
  return (
    <Section icon={TrendingUp} title="Last 30 days">
      <TrendLine
        testID="trend-line"
        scores={trend.map((point) => point.score)}
        accessibilityLabel={summary}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: palette.muted, fontSize: 12 }}>30 days ago</Text>
        <Text style={{ color: palette.muted, fontSize: 12 }}>Today</Text>
      </View>
      <Text style={{ color: palette.text, fontSize: 14 }}>{summary}</Text>
    </Section>
  );
}

/** The privacy promise, as a pill at the top of the screen. */
function PrivacyChip() {
  const { palette } = useTheme();
  return (
    <View
      testID="privacy-chip"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        borderRadius: RADIUS.card,
        borderWidth: BORDER_WIDTH,
        borderColor: palette.border,
        backgroundColor: palette.surfaceRaised,
      }}
    >
      <Icon icon={ShieldCheck} size="inline" color={palette.success} />
      <Text style={{ flex: 1, flexShrink: 1, color: palette.muted, fontSize: 13 }}>
        Worked out on your device. Your journal text is never sent to an AI service.
      </Text>
    </View>
  );
}

interface Props {
  insights: Insights;
  /** The sentence chosen by pickMessage. */
  message: string;
}

/** The Insights screen: privacy chip, recall score, streak, 30-day trend and one message. */
export function InsightsView({ insights, message }: Props) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        alignSelf: 'center',
        gap: SPACING.md,
        padding: SPACING.lg,
      }}
    >
      <FadeUp index={0}>
        <PrivacyChip />
      </FadeUp>
      <FadeUp index={1}>
        <ScoreCard score={insights.score} delta={insights.scoreDelta} />
      </FadeUp>
      <FadeUp index={2}>
        <StreakCard streak={insights.streak} />
      </FadeUp>
      <FadeUp index={3}>
        <TrendCard trend={insights.trend} />
      </FadeUp>
      <FadeUp index={4}>
        <Card active testID="message-card">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <Icon icon={Sparkles} size="control" color={palette.neonViolet} />
            <Text
              style={{ flex: 1, flexShrink: 1, color: palette.text, fontSize: 17, lineHeight: 25 }}
            >
              {message}
            </Text>
          </View>
        </Card>
      </FadeUp>
    </View>
  );
}
