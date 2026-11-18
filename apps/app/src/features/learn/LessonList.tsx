import { learnProgress, nextLesson, type Lesson } from '@memory-journal/core';
import { Clock, CircleCheck, GraduationCap } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from '@/components/Card';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { PressableCard } from '@/components/PressableCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ResponsiveGrid } from '@/components/ResponsiveGrid';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { useLayout } from '@/theme/useLayout';

import { lessonIcon } from './lessonIcon';

/** Width and height of the round badge that holds the lesson number. */
const BADGE = 44;

interface Props {
  lessons: readonly Lesson[];
  completed: readonly string[];
  onOpen: (lessonId: string) => void;
}

interface LessonCardProps {
  lesson: Lesson;
  number: number;
  finished: boolean;
  onOpen: () => void;
}

/** One lesson: numbered badge, lesson icon, title, summary, reading time and a check when done. */
function LessonCard({ lesson, number, finished, onOpen }: LessonCardProps) {
  const { palette } = useTheme();
  return (
    <PressableCard
      testID={`lesson-card-${lesson.id}`}
      accessibilityLabel={`${lesson.title}, ${lesson.minutes} minute read${finished ? ', done' : ''}`}
      onPress={onOpen}
      active={finished}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md }}>
        <View
          style={{
            width: BADGE,
            height: BADGE,
            borderRadius: RADIUS.pill,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: BORDER_WIDTH,
            borderColor: palette.border,
            backgroundColor: palette.surfaceRaised,
          }}
        >
          <Text style={{ color: palette.neonViolet, fontSize: 17, fontWeight: '700' }}>
            {number}
          </Text>
        </View>
        <View style={{ flex: 1, flexShrink: 1, gap: SPACING.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Icon icon={lessonIcon(lesson.id)} size="inline" color={palette.neonViolet} />
            <Text
              style={{
                flex: 1,
                flexShrink: 1,
                color: palette.text,
                fontSize: 17,
                fontWeight: '600',
              }}
            >
              {lesson.title}
            </Text>
            {finished ? (
              <View testID={`lesson-done-${lesson.id}`}>
                <Icon
                  icon={CircleCheck}
                  size="inline"
                  color={palette.success}
                  accessibilityLabel="Done"
                />
              </View>
            ) : null}
          </View>
          <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>
            {lesson.summary}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
            <Icon icon={Clock} size={14} color={palette.muted} />
            <Text style={{ color: palette.muted, fontSize: 13 }}>{lesson.minutes} min read</Text>
          </View>
        </View>
      </View>
    </PressableCard>
  );
}

/** The lesson list: how far along the person is, and one card per lesson in teaching order. */
export function LessonList({ lessons, completed, onOpen }: Props) {
  const { palette } = useTheme();
  const layout = useLayout();
  const { done, total } = learnProgress(completed);
  const next = nextLesson(completed);

  return (
    <View
      style={{
        width: '100%',
        maxWidth: layout.contentMaxWidth,
        alignSelf: 'center',
        padding: SPACING.lg,
        gap: SPACING.md,
      }}
    >
      <FadeUp index={0}>
        <Card testID="learn-progress" style={{ gap: SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Icon icon={GraduationCap} size="inline" color={palette.neonViolet} />
            <Text style={{ flex: 1, flexShrink: 1, color: palette.text, fontSize: 16 }}>
              {done === total
                ? `All ${total} lessons done.`
                : `${done} of ${total} lessons done${next ? `. Up next: ${next.title}.` : '.'}`}
            </Text>
          </View>
          <ProgressBar
            testID="learn-progress-bar"
            progress={total === 0 ? 0 : done / total}
            accessibilityLabel="Lessons done"
          />
        </Card>
      </FadeUp>
      <ResponsiveGrid columns={layout.columns}>
        {lessons.map((lesson, index) => (
          <FadeUp key={lesson.id} index={index + 1}>
            <LessonCard
              lesson={lesson}
              number={index + 1}
              finished={completed.includes(lesson.id)}
              onOpen={() => onOpen(lesson.id)}
            />
          </FadeUp>
        ))}
      </ResponsiveGrid>
    </View>
  );
}
