import { parseLesson, TRY_IT_HEADING, type Lesson, type LessonBlock } from '@memory-journal/core';
import { Check, Clock, PenLine } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { Pop } from '@/components/Pop';
import { BORDER_WIDTH, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

/** A comfortable line length for reading (section 15.11). */
const READING_MAX_WIDTH = 680;

interface Props {
  lesson: Lesson;
  done: boolean;
  onToggleDone: () => void;
  /** Opens today's page on the Day screen. */
  onTryIt: () => void;
}

function Block({ block, id }: { block: LessonBlock; id: string }) {
  const { palette } = useTheme();
  if (block.type === 'heading') {
    return (
      <Text
        accessibilityRole="header"
        style={{
          color: palette.text,
          fontSize: 19,
          lineHeight: 26,
          fontWeight: '700',
          marginTop: SPACING.sm,
        }}
      >
        {block.text}
      </Text>
    );
  }
  if (block.type === 'list') {
    return (
      <View style={{ gap: SPACING.sm }}>
        {block.items.map((item, itemIndex) => (
          <View key={`${id}-${itemIndex}`} style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <Text style={{ color: palette.neonViolet, fontSize: 16, lineHeight: 24 }}>
              {'\u2022'}
            </Text>
            <Text style={{ flex: 1, color: palette.text, fontSize: 16, lineHeight: 24 }}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  return <Text style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>{block.text}</Text>;
}

/**
 * One lesson drawn from its bundled text. The Try it tonight section is the last section of every
 * lesson, so it is drawn as a card with a gradient border and a button to today's page, followed by
 * the Mark as done toggle.
 */
export function LessonView({ lesson, done, onToggleDone, onTryIt }: Props) {
  const { palette } = useTheme();
  const blocks = parseLesson(lesson.body);
  const tryItIndex = blocks.findIndex(
    (block) => block.type === 'heading' && block.text === TRY_IT_HEADING,
  );
  const reading = tryItIndex === -1 ? blocks : blocks.slice(0, tryItIndex);
  const exercise = tryItIndex === -1 ? [] : blocks.slice(tryItIndex);

  return (
    <View
      style={{
        width: '100%',
        maxWidth: READING_MAX_WIDTH,
        alignSelf: 'center',
        padding: SPACING.lg,
        gap: SPACING.md,
      }}
    >
      <FadeUp index={0}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
          <Icon icon={Clock} size={14} color={palette.muted} />
          <Text style={{ color: palette.muted, fontSize: 13 }}>{lesson.minutes} min read</Text>
        </View>
      </FadeUp>
      <FadeUp index={1} style={{ gap: SPACING.md }}>
        {reading.map((block, index) => (
          <Block key={`${index}-${block.type}`} block={block} id={`${index}`} />
        ))}
      </FadeUp>
      {tryItIndex !== -1 ? (
        <FadeUp index={2}>
          <Card active testID="try-it-card" style={{ gap: SPACING.md }}>
            <View style={{ gap: SPACING.md }}>
              {exercise.map((block, index) => (
                <Block key={`try-${index}-${block.type}`} block={block} id={`try-${index}`} />
              ))}
              <View style={{ alignItems: 'flex-start' }}>
                <Button label="Open today's page" icon={PenLine} onPress={onTryIt} />
              </View>
            </View>
          </Card>
        </FadeUp>
      ) : null}
      <View
        style={{
          marginTop: SPACING.sm,
          paddingTop: SPACING.md,
          borderTopWidth: BORDER_WIDTH,
          borderTopColor: palette.border,
          alignItems: 'flex-start',
        }}
      >
        <Pop trigger={done} testID="done-pop">
          <Button
            testID="mark-done"
            label={done ? 'Mark as not done' : 'Mark as done'}
            icon={Check}
            variant={done ? 'secondary' : 'primary'}
            onPress={onToggleDone}
          />
        </Pop>
      </View>
    </View>
  );
}
